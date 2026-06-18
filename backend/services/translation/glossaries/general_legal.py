from .base import BaseGlossary


class GeneralLegalGlossary(BaseGlossary):
    """Common Vietnamese legal and government document terms."""

    @property
    def terms(self) -> dict[str, str]:
        return {
            # Header formulas
            "Độc lập - Tự do - Hạnh phúc": "Independence - Freedom - Happiness",
            "Cộng hòa xã hội chủ nghĩa Việt Nam": "Socialist Republic of Vietnam",
            "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM": "SOCIALIST REPUBLIC OF VIETNAM",

            # Government bodies
            "Ủy ban nhân dân": "People's Committee",
            "Uỷ ban nhân dân": "People's Committee",
            "Hội đồng nhân dân": "People's Council",
            "Bộ Tư pháp": "Ministry of Justice",
            "Bộ Nội vụ": "Ministry of Home Affairs",
            "Bộ Ngoại giao": "Ministry of Foreign Affairs",
            "Sở Tư pháp": "Department of Justice",
            "Phòng Tư pháp": "Division of Justice",

            # Personal identification
            "Chứng minh nhân dân": "National Identity Card",
            "Căn cước công dân": "Citizen Identity Card",
            "CMND": "National ID",
            "CCCD": "Citizen ID",
            "Hộ chiếu": "Passport",
            "Ngày cấp": "Date of Issue",
            "Nơi cấp": "Place of Issue",
            "Ngày hết hạn": "Expiry Date",

            # Residence / address
            "Hộ khẩu thường trú": "Permanent Residence Registration",
            "Nơi đăng ký hộ khẩu thường trú": "Permanent Household Registration Address",
            "Nơi thường trú": "Permanent Residence",
            "Nơi tạm trú": "Temporary Residence",
            "Địa chỉ thường trú": "Permanent Address",
            "Địa chỉ liên hệ": "Contact Address",

            # Personal info fields
            "Họ và tên": "Full Name",
            "Họ tên": "Full Name",
            "Giới tính": "Gender",
            "Nam": "Male",
            "Nữ": "Female",
            "Ngày tháng năm sinh": "Date of Birth",
            "Ngày sinh": "Date of Birth",
            "Nơi sinh": "Place of Birth",
            "Quốc tịch": "Nationality",
            "Dân tộc": "Ethnicity",
            "Tôn giáo": "Religion",
            "Số điện thoại": "Phone Number",
            "Email": "Email",

            # Certification language
            "Chứng nhận": "Certified",
            "Xác nhận": "Confirmed",
            "Xác thực": "Authenticated",
            "Chứng thực": "Notarized",
            "Công chứng": "Notarized",

            # Officials
            "Giám đốc": "Director",
            "Tổng Giám đốc": "General Director",
            "Phó Giám đốc": "Deputy Director",
            "Chủ tịch": "Chairman / President",
            "Phó Chủ tịch": "Vice Chairman",
            "Thủ trưởng cơ quan": "Head of Agency",
            "Người đại diện theo pháp luật": "Legal Representative",
            "Đại diện pháp luật": "Legal Representative",
            "Người ký": "Signatory",
            "Chức vụ": "Position / Title",
            "Chức danh": "Title",

            # Document parts
            "Điều": "Article",
            "Khoản": "Clause",
            "Điểm": "Point",
            "Mục": "Section",
            "Phụ lục": "Appendix",
            "Biên bản": "Minutes / Record",
            "Tờ khai": "Declaration Form",
            "Đơn xin": "Application",
            "Đơn đề nghị": "Request Form",
            "Giấy tờ": "Documents",
            "Giấy phép": "License / Permit",

            # Administrative
            "Phường": "Ward",
            "Xã": "Commune",
            "Quận": "District",
            "Huyện": "District",
            "Thị trấn": "Town",
            "Thành phố": "City",
            "Tỉnh": "Province",
            "Thành phố trực thuộc trung ương": "Centrally Administered Municipality",
            "Thủ đô Hà Nội": "Hanoi Capital",
            "Thành phố Hồ Chí Minh": "Ho Chi Minh City",

            # Date/time
            "Ngày ... tháng ... năm": "Date ... Month ... Year",
            "Hôm nay": "Today",
            "ngày": "day",
            "tháng": "month",
            "năm": "year",

            # Signatures/seals
            "Ký tên": "Signature",
            "Ký và đóng dấu": "Signed and Sealed",
            "Con dấu": "Official Seal",
            "Đóng dấu": "Official Stamp",
            "Dấu của cơ quan": "Agency Seal",

            # Miscellaneous legal
            "Theo quy định của pháp luật": "In accordance with the provisions of law",
            "Pháp luật hiện hành": "Current applicable law",
            "Quy định pháp luật": "Legal regulations",
            "Có giá trị pháp lý": "Legally valid",
            "Lập thành": "Made in",
            "bản chính": "original copy",
            "bản sao": "copy",
            "có giá trị như nhau": "of equal legal value",
            "Mỗi bên giữ": "Each party retains",
        }

    @property
    def keywords(self) -> list[str]:
        return []
