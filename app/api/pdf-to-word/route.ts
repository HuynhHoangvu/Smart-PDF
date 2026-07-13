import { NextRequest, NextResponse } from "next/server";
import { convertPdfToDocx } from "@/lib/pdfToDocx";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ detail: "Không có file" }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const docxBuffer = await convertPdfToDocx(bytes);
    const baseName = (file.name || "converted").replace(/\.[^/.]+$/, "");

    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${baseName}.docx"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: (err as Error).message }, { status: 500 });
  }
}
