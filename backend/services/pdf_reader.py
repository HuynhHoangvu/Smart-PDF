from pypdf import PdfReader
import io

def read_pdf_metadata(file_bytes: bytes) -> dict:
    reader = PdfReader(io.BytesIO(file_bytes))
    meta = reader.metadata
    
    # Safely decode metadata keys and values
    clean_meta = {}
    if meta:
        for key, val in meta.items():
            clean_key = key.replace('/', '')
            clean_meta[clean_key] = str(val)
            
    return {
        "pages": len(reader.pages),
        "metadata": clean_meta,
        "first_page_text": reader.pages[0].extract_text()[:1000] if len(reader.pages) > 0 else ""
    }
