import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, degrees } from "pdf-lib";
import { requireFiles, parseJsonBody, sanitizeFilenameForHeader, handleApiError, ApiError } from "@/lib/apiValidation";

type ManifestEntry = { file_index: number; page: number; rotation?: number };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = requireFiles(formData, "files");
    const manifestRaw = formData.get("manifest") as string | null;
    const outputName = (formData.get("output_name") as string | null) || "merged";

    if (!manifestRaw) {
      throw new ApiError("Thiếu manifest.", 400);
    }

    const manifest = parseJsonBody<ManifestEntry[]>(manifestRaw);
    const docs = await Promise.all(
      files.map(async (f) => {
        try {
          return await PDFDocument.load(await f.arrayBuffer());
        } catch {
          throw new ApiError(`File "${f.name}" không phải PDF hợp lệ hoặc đã bị hỏng.`, 400);
        }
      })
    );

    const result = await PDFDocument.create();

    for (const entry of manifest) {
      const doc = docs[entry.file_index];
      const pageIdx = entry.page - 1;
      if (!doc || pageIdx < 0 || pageIdx >= doc.getPageCount()) continue;
      const [copied] = await result.copyPages(doc, [pageIdx]);
      const extraRot = ((entry.rotation || 0) % 360 + 360) % 360;
      if (extraRot) copied.setRotation(degrees((copied.getRotation().angle + extraRot) % 360));
      result.addPage(copied);
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
