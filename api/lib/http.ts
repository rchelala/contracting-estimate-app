export interface JsonResponseWriter {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body: string): void
}

export type AsyncBodyStream = {
  body?: unknown
  [Symbol.asyncIterator]?: () => AsyncIterator<Uint8Array | string>
}

export function json(res: JsonResponseWriter, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}
