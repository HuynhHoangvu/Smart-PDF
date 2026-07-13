# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SmartPDF is a Vietnamese PDF tools web app, built as a single Next.js 16 (App Router) + TypeScript project deployable on Vercel — no separate backend, no database. The primary feature is translating Vietnamese legal documents (birth certificates, marriage certificates, school transcripts, etc.) to English using Gemini.

This was migrated from an earlier FastAPI (Python) + React/Vite architecture. The old `backend/`/`frontend/` split is gone; API routes and UI now live in one app.

## Running the Project

```
npm install
npm run dev       # dev server at http://localhost:3000 (or next available port)
npm run build     # production build
npm run lint      # ESLint
```

Frontend and API routes are same-origin — no proxy/env base URL needed (`fetch("/api/...")`).

## Environment Variables

- `GEMINI_API_KEY` — required for translate (`/api/translate-pdf/*`) and the OCR fallback in `/api/pdf-to-word`. No hardcoded fallback key; must be set in `.env.local` / Vercel project settings.

## Architecture

### Routes (`app/`)
- `app/page.tsx` — Home (tool grid)
- `app/tool/[toolId]/page.tsx` — dispatcher that renders the matching Workspace component (mirrors the old `ToolPage.jsx`). `MergeWorkspace`, `SplitWorkspace`, `TranslateWorkspace` are loaded via `next/dynamic({ ssr: false })` because they import `react-pdf`, which touches browser-only globals (`DOMMatrix`) at module-eval time.

### API routes (`app/api/*/route.ts`)
All are Node runtime (`export const runtime = "nodejs"` where native/Node-only deps are used).
- `POST /api/merge`, `/api/merge-pages`, `/api/split`, `/api/images-to-pdf` — pure `pdf-lib`, no native deps
- `POST /api/compress`, `/api/pdf-to-images` — rasterize pages via `pdfjs-dist/legacy` + `@napi-rs/canvas` (see `lib/pdfRaster.ts`); pdfjs's worker must be pointed at a `file://` URL on Windows/Node (`pathToFileURL`), and `GlobalWorkerOptions.workerSrc` must be set unconditionally — pdfjs applies its own default before any `if (!workerSrc)` guard would see it unset
- `POST /api/convert-image` — `sharp`
- `POST /api/translate-pdf/html` — splits the PDF into single pages (`pdf-lib`), sends each page's raw bytes to Gemini multimodal (`lib/gemini.ts`) with a vision prompt that returns translated HTML directly (no separate layout-extraction step — simplified vs. the old Python `html_extractor.py` heuristics). Runs with a small concurrency pool (4 at a time).
- `POST /api/translate-pdf/download-pdf`, `POST /api/word-to-pdf` — render HTML → PDF via `lib/htmlToPdf.ts` (puppeteer-core + `@sparticuz/chromium` on Vercel/Lambda, full `puppeteer` locally — branches on `process.env.VERCEL`/`AWS_LAMBDA_FUNCTION_NAME`)
- `POST /api/translate-pdf/download-edited-docx` — parses translated HTML with `cheerio` and builds a `.docx` via the `docx` package (`lib/htmlToDocx.ts`)
- `POST /api/pdf-to-word` — `pdfjs-dist` text-content extraction grouped into lines/paragraphs (`lib/pdfToDocx.ts`); scanned pages (little/no extractable text) fall back to Gemini Vision OCR (`lib/ocr.ts`) instead of Tesseract. No table/image extraction (simplified vs. the old Python block parser).

### Components (`components/`)
Ports of the original Workspace components (`MergeWorkspace`, `SplitWorkspace`, `CompressWorkspace`, `TranslateWorkspace`, `PdfToWordWorkspace`, `PdfToImageWorkspace`, `WordToPdfWorkspace`, `ImageConvertWorkspace`, `MergeResult`, `PdfRenderer`, `Sidebar`). `TranslateWorkspace` keeps the original two-panel bilingual editor (contentEditable HTML panel + original PDF viewer via `react-pdf`).

### Known simplifications vs. the old Python backend
- No structured/block translation pipeline or glossary system — HTML-via-Gemini only.
- `pdf-to-word` has no table detection or embedded-image extraction (paragraphs only).
- Stub tools (`read`, `protect`, `sign`, `edit`) and the unused `docx-preview` dependency were dropped — they were non-functional in the old frontend too.

### PDF/document libraries
- `pdf-lib` — structural PDF ops (merge/split/rotate/embed images)
- `pdfjs-dist` (legacy build) + `@napi-rs/canvas` — server-side PDF rasterization
- `sharp` — image format conversion
- `docx` — DOCX building; `mammoth` — DOCX → HTML (for word-to-pdf)
- `puppeteer-core` / `puppeteer` + `@sparticuz/chromium` — HTML → PDF rendering
- `@google/genai` — Gemini calls (translation + OCR)
- `react-pdf` — client-side PDF thumbnails/preview
