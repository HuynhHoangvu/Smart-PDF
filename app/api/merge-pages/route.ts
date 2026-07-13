import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, degrees } from "pdf-lib";

type ManifestEntry = { file_index: number; page: number; rotation?: number };

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const manifestRaw = formData.get("manifest") as string | null;
    const outputName = (formData.get("output_name") as string | null) || "merged";

    if (!files.length || !manifestRaw) {
      return NextResponse.json({ detail: "Thiếu file hoặc manifest" }, { status: 400 });
    }

    const manifest: ManifestEntry[] = JSON.parse(manifestRaw);
    const docs = await Promise.all(files.map(async (f) => PDFDocument.load(await f.arrayBuffer())));

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
        "Content-Disposition": `attachment; filename="${outputName}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: `Ghép trang thất bại: ${(err as Error).message}` }, { status: 500 });
  }
}
