import crypto from 'crypto'

const SCOPES = 'signature impersonation'

function buildJWT(
  integrationKey: string,
  userId: string,
  authServer: string,
  rsaPrivateKey: string
): string {
  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   integrationKey,
    sub:   userId,
    aud:   authServer.replace('https://', ''),
    iat:   now,
    exp:   now + 3600,
    scope: SCOPES,
  })).toString('base64url')
  const signingInput = `${header}.${payload}`
  const signer = crypto.createSign('SHA256')
  signer.update(signingInput)
  signer.end()
  const sig = signer.sign(rsaPrivateKey.replace(/\\n/g, '\n'))
  return `${signingInput}.${sig.toString('base64url')}`
}

export async function getDocuSignToken(): Promise<string> {
  const integrationKey = process.env['DOCUSIGN_INTEGRATION_KEY']!
  const userId         = process.env['DOCUSIGN_USER_ID']!
  const authServer     = process.env['DOCUSIGN_AUTH_SERVER']!
  const rsaKey         = process.env['DOCUSIGN_RSA_PRIVATE_KEY']!

  const jwt = buildJWT(integrationKey, userId, authServer, rsaKey)

  const res = await fetch(`${authServer}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })

  if (!res.ok) throw new Error(`DocuSign auth failed: ${await res.text()}`)
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export type EnvelopeParams = {
  candidateEmail: string
  candidateName:  string
  htmlContent:    string
  subject:        string
  rtrNumber:      string
}

export async function sendEnvelopeForSigning(params: EnvelopeParams): Promise<string> {
  const accountId = process.env['DOCUSIGN_ACCOUNT_ID']!
  const baseUrl   = process.env['DOCUSIGN_BASE_URL']!
  const token     = await getDocuSignToken()

  const body = {
    emailSubject: params.subject,
    status:       'sent',
    documents: [{
      documentBase64: Buffer.from(params.htmlContent).toString('base64'),
      name:           `Right to Represent - ${params.rtrNumber}`,
      fileExtension:  'html',
      documentId:     '1',
    }],
    recipients: {
      signers: [{
        email:       params.candidateEmail,
        name:        params.candidateName,
        recipientId: '1',
        routingOrder:'1',
        tabs: {
          signHereTabs: [{
            documentId:    '1',
            pageNumber:    '1',
            recipientId:   '1',
            tabLabel:      'Signature',
            xPosition:     '100',
            yPosition:     '700',
            anchorString:  'Candidate Signature',
            anchorXOffset: '0',
            anchorYOffset: '0',
          }],
        },
      }],
    },
  }

  const res = await fetch(`${baseUrl}/accounts/${accountId}/envelopes`, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`DocuSign envelope failed: ${await res.text()}`)
  const result = await res.json() as { envelopeId: string }
  return result.envelopeId
}
