// Shared in-memory store for PDF buffers during the admin upload flow.
// Using the `global` object so the map survives Next.js HMR module reloads in dev.
declare global {
  // eslint-disable-next-line no-var
  var __pdfSessionStore: Map<string, Buffer> | undefined
}

if (!global.__pdfSessionStore) {
  global.__pdfSessionStore = new Map<string, Buffer>()
}

export const pdfSessionStore = global.__pdfSessionStore
