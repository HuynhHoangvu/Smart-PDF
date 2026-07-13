import { NextRequest, NextResponse } from "next/server";
import { loadPdfDocument, renderPageToJpeg, renderPageToPng } from "@/lib/pdfRaster";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const dpi = Number(formData.get("dpi") || 150);
    const fmt = ((formData.get("fmt") as string | null) || "png") as "png" | "jpg";
    if (!file) return NextResponse.json({ detail: "Không có file" }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfDoc = await loadPdfDocument(bytes);
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
    return NextResponse.json({ detail: `Chuyển PDF sang ảnh thất bại: ${(err as Error).message}` }, { status: 500 });
  }
}
