import OpenAI from "openai";

export function getOpenAI() {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("No AI API key configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.");
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_API_KEY
      ? "https://openrouter.ai/api/v1"
      : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1"),
    defaultHeaders: process.env.OPENROUTER_API_KEY
      ? { "HTTP-Referer": "https://darciabusinesshub.app", "X-Title": "Darcia Business Hub" }
      : {},
  });
}

export function getAIModel() {
  return process.env.OPENROUTER_API_KEY
    ? (process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001")
    : (process.env.OPENAI_MODEL || "gpt-4o-mini");
}
