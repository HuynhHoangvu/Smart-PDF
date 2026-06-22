"""
HTML-based translator using Gemini.

Takes the structured HTML output of html_extractor and asks Gemini to:
  - Translate Vietnamese text content to English
  - Preserve every HTML tag and inline style exactly
  - Apply standard consular terminology

Falls back to Google Translate per-paragraph if Gemini fails.
"""
import json
import re
import logging
import urllib.request
import urllib.error
import os
from html.parser import HTMLParser

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyDrLO5Y4untHFecD6iCPoJv5GOzhiEVVZM")
# Model confirmed working with this API key (v1beta endpoint)
GEMINI_MODELS = [
    "gemini-3.5-flash",
    "gemini-2.5-flash",
]

SYSTEM_PROMPT = """\
You are an expert Vietnamese-to-English consular and legal document translator.
You will receive an HTML fragment from a Vietnamese legal document.

Your task:
1. Translate ONLY the visible Vietnamese text inside HTML elements to formal English.
2. Preserve ALL HTML tags, inline styles, class names, and data attributes EXACTLY as-is — do not change font-size, font-weight, text-align, or any other CSS value.
3. Do NOT add or remove any HTML elements or attributes.
4. Transliterate Vietnamese PERSONAL NAMES ONLY to UPPERCASE Latin without diacritics.
   Example: "Nguyễn Đỗ Thảo Trân" → "NGUYEN DO THAO TRAN"
   All other text (labels, places, institutions) → normal case, NOT uppercase.
5. Use standard English consular terminology:
   - "Giấy khai sinh" / "GIAY KHAI SINH" → "BIRTH CERTIFICATE"
   - "Bản chính" / "BAN CHINH" → "ORIGINAL"
   - "Bản sao" → "COPY"
   - "Cộng hòa xã hội chủ nghĩa Việt Nam" → "SOCIALIST REPUBLIC OF VIETNAM" (ALL CAPS, bold)
   - "Độc lập - Tự do - Hạnh phúc" → "Independence – Freedom – Happiness"
   - "Họ và tên" → "Full name", "Giới tính" → "Gender", "Nam" → "Male", "Nữ" → "Female"
   - "Ngày, tháng, năm sinh" → "Date of birth"
   - "Nơi sinh" → "Place of birth"
   - "Dân tộc" → "Ethnic group", "Quốc tịch" → "Nationality"
   - "Họ và tên cha" → "Father's full name", "Họ và tên mẹ" → "Mother's full name"
   - "Nơi thường trú" → "Permanent residence"
   - "Ngày đăng ký" → "Date of registration"
   - "Người đi khai sinh" → "Birth declarer"
   - "Quan hệ với người được khai sinh" → "Relationship to the registered person"
   - "Bà ngoại" → "Grandmother", "Ông nội" → "Grandfather", "Cha" → "Father", "Mẹ" → "Mother"
   - "Người thực hiện" → "REGISTRAR", "Người ký giấy khai sinh" → "SIGNER OF BIRTH CERTIFICATE"
   - "Chủ tịch" → "CHAIRMAN", "Phó chủ tịch" → "VICE CHAIRMAN"
   - "Giấy kết hôn" → "Marriage Certificate"
   - "Học bạ" → "School Report", "Bảng điểm" → "Transcript"
   - "Xác nhận thông tin cư trú" → "Confirmation of Residence Information"
   - "Giấy chứng nhận quyền sử dụng đất" → "Certificate of Land Use Rights"
   - "Quyền sở hữu nhà ở" → "Ownership of House"
   - "Thửa đất số" → "Land lot No.", "Tờ bản đồ số" → "Map sheet No."
   - "Diện tích" → "Area", "Mục đích sử dụng" → "Purpose of use"
   - "Đất ở tại đô thị" → "Urban residential land"
   - "Sử dụng riêng" → "Private use", "Lâu dài" → "Long-term"
   - "Ông" → "Mr.", "Bà" → "Mrs."
6. Keep numbers, sequences of dots (......), dashes (---), and parentheses unchanged.
7. Do NOT add extra bold (font-weight:bold) to spans that are not bold in the source HTML. Preserve bold only where it already exists in the original styles.
8. Do NOT wrap your response in markdown code fences.
9. Return ONLY the translated HTML fragment — no explanations, no preamble.
"""

