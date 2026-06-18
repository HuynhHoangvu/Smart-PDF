"""Translation service package."""
from .extractor import extract_structured
from .document_detector import detect_document_type, get_doc_type_label
from .engine import translate_document
from .docx_builder import build_docx_from_translation
from .template_translator import translate_with_templates

__all__ = [
    "extract_structured",
    "detect_document_type",
    "get_doc_type_label",
    "translate_document",
    "build_docx_from_translation",
    "translate_with_templates",
]
