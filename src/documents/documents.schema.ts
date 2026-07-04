import { z } from 'zod';

export const documentIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9._:-]+$/);

export const upsertDocumentBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().max(100_000),
  metadata: z.record(z.unknown()).default({}),
});

export type UpsertDocumentBody = z.infer<typeof upsertDocumentBodySchema>;

