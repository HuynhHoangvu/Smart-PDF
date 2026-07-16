import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { renderHtmlToPdf } from "@/lib/htmlToPdf";
import { requireFile, assertMagicBytes, assertFileSize, sanitizeFilenameForHeader, handleApiError, ApiError, SIZE_LIMITS } from "@/lib/apiValidation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = requireFile(formData, "file");

    assertFileSize(file, SIZE_LIMITS.docx, "chuyển Word sang PDF");
    const fileBuffer = await assertMagicBytes(file, "docx");

    let bodyHtml: string;
    try {
      ({ value: bodyHtml } = await mammoth.convertToHtml({ buffer: fileBuffer }));
    } catch {
      throw new ApiError(`File "${file.name}" không phải Word (.docx) hợp lệ hoặc đã bị hỏng.`, 400);
    }

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
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`${baseName}.pdf`, "converted.pdf")}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
