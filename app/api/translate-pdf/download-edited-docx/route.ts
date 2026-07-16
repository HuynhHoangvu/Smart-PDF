import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildDocxFromTranslation } from "@/lib/htmlToDocx";
import { sanitizeTranslatedHtml } from "@/lib/sanitizeHtml";
import { handleApiError, ApiError, sanitizeFilenameForHeader } from "@/lib/apiValidation";

export const runtime = "nodejs";
export const maxDuration = 300;

const TranslationResultSchema = z.object({
  pages: z.array(z.object({ translated_html: z.string().optional() })).min(1),
  original_filename: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    let body: { result?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ApiError("Dữ liệu JSON gửi lên không hợp lệ.", 400);
    }
    const parsed = TranslationResultSchema.safeParse(body.result);
    if (!parsed.success) {
      throw new ApiError("Dữ liệu kết quả dịch không hợp lệ.", 400);
    }
    const result = parsed.data;
    const sanitizedResult = {
      ...result,
      pages: result.pages.map((p) => ({ translated_html: sanitizeTranslatedHtml(p.translated_html || "") })),
    };

    const docxBuffer = await buildDocxFromTranslation(sanitizedResult);

    let outFilename = "translated_edited.docx";
    if (result.original_filename) {
      const baseName = result.original_filename.replace(/\.[^/.]+$/, "");
      outFilename = `${baseName}_translated.docx`;
    }

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; ${sanitizeFilenameForHeader(outFilename, "translated_edited.docx")}`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
