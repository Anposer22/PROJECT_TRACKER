import { trackerDocumentSchema } from './schema'
import { normalizeDocument, validateDocumentInvariants } from './normalize'
import type { TrackerDocument } from './types'

export type ParseResult =
  | { ok: true; document: TrackerDocument }
  | { ok: false; error: string }

export function parseDocumentText(text: string): ParseResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}` }
  }
  const parsed = trackerDocumentSchema.safeParse(json)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
    return { ok: false, error: msg }
  }
  const doc = normalizeDocument(parsed.data as unknown as TrackerDocument)
  const inv = validateDocumentInvariants(doc)
  if (inv) return { ok: false, error: inv }
  return { ok: true, document: doc }
}
