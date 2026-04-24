import OpenAI from "openai";
import { readServerEnv } from "@/lib/env";
import { normalizedCardSchema, type NormalizedCard } from "@/lib/validators/card";

function extractEmail(rawText: string) {
  return rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extractPhone(rawText: string) {
  return (
    rawText.match(/(?:tel\.?|cel\.?|phone|telefone)?\s*[:.]?\s*(?:\+?\d{1,3}[\s().-]*)?(?:\(?\d{2,3}\)?[\s.-]*)?\d{4,5}[\s.-]?\d{4}/i)?.[0] ??
    ""
  ).trim();
}

function removeCommonNoise(line: string) {
  const normalized = line.trim();
  return !/^(tel\.?|cel\.?|phone|telefone|cep|www\.|http|email|e-mail)$/i.test(normalized);
}

function buildFallbackCard(rawText: string, reason: string): NormalizedCard {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(removeCommonNoise);
  const email = extractEmail(rawText);
  const phone = extractPhone(rawText);
  const name = lines.find((line) => /^[\p{L}\s.'-]{3,}$/u.test(line) && !line.includes("@")) ?? "";
  const jobTitle =
    lines.find((line) =>
      /(vereador|diretor|presidente|coordenador|secret[aá]rio|assessor|manager|director)/i.test(line),
    ) ?? "";
  const city = /s[aã]o paulo/i.test(rawText) ? "São Paulo" : "";
  const address =
    lines.find((line) => /(rua|avenida|av\.|viaduto|praça|andar|sala|cep)/i.test(line)) ?? "";

  return normalizedCardSchema.parse({
    name,
    company: lines.find((line) => /(câmara|camara|municipal|prefeitura|secretaria|instituto)/i.test(line)) ?? "",
    jobTitle,
    email,
    phone,
    website: lines.find((line) => /(www\.|https?:\/\/)/i.test(line)) ?? "",
    address,
    city,
    country: "Brazil",
    notes: `AI 구조화 실패로 OCR 원문에서 기본 필드만 자동 추출했습니다. 원인: ${reason}`,
    languageHint: "pt-BR",
  });
}

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const jsonStart = withoutFence.indexOf("{");
  const jsonEnd = withoutFence.lastIndexOf("}");

  if (jsonStart >= 0 && jsonEnd > jsonStart) {
    return JSON.parse(withoutFence.slice(jsonStart, jsonEnd + 1));
  }

  return JSON.parse(withoutFence);
}

export async function normalizeBusinessCard(rawText: string) {
  const env = readServerEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You extract business card data for a Korean cultural organization operating in Brazil.",
            "Return valid JSON only.",
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

    const parsed = parseJsonContent(content);
    return normalizedCardSchema.parse(parsed);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    return buildFallbackCard(rawText, reason);
  }
}
