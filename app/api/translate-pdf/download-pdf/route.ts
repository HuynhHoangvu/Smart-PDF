import { NextRequest, NextResponse } from "next/server";
import { renderHtmlToPdf } from "@/lib/htmlToPdf";

export const runtime = "nodejs";
export const maxDuration = 300;

type TranslationPage = { translated_html?: string };
type TranslationResult = { pages?: TranslationPage[]; original_filename?: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { result: TranslationResult };
    const result = body.result;
    const pages = result.pages || [];

    const pageDivs = pages.map((p) => `<div class="doc-page">${p.translated_html || ""}</div>`).join("");

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
        "Content-Disposition": `attachment; filename="${baseName}_translated.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: `Không thể tạo file PDF: ${(err as Error).message}` }, { status: 500 });
  }
}
