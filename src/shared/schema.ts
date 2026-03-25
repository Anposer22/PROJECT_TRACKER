import { z } from 'zod'

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

const isoDateTime = z.string().min(1)

export const taskEventCreatedSchema = z.object({
  id: z.string().min(1),
  type: z.literal('created'),
  date: dateOnly,
  toLaneId: z.string().min(1)
})

export const taskEventHandoffSchema = z.object({
  id: z.string().min(1),
  type: z.literal('handoff'),
  date: dateOnly,
  fromLaneId: z.string().min(1),
  toLaneId: z.string().min(1),
  note: z.string().optional()
})

export const taskEventClosedSchema = z.object({
  id: z.string().min(1),
  type: z.literal('closed'),
  date: dateOnly
})

export const taskEventReopenedSchema = z.object({
  id: z.string().min(1),
  type: z.literal('reopened'),
  date: dateOnly
})

export const taskEventStatusNoteSchema = z.object({
  id: z.string().min(1),
  type: z.literal('status-note'),
  date: dateOnly,
  note: z.string().min(1)
})

export const taskEventSchema = z.discriminatedUnion('type', [
  taskEventCreatedSchema,
  taskEventHandoffSchema,
  taskEventClosedSchema,
  taskEventReopenedSchema,
  taskEventStatusNoteSchema
])

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  summary: z.string(),
  events: z.array(taskEventSchema).min(1)
})

export const subGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int()
})

export const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected #RRGGBB'),
  order: z.number().int(),
  subGroups: z.array(subGroupSchema)
})

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int(),
  groups: z.array(groupSchema),
  tasks: z.array(taskSchema)
})

export const customerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int(),
  projects: z.array(projectSchema)
})

export const trackerDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({
    documentTitle: z.string(),
    updatedAt: isoDateTime
  }),
  customers: z.array(customerSchema)
})

export type ParsedTrackerDocument = z.infer<typeof trackerDocumentSchema>
