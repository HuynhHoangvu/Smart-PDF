import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { loadPdfDocument, renderPageToPng } from "./pdfRaster";
import { ocrImageToText } from "./ocr";

type TextItem = { str: string; transform: number[]; width: number; height: number };

type LineBlock = { y: number; x0: number; x1: number; text: string; fontSize: number };

function groupItemsIntoLines(items: TextItem[]): LineBlock[] {
  const sorted = [...items].sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
  const lines: LineBlock[] = [];
  const Y_TOLERANCE = 2.5;

  for (const item of sorted) {
    const text = item.str;
    if (!text) continue;
    const y = item.transform[5];
    const x0 = item.transform[4];
    const x1 = x0 + (item.width || 0);
    const fontSize = Math.abs(item.transform[3]) || 10;

    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - y) < Y_TOLERANCE) {
      last.text += (last.text.endsWith(" ") ? "" : " ") + text;
      last.x1 = Math.max(last.x1, x1);
    } else {
      lines.push({ y, x0, x1, text, fontSize });
    }
  }
  return lines;
}

function detectAlign(x0: number, x1: number, pageWidth: number): (typeof AlignmentType)[keyof typeof AlignmentType] {
  const mid = pageWidth / 2;
  const blockW = x1 - x0;
  const sym = Math.abs(x0 - (pageWidth - x1));
  if (x0 > mid * 1.1 && blockW < pageWidth * 0.45) return AlignmentType.RIGHT;
  if (sym < pageWidth * 0.06 && blockW < pageWidth * 0.75) return AlignmentType.LEFT;
  return AlignmentType.LEFT;
}

function mergeLinesIntoParagraphs(lines: LineBlock[], pageWidth: number) {
  const paragraphs: { text: string; fontSize: number; align: ReturnType<typeof detectAlign>; bold: boolean }[] = [];
  let current: LineBlock | null = null;

  for (const line of lines) {
    if (!current) {
      current = { ...line };
      continue;
    }
    const gap = current.y - line.y; // pdf y decreases downward in our sort
    const lineHeight = Math.max(current.fontSize, 6);
    const sizeOk = Math.abs(current.fontSize - line.fontSize) < 2.5;
    const gapOk = gap > 0 && gap < lineHeight * 1.8;
    const endsSentence = /[.!?]\s*$/.test(current.text);

    if (gapOk && sizeOk && !endsSentence) {
      current.text += (current.text.endsWith(" ") ? "" : " ") + line.text;
      current.x1 = Math.max(current.x1, line.x1);
      current.y = line.y;
    } else {
      paragraphs.push({
        text: current.text,
        fontSize: current.fontSize,
        align: detectAlign(current.x0, current.x1, pageWidth),
        bold: current.fontSize > 14,
      });
      current = { ...line };
    }
  }
  if (current) {
    paragraphs.push({
      text: current.text,
      fontSize: current.fontSize,
      align: detectAlign(current.x0, current.x1, pageWidth),
      bold: current.fontSize > 14,
    });
  }
  return paragraphs;
}

export async function convertPdfToDocx(bytes: Uint8Array): Promise<Buffer> {
  const pdfDoc = await loadPdfDocument(bytes);
  const children: Paragraph[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const items = textContent.items as unknown as TextItem[];
    const rawText = items.map((it) => it.str).join("").trim();

    let paragraphs: { text: string; fontSize: number; align: ReturnType<typeof detectAlign>; bold: boolean }[];

    if (rawText.length < 30) {
      // Likely a scanned page — OCR via Gemini Vision (preserves original language).
      const { buffer } = await renderPageToPng(pdfDoc, i, 2.0);
      let ocrText = "";
      try {
        ocrText = await ocrImageToText(buffer);
      } catch (err) {
        console.error(`OCR failed for page ${i}:`, err);
      }
      paragraphs = ocrText
        .split(/\n{2,}/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ text, fontSize: 12, align: AlignmentType.LEFT, bold: false }));
    } else {
      const lines = groupItemsIntoLines(items);
      paragraphs = mergeLinesIntoParagraphs(lines, viewport.width);
    }

    for (const p of paragraphs) {
      if (!p.text.trim()) continue;
      children.push(
        new Paragraph({
          alignment: p.align,
          children: [new TextRun({ text: p.text, bold: p.bold, size: Math.round(p.fontSize * 2) })],
        })
      );
    }
    if (i < pdfDoc.numPages) {
      children.push(new Paragraph({ children: [], pageBreakBefore: true }));
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children: children.length ? children : [new Paragraph("")] }],
    styles: { default: { document: { run: { font: "Times New Roman", size: 26 } } } },
  });

  return Packer.toBuffer(doc);
}
