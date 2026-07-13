import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ranges = formData.get("ranges") as string | null;
    if (!file || !ranges) {
      return NextResponse.json({ detail: "Thiếu file hoặc ranges" }, { status: 400 });
    }

    const src = await PDFDocument.load(await file.arrayBuffer());
    const total = src.getPageCount();

    const segments: [number, number][] = [];
    for (const part of ranges.split(",")) {
      const p = part.trim();
      if (!p) continue;
      let start: number, end: number;
      if (p.includes("-")) {
        const [a, b] = p.split("-", 2);
        start = parseInt(a.trim(), 10) - 1;
        end = parseInt(b.trim(), 10) - 1;
      } else {
        start = end = parseInt(p, 10) - 1;
      }
      start = Math.max(0, Math.min(start, total - 1));
      end = Math.max(0, Math.min(end, total - 1));
      segments.push([start, end]);
    }

    if (!segments.length) {
      return NextResponse.json({ detail: "Không có range hợp lệ" }, { status: 400 });
    }

    const base = (file.name || "document").replace(/\.[^/.]+$/, "");
    const zip = new JSZip();

    for (const [s, e] of segments) {
      const newDoc = await PDFDocument.create();
      const indices = Array.from({ length: e - s + 1 }, (_, i) => s + i);
      const copied = await newDoc.copyPages(src, indices);
      copied.forEach((p) => newDoc.addPage(p));
      const bytes = await newDoc.save();
      const label = s === e ? `trang_${s + 1}` : `trang_${s + 1}-${e + 1}`;
      zip.file(`${base}_${label}.pdf`, bytes);
    }

    const zipBytes = await zip.generateAsync({ type: "uint8array" });
    return new NextResponse(Buffer.from(zipBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${base}_split.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: `Cắt PDF thất bại: ${(err as Error).message}` }, { status: 500 });
  }
}
