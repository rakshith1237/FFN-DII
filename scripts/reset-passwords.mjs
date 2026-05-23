import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mnrwchtpethrbfdivkaa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ucndjaHRwZXRocmJmZGl2a2FhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTMwOTk4MCwiZXhwIjoyMDk0ODg1OTgwfQ.iZRahh6XVIVVGeN-pQyYQRx_7ATpYPIhsSLWB9Bpf5s',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const EMAILS = [
  'psa@acmecorp.demo','phm@acmecorp.demo','prec@acmecorp.demo',
  'asa@talentfirst.demo','arm@talentfirst.demo','arec@talentfirst.demo',
]

const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 100 })
if (error) { console.error('listUsers failed:', error.message); process.exit(1) }
console.log(`Found ${users.length} total users`)

for (const email of EMAILS) {
  const user = users.find(u => u.email === email)
  if (!user) { console.log(`NOT FOUND: ${email}`); continue }
  const { error: err } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'Testing@12345678',
    email_confirm: true,
  })
  if (err) console.log(`FAILED: ${email} — ${err.message}`)
  else console.log(`RESET OK: ${email}`)
}