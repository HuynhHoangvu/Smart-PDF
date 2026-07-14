// react-pdf bundles its own pdfjs-dist version, which can differ from the
// top-level pdfjs-dist used server-side. The client worker file we serve
// from /public must match react-pdf's bundled version exactly, or the
// browser fails with "Warning: indexing all PDF objects" / load errors.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "node_modules", "react-pdf", "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = path.join(__dirname, "..", "public", "pdf.worker.min.mjs");

if (!fs.existsSync(src)) {
  console.warn(`[copy-pdf-worker] source not found, skipping: ${src}`);
  process.exit(0);
}

fs.copyFileSync(src, dest);
console.log(`[copy-pdf-worker] copied worker from react-pdf's pdfjs-dist to public/pdf.worker.min.mjs`);
