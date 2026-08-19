import { Router, type IRouter } from "express";
import OpenAI from "openai";
import {
  FormatContractBody,
  FormatContractResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

router.post(
  "/openai/format-contract",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = FormatContractBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const client = getOpenAiClient();
    const completion = await client.chat.completions.create({
      model: "gpt-5.4-mini",
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `أنت محرر عقود محترف باللغة العربية. رتّب النص الخام إلى مسودة عقد واضحة ومهنية، مع الحفاظ على المعنى وعدم اختراع معلومات غير موجودة. أعد JSON صالحاً بالمفاتيح التالية فقط:
title: عنوان مختصر للعقد
clientName: اسم العميل أو الشركة، أو نص فارغ إذا لم يذكر
clientEmail: البريد الإلكتروني، أو نص فارغ إذا لم يذكر
scope: نطاق العمل في فقرات واضحة
paymentTerms: شروط الدفع كما وردت، أو نص فارغ
expirationDate: تاريخ الانتهاء بصيغة YYYY-MM-DD إن ذكر، أو نص فارغ
formattedText: النص الكامل المرتب بالعربية مع عنوان وأقسام مرقمة وبنود واضحة. لا تستخدم Markdown tables.`,
        },
        {
          role: "user",
          content: parsed.data.rawText,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: "لم يتم الحصول على نتيجة من الذكاء الاصطناعي" });
      return;
    }

    try {
      const result = FormatContractResponse.parse(JSON.parse(content));
      req.log.info("Formatted contract text with AI");
      res.json(result);
    } catch (error) {
      req.log.error({ error }, "AI returned an invalid contract draft");
      res.status(502).json({ error: "تعذر ترتيب نص العقد، حاول مرة أخرى" });
    }
  },
);

export default router;