import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    if (!files.length) {
      return NextResponse.json({ detail: "Không có ảnh hợp lệ" }, { status: 400 });
    }

    const pdf = await PDFDocument.create();
    const failed: string[] = [];

    for (const f of files) {
      try {
        const inputBytes = Buffer.from(await f.arrayBuffer());
        // failOn: "none" lets libvips recover from minor corruption/truncation
        // (common with images downloaded from chat apps) instead of throwing.
        // .rotate() with no args auto-orients using the image's EXIF Orientation
        // tag (then strips it) — phone/scanner photos are often stored "sideways"
        // pixel-wise and only look upright because viewers honor that tag; without
        // this, sharp re-encodes the raw (unrotated) pixels and the PDF page comes
        // out rotated/mirrored compared to how the original file displays elsewhere.
        const jpegBytes = await sharp(inputBytes, { failOn: "none" })
          .rotate()
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 92 })
          .toBuffer();
        const image = await pdf.embedJpg(jpegBytes);
        // A PDF page's [width, height] is in points (72/inch). Using the raw
        // pixel count as the point size (the old behavior) makes the page
        // physically huge — a 1236x1776px photo became a ~17x25in page — so
        // the image only fills it at ~72 DPI and looks blurry/pixelated the
        // moment you zoom in. Sizing the page from the pixel count at a
        // normal print DPI keeps the full image resolution intact instead.
        const DPI = 150;
        const pageWidth = (image.width / DPI) * 72;
        const pageHeight = (image.height / DPI) * 72;
        const page = pdf.addPage([pageWidth, pageHeight]);
        page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      } catch (err) {
        console.error(`images-to-pdf: failed to process "${f.name}":`, err);
        failed.push(f.name);
      }
    }

    if (pdf.getPageCount() === 0) {
      return NextResponse.json(
        { detail: `Không xử lý được ảnh nào — file có thể bị hỏng hoặc không đúng định dạng: ${failed.join(", ")}` },
        { status: 400 }
      );
    }

    const outBytes = await pdf.save();
    const headers: Record<string, string> = {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="converted.pdf"`,
    };
    if (failed.length) {
      console.warn(`images-to-pdf: skipped ${failed.length} unreadable file(s): ${failed.join(", ")}`);
      headers["X-Skipped-Files"] = encodeURIComponent(failed.join(", "));
    }
    return new NextResponse(Buffer.from(outBytes), { status: 200, headers });
  } catch (err) {
    return NextResponse.json({ detail: `Chuyển ảnh sang PDF thất bại: ${(err as Error).message}` }, { status: 500 });
  }
}
