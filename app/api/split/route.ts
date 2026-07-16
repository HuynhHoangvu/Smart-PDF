import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { requireFile, assertMagicBytes, assertFileSize, sanitizeFilenameForHeader, handleApiError, ApiError, SIZE_LIMITS } from "@/lib/apiValidation";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = requireFile(formData, "file");
    const ranges = formData.get("ranges") as string | null;
    if (!ranges) {
      throw new ApiError("Thiếu thông tin phạm vi trang (ranges).", 400);
    }

    assertFileSize(file, SIZE_LIMITS.pdf, "cắt PDF");
    const fileBuffer = await assertMagicBytes(file, "pdf");

    let src;
    try {
      src = await PDFDocument.load(fileBuffer);
    } catch {
      throw new ApiError(`File "${file.name}" không phải PDF hợp lệ hoặc đã bị hỏng.`, 400);
    }
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
      if (!Number.isFinite(start) || !Number.isFinite(end)) {
        throw new ApiError(`Phạm vi trang không hợp lệ: "${p}".`, 400);
      }
      start = Math.max(0, Math.min(start, total - 1));
      end = Math.max(0, Math.min(end, total - 1));
      if (end < start) [start, end] = [end, start];
      segments.push([start, end]);
    }

    if (!segments.length) {
      throw new ApiError("Không có phạm vi trang hợp lệ.", 400);
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
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`${base}_split.zip`, "split.zip")}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
