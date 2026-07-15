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
        const jpegBytes = await sharp(inputBytes, { failOn: "none" })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 92 })
          .toBuffer();
        const image = await pdf.embedJpg(jpegBytes);
        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
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
