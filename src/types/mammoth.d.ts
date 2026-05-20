declare module 'mammoth' {
  interface ExtractRawTextOptions {
    buffer: Buffer
  }
  interface ExtractRawTextResult {
    value: string
    messages: unknown[]
  }
  export function extractRawText(options: ExtractRawTextOptions): Promise<ExtractRawTextResult>
}
