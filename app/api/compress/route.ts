import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { loadPdfDocument, renderPageToJpeg } from "@/lib/pdfRaster";
import { requireFile, assertMagicBytes, assertFileSize, assertEnum, sanitizeFilenameForHeader, handleApiError, ApiError, SIZE_LIMITS } from "@/lib/apiValidation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = requireFile(formData, "file");
    const level = assertEnum(formData.get("level") as string | null, ["medium", "extreme", "ultra"] as const, "medium", "level");

    assertFileSize(file, SIZE_LIMITS.pdf, "nén PDF");
    const fileBuffer = await assertMagicBytes(file, "pdf");

    let zoom = 1.4;
    let quality = 0.7;
    if (level === "ultra") {
      zoom = 0.5;
      quality = 0.2;
    } else if (level === "extreme") {
      zoom = 0.9;
      quality = 0.35;
    }

    const bytes = new Uint8Array(fileBuffer);
    let pdfDoc;
    try {
      pdfDoc = await loadPdfDocument(bytes);
    } catch {
      throw new ApiError(`File "${file.name}" không phải PDF hợp lệ hoặc đã bị hỏng.`, 400);
    }
    const numPages = pdfDoc.numPages;

    const outPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      // Use the rotation-aware viewport (not the raw mediabox) so the output
      // page matches the rendered image's orientation — page.view ignores
      // the page's /Rotate, but getViewport swaps width/height for 90°/270°.
      const baseViewport = page.getViewport({ scale: 1 });
      const [pw, ph] = [baseViewport.width, baseViewport.height];
      const { buffer } = await renderPageToJpeg(pdfDoc, i, zoom, quality);
      const jpgImage = await outPdf.embedJpg(buffer);
      const newPage = outPdf.addPage([pw, ph]);
      newPage.drawImage(jpgImage, { x: 0, y: 0, width: pw, height: ph });
    }

    const outBytes = await outPdf.save();
    return new NextResponse(Buffer.from(outBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`compressed_${file.name}`, "compressed.pdf")}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
