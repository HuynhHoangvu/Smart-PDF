export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif|avif)$/i.test(file.name);
}

/**
 * Converts an image File into a single-page A4 PDF File entirely in the
 * browser — the image is scaled to fit and centered on a standard A4 page
 * (portrait or landscape depending on the image's own orientation) rather
 * than a page cropped tight to the image's exact aspect ratio. Lets image
 * files be dropped straight into the Merge tool, which otherwise only knows
 * how to read real PDF bytes.
 */
export async function imageFileToPdfFile(file: File): Promise<File> {
  const { PDFDocument } = await import("pdf-lib");

  // imageOrientation: "from-image" auto-applies the EXIF orientation tag so
  // photos from phones/scanners don't come out sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error(`Không thể xử lý ảnh "${file.name}".`);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const jpegBlob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Không thể xử lý ảnh "${file.name}".`))), "image/jpeg", 0.92)
  );
  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

  const pdf = await PDFDocument.create();
  const image = await pdf.embedJpg(jpegBytes);
  const DPI = 150;
  const naturalWidth = (image.width / DPI) * 72;
  const naturalHeight = (image.height / DPI) * 72;

  // Standard A4 page (portrait or landscape, matching the image's own
  // orientation) with the image scaled to fit and centered — matches how a
  // normal PDF page looks, instead of a page cropped tight to the image's
  // own aspect ratio.
  const A4_PORTRAIT_W = 595.28;
  const A4_PORTRAIT_H = 841.89;
  const [pageWidth, pageHeight] =
    naturalWidth > naturalHeight ? [A4_PORTRAIT_H, A4_PORTRAIT_W] : [A4_PORTRAIT_W, A4_PORTRAIT_H];
  const scale = Math.min(pageWidth / naturalWidth, pageHeight / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  const x = (pageWidth - drawWidth) / 2;
  const y = (pageHeight - drawHeight) / 2;

  const page = pdf.addPage([pageWidth, pageHeight]);
  page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });

  const bytes = await pdf.save();
  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return new File([bytes.buffer as ArrayBuffer], `${baseName}.pdf`, { type: "application/pdf" });
}
