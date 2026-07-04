import { z } from 'zod';

const serverEnvSchema = z.object({
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function readServerEnv(env: NodeJS.ProcessEnv): ServerEnv {
  return serverEnvSchema.parse(env);
}

