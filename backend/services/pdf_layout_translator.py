import fitz  # PyMuPDF
import io
from services.pdf_translator import translate_text

def translate_pdf_preserve_layout(pdf_bytes: bytes) -> bytes:
    # Open the PDF from bytes
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    for page in doc:
        # Get all text spans with formatting and coordinates
        text_dict = page.get_text("dict")
        
        for block in text_dict.get("blocks", []):
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span["text"].strip()
                    # Only translate spans that look like actual Vietnamese text
                    if not text or len(text) < 2:
                        continue
                    
                    # Translate
                    translated = translate_text(text)
                    
                    # Define the bounding box (bbox)
                    bbox = fitz.Rect(span["bbox"])
                    
                    # Hide the old text by painting a white rectangle over it
                    # We use the background color of the text block if possible, defaulting to white (1, 1, 1)
                    page.draw_rect(bbox, color=(1, 1, 1), fill=(1, 1, 1), width=0)
                    
                    # Calculate font size to fit the translated text in the original box
                    font_size = span["size"]
                    font_name = "helv"  # Default Helvetica standard font
                    
                    # Simple heuristic: adjust font size if English translation is longer than original
                    original_len = len(text)
                    translated_len = len(translated)
                    
                    if translated_len > original_len and original_len > 0:
                        font_size = font_size * (original_len / translated_len)
                        font_size = max(font_size, 6)  # Don't shrink below size 6
                    
                    # Draw new translated text
                    # Point needs to start at bottom-left of text baseline
                    point = fitz.Point(bbox.x0, bbox.y1 - 2)
                    
                    # Draw text
                    page.insert_text(
                        point, 
                        translated, 
                        fontsize=font_size, 
                        fontname=font_name, 
                        color=fitz.sRGB_to_pdf(span["color"]) if "color" in span else (0, 0, 0)
                    )
                    
    # Save document back to bytes
    out_io = io.BytesIO()
    doc.save(out_io)
    doc.close()
    return out_io.getvalue()
