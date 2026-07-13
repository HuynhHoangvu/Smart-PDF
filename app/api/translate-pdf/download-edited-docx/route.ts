import { NextRequest, NextResponse } from "next/server";
import { buildDocxFromTranslation } from "@/lib/htmlToDocx";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { result: { pages?: { translated_html?: string }[]; original_filename?: string } };
    const result = body.result;

    const docxBuffer = await buildDocxFromTranslation(result);

    let outFilename = "translated_edited.docx";
    if (result.original_filename) {
      const baseName = result.original_filename.replace(/\.[^/.]+$/, "");
      outFilename = `${baseName}_translated.docx`;
    }

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${outFilename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: (err as Error).message }, { status: 500 });
  }
}
