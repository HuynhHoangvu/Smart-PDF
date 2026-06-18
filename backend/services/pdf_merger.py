from pypdf import PdfWriter, PdfReader
import io

def merge_pdfs(files: list[bytes]) -> bytes:
    merger = PdfWriter()
    for f_bytes in files:
        reader = PdfReader(io.BytesIO(f_bytes))
        for page in reader.pages:
            merger.add_page(page)
    
    out_io = io.BytesIO()
    merger.write(out_io)
    return out_io.getvalue()
