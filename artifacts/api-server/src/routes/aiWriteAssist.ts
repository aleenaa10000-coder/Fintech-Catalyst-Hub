import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { isAdminEmail } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const SYSTEM_PROMPT = `You are an expert fintech content editor. 
Your job is to improve blog post content for a fintech SEO agency. 
Always return ONLY the improved text — no preamble, no explanation, no quotes around the result.
Preserve the intent, facts, and specific fintech terminology in the original. Keep the same language.`;

const ACTION_PROMPTS: Record<string, string> = {
  rewrite:
    "Rewrite the following text to make it clearer, more engaging, and better suited for a professional fintech audience:",
  expand:
    "Expand the following text with additional detail, examples, and explanation while keeping it focused and relevant to fintech:",
  summarize:
    "Summarize the following text into a concise version that captures all key points, suitable for a fintech blog:",
  fixGrammar:
    "Fix any grammar, spelling, punctuation, and style issues in the following text without changing its meaning or structure:",
  makeShorter:
    "Make the following text shorter and more concise while preserving all key information and fintech terminology:",
};

const RequestBody = z.object({
  text: z.string().min(1).max(8000),
  action: z.enum(["rewrite", "expand", "summarize", "fixGrammar", "makeShorter"]),
});

router.post("/api/ai/write-assist", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!isAdminEmail(req.user.email)) {
    res.status(403).json({ error: "Forbidden — admin access required" });
    return;
  }

  let body: z.infer<typeof RequestBody>;
  try {
    body = RequestBody.parse(req.body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request", issues: err.issues });
      return;
    }
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { text, action } = body;
  const actionPrompt = ACTION_PROMPTS[action];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${actionPrompt}\n\n${text}` },
      ],
      max_completion_tokens: 4096,
    });

    const result = completion.choices[0]?.message?.content ?? "";
    res.json({ result });
  } catch (err) {
    logger.error({ err }, "AI write-assist failed");
    res.status(500).json({ error: "AI request failed. Please try again." });
  }
});

export default router;
