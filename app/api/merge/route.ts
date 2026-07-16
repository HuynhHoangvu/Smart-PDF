import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, degrees } from "pdf-lib";
import { requireFiles, parseJsonBody, sanitizeFilenameForHeader, handleApiError, ApiError } from "@/lib/apiValidation";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = requireFiles(formData, "files");
    const rotationsRaw = formData.get("rotations") as string | null;
    const outputName = (formData.get("output_name") as string | null) || "merged";
    const rotations: number[] = rotationsRaw ? parseJsonBody<number[]>(rotationsRaw) : [];

    const result = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const bytes = await files[i].arrayBuffer();
      let src;
      try {
        src = await PDFDocument.load(bytes);
      } catch {
        throw new ApiError(`File '${files[i].name}' không phải PDF hợp lệ hoặc đã bị hỏng.`, 400);
      }
      const copiedPages = await result.copyPages(src, src.getPageIndices());
      const rot = ((rotations[i] || 0) % 360 + 360) % 360;
      copiedPages.forEach((page) => {
        if (rot) page.setRotation(degrees((page.getRotation().angle + rot) % 360));
        result.addPage(page);
      });
    }

    const outBytes = await result.save();
    return new NextResponse(Buffer.from(outBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(`${outputName}.pdf`, "merged.pdf")}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
