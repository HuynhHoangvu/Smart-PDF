import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, degrees } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const rotationsRaw = formData.get("rotations") as string | null;
    const outputName = (formData.get("output_name") as string | null) || "merged";
    const rotations: number[] = rotationsRaw ? JSON.parse(rotationsRaw) : [];

    if (!files.length) {
      return NextResponse.json({ detail: "Không có file nào được gửi lên" }, { status: 400 });
    }

    const result = await PDFDocument.create();

    for (let i = 0; i < files.length; i++) {
      const bytes = await files[i].arrayBuffer();
      let src;
      try {
        src = await PDFDocument.load(bytes);
      } catch {
        return NextResponse.json(
          { detail: `File '${files[i].name}' không phải PDF hợp lệ hoặc đã bị hỏng.` },
          { status: 400 }
        );
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
        "Content-Disposition": `attachment; filename="${outputName}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ detail: `Gộp PDF thất bại: ${(err as Error).message}` }, { status: 400 });
  }
}
