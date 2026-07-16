import { NextRequest, NextResponse } from "next/server";
import { loadPdfDocument, renderPageToJpeg, renderPageToPng } from "@/lib/pdfRaster";
import { requireFile, assertMagicBytes, assertFileSize, assertEnum, assertBoundedNumber, handleApiError, ApiError, SIZE_LIMITS } from "@/lib/apiValidation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = requireFile(formData, "file");
    const dpi = assertBoundedNumber(formData.get("dpi") as string | null, { min: 36, max: 300, default: 150, integer: true }, "dpi");
    const fmt = assertEnum(formData.get("fmt") as string | null, ["png", "jpg"] as const, "png", "fmt");

    assertFileSize(file, SIZE_LIMITS.pdf, "chuyển PDF sang ảnh");
    const fileBuffer = await assertMagicBytes(file, "pdf");

    const bytes = new Uint8Array(fileBuffer);
    let pdfDoc;
    try {
      pdfDoc = await loadPdfDocument(bytes);
    } catch {
      throw new ApiError(`File "${file.name}" không phải PDF hợp lệ hoặc đã bị hỏng.`, 400);
    }
    const zoom = dpi / 72;

    const images = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const { buffer } = fmt === "png" ? await renderPageToPng(pdfDoc, i, zoom) : await renderPageToJpeg(pdfDoc, i, zoom, 0.9);
      images.push({
        page: i,
        data: buffer.toString("base64"),
        mime: fmt === "png" ? "image/png" : "image/jpeg",
        ext: fmt,
      });
    }

    return NextResponse.json({ total: images.length, images });
  } catch (err) {
    return handleApiError(err);
  }
}
