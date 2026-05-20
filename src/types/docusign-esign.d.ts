declare module 'docusign-esign' {
  class ApiClient {
    setOAuthBasePath(basePath: string): void
    setBasePath(basePath: string): void
    addDefaultHeader(name: string, value: string): void
    requestJWTUserToken(
      integrationKey: string,
      userId: string,
      scopes: string[],
      rsaKey: Buffer,
      expiresIn: number
    ): Promise<{ body: unknown }>
  }

  class Document {
    documentBase64?: string
    name?: string
    fileExtension?: string
    documentId?: string
  }

  class Signer {
    email?: string
    name?: string
    recipientId?: string
    routingOrder?: string
    tabs?: Tabs
  }

  class SignHere {
    documentId?: string
    pageNumber?: string
    recipientId?: string
    tabLabel?: string
    xPosition?: string
    yPosition?: string
    anchorString?: string
    anchorXOffset?: string
    anchorYOffset?: string
  }

  class Tabs {
    signHereTabs?: SignHere[]
  }

  class Recipients {
    signers?: Signer[]
  }

  class EnvelopeDefinition {
    emailSubject?: string
    documents?: Document[]
    recipients?: Recipients
    status?: string
  }

  class EnvelopesApi {
    constructor(apiClient: ApiClient)
    createEnvelope(
      accountId: string,
      options: { envelopeDefinition: EnvelopeDefinition }
    ): Promise<{ envelopeId?: string }>
  }
}
