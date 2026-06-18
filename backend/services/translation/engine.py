"""
Translation Engine — Main Orchestrator.

Pipeline:
  1. Detect document type from extracted text
  2. Load matching specialized glossary
  3. For each block: apply glossary → translate → restore glossary terms
  4. Return bilingual JSON

Translation backends (in priority order):
  1. DeepL API  — if DEEPL_API_KEY env var is set (best for legal docs)
  2. Google Translate via deep-translator  — free fallback
"""
import os
import logging
from typing import Optional

from .glossaries import get_glossary_for_type, BaseGlossary
from .document_detector import detect_document_type, get_doc_type_label, DocumentType

logger = logging.getLogger(__name__)

# ── Translation backends ──────────────────────────────────────────────────────

def _translate_deepl(text: str, api_key: str) -> str:
    import deepl
    translator = deepl.Translator(api_key)
    result = translator.translate_text(text, source_lang="VI", target_lang="EN-US")
    return str(result)


def _translate_google(text: str) -> str:
    from deep_translator import GoogleTranslator
    MAX_CHUNK = 4500  # Google free limit per request

    if not text.strip():
        return text

    if len(text) <= MAX_CHUNK:
        try:
            translated = GoogleTranslator(source="vi", target="en").translate(text)
            return translated or text
        except Exception as e:
            logger.warning(f"Google Translate error: {e}")
            return text

    # Split into chunks at sentence boundaries where possible
    chunks: list[str] = []
    current = ""
    for sentence in text.replace("\n", " \n ").split("\n"):
        if len(current) + len(sentence) > MAX_CHUNK:
            if current:
                chunks.append(current.strip())
            current = sentence
        else:
            current += "\n" + sentence
    if current.strip():
        chunks.append(current.strip())

    translated_parts = []
    for chunk in chunks:
        try:
            t = GoogleTranslator(source="vi", target="en").translate(chunk)
            translated_parts.append(t or chunk)
        except Exception as e:
            logger.warning(f"Google Translate chunk error: {e}")
            translated_parts.append(chunk)

    return "\n".join(translated_parts)


def _translate(text: str, api_key: Optional[str]) -> str:
    """Try DeepL first; fall back to Google if no key or on error."""
    if not text.strip():
        return text
    if api_key:
        try:
            return _translate_deepl(text, api_key)
        except Exception as e:
            logger.warning(f"DeepL failed ({e}), falling back to Google Translate")
    return _translate_google(text)


import json
import urllib.request
import urllib.error

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDrLO5Y4untHFecD6iCPoJv5GOzhiEVVZM")