SCANNED_EXTRA = """\

IMPORTANT — This HTML was extracted from a SCANNED document. The text layer may contain OCR errors:
- Missing Vietnamese diacritics: "NGUYEN THINH TRONG" means "NGUYỄN THỊNH TRỌNG"
- Merged words: "CONG HOAXA HOI" means "CỘNG HÒA XÃ HỘI"
- Garbled characters: "Ghi bang chie" means "Ghi bằng chữ", "NGHiAVIETNAM" means "NGHĨA VIỆT NAM"
- Wrong letters: "1ong" means "Tổng", "Dantoe" means "Dân tộc", "Namsinhf" means "Năm sinh"
- Mixed characters: "Namsinh:Al.07.3.1908" means "Năm sinh: 07.3.1968"
Please RECONSTRUCT the correct Vietnamese meaning from context, then translate to English.
The document structure (birth certificate, land certificate, etc.) should guide your interpretation.
"""


def _call_gemini(model: str, api_key: str, prompt_text: str, retries: int = 3,
                  image_b64: str | None = None, mime_type: str = "image/png") -> str:
    """Call a specific Gemini model and return the text response.
    If image_b64 is provided, sends a multimodal request (vision)."""
    import time
    if image_b64:
        parts = [
            {"inline_data": {"mime_type": mime_type, "data": image_b64}},
            {"text": prompt_text},
        ]
    else:
        parts = [{"text": prompt_text}]

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"temperature": 0.05, "maxOutputTokens": 16384},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    data_bytes = json.dumps(payload).encode("utf-8")
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, data=data_bytes,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except urllib.error.HTTPError:
            raise  # HTTP errors (404, 400) không retry
        except Exception as e:
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # 1s, 2s
    raise last_err


def _gemini_translate_html(html: str, api_key: str, is_scanned: bool = False) -> str:
    """Send HTML to Gemini (tries multiple models) and return translated HTML."""
    system = SYSTEM_PROMPT + (SCANNED_EXTRA if is_scanned else "")
    prompt_text = (
        system
        + "\n\n--- HTML to translate ---\n"
        + html
        + "\n--- end ---"
    )

    last_err = None
    for model in GEMINI_MODELS:
        try:
            text = _call_gemini(model, api_key, prompt_text)
            # Strip markdown fences if Gemini wraps the HTML anyway
            text = re.sub(r"^```[a-z]*\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            text = text.strip()
            if text:
                logger.info(f"Gemini HTML translation succeeded with model: {model}")
                return text
        except urllib.error.HTTPError as e:
            logger.warning(f"Gemini model {model} returned HTTP {e.code}, trying next…")
            last_err = e
        except Exception as e:
            logger.warning(f"Gemini model {model} failed: {e}, trying next…")
            last_err = e

    raise RuntimeError(f"All Gemini models failed. Last error: {last_err}")


# ── Fallback: extract text nodes and translate with Google ────────────────────

class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.texts: list[str] = []

    def handle_data(self, data: str):
        if data.strip():
            self.texts.append(data)


def _google_translate(text: str) -> str:
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="vi", target="en").translate(text) or text
    except Exception as e:
        logger.warning(f"Google Translate fallback error: {e}")
        return text


def _fallback_translate_html(html: str) -> str:
    """
    Crude fallback: split on tags, translate text nodes with Google.
    Only used when Gemini is unavailable.
    """
    parts = re.split(r"(<[^>]+>)", html)
    translated: list[str] = []
    for part in parts:
        if part.startswith("<") or not part.strip():
            translated.append(part)
        else:
            translated.append(_google_translate(part))
    return "".join(translated)


# ── Public interface ──────────────────────────────────────────────────────────

