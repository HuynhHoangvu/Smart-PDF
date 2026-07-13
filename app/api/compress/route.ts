import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { loadPdfDocument, renderPageToJpeg } from "@/lib/pdfRaster";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const level = ((formData.get("level") as string | null) || "medium") as "medium" | "extreme" | "ultra";
    if (!file) return NextResponse.json({ detail: "Không có file" }, { status: 400 });

    let zoom = 1.4;
    let quality = 0.7;
    if (level === "ultra") {
      zoom = 0.5;
      quality = 0.2;
    } else if (level === "extreme") {
      zoom = 0.9;
      quality = 0.35;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await loadPdfDocument(bytes);
    const numPages = pdfDoc.numPages;

    const outPdf = await PDFDocument.create();

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const [pw, ph] = [page.view[2] - page.view[0], page.view[3] - page.view[1]];
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
        "Content-Disposition": `attachment; filename="compressed_${file.name}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: `Nén PDF thất bại: ${(err as Error).message}` }, { status: 500 });
  }
}
