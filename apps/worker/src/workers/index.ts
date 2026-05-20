import { Worker, Queue, Job } from 'bullmq';
import connection from '../redis';
import { QUEUES, QueueName } from '../queues';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

type TierEscalationResult =
  | { stopped: true; reason: string }
  | { escalated: true; tier: number; agencyCount: number };

type WorkerResult =
  | { processed: boolean | number }
  | { parsed: boolean; inboxId: string }
  | TierEscalationResult;

type WorkerInstance = Worker<unknown, WorkerResult>;

export function createAllWorkers(): WorkerInstance[] {
  const workers: WorkerInstance[] = [];

  for (const [, queueName] of Object.entries(QUEUES) as Array<[string, QueueName]>) {
    let processor: (job: Job<unknown, WorkerResult>) => Promise<WorkerResult>;

    if (queueName === QUEUES.SCORE_COMPUTE) {
      processor = async (job: Job<unknown, WorkerResult>): Promise<WorkerResult> => {
        if (job.name === 'parse_vms') {
          const { inboxId, tenantId } = job.data as { inboxId: string; tenantId: string };
          const { parseVmsEmail } = await import('../lib/ai/vms-parser');
          await parseVmsEmail(inboxId, tenantId);
          return { parsed: true, inboxId };
        }
        console.log(`[FFN Worker] Processing ${queueName}: ${job.id}`);
        return { processed: true };
      };
    } else if (queueName === QUEUES.TIER_ESCALATION) {
      processor = async (job: Job<unknown, WorkerResult>): Promise<WorkerResult> => {
        if (job.name === 'escalate_tier') {
          const { jdId, tenantId, nextTier, jdTitle } = job.data as {
            jdId:     string
            tenantId: string
            nextTier: number
            jdTitle:  string
          };

          const supabaseAdmin = createAdminClient(
            process.env['NEXT_PUBLIC_SUPABASE_URL']!,
            process.env['SUPABASE_SERVICE_ROLE_KEY']!,
            { auth: { autoRefreshToken: false, persistSession: false } }
          );
          const resend = new Resend(process.env['RESEND_API_KEY']!);

          // BR-DIST-004 — retracted JD stops cascade
          const { data: jd } = await supabaseAdmin
            .from('x_ffn_jd')
            .select('status')
            .eq('id', jdId)
            .single();
          if (!jd || jd.status === 'retracted' || jd.status === 'closed') {
            console.info('[FFN][tier-escalation] JD retracted/closed — stopping cascade', jdId);
            return { stopped: true, reason: 'jd_retracted' };
          }

          // BR-DIST-003 — early stop if previous tier has accepted broadcast
          const prevTier = nextTier - 1;
          const { data: prevAccepted } = await supabaseAdmin
            .from('x_ffn_jd_broadcast')
            .select('id')
            .eq('jd_id', jdId)
            .eq('tier', prevTier)
            .eq('status', 'accepted')
            .limit(1);
          if (prevAccepted && prevAccepted.length > 0) {
            console.info('[FFN][tier-escalation] Tier', prevTier, 'accepted — stopping cascade', jdId);
            return { stopped: true, reason: 'accepted_in_prev_tier' };
          }

          const { data: tierAgencies } = await supabaseAdmin
            .from('x_ffn_tier_config')
            .select('agency_tenant_id, hold_window_hours')
            .eq('tenant_id', tenantId)
            .eq('tier_number', nextTier);
          if (!tierAgencies || tierAgencies.length === 0) {
            console.info('[FFN][tier-escalation] No agencies in tier', nextTier, '— cascade complete');
            return { stopped: true, reason: 'no_agencies_in_tier' };
          }

          const SLA_HOURS = 48;
          void SLA_HOURS;
          const now = new Date();
          const broadcastRows = tierAgencies.map(ta => ({
            tenant_id:        tenantId,
            jd_id:            jdId,
            agency_tenant_id: ta.agency_tenant_id,
            tier:             nextTier,
            status:           'pending',
            sent_at:          now.toISOString(),
          }));
          await supabaseAdmin.from('x_ffn_jd_broadcast').insert(broadcastRows);

          for (const ta of tierAgencies) {
            const { data: arms } = await supabaseAdmin
              .from('x_ffn_user_profile')
              .select('email, full_name')
              .eq('tenant_id', ta.agency_tenant_id)
              .eq('persona_code', 'a_recruiting_manager')
              .eq('is_active', true);
            if (arms) {
              for (const arm of arms) {
                if (arm.email) {
                  await resend.emails.send({
                    from:    'noreply@hirenowwithflex.us',
                    to:      arm.email,
                    subject: `New Job Description Available (Tier ${nextTier}) — ${jdTitle}`,
                    html: `<p>A new Job Description is now available for your agency: <strong>${jdTitle}</strong>.</p>
                           <p>Review it in your <a href="${process.env['NEXT_PUBLIC_APP_URL']}/agency/jd-inbox">JD Inbox</a>.</p>`,
                  }).catch(err => console.error('[FFN][tier-escalation] Email failed:', err));
                }
              }
            }
          }

          if (nextTier < 3) {
            const nextHoldHours = tierAgencies[0]?.hold_window_hours ?? 24;
            const nextQueue = new Queue('tier-escalation', { connection });
            await nextQueue.add(
              'escalate_tier',
              { jdId, tenantId, nextTier: nextTier + 1, jdTitle },
              { delay: nextHoldHours * 3_600_000 }
            );
            await nextQueue.close();
          }

          return { escalated: true, tier: nextTier, agencyCount: tierAgencies.length };
        }

        console.log(`[FFN Worker] Processing ${queueName}: ${job.id}`);
        return { processed: true };
      };
    } else if (queueName === QUEUES.SLA_MONITOR) {
      processor = async (_job: Job<unknown, WorkerResult>): Promise<WorkerResult> => {
        const supabaseAdmin = createAdminClient(
          process.env['NEXT_PUBLIC_SUPABASE_URL']!,
          process.env['SUPABASE_SERVICE_ROLE_KEY']!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const now = new Date().toISOString();
        const { data: breached } = await supabaseAdmin
          .from('x_ffn_jd_broadcast')
          .select('id, jd_id, agency_tenant_id, tenant_id')
          .eq('status', 'pending')
          .eq('sla_breached', false)
          .lt('sla_deadline', now);

        if (!breached || breached.length === 0) return { processed: 0 };

        const ids = breached.map(r => r.id);
        await supabaseAdmin
          .from('x_ffn_jd_broadcast')
          .update({ sla_breached: true })
          .in('id', ids);

        await supabaseAdmin.from('x_ffn_audit_log').insert(
          breached.map(r => ({
            tenant_id:    r.tenant_id,
            actor_id:     null,
            persona_code: 'system',
            action:       'jd_broadcast.sla_breached',
            entity_type:  'x_ffn_jd_broadcast',
            entity_id:    r.id,
            new_values:   { jd_id: r.jd_id, agency_tenant_id: r.agency_tenant_id },
            ip_address:   null,
            user_agent:   null,
          }))
        );

        console.info(`[FFN][sla-monitor] Marked ${ids.length} broadcasts as SLA breached`);
        return { processed: ids.length };
      };
    } else {
      processor = async (job: Job<unknown, WorkerResult>): Promise<WorkerResult> => {
        console.log(`[FFN Worker] Processing ${queueName}: ${job.id}`);
        return { processed: true };
      };
    }

    const worker = new Worker<unknown, WorkerResult>(
      queueName,
      processor,
      { connection, concurrency: 5 },
    );

    worker.on('error', (err: Error) => {
      console.error(`[FFN Worker] Error in ${queueName}: ${err.message}`);
    });

    workers.push(worker);
  }

  console.log(`[FFN Worker] ${workers.length} workers started`);
  return workers;
}

export async function closeAllWorkers(workers: WorkerInstance[]): Promise<void> {
  for (const worker of workers) {
    await worker.close();
  }
  console.log('[FFN Worker] All workers closed');
}
