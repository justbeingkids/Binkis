import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  // Optional. If set, must be a real secret (>=16 chars). When absent we fall
  // back to SUPABASE_SERVICE_ROLE_KEY (see getServerEnv) so the app works on a
  // host where we cannot add a new env var.
  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET, if set, must be at least 16 chars")
    .optional(),
});

const sheetsLegacyEnvSchema = z.object({
  GOOGLE_SHEETS_ID: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1),
  GOOGLE_SHEETS_TAB: z.string().default("Codes"),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_BASE_URL: z.string().url().default("http://localhost:3002"),
  NEXT_PUBLIC_BRAND_NAME: z.string().default("BinKis"),
  NEXT_PUBLIC_COLLECTION_NUMBER: z.string().default("777"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export function getServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid server environment configuration:\n${issues}`);
  }

  const data = parsed.data;
  return {
    SUPABASE_SERVICE_ROLE_KEY: data.SUPABASE_SERVICE_ROLE_KEY,
    // Effective secret used to sign/verify admin session cookies. Prefer a
    // dedicated SESSION_SECRET; fall back to the always-present, high-entropy
    // service-role key so no new env var is needed on the host.
    SESSION_SECRET: data.SESSION_SECRET ?? data.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export function getSheetsLegacyEnv() {
  const parsed = sheetsLegacyEnvSchema.safeParse({
    GOOGLE_SHEETS_ID: process.env.GOOGLE_SHEETS_ID,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    GOOGLE_SHEETS_TAB: process.env.GOOGLE_SHEETS_TAB,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid Sheets legacy environment configuration:\n${issues}`);
  }

  return parsed.data;
}

export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_BRAND_NAME: process.env.NEXT_PUBLIC_BRAND_NAME,
  NEXT_PUBLIC_COLLECTION_NUMBER: process.env.NEXT_PUBLIC_COLLECTION_NUMBER,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});
