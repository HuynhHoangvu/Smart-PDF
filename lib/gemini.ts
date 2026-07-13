import { GoogleGenAI } from "@google/genai";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash"];

export const VISION_PROMPT = `You are a Vietnamese-to-English legal document translator for consular purposes.

Read this Vietnamese PDF and output an HTML fragment that:
1. Translates ALL Vietnamese text to English — nothing left in Vietnamese
2. Reproduces the EXACT same visual layout and structure as the original document
3. Uses inline CSS for all styling

Layout rules:
- Keep the same number of columns, same table structure, same field arrangement as the original
- Borderless layout tables (headers, 2-col fields, signatures): use <table style="width:100%;border-collapse:collapse;table-layout:fixed"> with <td style="border:none;word-wrap:break-word">
- Data tables with visible lines (grade tables, tax detail tables): use <table style="width:100%;border-collapse:collapse;table-layout:fixed"> with <td style="border:1px solid #666;padding:2px 4px;word-wrap:break-word">
- Document title (e.g. BIRTH CERTIFICATE, STATE BUDGET PAYMENT SLIP): always as a standalone <p style="text-align:center;font-size:13pt;font-weight:bold;margin:8px 0"> — NOT inside a table cell
- "SOCIALIST REPUBLIC OF VIETNAM": font-size:10pt; font-weight:bold; text-align:center
- "Independence - Freedom - Happiness": font-size:9pt; font-style:italic; text-align:center
- Default text: font-size:9pt; line-height:1.5
- Labels bold, values normal

Translation rules:
- Personal names → UPPERCASE Latin no diacritics (NGUYEN VAN AN)
- "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" → "SOCIALIST REPUBLIC OF VIETNAM"
- "Độc lập - Tự do - Hạnh phúc" → "Independence - Freedom - Happiness"
- Dates: write as "August 12th, 2010" or "March 7th, 1968" (month name + ordinal day + year)
- Standard terms: Giấy khai sinh→Birth Certificate, Giấy đăng ký kết hôn→Marriage Certificate,
  Học bạ→School Report, Giấy nộp tiền vào ngân sách nhà nước→State Budget Payment Slip,
  Người nộp thuế→Taxpayer, Thuế GTGT→VAT, Tổng cộng→Total, Họ và tên→Full name,
  Ngày tháng năm sinh→Date of birth, Nơi sinh→Place of birth, Dân tộc→Ethnic group,
  Quốc tịch→Nationality, Chủ tịch→Chairman

Ignore circular stamps/seals — do not include their text.

Return ONLY the HTML fragment. No markdown, no explanation.`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callGemini(model: string, apiKey: string, pdfBase64: string, retries = 3): Promise<string> {
  const client = new GoogleGenAI({ apiKey });
  let lastErr: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { data: pdfBase64, mimeType: "application/pdf" } }, { text: VISION_PROMPT }],
          },
        ],
        config: { temperature: 0.05, maxOutputTokens: 16384 },
      });
      return (response.text || "").trim();
    } catch (err) {
      lastErr = err;
      const msg = String(err);
      if (msg.includes("400") || msg.includes("404") || msg.includes("INVALID_ARGUMENT")) throw err;
      if (attempt < retries - 1) await sleep(2 ** attempt * 1000);
    }
  }
  throw lastErr;
}

export async function translatePdfPageToHtml(pdfBase64: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");

  for (const model of GEMINI_MODELS) {
    try {
      const raw = await callGemini(model, apiKey, pdfBase64);
      const cleaned = raw.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
      if (cleaned && cleaned.length > 30) return cleaned;
    } catch (err) {
      console.warn(`PDF translate model ${model} failed:`, err);
    }
  }
  return "";
}
