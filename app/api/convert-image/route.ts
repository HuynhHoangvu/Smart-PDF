import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const toFormat = ((formData.get("to_format") as string | null) || "png") as "png" | "jpg" | "webp";
    if (!file) return NextResponse.json({ detail: "Không có file" }, { status: 400 });

    const inputBytes = Buffer.from(await file.arrayBuffer());
    // failOn: "none" lets libvips recover from minor corruption/truncation
    // instead of hard-failing (common with images downloaded from chat apps).
    let img = sharp(inputBytes, { failOn: "none" });
    let mime = "image/png";
    if (toFormat === "jpg") {
      img = img.flatten({ background: "#ffffff" }).jpeg({ quality: 92 });
      mime = "image/jpeg";
    } else if (toFormat === "webp") {
      img = img.webp({ quality: 92 });
      mime = "image/webp";
    } else {
      img = img.png();
      mime = "image/png";
    }

    const outBuffer = await img.toBuffer();
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return new NextResponse(outBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${baseName}.${toFormat}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: `Chuyển đổi ảnh thất bại: file có thể bị hỏng hoặc không đúng định dạng ảnh (${(err as Error).message})` }, { status: 400 });
  }
}
