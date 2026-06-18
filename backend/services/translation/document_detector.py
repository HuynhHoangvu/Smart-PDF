"""
Document Type Detector.

Uses keyword scoring to automatically classify the type of Vietnamese legal document.
This determines which specialized glossary to apply during translation.

How to add a new document type:
  1. Add a new entry to DETECTION_RULES with distinctive keywords.
  2. Create the corresponding glossary in glossaries/your_type.py.
  3. Register it in glossaries/__init__.py.
"""
from typing import Literal

DocumentType = Literal[
    "employment",
    "marriage_cert",
    "school_transcript",
    "birth_cert",
    "power_of_attorney",
    "consular",
    "land_use_right",
    "residence_confirm",
    "general",
]

# Each rule: (document_type, [list of distinctive Vietnamese keywords])
# Keywords are matched case-insensitively against the full extracted text.
# The type with the most keyword matches wins.
DETECTION_RULES: list[tuple[DocumentType, list[str]]] = [
    ("school_transcript", [
        "học bạ",
        "bảng điểm",
        "xếp loại học lực",
        "hạnh kiểm",
        "giáo viên chủ nhiệm",
        "kết quả học tập",
        "điểm trung bình",
        "học sinh",
        "năm học",
        "học kỳ",
        "hiệu trưởng trường",
        "bằng tốt nghiệp",
        "phiếu điểm",
    ]),
    ("marriage_cert", [
        "giấy chứng nhận kết hôn",
        "đăng ký kết hôn",
        "bên nam",
        "bên nữ",
        "hôn nhân",
        "kết hôn",
        "người chồng",
        "người vợ",
        "sổ đăng ký kết hôn",
        "tình trạng hôn nhân",
    ]),
    ("birth_cert", [
        "giấy khai sinh",
        "giấy chứng nhận khai sinh",
        "trích lục khai sinh",
        "họ và tên cha",
        "họ và tên mẹ",
        "khai sinh",
        "sổ đăng ký khai sinh",
        "cơ sở y tế",
        "con thứ",
        "giay khai sinh",
        "người ký giấy khai sinh",
        "nguoi ky giay khai sinh",
        "khai sinh ban sao",
        "khai sinh bản sao",
    ]),
    ("power_of_attorney", [
        "giấy ủy quyền",
        "giấy uỷ quyền",
        "bên ủy quyền",
        "bên được ủy quyền",
        "ủy quyền cho",
        "phạm vi ủy quyền",
        "hợp đồng ủy quyền",
        "thời hạn ủy quyền",
    ]),
    ("employment", [
        "hợp đồng lao động",
        "người sử dụng lao động",
        "người lao động",
        "thời gian thử việc",
        "tiền lương",
        "bảo hiểm xã hội",
        "hợp đồng thử việc",
        "chức danh công việc",
        "địa điểm làm việc",
        "chế độ bảo hiểm",
    ]),
    ("consular", [
        "hộ chiếu",
        "thị thực",
        "lãnh sự",
        "đại sứ quán",
        "nhập cảnh",
        "xuất cảnh",
        "giấy phép cư trú",
        "thẻ tạm trú",
        "thẻ thường trú",
        "kiểm soát xuất nhập cảnh",
    ]),
    ("land_use_right", [
        "quyền sử dụng đất",
        "sổ đỏ",
        "quyền sở hữu nhà ở",
        "thửa đất số",
        "tờ bản đồ số",
        "mục đích sử dụng",
        "thời hạn sử dụng",
        "nguồn gốc sử dụng",
        "nhà ở",
    ]),
    ("residence_confirm", [
        "xác nhận thông tin về cư trú",
        "thông tin về cư trú",
        "ct07",
        "chủ hộ",
        "thành viên khác của hộ gia đình",
        "quan hệ với chủ hộ",
        "định danh cá nhân",
        "nơi thường trú",
    ]),
]


def strip_accents_for_detection(text: str) -> str:
    """Normalize text by converting to lowercase and stripping Vietnamese accents."""
    import unicodedata
    normalized = unicodedata.normalize('NFD', text)
    # Strip combining diacritical marks
    stripped = "".join(c for c in normalized if unicodedata.category(c) != 'Mn')
    return stripped.lower()


def detect_document_type(full_text: str) -> DocumentType:
    """
    Score each document type by counting keyword matches.
    Both text and keywords are normalized (accents stripped) for robustness
    against OCR/scanning errors.
    """
    text_clean = strip_accents_for_detection(full_text)

    best_type: DocumentType = "general"
    best_score = 0

    for doc_type, keywords in DETECTION_RULES:
        # Strip accents from rules keywords as well for perfect alignment
        normalized_kws = [strip_accents_for_detection(kw) for kw in keywords]
        score = sum(1 for kw in normalized_kws if kw in text_clean)
        
        # Give higher weight to matches if it has strong distinctive words
        if score > best_score:
            best_score = score
            best_type = doc_type

    return best_type


def get_doc_type_label(doc_type: DocumentType) -> str:
    """Human-readable Vietnamese label for the detected document type."""
    labels: dict[str, str] = {
        "employment":        "Hợp đồng lao động",
        "marriage_cert":     "Giấy kết hôn",
        "school_transcript": "Học bạ / Bảng điểm",
        "birth_cert":        "Giấy khai sinh",
        "power_of_attorney": "Giấy ủy quyền",
        "consular":          "Hộ chiếu / Visa",
        "land_use_right":    "Sổ đỏ / Quyền sử dụng đất",
        "residence_confirm": "Xác nhận cư trú CT07",
        "general":           "Tài liệu pháp lý",
    }
    return labels.get(doc_type, "Tài liệu pháp lý")
