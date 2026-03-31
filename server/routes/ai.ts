import { Router } from "express";
import OpenAI from "openai";
import { db } from "../db.js";
import { customers, interactions, businesses } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, desc, inArray } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

router.post("/parse-capture", async (req, res) => {
  try {
    const { text, businesses: bizList } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text required" });

    const bizNames = bizList?.map((b: any) => `${b.name} (id: ${b.id})`).join(", ") || "none";

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a CRM assistant. Extract customer info from natural-language notes. Available businesses: ${bizNames}. 
Return JSON with:
- name: string (customer name, extract from text)
- businessIds: array of matching business ids from the list (empty if none match)
- status: "new" | "warm" | "hot" (based on interest level)
- interest: string (what they're interested in, 1 short sentence)
- followUpDate: string ISO date YYYY-MM-DD or null (if a date/timeframe is mentioned)
- content: string (cleaned capture note to save)`,
        },
        { role: "user", content: text },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return res.json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

router.get("/customer-summary/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return res.status(404).json({ error: "Not found" });

    const interactionRows = await db
      .select()
      .from(interactions)
      .where(eq(interactions.customerId, id))
      .orderBy(desc(interactions.createdAt))
      .limit(20);

    const interactionText = interactionRows
      .map((i) => `[${i.type}] ${i.content}${i.amount ? ` — Amount: ${i.amount}` : ""}${i.followUpDate ? ` — Follow-up: ${i.followUpDate}` : ""}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a CRM assistant. Write a concise 2-3 sentence customer summary that covers: who they are, what they want, and their current status. Be direct and actionable. No fluff.`,
        },
        {
          role: "user",
          content: `Customer: ${customer.name}\nStatus: ${customer.status}\nEmail: ${customer.email || "none"}\nPhone: ${customer.phone || "none"}\n\nInteraction history:\n${interactionText || "No interactions yet."}`,
        },
      ],
      max_tokens: 200,
    });

    return res.json({ summary: response.choices[0].message.content?.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

router.post("/reply", async (req, res) => {
  try {
    const { customerMessage, tone, customerId } = req.body;
    if (!customerMessage?.trim()) return res.status(400).json({ error: "customerMessage required" });

    let historyContext = "";
    if (customerId) {
      const recent = await db
        .select()
        .from(interactions)
        .where(eq(interactions.customerId, customerId))
        .orderBy(desc(interactions.createdAt))
        .limit(10);
      if (recent.length) {
        historyContext = "\n\nCustomer history:\n" + recent.map((i) => `[${i.type}] ${i.content}`).join("\n");
      }
    }

    const toneInstruction = {
      casual: "Write in a friendly, warm, conversational tone — like messaging a friend.",
      professional: "Write in a clear, professional, and respectful tone.",
      persuasive: "Write in a persuasive, confident tone that encourages action without being pushy.",
    }[tone] || "Write in a friendly, professional tone.";

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a business assistant helping write customer reply messages. ${toneInstruction} Keep replies concise and practical. Do not add placeholders like [Your Name].${historyContext}`,
        },
        {
          role: "user",
          content: `Write a reply to this customer message:\n\n"${customerMessage}"`,
        },
      ],
      max_tokens: 300,
    });

    return res.json({ reply: response.choices[0].message.content?.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

router.get("/next-action/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return res.status(404).json({ error: "Not found" });

    const interactionRows = await db
      .select()
      .from(interactions)
      .where(eq(interactions.customerId, id))
      .orderBy(desc(interactions.createdAt))
      .limit(15);

    const interactionText = interactionRows
      .map((i) => `[${i.type}] ${i.createdAt?.toString().split("T")[0]} — ${i.content}${i.followUpDate ? ` (follow-up: ${i.followUpDate}, completed: ${i.isCompleted})` : ""}`)
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a CRM assistant. Based on customer info and history, suggest the single best next action. Return JSON:
- action: string (what to do, short and specific)
- reason: string (why this is the best next step, 1 sentence)
- urgency: "high" | "medium" | "low"
- suggestedDate: string YYYY-MM-DD or null (when to do it)`,
        },
        {
          role: "user",
          content: `Customer: ${customer.name}\nStatus: ${customer.status}\n\nHistory:\n${interactionText || "No interactions yet."}`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return res.json(parsed);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

router.post("/weekly-insight", async (req, res) => {
  try {
    const { stats } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a business advisor giving a short weekly CRM review. Be direct and practical. 3-4 sentences max. Cover: what went well, what needs attention, one clear action to take next week.`,
        },
        {
          role: "user",
          content: `This week's CRM stats:\n${JSON.stringify(stats, null, 2)}`,
        },
      ],
      max_tokens: 200,
    });

    return res.json({ insight: response.choices[0].message.content?.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

router.post("/monthly-insight", async (req, res) => {
  try {
    const { current, previous, byBusiness } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a business advisor giving a short monthly CRM review. Be direct and practical. 3-5 sentences max. Compare to last month, highlight best-performing business, flag what needs attention, and give one concrete suggestion.`,
        },
        {
          role: "user",
          content: `Monthly stats:\nThis month: ${JSON.stringify(current)}\nLast month: ${JSON.stringify(previous)}\nBy business: ${JSON.stringify(byBusiness)}`,
        },
      ],
      max_tokens: 250,
    });

    return res.json({ insight: response.choices[0].message.content?.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

export default router;
