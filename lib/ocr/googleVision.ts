import { readServerEnv } from "@/lib/env";

export async function runGoogleVisionOCR(imageBuffer: Buffer) {
  const env = readServerEnv();
  const imageBase64 = imageBuffer.toString("base64");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "TEXT_DETECTION" }],
            imageContext: {
              languageHints: ["pt-BR", "pt", "en"],
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision request failed: ${errorText}`);
  }

  const payload = (await response.json()) as {
    responses?: Array<{
      fullTextAnnotation?: { text?: string };
      textAnnotations?: Array<{ description?: string }>;
    }>;
  };

  const firstResponse = payload.responses?.[0];

  return (
    firstResponse?.fullTextAnnotation?.text ||
    firstResponse?.textAnnotations?.[0]?.description ||
    ""
  );
}
