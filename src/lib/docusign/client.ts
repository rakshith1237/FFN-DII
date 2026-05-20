import * as docusign from 'docusign-esign'

const SCOPES = ['signature', 'impersonation']

export async function getDocuSignToken(): Promise<string> {
  const integrationKey = process.env['DOCUSIGN_INTEGRATION_KEY']!
  const userId         = process.env['DOCUSIGN_USER_ID']!
  const authServer     = process.env['DOCUSIGN_AUTH_SERVER']!
  const rsaKey         = process.env['DOCUSIGN_RSA_PRIVATE_KEY']!

  const apiClient = new docusign.ApiClient()
  apiClient.setOAuthBasePath(authServer.replace('https://', ''))

  const results = await apiClient.requestJWTUserToken(
    integrationKey,
    userId,
    SCOPES,
    Buffer.from(rsaKey),
    3600
  )

  return (results.body as { access_token: string }).access_token
}

export type EnvelopeParams = {
  candidateEmail: string
  candidateName:  string
  htmlContent:    string
  subject:        string
  rtrNumber:      string
}

export async function sendEnvelopeForSigning(
  params: EnvelopeParams
): Promise<string> {
  const accountId = process.env['DOCUSIGN_ACCOUNT_ID']!
  const baseUrl   = process.env['DOCUSIGN_BASE_URL']!

  const token     = await getDocuSignToken()
  const apiClient = new docusign.ApiClient()
  apiClient.setBasePath(baseUrl)
  apiClient.addDefaultHeader('Authorization', `Bearer ${token}`)

  // Create document from HTML
  const document              = new docusign.Document()
  document.documentBase64     = Buffer.from(params.htmlContent).toString('base64')
  document.name               = `Right to Represent — ${params.rtrNumber}`
  document.fileExtension      = 'html'
  document.documentId         = '1'

  // Create signer
  const signer         = new docusign.Signer()
  signer.email         = params.candidateEmail
  signer.name          = params.candidateName
  signer.recipientId   = '1'
  signer.routingOrder  = '1'

  // Signature tab (bottom of document)
  const signHere          = new docusign.SignHere()
  signHere.documentId     = '1'
  signHere.pageNumber     = '1'
  signHere.recipientId    = '1'
  signHere.tabLabel       = 'Signature'
  signHere.xPosition      = '100'
  signHere.yPosition      = '700'
  signHere.anchorString   = 'Candidate Signature'
  signHere.anchorXOffset  = '0'
  signHere.anchorYOffset  = '0'

  const tabs        = new docusign.Tabs()
  tabs.signHereTabs = [signHere]
  signer.tabs       = tabs

  // Create envelope
  const envelope        = new docusign.EnvelopeDefinition()
  envelope.emailSubject = params.subject
  envelope.documents    = [document]
  const recipients      = new docusign.Recipients()
  recipients.signers    = [signer]
  envelope.recipients   = recipients
  envelope.status       = 'sent'

  const envelopesApi = new docusign.EnvelopesApi(apiClient)
  const result       = await envelopesApi.createEnvelope(accountId, {
    envelopeDefinition: envelope,
  })

  return result.envelopeId ?? ''
}