VISION_PROMPT = """\
You are an expert Vietnamese-to-English consular and legal document translator.
You are looking at an image of a Vietnamese legal document page.

Your task:
1. Read ALL text visible in the image carefully and completely
2. Identify the document type (birth certificate, marriage certificate, land certificate, tax payment slip, etc.)
3. Translate EVERYTHING to formal English — ALL labels, ALL values, ALL headers, ALL text must be in English
4. Format as a SINGLE compact HTML fragment that MUST fit on one A4 page. Rules:
   - All text uses line-height:1; margin:0; padding:0 — no extra spacing anywhere
   - Document title: <p style="text-align:center;margin:2px 0 0 0;line-height:0.8;"><span style="font-size:11pt;font-weight:bold;">TITLE</span></p>
   - Header lines (SOCIALIST REPUBLIC OF VIETNAM, Independence...): <p style="text-align:center;margin:0;line-height:0.8;"><span style="font-size:8pt;font-weight:bold;">text</span></p>
   - Subtitle (ORIGINAL/COPY): <p style="text-align:center;margin:0;line-height:0.8;"><span style="font-size:8pt;">(text)</span></p>
   - Field label + value: <p style="margin:0;line-height:0.8;"><span style="font-size:8pt;"><b>Label:</b> value</span></p>
   - Two fields on same line: <table style="width:100%;border:none;border-collapse:collapse;margin:0;"><tr><td style="font-size:8pt;border:none;width:50%;line-height:0.8;"><b>Label1:</b> val1</td><td style="font-size:8pt;border:none;line-height:0.8;"><b>Label2:</b> val2</td></tr></table>
   - Signature block: right-aligned, 8pt, line-height:0.8, margin:0
   - Do NOT bold values. Only bold labels and document title.
   - Do NOT invent section headers not present in the original document.
5. Consular terminology:
   - ONLY personal names (people's names) → UPPERCASE Latin without diacritics: e.g. Nguyễn Thịnh Trọng → NGUYEN THINH TRONG
   - All other text → normal Title Case or sentence case, NOT uppercase
   - "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" → "SOCIALIST REPUBLIC OF VIETNAM" (ALL CAPS, bold)
   - "Độc lập - Tự do - Hạnh phúc" → "Independence – Freedom – Happiness"
   - "Giấy khai sinh" → "Birth Certificate", "Bản chính" → "Original", "Bản sao" → "Copy"
   - "Họ và tên" → "Full name", "Giới tính" → "Gender", "Nam" → "Male", "Nữ" → "Female"
   - "Ngày, tháng, năm sinh" → "Date of birth", "Nơi sinh" → "Place of birth"
   - "Dân tộc" → "Ethnic group", "Quốc tịch" → "Nationality"
   - "Nơi thường trú" → "Permanent residence"
   - "Họ và tên cha" → "Father's full name", "Họ và tên mẹ" → "Mother's full name"
   - "Ngày đăng ký" → "Date of registration", "Người đi khai sinh" → "Birth declarer"
   - "Người thực hiện" → "Registrar", "Chủ tịch" → "Chairman", "Phó chủ tịch" → "Vice Chairman"
   - "Giấy kết hôn" → "Marriage Certificate", "Học bạ" → "School Report"
   - "Giấy chứng nhận quyền sử dụng đất" → "Certificate of Land Use Rights"
   - "Giấy nộp tiền vào ngân sách nhà nước" → "State Budget Payment Slip"
   - "Người nộp thuế" → "Taxpayer", "Mã số thuế" → "Tax code"
   - "Thuế giá trị gia tăng" → "Value Added Tax (VAT)"
   - "Thuế thu nhập cá nhân" → "Personal Income Tax"
   - "Tổng số tiền" → "Total amount", "Số tiền bằng chữ" → "Amount in words"
   - "Ông" → "Mr.", "Bà" → "Mrs."
   - For tables (tax slips, transcripts): use visible borders: <table style="width:100%;border-collapse:collapse;font-size:7pt;">
6. Do NOT wrap your response in markdown code fences.
7. Return ONLY the HTML fragment — no explanations, no preamble.
"""

