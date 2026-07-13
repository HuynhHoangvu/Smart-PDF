import { GoogleGenAI } from "@google/genai";

const OCR_PROMPT = `Extract all text from this scanned document image exactly as written, preserving the original language (do NOT translate). Keep paragraph breaks. Return plain text only, no markdown, no commentary.`;

export async function ocrImageToText(pngBuffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { data: pngBuffer.toString("base64"), mimeType: "image/png" } }, { text: OCR_PROMPT }],
      },
    ],
    config: { temperature: 0.05, maxOutputTokens: 8192 },
  });
  return (response.text || "").trim();
}
