import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { requireFile, assertMagicBytes, assertFileSize, assertEnum, sanitizeFilenameForHeader, handleApiError, ApiError, SIZE_LIMITS } from "@/lib/apiValidation";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = requireFile(formData, "file");
    const level = assertEnum(formData.get("level") as string | null, ["medium", "extreme", "ultra"] as const, "medium", "level");
    const requestedFormat = assertEnum(formData.get("format") as string | null, ["auto", "jpg", "png", "webp"] as const, "auto", "format");

    assertFileSize(file, SIZE_LIMITS.image, "nén ảnh");
    const inputBytes = await assertMagicBytes(file, "image");

    let img;
    let metadata;
    try {
      // failOn: "none" recovers from minor corruption/truncation (common with
      // images downloaded from chat apps). .rotate() auto-orients using the
      // EXIF Orientation tag (then strips it) so output isn't sideways.
      img = sharp(inputBytes, { failOn: "none" }).rotate();
      metadata = await img.metadata();
    } catch {
      throw new ApiError(`Tệp "${file.name}" không phải ảnh hợp lệ hoặc đã bị hỏng.`, 400);
    }

    let quality = 75;
    let scale = 1;
    if (level === "extreme") {
      quality = 55;
      scale = 0.85;
    } else if (level === "ultra") {
      quality = 35;
      scale = 0.65;
    }

    if (scale < 1 && metadata.width) {
      img = img.resize({ width: Math.max(1, Math.round(metadata.width * scale)) });
    }

    const format = metadata.format;
    let outFormat: "jpeg" | "png" | "webp";
    if (requestedFormat !== "auto") {
      outFormat = requestedFormat === "jpg" ? "jpeg" : requestedFormat;
    } else if (format === "png") {
      outFormat = "png";
    } else if (format === "webp") {
      outFormat = "webp";
    } else {
      // JPEG/GIF/BMP/TIFF/HEIC don't support useful lossy re-encoding via a
      // simple quality knob the way JPEG/WebP/PNG do — normalize everything
      // else to JPEG, which is what actually shrinks the file.
      outFormat = "jpeg";
    }

    if (outFormat === "jpeg") {
      img = img.flatten({ background: "#ffffff" }).jpeg({ quality, mozjpeg: true });
    } else if (outFormat === "webp") {
      img = img.webp({ quality });
    } else {
      // sharp's png quantizer (palette mode) is what actually reduces size;
      // plain compressionLevel only changes zlib effort, not color depth.
      img = img.png({ quality, compressionLevel: 9, palette: true });
    }

    let outBuffer;
    try {
      outBuffer = await img.toBuffer();
    } catch {
      throw new ApiError(`Không thể xử lý ảnh "${file.name}", tệp có thể bị hỏng.`, 400);
    }

    // Fall back to the original bytes if "compression" somehow grew the file
    // (can happen with already-optimized small images) — only when the
    // container format didn't change, otherwise the original bytes wouldn't
    // match the declared output format/extension.
    if (format === outFormat && outBuffer.length >= inputBytes.length) {
      outBuffer = inputBytes;
    }

    const ext = outFormat === "jpeg" ? "jpg" : outFormat;
    const mime = outFormat === "jpeg" ? "image/jpeg" : outFormat === "webp" ? "image/webp" : "image/png";
    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return new NextResponse(new Uint8Array(outBuffer), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`${baseName}_compressed.${ext}`, `compressed.${ext}`)}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