RECONSTRUCT_PROMPT = """\
You are an expert Vietnamese-to-English consular document translator and HTML formatter.

⚠️ CRITICAL RULE: Your output HTML must contain ENGLISH TEXT ONLY. Every word must be translated from Vietnamese to English. Do NOT leave any Vietnamese words in your output. This is a TRANSLATION task, not a transcription task.

Below is raw OCR text extracted from a scanned Vietnamese legal document (may be 1 or 2 pages combined).
The OCR text may contain errors: missing diacritics, merged words, wrong characters.
If the text contains "--- PAGE 2 (table/details section) ---", it means the second page belongs to the same document — combine both sections into ONE complete HTML output covering all content from both pages.

Your task:
1. Identify the document type (birth certificate, marriage certificate, land certificate, tax payment slip, etc.)
2. Reconstruct the correct Vietnamese content from context, fixing OCR errors
3. Translate EVERYTHING to formal English — ALL labels, ALL values, ALL headers, ALL text in the output HTML must be in English
4. Format as a SINGLE compact HTML fragment that MUST fit on one A4 page. Rules:
   - All text uses line-height:1; margin:0; padding:0 — no extra spacing anywhere
   - Document title: <p style="text-align:center;margin:2px 0 0 0;line-height:0.8;"><span style="font-size:11pt;font-weight:bold;">TITLE</span></p>
   - Header lines (SOCIALIST REPUBLIC OF VIETNAM, Independence...): <p style="text-align:center;margin:0;line-height:0.8;"><span style="font-size:8pt;font-weight:bold;">text</span></p>
   - Subtitle (ORIGINAL/COPY): <p style="text-align:center;margin:0;line-height:0.8;"><span style="font-size:8pt;">(text)</span></p>
   - No./Book No.: <table style="width:100%;border:none;border-collapse:collapse;margin:0;"><tr><td style="font-size:8pt;border:none;line-height:0.8;">No.: X</td><td style="font-size:8pt;text-align:right;border:none;line-height:0.8;">Book No.: Y</td></tr></table>
   - Field label + value: <p style="margin:0;line-height:0.8;"><span style="font-size:8pt;"><b>Label:</b> value</span></p>
   - Two fields on same line: <table style="width:100%;border:none;border-collapse:collapse;margin:0;"><tr><td style="font-size:8pt;border:none;width:50%;line-height:0.8;"><b>Label1:</b> val1</td><td style="font-size:8pt;border:none;line-height:0.8;"><b>Label2:</b> val2</td></tr></table>
   - Three fields on same line: use 3-col borderless table, same style
   - CRITICAL: Do NOT invent section headers (FATHER, MOTHER, REGISTRATION DETAILS, etc.) not in the original. Only translate what exists.
   - Signature block: right-aligned, 8pt, line-height:0.8, margin:0
   - Do NOT bold values. Only bold labels and document title.
5. Consular terminology and formatting rules:
   - ONLY personal names (people's names) → write in UPPERCASE Latin without diacritics: e.g. Nguyễn Thịnh Trọng → NGUYEN THINH TRONG
   - All other text → normal Title Case or sentence case, NOT uppercase
   - "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" → "SOCIALIST REPUBLIC OF VIETNAM" (ALL CAPS, bold)
   - "Độc lập - Tự do - Hạnh phúc" → "Independence – Freedom – Happiness"
   - "Giấy khai sinh" → "Birth Certificate", "Bản chính" → "Original", "Bản sao" → "Copy"
   - "Họ và tên" → "Full name", "Giới tính" → "Gender", "Nam" → "Male", "Nữ" → "Female"
   - "Ngày, tháng, năm sinh" / "Ngày tháng năm sinh" → "Date of birth"
   - "Nơi sinh" → "Place of birth", "Dân tộc" → "Ethnic group", "Quốc tịch" → "Nationality"
   - "Nơi thường trú" / "Địa chỉ thường trú" → "Permanent residence"
   - "Họ và tên cha" → "Father's full name", "Họ và tên mẹ" → "Mother's full name"
   - "Năm sinh" → "Year of birth", "Ngày đăng ký" → "Date of registration"
   - "Người đi khai sinh" → "Birth declarer", "Quan hệ" → "Relationship"
   - "Người thực hiện" → "Registrar", "Người ký giấy khai sinh" → "Signer of Birth Certificate"
   - "Chủ tịch" → "Chairman", "Phó chủ tịch" → "Vice Chairman", "Giám đốc" → "Director"
   - "Số định danh cá nhân" → "Personal identification number"
   - "Quê quán" → "Place of origin"
   - "Thửa đất số" → "Land lot No.", "Tờ bản đồ số" → "Map sheet No."
   - "Diện tích" → "Area", "Lâu dài" → "Long-term", "Sử dụng riêng" → "Private use"
   - "Đất ở tại đô thị" → "Urban residential land"
   - "Mục đích sử dụng" → "Purpose of use", "Thời hạn sử dụng" → "Duration of use"
   - "Giấy chứng nhận quyền sử dụng đất" → "Certificate of Land Use Rights"
   - "Sở Tài nguyên và Môi trường" → "Department of Natural Resources and Environment"
   - "Ông" → "Mr.", "Bà" → "Mrs."
   TAX / FINANCE DOCUMENT TERMS:
   - "Giấy nộp tiền vào ngân sách nhà nước" → "State Budget Payment Slip"
   - "Mẫu số" → "Form No.", "Mã hiệu" → "Code", "Số" / "Số:" → "No.:", "Số tham chiếu" → "Reference No."
   - "Tiền mặt" → "Cash", "Chuyển khoản" → "Transfer", "Loại tiền" → "Currency", "Khác" → "Other"
   - "Người nộp thuế" → "Taxpayer", "Mã số thuế" → "Tax code"
   - "Địa chỉ" → "Address", "Quận/Huyện" → "District", "Tỉnh, TP" → "Province/City"
   - "Người nộp thay" → "Payer on behalf"
   - "Đề nghị NH/KBNN" → "Requesting Bank/State Treasury"
   - "Trích TK số" → "Debit Account No.", "hoặc thu tiền mặt để nộp NSNN theo" → "or collect cash for State Budget payment according to"
   - "TK thu NSNN" → "State Budget collection account"
   - "TK tạm thu" → "Temporary collection account"
   - "TK thu hồi hoàn thuế GTGT" → "VAT refund recovery account"
   - "Vào tài khoản của KBNN" → "To the account of State Treasury"
   - "Phòng giao dịch" → "Transaction Office", "KBNN khu vực" → "State Treasury Area"
   - "Mở tại NH ủy nhiệm thu" → "Opened at collecting authorized bank"
   - "Nộp theo văn bản của cơ quan có thẩm quyền" → "Payment according to document of competent authority"
   - "Kiểm toán nhà nước" → "State Audit", "Thanh tra tài chính" → "Financial Inspectorate"
   - "Thanh tra Chính phủ" → "Government Inspectorate", "Cơ quan có thẩm quyền khác" → "Other competent authority"
   - "Tên cơ quan quản lý thu" → "Name of managing tax authority"
   - "Phần dành cho người nộp thuế ghi" → "For taxpayer to fill in"
   - "Phần dành cho NH ủy nhiệm thu/ NH phối hợp thu/ KBNN ghi" → "For authorized collecting bank / cooperating bank / State Treasury to fill in"
   - "Số tờ khai/Số quyết định/Số thông báo/Mã định danh hồ sơ (ID)" → "Declaration No./Decision No./Notification No./Date/ID"
   - "Kỳ thuế/Ngày quyết định/Ngày thông báo" → "Tax period/Date"
   - "Nội dung các khoản nộp NSNN" → "Content of State Budget payments"
   - "Mã chương" → "Chapter code", "Mã NDKT (TM)" → "Sub-item code (TM)", "Mã DBHC" → "Admin area code (DBHC)"
   - "Số tiền VND" → "Amount in VND", "Số ngoại tệ nguyên tệ" → "Original currency amount"
   - "Thuế giá trị gia tăng" / "Thuế GTGT" → "Value added tax (VAT)"
   - "Thuế giá trị gia tăng hàng sản xuất trong nước" → "Value added tax on domestically manufactured goods"
   - "Tổng số tiền" → "Total amount", "Tổng cộng" → "Total"
   - "Tổng số tiền bằng chữ" → "Total amount in words"
   - "Người nộp thuế" (signature) → "FOR TAXPAYER", "NH ủy nhiệm thu/KBNN" (signature) → "FOR AUTHORIZED COLLECTING BANK / STATE TREASURY"
   - "Ký, ghi rõ họ tên, đóng dấu (nếu có)" → "(Sign, write full name, and stamp if applicable)"
   - "Ký, ghi rõ họ tên, chức vụ và đóng dấu" → "(Sign, write full name, position, and stamp)"
   - "CN" → "Branch", "Ngân hàng TMCP Quân đội" → "Military Commercial Joint Stock Bank"
   - "Thuế thu nhập cá nhân" → "Personal income tax", "Thuế thu nhập doanh nghiệp" → "Corporate income tax"
   TABLE RECONSTRUCTION RULES (for tax payment slip detail pages):
   - The payment table has columns: STT | Declaration No./ID | Tax period | Content of State Budget payments | Original currency amount | Amount (VND) | Chapter code | Sub-item code (TM) | Admin area code (DBHC)
   - Typical rows: Row 1 = Value added tax (VAT on domestic production), Sub-item 1701; Row 2 = Personal income tax from production/business, Sub-item 1003; Chapter code is always 757
   - If OCR text is garbled and some amounts are missing, infer from Total: e.g. if Total=1,200,000 and PIT=400,000, then VAT=800,000
   - Render the table WITH visible borders: <table style="width:100%;border-collapse:collapse;margin:2px 0;font-size:7pt;">
   - Header row: <tr style="background:#f0f0f0;"><th style="border:1px solid #999;padding:2px 3px;text-align:center;">No.</th><th ...>Declaration No./ID</th>...</tr>
   - Data rows: <tr><td style="border:1px solid #999;padding:2px 3px;text-align:center;">1</td>...</tr>
   - Total row: <tr><td colspan="5" style="border:1px solid #999;padding:2px;font-weight:bold;">Total</td><td style="border:1px solid #999;padding:2px;text-align:right;font-weight:bold;">1,200,000</td><td colspan="3" style="border:1px solid #999;"></td></tr>
   - "FOR STATE TREASURY TO FILL IN UPON ACCOUNTING:" section: use a compact bordered box, 7pt
   - Signature section: two columns — left = PAYER, right = bank + date + staff names
   - Do NOT omit any section visible in OCR (accounting box, signatures, staff names)

Do NOT wrap your response in markdown code fences.
Return ONLY the HTML fragment.

--- OCR TEXT ---
{text}
--- END ---
"""


