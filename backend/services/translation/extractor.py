"""
PDF Structured Text Extractor using PyMuPDF.

Extracts text blocks and tables per page with layout structure and metadata:
- bounding box (bbox)
- font size & bold detection
- heading classification
- horizontal alignment (left, center, right)
- table detection and cell extraction
"""
import fitz  # PyMuPDF


def is_inside_any_table(bbox: list, table_bboxes: list) -> bool:
    """Check if a block's center coordinate is inside any table's bounding box."""
    cx = (bbox[0] + bbox[2]) / 2
    cy = (bbox[1] + bbox[3]) / 2
    for tx0, ty0, tx1, ty1 in table_bboxes:
        if tx0 - 3 <= cx <= tx1 + 3 and ty0 - 3 <= cy <= ty1 + 3:
            return True
    return False


def get_alignment(block_width: float, x0: float, page_width: float, is_heading: bool = False) -> str:
    """Determine horizontal alignment based on margins and block width."""
    block_mid = (x0 + x0 + block_width) / 2
    page_mid = page_width / 2
    margin_left = x0
    margin_right = page_width - (x0 + block_width)
    
    # Centered headings
    if is_heading and abs(margin_left - margin_right) < (page_width * 0.1) and block_width < (page_width * 0.8):
        return "center"
    # Right-aligned narrow blocks with left margin
    if x0 > page_mid * 1.05 and block_width < (page_width * 0.5):
        return "right"
    # Centered blocks with balanced margins
    if abs(margin_left - margin_right) < (page_width * 0.05) and block_width < (page_width * 0.6):
        return "center"
    # Default to left
    return "left"


def extract_structured(pdf_bytes: bytes) -> dict:
    """
    Extract structured content (paragraphs and tables) from a PDF.

    Returns:
        {
            "total_pages": int,
            "full_text": str,
            "pages": [
                {
                    "page_num": int,
                    "width": float,
                    "height": float,
                    "blocks": [
                        {
                            "type": "paragraph",
                            "text": str,
                            "bbox": [x0, y0, x1, y1],
                            "is_heading": bool,
                            "font_size": float,
                            "is_bold": bool,
                            "align": "left" | "center" | "right"
                        } or {
                            "type": "table",
                            "cells": [[str, ...], ...],
                            "bbox": [x0, y0, x1, y1]
                        }
                    ]
                }
            ]
        }
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages_data = []
    full_text_parts: list[str] = []
    ocr_engine = None

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_width = page.rect.width
        page_height = page.rect.height

        # Detect tables first
        tables = page.find_tables()
        table_bboxes = [list(t.bbox) for t in tables]
        
        extracted_tables = []
        for t in tables:
            grid = t.extract()
            # Flatten grid text to add to full_text for detection
            for row in grid:
                for cell in row:
                    if cell:
                        full_text_parts.append(cell)
            extracted_tables.append({
                "type": "table",
                "bbox": list(t.bbox),
                "cells": grid
            })

        # Check if the page has extractable text. If not, trigger OCR.
        raw_text = page.get_text("text").strip()
        needs_ocr = len(raw_text) < 30
        paragraphs: list[dict] = []

        if needs_ocr:
            # Lazy load RapidOCR
            if ocr_engine is None:
                from rapidocr_onnxruntime import RapidOCR
                ocr_engine = RapidOCR()
            
            # Render page to high-resolution image bytes (2x zoom)
            zoom = 2.0
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes("png")
            
            # Run OCR
            ocr_result, _ = ocr_engine(img_bytes)
            
            if ocr_result:
                for box, text, conf in ocr_result:
                    t_str = text.strip()
                    if not t_str:
                        continue
                    
                    # box: [ [x0, y0], [x1, y1], [x2, y2], [x3, y3] ]
                    xs = [pt[0] for pt in box]
                    ys = [pt[1] for pt in box]
                    x0 = min(xs) / zoom
                    y0 = min(ys) / zoom
                    x1 = max(xs) / zoom
                    y1 = max(ys) / zoom
                    
                    # Skip if it falls inside a detected table
                    if is_inside_any_table([x0, y0, x1, y1], table_bboxes):
                        continue

                    # Heuristic for font size based on bbox height
                    font_size = round((y1 - y0) * 0.75, 2)
                    is_bold = font_size > 14
                    is_heading = font_size >= 14
                    
                    # Alignment heuristic
                    block_width = x1 - x0
                    dot_count = t_str.count('.')
                    has_lots_of_dots = dot_count > 4
                    
                    if has_lots_of_dots:
                        align = "left"
                    else:
                        align = get_alignment(block_width, x0, page_width, is_heading)

                    paragraphs.append({
                        "type": "paragraph",
                        "text": t_str,
                        "bbox": [x0, y0, x1, y1],
                        "is_heading": is_heading,
                        "font_size": font_size,
                        "is_bold": is_bold,
                        "align": align
                    })
                    full_text_parts.append(t_str)
        else:
            # Normal PDF Text Extraction
            raw = page.get_text("dict")
            all_sizes: list[float] = []
            for block in raw["blocks"]:
                if "lines" not in block:
                    continue
                for line in block["lines"]:
                    for span in line["spans"]:
                        if span["text"].strip():
                            all_sizes.append(span["size"])

            avg_size = sum(all_sizes) / len(all_sizes) if all_sizes else 11.0
            heading_threshold = avg_size * 1.15

            for block in raw["blocks"]:
                if "lines" not in block:
                    continue  # skip image blocks

                bbox = list(block["bbox"])
                if is_inside_any_table(bbox, table_bboxes):
                    continue

                lines_text: list[str] = []
                max_font_size = 0.0
                block_is_bold = False

                for line in block["lines"]:
                    line_parts: list[str] = []
                    for span in line["spans"]:
                        t = span["text"]
                        if not t:
                            continue
                        line_parts.append(t)
                        if span["size"] > max_font_size:
                            max_font_size = span["size"]
                        if span["flags"] & 16:
                            block_is_bold = True
                    if line_parts:
                        lines_text.append(" ".join(line_parts))

                block_text = "\n".join(lines_text).strip()
                if not block_text:
                    continue

                is_heading = (max_font_size >= heading_threshold) or block_is_bold

                # Strict alignment heuristic to prevent form dotted lines from misaligning
                x0, y0, x1, y1 = bbox
                block_width = x1 - x0
                
                dot_count = block_text.count('.')
                has_lots_of_dots = dot_count > 4
                
                if has_lots_of_dots:
                    align = "left"
                else:
                    align = get_alignment(block_width, x0, page_width, is_heading)

                paragraphs.append({
                    "type": "paragraph",
                    "text": block_text,
                    "bbox": bbox,
                    "is_heading": is_heading,
                    "font_size": round(max_font_size, 2),
                    "is_bold": block_is_bold,
                    "align": align
                })
                full_text_parts.append(block_text)

        # Merge paragraph blocks and tables, sort by top coordinate (y0)
        all_blocks = paragraphs + extracted_tables
        all_blocks.sort(key=lambda b: b["bbox"][1])

        pages_data.append({
            "page_num": page_idx + 1,
            "width": page_width,
            "height": page_height,
            "blocks": all_blocks,
        })

    doc.close()

    return {
        "total_pages": len(pages_data),
        "full_text": "\n".join(full_text_parts),
        "pages": pages_data,
    }
