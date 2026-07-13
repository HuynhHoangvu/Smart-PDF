import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { renderHtmlToPdf } from "@/lib/htmlToPdf";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ detail: "Không có file" }, { status: 400 });

    const bytes = Buffer.from(await file.arrayBuffer());
    const { value: bodyHtml } = await mammoth.convertToHtml({ buffer: bytes });

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #666; padding: 4px 6px; }
  img { max-width: 100%; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;

    const pdfBuffer = await renderHtmlToPdf(fullHtml);
    const baseName = (file.name || "converted").replace(/\.(docx?|doc)$/i, "");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: (err as Error).message }, { status: 500 });
  }
}
