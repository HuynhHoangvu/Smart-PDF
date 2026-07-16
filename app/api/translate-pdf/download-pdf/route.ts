import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderHtmlToPdf } from "@/lib/htmlToPdf";
import { sanitizeTranslatedHtml } from "@/lib/sanitizeHtml";
import { handleApiError, ApiError, sanitizeFilenameForHeader } from "@/lib/apiValidation";

export const runtime = "nodejs";
export const maxDuration = 300;

const TranslationResultSchema = z.object({
  pages: z.array(z.object({ translated_html: z.string().optional() })).min(1),
  original_filename: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    let body: { result?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ApiError("Dữ liệu JSON gửi lên không hợp lệ.", 400);
    }
    const parsed = TranslationResultSchema.safeParse(body.result);
    if (!parsed.success) {
      throw new ApiError("Dữ liệu kết quả dịch không hợp lệ.", 400);
    }
    const result = parsed.data;

    const pageDivs = result.pages
      .map((p) => `<div class="doc-page">${sanitizeTranslatedHtml(p.translated_html || "")}</div>`)
      .join("");

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  @page {
    size: A4;
    margin: 18mm 20mm 18mm 22mm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #000;
    margin: 0;
    padding: 0;
  }
  .doc-page {
    page-break-after: always;
  }
  .doc-page:last-child {
    page-break-after: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9pt;
    margin-bottom: 6px;
  }
  td, th {
    vertical-align: top;
    word-wrap: break-word;
    padding: 3px 5px;
  }
  p {
    margin-top: 0;
    margin-bottom: 6px;
  }
</style>
</head>
<body>${pageDivs}</body>
</html>`;

    const pdfBuffer = await renderHtmlToPdf(fullHtml);
    const baseName = (result.original_filename || "translation").replace(/\.pdf$/i, "");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`${baseName}_translated.pdf`, "translated.pdf")}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
