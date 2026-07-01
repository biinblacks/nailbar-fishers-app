import "dotenv/config";

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  supabaseUrl: required("SUPABASE_URL", process.env.SUPABASE_URL),
  supabaseServiceRoleKey: required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ),
  geminiApiKey: required("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
};
