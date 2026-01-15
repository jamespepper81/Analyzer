import { logger } from '@/lib/logger';

type GenkitSchemaLike = {
  _def?: {
    typeName?: string;
  };
};

const safeSerialize = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const seen = new WeakSet();
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) {
          return '[Circular]';
        }
        seen.add(val);
      }
      return val;
    }),
  );
};

// Genkit converts Zod schemas to JSON schema using zod-to-json-schema (Zod v3).
// If a schema comes from Zod v4 or is not a Zod schema, `_def.typeName` is missing,
// which triggers the runtime crash we're guarding against here.
const assertGenkitSchema = (schema: unknown, label: string): void => {
  const def = (schema as GenkitSchemaLike | undefined)?._def;
  const typeName = def?.typeName;

  if (!typeName) {
    logger.error(`${label}: schema missing _def.typeName`, {
      schema: safeSerialize(schema),
    });
    throw new Error(`${label}: invalid Genkit schema (missing _def.typeName)`);
  }
};

const logAiResponsePayload = (
  label: string,
  response: {
    output?: unknown;
    text?: string;
    message?: unknown;
    raw?: unknown;
    request?: unknown;
  },
  derived?: Record<string, unknown>,
): void => {
  logger.debug(`${label}: AI response payload`, {
    response: {
      output: safeSerialize(response.output),
      text: response.text,
      message: safeSerialize(response.message),
      raw: safeSerialize(response.raw),
      request: safeSerialize(response.request),
    },
    derived: safeSerialize(derived),
  });
};

export { assertGenkitSchema, logAiResponsePayload };
