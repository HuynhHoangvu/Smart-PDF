import re
import logging


def get_gemini_birth_cert_blocks(full_text: str, api_key: str) -> list:
    """
    Use Gemini to extract birth certificate details from Vietnamese text and map to the standard 2010 template.
    """
    import urllib.request
    import json

    logger = logging.getLogger(__name__)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"

    prompt = (
        "You are an expert consular translator. Analyze the following Vietnamese Birth Certificate text and extract all details in English.\n"
        "Transliterate names to UPPERCASE without accents (e.g. NGUYỄN ĐỖ THẢO TRÂN -> NGUYEN DO THAO TRAN).\n"
        "Translate dates, addresses, ethnicities, nationalities, relationships, and administrative terms to English (e.g., 'Kinh' -> 'Kinh', 'Việt Nam' -> 'Vietnamese', 'Bà ngoại' -> 'Grandmother', 'Cha' -> 'Father').\n"
        "If a field is not present in the text, return empty string.\n\n"
        "Extract the following fields as JSON:\n"
        "- is_copy: boolean (true if text indicates it's a Copy/Trích lục/Bản sao, false if Original/Bản chính)\n"
        "- no: string (e.g. '555' or '20140/2010')\n"
        "- book_no: string (e.g. '05/2013' or '012010')\n"
        "- full_name: string (uppercase, no accents)\n"
        "- gender: string ('Male' or 'Female')\n"
        "- dob: string (e.g. 'December 14th, 2013' or 'September 21st, 2010')\n"
        "- dob_in_words: string (e.g. 'The twenty-first of September in two thousand and ten')\n"
        "- pob: string (e.g. 'Tu Du Hospital – Ho Chi Minh City')\n"
        "- ethnic: string (e.g. 'Kinh')\n"
        "- nationality: string (e.g. 'Vietnamese')\n"
        "- father_name: string (uppercase, no accents)\n"
        "- father_ethnic: string (e.g. 'Kinh')\n"
        "- father_nationality: string (e.g. 'Vietnamese')\n"
        "- father_yob: string (e.g. '1968' or '1986')\n"
        "- father_residence: string\n"
        "- mother_name: string (uppercase, no accents)\n"
        "- mother_ethnic: string (e.g. 'Kinh')\n"
        "- mother_nationality: string (e.g. 'Vietnamese')\n"
        "- mother_yob: string (e.g. '1982' or '1990')\n"
        "- mother_residence: string\n"
        "- place_of_registration: string (e.g. \"People's Committee of Tan Kieng Ward, District 7, Ho Chi Minh City\")\n"
        "- date_of_registration: string (e.g. 'December 19th, 2013')\n"
        "- note: string\n"
        "- declarer: string (uppercase, no accents)\n"
        "- relation: string (e.g. 'Father' or 'Mother' or 'Grandmother')\n"
        "- registrar: string (registrar officer name, uppercase, no accents)\n"
        "- signer: string (signer/vice-chairman/chairman name, uppercase, no accents)\n"
        "- signer_title: string (e.g. 'CHAIRMAN' or 'VICE CHAIRMAN')\n\n"
        f"Vietnamese Birth Certificate text:\n\"\"\"\n{full_text}\n\"\"\"\n"
    )

    # NOTE: Do NOT use responseMimeType: "application/json" — it causes HTTP 404 with this API key.
    # Instead, ask Gemini to return JSON via prompt instruction, then extract manually.
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt + "\n\nIMPORTANT: Respond with ONLY a valid JSON object. No markdown fences, no explanation."}
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
        with urllib.request.urlopen(req, timeout=25) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            response_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()

            # Strip markdown code fences if present (```json ... ```)
            if response_text.startswith("```"):
                response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
                response_text = re.sub(r"\s*```$", "", response_text)
            response_text = response_text.strip()

            data = json.loads(response_text)
            logger.info(f"Gemini birth cert extraction succeeded: name={data.get('full_name')} dob={data.get('dob')}")

            is_copy = data.get("is_copy", False)
            cert_type = "COPY" if is_copy else "ORIGINAL"

            blocks = [
                {"type": "paragraph", "translated": "SOCIALIST REPUBLIC OF VIETNAM\nIndependence – Freedom – Happiness", "align": "center", "is_heading": False, "is_bold": True, "font_size": 11, "margin_bottom": 2},
                {"type": "paragraph", "translated": f"BIRTH CERTIFICATE\n({cert_type})    No. {data.get('no', '')}\nBook No.: {data.get('book_no', '')}", "align": "center", "is_heading": True, "is_bold": True, "font_size": 18, "margin_bottom": 14},

                {
                    "type": "table",
                    "borderless": True,
                    "font_size": 12,
                    "col_widths": ["70%", "30%"],
                    "original_cells": [["Họ, chữ đệm, tên:", "Giới tính:"]],
                    "translated_cells": [[f"Full name: {data.get('full_name', '')}", f"Gender: {data.get('gender', '')}"]]
                },
                {"type": "paragraph", "translated": f"Date of birth: {data.get('dob', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {"type": "paragraph", "translated": f"In words: {data.get('dob_in_words', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {"type": "paragraph", "translated": f"Place of birth: {data.get('pob', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {
                    "type": "table",
                    "borderless": True,
                    "font_size": 12,
                    "col_widths": ["50%", "50%"],
                    "original_cells": [["Dân tộc:", "Quốc tịch:"]],
                    "translated_cells": [[f"Ethnic group: {data.get('ethnic', '')}", f"Nationality: {data.get('nationality', '')}"]]
                },

                {"type": "paragraph", "translated": "PARENTS' DETAILS", "align": "left", "is_heading": True, "is_bold": True, "font_size": 13, "margin_top": 10, "margin_bottom": 4},
                {"type": "paragraph", "translated": f"Father's full name: {data.get('father_name', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {
                    "type": "table",
                    "borderless": True,
                    "font_size": 12,
                    "col_widths": ["33%", "34%", "33%"],
                    "original_cells": [["Dân tộc:", "Quốc tịch:", "Năm sinh:"]],
                    "translated_cells": [[f"Ethnic group: {data.get('father_ethnic', '')}", f"Nationality: {data.get('father_nationality', '')}", f"Year of birth: {data.get('father_yob', '')}"]]
                },
                {"type": "paragraph", "translated": f"Permanent residence: {data.get('father_residence', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 8},

                {"type": "paragraph", "translated": f"Mother's full name: {data.get('mother_name', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {
                    "type": "table",
                    "borderless": True,
                    "font_size": 12,
                    "col_widths": ["33%", "34%", "33%"],
                    "original_cells": [["Dân tộc:", "Quốc tịch:", "Năm sinh:"]],
                    "translated_cells": [[f"Ethnic group: {data.get('mother_ethnic', '')}", f"Nationality: {data.get('mother_nationality', '')}", f"Year of birth: {data.get('mother_yob', '')}"]]
                },
                {"type": "paragraph", "translated": f"Permanent residence: {data.get('mother_residence', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 8},

                {"type": "paragraph", "translated": f"Place of registration: {data.get('place_of_registration', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {"type": "paragraph", "translated": f"Date of registration: {data.get('date_of_registration', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {"type": "paragraph", "translated": f"Note: {data.get('note', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {"type": "paragraph", "translated": f"Full name of birth declarer: {data.get('declarer', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 2},
                {"type": "paragraph", "translated": f"Relation with the declared person: {data.get('relation', '')}", "align": "left", "is_heading": False, "is_bold": False, "font_size": 12, "margin_bottom": 14},

                {
                    "type": "table",
                    "borderless": True,
                    "font_size": 11,
                    "col_widths": ["50%", "50%"],
                    "original_cells": [["NGƯỜI THỰC HIỆN ĐĂNG KÝ MẪU", "NGƯỜI KÝ GIẤY KHAI SINH"]],
                    "translated_cells": [[
                        f"REGISTRAR\n(Signed and wrote full name)\n\n\n{data.get('registrar', '')}",
                        f"SIGNER OF BIRTH CERTIFICATE\n{data.get('signer_title', 'CHAIRMAN')}\n(Signed, wrote full name and sealed)\n\n\n{data.get('signer', '')}"
                    ]]
                }
            ]
            return blocks
    except Exception as e:
        logger.warning(f"Failed to use Gemini birth certificate template: {e}", exc_info=True)
        return []
