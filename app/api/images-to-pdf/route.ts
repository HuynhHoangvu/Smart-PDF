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

    for (const f of files) {
      const inputBytes = Buffer.from(await f.arrayBuffer());
      // Normalize everything to JPEG so any input format (webp, gif, tiff, etc.) is supported.
      const jpegBytes = await sharp(inputBytes).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toBuffer();
      const image = await pdf.embedJpg(jpegBytes);
      const page = pdf.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const outBytes = await pdf.save();
    return new NextResponse(Buffer.from(outBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="converted.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: `Chuyển ảnh sang PDF thất bại: ${(err as Error).message}` }, { status: 500 });
  }
}
