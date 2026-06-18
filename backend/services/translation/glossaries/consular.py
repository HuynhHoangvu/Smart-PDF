from .base import BaseGlossary
from .general_legal import GeneralLegalGlossary


class ConsularGlossary(GeneralLegalGlossary):
    """Glossary for visa, passport, and consular documents."""

    @property
    def terms(self) -> dict[str, str]:
        base = super().terms
        specific = {
            # Documents
            "Hộ chiếu": "Passport",
            "HỘ CHIẾU": "PASSPORT",
            "Visa": "Visa",
            "Thị thực": "Visa",
            "Giấy phép cư trú": "Residence Permit",
            "Thẻ tạm trú": "Temporary Residence Card",
            "Thẻ thường trú": "Permanent Residence Card",
            "Giấy thông hành": "Travel Document / Laissez-passer",
            "Chứng minh thư ngoại giao": "Diplomatic Identity Card",

            # Visa types
            "Visa du lịch": "Tourist Visa",
            "Visa công tác": "Business Visa",
            "Visa học tập": "Student Visa",
            "Visa lao động": "Work Visa",
            "Visa thăm thân": "Family Visit Visa",
            "Visa định cư": "Immigration Visa",
            "Thị thực đơn": "Single-Entry Visa",
            "Thị thực nhiều lần": "Multiple-Entry Visa",

            # Entry/exit
            "Nhập cảnh": "Entry",
            "Xuất cảnh": "Departure / Exit",
            "Quá cảnh": "Transit",
            "Cửa khẩu": "Border Gate / Port of Entry",
            "Kiểm soát xuất nhập cảnh": "Immigration Control",
            "Cơ quan xuất nhập cảnh": "Immigration Authority",

            # Consular
            "Lãnh sự": "Consular",
            "Đại sứ quán": "Embassy",
            "Lãnh sự quán": "Consulate",
            "Tổng Lãnh sự quán": "Consulate General",
            "Đại sứ": "Ambassador",
            "Tổng Lãnh sự": "Consul General",
            "Cơ quan đại diện ngoại giao": "Diplomatic Mission",

            # Application
            "Đơn xin cấp visa": "Visa Application Form",
            "Phí cấp visa": "Visa Fee",
            "Thời hạn lưu trú": "Duration of Stay",
            "Ngày nhập cảnh": "Date of Entry",
            "Ngày xuất cảnh": "Date of Departure",
            "Mục đích nhập cảnh": "Purpose of Entry",
            "Có giá trị đến": "Valid until",

            # Residency & CT07 specific
            "Xác nhận thông tin về cư trú": "Confirmation of residence information",
            "XÁC NHẬN THÔNG TIN VỀ CƯ TRÚ": "CONFIRMATION OF RESIDENCE INFORMATION",
            "Thông tin các thành viên khác trong hộ gia đình": "Information of other household members",
            "Họ, chữ đệm và tên của Ông/Bà": "Full name of Mr./Mrs.",
            "Họ, chữ đệm và tên": "Full name",
            "Ngày, tháng, năm sinh": "Date of birth",
            "Giới tính": "Gender",
            "Số định danh cá nhân": "Personal identification number/ID",
            "Dân tộc": "Ethnic group",
            "Tôn giáo": "Religion",
            "Quê quán": "Native place",
            "Nơi đăng ký khai sinh": "Place of birth registration",
            "Nơi thường trú": "Permanent residence",
            "Nơi tạm trú": "Temporary residence",
            "Nơi ở hiện tại": "Current residence",
            "Họ, chữ đệm và tên chủ hộ": "Full name of householder",
            "Quan hệ với chủ hộ": "Relationship with householder",
            "Số định danh cá nhân chủ hộ": "Personal identification number of the householder",
            "Nội dung xác nhận khác": "Other confirmations",
            "Giấy này có giá trị sử dụng đến hết ngày": "This confirmation of residence information is valid until",
            "THỦ TRƯỞNG CƠ QUAN ĐĂNG KÝ CƯ TRÚ": "HEAD OF RESIDENCE REGISTRATION AGENCY",
            "Đăng ký tạm trú": "Temporary residence registration",
            "Đăng ký thường trú": "Permanent residence registration",
            "Người nước ngoài": "Foreigner / Foreign National",
            "Công dân Việt Nam": "Vietnamese Citizen",
            "Người Việt Nam định cư ở nước ngoài": "Overseas Vietnamese",
            "Việt kiều": "Overseas Vietnamese",
        }
        base.update(specific)
        return base

    @property
    def keywords(self) -> list[str]:
        return [
            "hộ chiếu", "visa", "thị thực", "lãnh sự", "đại sứ quán",
            "nhập cảnh", "xuất cảnh", "giấy phép cư trú"
        ]