def _translate_gemini(text: str, api_key: str, glossary_info: str = "") -> str:
    """
    Translate Vietnamese text to English using Gemini 2.0 Flash REST API.
    Provides formal, accurate translations guided by specialized glossaries.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    
    prompt = (
        "You are an expert consular and legal translator specializing in Vietnamese-to-English translations.\n"
        "Translate the following Vietnamese text into high-fidelity, professional English.\n"
        "Ensure names, dates, addresses, and official terms are kept formal and accurate.\n"
    )
    if glossary_info:
        prompt += f"\nUse these standard English translation mappings when appropriate:\n{glossary_info}\n"
        
    prompt += f"\nVietnamese text to translate:\n\"\"\"\n{text}\n\"\"\"\n"
    prompt += "\nOutput ONLY the translated English text. Do not include any chat formatting, quotes, or explanations."

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1
        }
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            translated_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Remove bounding double quotes if the model wrapped the translation
            if len(translated_text) > 1 and translated_text.startswith('"') and translated_text.endswith('"'):
                translated_text = translated_text[1:-1].strip()
            return translated_text
    except Exception as e:
        logger.warning(f"Gemini translate block failed: {e}")
        return ""


# ── Block-level translation ───────────────────────────────────────────────────

def translate_block(text: str, glossary: BaseGlossary, api_key: Optional[str]) -> str:
    """
    Translate a single text block:
      1. Tries Gemini 1.5 Flash with live glossary context if key is available
      2. Falls back to DeepL or Google Translate with placeholder protection
    """
    if not text.strip():
        return text

    if GEMINI_API_KEY:
        try:
            # Build text glossary info for Gemini prompt
            glossary_info = "\n".join([f'- "{vi}" -> "{en}"' for vi, en in glossary.terms.items()])
            translated = _translate_gemini(text, GEMINI_API_KEY, glossary_info)
            if translated and translated.strip():
                return translated
        except Exception as e:
            logger.warning(f"Primary Gemini translation failed, trying fallback: {e}")

    # Fallback path
    processed, placeholder_map = glossary.apply(text)
    translated = _translate(processed, api_key)
    return glossary.restore(translated, placeholder_map)


# ── Main entry point ──────────────────────────────────────────────────────────

def translate_document(
    structured_data: dict,
    deepl_api_key: Optional[str] = None,
    manual_doc_type: Optional[str] = None,
) -> dict:
    """
    Translate all pages of an extracted PDF document.

    Args:
        structured_data: output of extractor.extract_structured()
        deepl_api_key:   optional DeepL API key; falls back to Google if None
        manual_doc_type: manual override for document type classification

    Returns:
        {
            "doc_type": str,
            "doc_type_label": str,
            "total_pages": int,
            "translator": "deepl" | "google",
            "pages": [
                {
                    "page_num": int,
                    "blocks": [
                        {
                            "original": str,
                            "translated": str,
                            "is_heading": bool,
                            "font_size": float,
                            "is_bold": bool,
                            "bbox": list,
                        }
                    ]
                }
            ]
        }
    """
    full_text = structured_data.get("full_text", "")

    # 1. Detect document type or apply manual override
    if manual_doc_type and manual_doc_type != "auto":
        doc_type = manual_doc_type
    else:
        doc_type = detect_document_type(full_text)
        
    doc_type_label = get_doc_type_label(doc_type)
    logger.info(f"Using document type: {doc_type} ({doc_type_label})")

    # Use Gemini-powered template translator for birth certificate to ensure correct layout and perfect translation
    if doc_type == "birth_cert":
        from .template_translator import get_gemini_birth_cert_blocks
        template_blocks = get_gemini_birth_cert_blocks(full_text, GEMINI_API_KEY)
        if template_blocks:
            return {
                "doc_type":       doc_type,
                "doc_type_label": doc_type_label,
                "total_pages":    1,
                "translator":     "gemini",
                "pages": [
                    {
                        "page_num": 1,
                        "width":    595,
                        "height":   842,
                        "blocks":   template_blocks
                    }
                ]
            }

    # 2. Load glossary
    glossary = get_glossary_for_type(doc_type)

    # 3. Resolve which translator was actually used
    translator_name = "deepl" if deepl_api_key else "google"

    # 4. Translate each block
    result_pages = []
    for page in structured_data.get("pages", []):
        translated_blocks = []
        for block in page["blocks"]:
            block_type = block.get("type", "paragraph")
            if block_type == "table":
                original_cells = block.get("cells", [])
                translated_cells = []
                for row in original_cells:
                    translated_row = []
                    for cell in row:
                        if cell and cell.strip():
                            # Clean cell text for safer translation
                            cleaned = cell.strip().replace("\n", " ")
                            translated_cell = translate_block(cleaned, glossary, deepl_api_key)
                        else:
                            translated_cell = cell
                        translated_row.append(translated_cell)
                    translated_cells.append(translated_row)
                translated_blocks.append({
                    "type": "table",
                    "original_cells": original_cells,
                    "translated_cells": translated_cells,
                    "bbox": block.get("bbox", []),
                })
            else:
                original_text = block.get("text", "")
                translated_text = translate_block(original_text, glossary, deepl_api_key)
                translated_blocks.append({
                    "type": "paragraph",
                    "original":   original_text,
                    "translated": translated_text,
                    "is_heading": block.get("is_heading", False),
                    "font_size":  block.get("font_size", 11.0),
                    "is_bold":    block.get("is_bold", False),
                    "align":      block.get("align", "left"),
                    "bbox":       block.get("bbox", []),
                })
        result_pages.append({
            "page_num": page["page_num"],
            "width":    page.get("width", 595),
            "height":   page.get("height", 842),
            "blocks":   translated_blocks,
        })

    return {
        "doc_type":       doc_type,
        "doc_type_label": doc_type_label,
        "total_pages":    structured_data.get("total_pages", 0),
        "translator":     translator_name,
        "pages":          result_pages,
    }
