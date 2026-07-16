import * as cheerio from "cheerio";
import type { Element, AnyNode } from "domhandler";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle } from "docx";

function parseInlineStyle(style: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!style) return out;
  for (const decl of style.split(";")) {
    const [k, v] = decl.split(":");
    if (k && v) out[k.trim().toLowerCase()] = v.trim().toLowerCase();
  }
  return out;
}

const MAX_WALK_DEPTH = 50;

function textRunsFromNode($: ReturnType<typeof cheerio.load>, el: Element, baseBold = false): TextRun[] {
  const runs: TextRun[] = [];
  const node = $(el);

  const walk = (n: AnyNode, bold: boolean, italic: boolean, depth: number) => {
    if (depth > MAX_WALK_DEPTH) return;
    if (n.type === "text") {
      const text = $(n).text();
      if (text) runs.push(new TextRun({ text, bold, italics: italic }));
      return;
    }
    if (n.type === "tag") {
      const el = n as Element;
      const tag = el.tagName?.toLowerCase();
      const style = parseInlineStyle($(el).attr("style"));
      const isBold = bold || tag === "b" || tag === "strong" || style["font-weight"] === "bold" || Number(style["font-weight"]) >= 600;
      const isItalic = italic || tag === "i" || tag === "em" || style["font-style"] === "italic";
      if (tag === "br") {
        runs.push(new TextRun({ text: "", break: 1 }));
        return;
      }
      el.children?.forEach((c) => walk(c as AnyNode, isBold, isItalic, depth + 1));
    }
  };

  node.contents().each((_, c) => walk(c as AnyNode, baseBold, false, 0));
  if (runs.length === 0) {
    const text = node.text();
    if (text.trim()) runs.push(new TextRun({ text, bold: baseBold }));
  }
  return runs;
}

function alignmentFromStyle(style: Record<string, string>): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  const align = style["text-align"];
  if (align === "center") return AlignmentType.CENTER;
  if (align === "right") return AlignmentType.RIGHT;
  if (align === "justify") return AlignmentType.JUSTIFIED;
  return undefined;
}

function buildTable($: ReturnType<typeof cheerio.load>, tableEl: Element): Table {
  const style = parseInlineStyle($(tableEl).attr("style"));
  const rows: TableRow[] = [];
  $(tableEl)
    .find("tr")
    .each((_, tr) => {
      const cells: TableCell[] = [];
      $(tr)
        .find("td, th")
        .each((_, td) => {
          const cellStyle = parseInlineStyle($(td).attr("style"));
          const borderless = cellStyle["border"] === "none" || style["border"] === "none";
          const runs = textRunsFromNode($, td);
          const alignment = alignmentFromStyle(cellStyle);
          cells.push(
            new TableCell({
              children: [new Paragraph({ children: runs.length ? runs : [new TextRun("")], alignment })],
              borders: borderless
                ? {
                    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                  }
                : undefined,
            })
          );
        });
      if (cells.length) rows.push(new TableRow({ children: cells }));
    });

  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

/** Converts a translated HTML fragment (one page) into docx paragraphs/tables. */
function htmlToDocxElements(html: string): (Paragraph | Table)[] {
  const $ = cheerio.load(`<div id="root">${html}</div>`);
  const root = $("#root")[0];
  const elements: (Paragraph | Table)[] = [];

  $(root)
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      if (tag === "table") {
        elements.push(buildTable($, el));
        return;
      }
      const style = parseInlineStyle($(el).attr("style"));
      const bold = style["font-weight"] === "bold" || Number(style["font-weight"]) >= 600;
      const runs = textRunsFromNode($, el, bold);
      if (runs.length === 0) return;
      elements.push(
        new Paragraph({
          children: runs,
          alignment: alignmentFromStyle(style),
        })
      );
    });

  if (elements.length === 0) {
    const text = $(root).text().trim();
    if (text) elements.push(new Paragraph({ children: [new TextRun(text)] }));
  }

  return elements;
}

type TranslationPage = { translated_html?: string };
type TranslationResult = { pages?: TranslationPage[] };

export async function buildDocxFromTranslation(result: TranslationResult): Promise<Buffer> {
  const pages = result.pages || [];
  const children: (Paragraph | Table)[] = [];

  pages.forEach((page, idx) => {
    const html = page.translated_html || "";
    if (!html.trim()) return;
    children.push(...htmlToDocxElements(html));
    if (idx < pages.length - 1) {
      children.push(new Paragraph({ children: [], pageBreakBefore: true }));
    }
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children.length ? children : [new Paragraph("")],
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 20 },
        },
      },
    },
  });

  return Packer.toBuffer(doc);
}
