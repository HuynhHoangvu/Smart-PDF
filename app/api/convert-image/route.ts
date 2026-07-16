import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireFile, assertMagicBytes, assertFileSize, assertEnum, sanitizeFilenameForHeader, handleApiError, ApiError, SIZE_LIMITS } from "@/lib/apiValidation";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = requireFile(formData, "file");
    const toFormat = assertEnum(formData.get("to_format") as string | null, ["png", "jpg", "webp"] as const, "png", "to_format");

    assertFileSize(file, SIZE_LIMITS.image, "chuyển đổi ảnh");
    const inputBytes = await assertMagicBytes(file, "image");

    let img;
    try {
      // failOn: "none" lets libvips recover from minor corruption/truncation
      // instead of hard-failing (common with images downloaded from chat apps).
      // .rotate() auto-orients using the EXIF Orientation tag (then strips it) —
      // without it, phone/scanner photos come out sideways/mirrored in the output.
      img = sharp(inputBytes, { failOn: "none" }).rotate();
    } catch {
      throw new ApiError(`Tệp "${file.name}" không phải ảnh hợp lệ hoặc đã bị hỏng.`, 400);
    }
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

    let outBuffer;
    try {
      outBuffer = await img.toBuffer();
    } catch {
      throw new ApiError(`Không thể xử lý ảnh "${file.name}", tệp có thể bị hỏng.`, 400);
    }
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return new NextResponse(outBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`${baseName}.${toFormat}`, `converted.${toFormat}`)}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
