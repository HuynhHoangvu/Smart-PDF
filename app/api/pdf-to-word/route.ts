import { NextRequest, NextResponse } from "next/server";
import { convertPdfToDocx } from "@/lib/pdfToDocx";
import { requireFile, assertMagicBytes, assertFileSize, sanitizeFilenameForHeader, handleApiError, ApiError, SIZE_LIMITS } from "@/lib/apiValidation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = requireFile(formData, "file");

    assertFileSize(file, SIZE_LIMITS.pdf, "chuyển PDF sang Word");
    const fileBuffer = await assertMagicBytes(file, "pdf");

    const bytes = new Uint8Array(fileBuffer);
    let docxBuffer;
    try {
      docxBuffer = await convertPdfToDocx(bytes);
    } catch {
      throw new ApiError(`Không thể chuyển đổi file "${file.name}" — tệp có thể bị hỏng.`, 400);
    }
    const baseName = (file.name || "converted").replace(/\.[^/.]+$/, "");

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`${baseName}.docx`, "converted.docx")}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
