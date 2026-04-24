import OpenAI from "openai";
import { readServerEnv } from "@/lib/env";
import { normalizedCardSchema } from "@/lib/validators/card";

export async function normalizeBusinessCard(rawText: string) {
  const env = readServerEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: [
          "You extract business card data for a Korean cultural organization operating in Brazil.",
          "Return only JSON.",
          "Preserve Brazilian Portuguese accents accurately.",
          "Prefer correcting obvious OCR mistakes such as Sao -> São, Joao -> João, Acao -> Ação.",
          "Keep emails and phone numbers exactly as found when possible.",
          "Use empty strings for unknown fields.",
          "JSON keys must be: name, company, jobTitle, email, phone, website, address, city, country, notes, languageHint.",
        ].join(" "),
      },
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI did not return any normalized content.");
  }

  const parsed = JSON.parse(content);
  return normalizedCardSchema.parse(parsed);
}
