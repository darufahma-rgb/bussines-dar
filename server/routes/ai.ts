import { Router } from "express";
import { db } from "../db.js";
import { customers, interactions, businesses } from "../../shared/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { eq, desc, inArray, and } from "drizzle-orm";
import { getOpenAI, getAIModel } from "../lib/aiClient.js";

const router = Router();
router.use(requireAuth);

router.post("/parse-capture", async (req, res) => {
  try {
    const { text, businesses: bizList } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "text required" });

    const bizNames = bizList?.map((b: any) => `${b.name} (id: ${b.id})`).join(", ") || "none";

    const response = await getOpenAI().chat.completions.create({
      model: getAIModel(),
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

    const response = await getOpenAI().chat.completions.create({
      model: getAIModel(),
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

    const response = await getOpenAI().chat.completions.create({
      model: getAIModel(),
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

    const response = await getOpenAI().chat.completions.create({
      model: getAIModel(),
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

    const response = await getOpenAI().chat.completions.create({
      model: getAIModel(),
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

    const response = await getOpenAI().chat.completions.create({
      model: getAIModel(),
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

router.post("/yearly-insight", async (req, res) => {
  try {
    const { stats } = req.body;

    const response = await getOpenAI().chat.completions.create({
      model: getAIModel(),
      messages: [
        {
          role: "system",
          content: `You are a strategic business advisor giving a concise yearly CRM review for a founder managing multiple businesses. Be direct, reflective, and forward-looking. 4-6 sentences. Cover: overall year performance, strongest business unit, key pattern in wins/losses, and one clear strategic direction for next year.`,
        },
        {
          role: "user",
          content: `Yearly CRM data:\n${JSON.stringify(stats, null, 2)}`,
        },
      ],
      max_tokens: 300,
    });

    return res.json({ insight: response.choices[0].message.content?.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages required" });
    }

    // Load full CRM context
    const [customerRows, bizRows, overdueRows, recentInteractions] = await Promise.all([
      db.select({
        id: customers.id,
        name: customers.name,
        status: customers.status,
        estimatedValue: customers.estimatedValue,
        phone: customers.phone,
        email: customers.email,
        source: customers.source,
        lostReason: customers.lostReason,
        createdAt: customers.createdAt,
      }).from(customers).orderBy(desc(customers.updatedAt)).limit(100),
      db.select().from(businesses),
      db.select({
        id: interactions.id,
        customerId: interactions.customerId,
        content: interactions.content,
        followUpDate: interactions.followUpDate,
      }).from(interactions).where(
        and(
          eq(interactions.type, "follow_up"),
          eq(interactions.isCompleted, false),
        )
      ).limit(20),
      db.select({
        id: interactions.id,
        customerId: interactions.customerId,
        type: interactions.type,
        content: interactions.content,
        amount: interactions.amount,
        createdAt: interactions.createdAt,
      }).from(interactions).orderBy(desc(interactions.createdAt)).limit(20),
    ]);

    const statusCounts = customerRows.reduce((acc: Record<string, number>, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});

    const customerSummary = customerRows
      .map((c) => `- [${c.id.slice(0, 8)}] ${c.name} | status: ${c.status}${c.estimatedValue ? ` | nilai: Rp${c.estimatedValue}` : ""}${c.phone ? ` | telp: ${c.phone}` : ""}`)
      .join("\n");

    const overdueSummary = overdueRows.length
      ? overdueRows.map((o) => `- customerId ${o.customerId.slice(0, 8)}: "${o.content}" (due: ${o.followUpDate})`).join("\n")
      : "Tidak ada.";

    const recentSummary = recentInteractions
      .map((i) => `- customerId ${i.customerId.slice(0, 8)} [${i.type}]: "${i.content}"${i.amount ? ` Rp${i.amount}` : ""}`)
      .join("\n");

    const bizList = bizRows.map((b) => `${b.name} (id: ${b.id})`).join(", ");

    const systemPrompt = `Kamu adalah asisten bisnis AI untuk Darcia Business Hub — CRM yang mengelola customer dari 4 bisnis: Temantiket, SYMP Studio, Darcia, dan AIGYPT.
Jawab dalam Bahasa Indonesia secara ringkas, praktis, dan membantu.

=== RINGKASAN PIPELINE ===
${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c} customer`).join(", ")}
Total: ${customerRows.length} customer

=== DAFTAR CUSTOMER (format: [id_singkat] nama | status | nilai) ===
${customerSummary || "Belum ada customer."}

=== FOLLOW-UP OVERDUE ===
${overdueSummary}

=== INTERAKSI TERBARU ===
${recentSummary || "Belum ada."}

=== BISNIS TERSEDIA ===
${bizList}

Kamu BISA membuat customer baru atau mencatat interaksi menggunakan tool yang tersedia.
Gunakan ID customer (8 karakter pertama sudah cukup, sistem akan mencocokkan) saat memanggil tool.`;

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "create_customer",
          description: "Buat customer baru di CRM",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Nama lengkap customer" },
              status: { type: "string", enum: ["new", "warm", "hot", "negotiation"], description: "Status awal customer" },
              phone: { type: "string", description: "Nomor telepon (opsional)" },
              email: { type: "string", description: "Email (opsional)" },
              source: { type: "string", description: "Sumber lead, e.g. Instagram, WhatsApp, Referral (opsional)" },
              interest: { type: "string", description: "Apa yang diminati customer (akan disimpan sebagai catatan)" },
              businessName: { type: "string", description: "Nama bisnis (Temantiket / SYMP Studio / Darcia / AIGYPT)" },
              followUpDate: { type: "string", description: "Tanggal follow-up format YYYY-MM-DD (opsional)" },
            },
            required: ["name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "add_interaction",
          description: "Tambahkan catatan, interaksi, atau follow-up ke customer yang sudah ada",
          parameters: {
            type: "object",
            properties: {
              customerId: { type: "string", description: "ID customer (minimal 8 karakter pertama)" },
              type: { type: "string", enum: ["note", "follow_up", "quick_capture"], description: "Tipe interaksi" },
              content: { type: "string", description: "Isi catatan atau interaksi" },
              followUpDate: { type: "string", description: "Tanggal follow-up format YYYY-MM-DD (hanya jika type=follow_up)" },
            },
            required: ["customerId", "type", "content"],
          },
        },
      },
    ];

    const openai = getOpenAI();
    const model = getAIModel();

    const firstResponse = await openai.chat.completions.create({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      tools,
      tool_choice: "auto",
      max_tokens: 800,
    });

    const firstMsg = firstResponse.choices[0].message;
    const toolCalls = firstMsg.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      return res.json({ reply: firstMsg.content?.trim() ?? "" });
    }

    // Execute tool calls
    const toolResults: any[] = [];
    const actions: any[] = [];

    for (const call of toolCalls) {
      const args = JSON.parse(call.function.arguments);
      let result = "";

      if (call.function.name === "create_customer") {
        try {
          const matchedBiz = args.businessName
            ? bizRows.find((b) => b.name.toLowerCase().includes(args.businessName.toLowerCase()))
            : null;

          const [newCustomer] = await db.insert(customers).values({
            name: args.name,
            status: args.status || "new",
            phone: args.phone || null,
            email: args.email || null,
            source: args.source || null,
          }).returning();

          if (matchedBiz) {
            await db.insert(customerBusinesses).values({ customerId: newCustomer.id, businessId: matchedBiz.id });
          }

          if (args.interest) {
            await db.insert(interactions).values({ customerId: newCustomer.id, type: "quick_capture", content: args.interest });
          }

          if (args.followUpDate) {
            await db.insert(interactions).values({ customerId: newCustomer.id, type: "follow_up", content: `Follow-up ${args.name}`, followUpDate: args.followUpDate });
          }

          result = `Customer "${args.name}" berhasil dibuat dengan ID ${newCustomer.id}`;
          actions.push({ type: "create_customer", customerId: newCustomer.id, name: args.name, status: args.status || "new" });
        } catch (e: any) {
          result = `Gagal membuat customer: ${e.message}`;
        }
      } else if (call.function.name === "add_interaction") {
        try {
          const partialId = args.customerId.slice(0, 8);
          const matchedCustomer = customerRows.find((c) => c.id.startsWith(partialId));
          if (!matchedCustomer) {
            result = `Customer dengan ID "${partialId}" tidak ditemukan`;
          } else {
            await db.insert(interactions).values({
              customerId: matchedCustomer.id,
              type: args.type,
              content: args.content,
              followUpDate: args.followUpDate || null,
            });
            result = `Interaksi berhasil ditambahkan ke customer "${matchedCustomer.name}"`;
            actions.push({ type: "add_interaction", customerId: matchedCustomer.id, customerName: matchedCustomer.name, interactionType: args.type, content: args.content });
          }
        } catch (e: any) {
          result = `Gagal menambahkan interaksi: ${e.message}`;
        }
      }

      toolResults.push({ tool_call_id: call.id, role: "tool" as const, content: result });
    }

    // Second call with tool results
    const secondResponse = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
        firstMsg,
        ...toolResults,
      ],
      max_tokens: 600,
    });

    return res.json({
      reply: secondResponse.choices[0].message.content?.trim() ?? "",
      actions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI error" });
  }
});

export default router;

