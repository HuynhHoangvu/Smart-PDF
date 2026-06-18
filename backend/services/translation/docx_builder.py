import io
from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

def build_docx_from_translation(translation_result: dict) -> bytes:
    """
    Generate a beautifully formatted DOCX from structured translation blocks.
    Enforces consular standards: Times New Roman, 13pt body text, 14pt bold headings,
    preserves tables and alignment formatting.
    """
    doc = Document()
    
    # Page setup: Margins of 1 inch
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
    # Configure default style (Normal) to Times New Roman, 13pt, and 1.25 line spacing
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(13)
    
    p_format = style.paragraph_format
    p_format.line_spacing = 1.25
    p_format.space_after = Pt(4)
    p_format.space_before = Pt(0)
    
    # Process page by page
    for p_idx, page in enumerate(translation_result.get("pages", [])):
        if p_idx > 0:
            doc.add_page_break()
            
        for block in page.get("blocks", []):
            block_type = block.get("type", "paragraph")
            
            if block_type == "table":
                cells = block.get("translated_cells", [])
                if not cells:
                    continue
                rows_count = len(cells)
                cols_count = len(cells[0]) if rows_count > 0 else 0
                if cols_count == 0:
                    continue
                
                table = doc.add_table(rows=rows_count, cols=cols_count)
                if not block.get("borderless", False):
                    table.style = 'Table Grid'
                
                for r_idx, row_data in enumerate(cells):
                    for c_idx, cell_value in enumerate(row_data):
                        val = cell_value or ""
                        cell = table.cell(r_idx, c_idx)
                        cell.text = str(val)
                        
                        # Set cell fonts
                        for paragraph in cell.paragraphs:
                            for run in paragraph.runs:
                                run.font.name = 'Times New Roman'
                                run.font.size = Pt(13)
            
            else: # paragraph
                text = block.get("translated", "")
                if not text.strip():
                    continue
                
                is_heading = block.get("is_heading", False)
                align_str = block.get("align", "left")
                is_bold = block.get("is_bold", False)
                
                p = doc.add_paragraph()
                
                # Apply alignments
                if align_str == "center":
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                elif align_str == "right":
                    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    # Preserve left indent from bbox x0 if present
                    bbox = block.get("bbox")
                    if bbox and len(bbox) >= 4:
                        x0 = bbox[0]
                        if x0 > 90:
                            indent_inches = (x0 - 72) / 72.0
                            p.paragraph_format.left_indent = Inches(min(3.5, max(0.0, indent_inches)))
                    
                # Split paragraph by original newlines to preserve spacing
                lines = text.split("\n")
                for l_idx, line in enumerate(lines):
                    if l_idx > 0:
                        p.add_run("\n")
                    run = p.add_run(line)
                    run.font.name = 'Times New Roman'
                    
                    if is_heading:
                        run.font.size = Pt(14)
                        run.bold = True
                    else:
                        run.font.size = Pt(13)
                        if is_bold:
                            run.bold = True
                            
    output = io.BytesIO()
    doc.save(output)
    output.seek(0)
    return output.read()
