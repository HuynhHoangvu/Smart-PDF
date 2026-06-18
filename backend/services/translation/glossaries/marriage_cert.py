from .base import BaseGlossary
from .general_legal import GeneralLegalGlossary


class MarriageCertGlossary(GeneralLegalGlossary):
    """Glossary for marriage certificates and family civil status documents."""

    @property
    def terms(self) -> dict[str, str]:
        base = super().terms
        specific = {
            # Document name
            "Giấy chứng nhận kết hôn": "Marriage Certificate",
            "GIẤY CHỨNG NHẬN KẾT HÔN": "MARRIAGE CERTIFICATE",
            "Đăng ký kết hôn": "Marriage Registration",
            "ĐĂNG KÝ KẾT HÔN": "MARRIAGE REGISTRATION",
            "Hôn nhân và gia đình": "Marriage and Family",
            "Sổ đăng ký kết hôn": "Marriage Registration Book",
            "Số đăng ký": "Registration Number",

            # Parties
            "Bên nam": "Groom / Male Party",
            "Người chồng": "Husband",
            "Ông": "Mr.",
            "Bên nữ": "Bride / Female Party",
            "Người vợ": "Wife",
            "Bà": "Mrs. / Ms.",
            "Chồng": "Husband",
            "Vợ": "Wife",
            "Vợ chồng": "Husband and Wife",

            # Personal details
            "Họ và tên đầy đủ": "Full Name",
            "Năm sinh": "Year of Birth",
            "Nguyên quán": "Place of Origin",
            "Quê quán": "Hometown / Place of Origin",
            "Nơi cư trú": "Place of Residence",

            # Marriage registration
            "Đăng ký tại": "Registered at",
            "Cơ quan đăng ký": "Registration Authority",
            "Cán bộ tư pháp hộ tịch": "Civil Status Registration Officer",
            "Chủ tịch Ủy ban nhân dân": "Chairman of the People's Committee",
            "Hai bên tự nguyện": "Both parties voluntarily",
            "Đủ điều kiện kết hôn": "Meet the conditions for marriage",
            "Chứng nhận đã đăng ký kết hôn": "Certified as registered for marriage",

            # Witnesses
            "Người làm chứng": "Witness",
            "Đại diện hai bên": "Representatives of both parties",
            "Có mặt đầy đủ": "All present",

            # Legal status
            "Tình trạng hôn nhân": "Marital Status",
            "Độc thân": "Single",
            "Đã kết hôn": "Married",
            "Ly hôn": "Divorced",
            "Góa": "Widowed",
            "Ly thân": "Separated",

            # Divorce document
            "Giấy chứng nhận ly hôn": "Divorce Certificate",
            "Bản án ly hôn": "Divorce Judgment",
            "Quyết định ly hôn": "Divorce Decision",
        }
        base.update(specific)
        return base

    @property
    def keywords(self) -> list[str]:
        return [
            "giấy chứng nhận kết hôn", "đăng ký kết hôn", "bên nam", "bên nữ",
            "hôn nhân", "kết hôn", "vợ chồng"
        ]
