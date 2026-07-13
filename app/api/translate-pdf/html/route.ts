import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { translatePdfPageToHtml } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

type TranslatedPage = {
  page_num: number;
  translated_html: string;
  group_id: number;
  is_group_lead: boolean;
  group_pages: number[];
};

async function extractPageAsBase64(src: PDFDocument, pageIndex: number): Promise<string> {
  const out = await PDFDocument.create();
  const [copied] = await out.copyPages(src, [pageIndex]);
  out.addPage(copied);
  const bytes = await out.save();
  return Buffer.from(bytes).toString("base64");
}

// Runs `fn` over `items` with at most `limit` in flight at once.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ detail: "Không có file" }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const src = await PDFDocument.load(bytes);
    const numPages = src.getPageCount();
    const pageIndices = Array.from({ length: numPages }, (_, i) => i);

    const translatedPages = await mapWithConcurrency(pageIndices, 4, async (pageIndex): Promise<TranslatedPage> => {
      const pageNum = pageIndex + 1;
      const b64 = await extractPageAsBase64(src, pageIndex);
      let html = "";
      try {
        html = await translatePdfPageToHtml(b64);
      } catch (err) {
        console.error(`Translate page ${pageNum} failed:`, err);
      }
      if (!html) html = "<p style='color:#e53e3e;text-align:center;'>Translation failed for this page.</p>";
      return {
        page_num: pageNum,
        translated_html: html,
        group_id: pageNum,
        is_group_lead: true,
        group_pages: [pageNum],
      };
    });

    return NextResponse.json({
      original_filename: file.name || "document.pdf",
      total_pages: translatedPages.length,
      mode: "html",
      pages: translatedPages,
    });
  } catch (err) {
    return NextResponse.json({ detail: `translate_html_failed: ${(err as Error).message}` }, { status: 500 });
  }
}
