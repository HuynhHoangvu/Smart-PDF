import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "p", "div", "span", "table", "thead", "tbody", "tr", "td", "th",
  "b", "strong", "i", "em", "br", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
];

/**
 * Cleans HTML translated by Gemini before it's rendered by Puppeteer
 * (page.setContent) or walked by cheerio for DOCX export. Strips scripts,
 * event handlers, and any src/href — Gemini output has occasionally come
 * back malformed/unexpected, and an unsanitized page.setContent() would
 * execute whatever it contains inside the headless Chromium process.
 */
export function sanitizeTranslatedHtml(html: string): string {
  return sanitizeHtml(html || "", {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": ["style"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^left$|^right$|^center$|^justify$/],
        "font-weight": [/^\d+$/, /^bold$|^normal$/],
        "font-style": [/^italic$|^normal$/],
        width: [/^\d+(%|px)?$/],
      },
    },
    disallowedTagsMode: "discard",
    allowVulnerableTags: false,
  });
}