def _clean_gemini_html(text: str) -> str:
    text = re.sub(r"^```[a-z]*\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def translate_scanned_image_to_html(image_b64: str, api_key: str | None = None) -> str:
    """
    Send a scanned page image directly to Gemini vision for translation.
    This is the highest-quality path — Gemini reads the image natively,
    bypassing OCR errors entirely.
    """
    key = api_key or GEMINI_API_KEY
    for model in GEMINI_MODELS:
        try:
            raw = _call_gemini(model, key, VISION_PROMPT, image_b64=image_b64)
            result = _clean_gemini_html(raw)
            if result and len(result) > 30:
                logger.info(f"Vision translation succeeded with model: {model}")
                return result
        except urllib.error.HTTPError as e:
            logger.warning(f"Vision: model {model} HTTP {e.code}, trying next…")
        except Exception as e:
            logger.warning(f"Vision: model {model} failed: {e}, trying next…")
    return ""


def translate_scanned_to_html(raw_text: str, api_key: str | None = None) -> str:
    """
    For scanned/pure-image PDFs where the OCR text is unreliable:
    send the raw OCR text to Gemini and ask it to reconstruct + translate → clean HTML.
    """
    key = api_key or GEMINI_API_KEY
    if not raw_text.strip():
        return "<p style='color:#999;text-align:center;'>No text extracted from this page.</p>"

    prompt = RECONSTRUCT_PROMPT.replace("{text}", raw_text[:8000])
    for model in GEMINI_MODELS:
        try:
            text = _call_gemini(model, key, prompt)
            text = _clean_gemini_html(text)
            if text and len(text) > 30:
                logger.info(f"Scanned reconstruction succeeded with model: {model}")
                return text
        except urllib.error.HTTPError as e:
            logger.warning(f"Model {model} HTTP {e.code}, trying next…")
        except Exception as e:
            logger.warning(f"Model {model} failed: {e}")

    return _fallback_translate_html(raw_text)


def translate_html_page(html: str, api_key: str | None = None, is_scanned: bool = False) -> str:
    """
    Translate a single HTML page fragment.
    Tries Gemini; falls back to Google if Gemini fails.
    """
    key = api_key or GEMINI_API_KEY
    if not html.strip():
        return html

    if key:
        try:
            result = _gemini_translate_html(html, key, is_scanned=is_scanned)
            if result and len(result) > 20:
                return result
            logger.warning("Gemini returned empty/short HTML, using fallback.")
        except Exception as e:
            logger.warning(f"Gemini HTML translation failed: {e}. Using fallback.")

    return _fallback_translate_html(html)


def translate_html_document(pages: list[dict], api_key: str | None = None) -> list[dict]:
    """
    Translate a list of HTML pages (output of html_extractor.pdf_to_html_pages).
    Returns the same list with an added "translated_html" key per page.

    For scanned pages with image_b64: uses Gemini vision (highest quality).
    Falls back to OCR-text path if vision fails.
    """
    from concurrent.futures import ThreadPoolExecutor

    def _translate_page(page: dict) -> dict:
        is_scanned = page.get("is_scanned", False)
        image_b64 = page.get("image_b64")

        # Best path: send actual image to Gemini vision
        if is_scanned and image_b64:
            translated = translate_scanned_image_to_html(image_b64, api_key)
            if translated:
                return {**page, "translated_html": translated}
            logger.warning(f"Page {page['page_num']}: vision failed, falling back to OCR text path")

        # Fallback: OCR text → Gemini text
        translated = translate_html_page(
            page["html"],
            api_key,
            is_scanned=is_scanned,
        )
        return {**page, "translated_html": translated}

    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(_translate_page, pages))
    return results
