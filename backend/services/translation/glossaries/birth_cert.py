from .base import BaseGlossary
from .general_legal import GeneralLegalGlossary


class BirthCertGlossary(GeneralLegalGlossary):
    """Glossary for birth certificates and civil registration documents."""

    @property
    def terms(self) -> dict[str, str]:
        base = super().terms
        specific = {
            # Document name
            "Giấy khai sinh": "Birth Certificate",
            "GIẤY KHAI SINH": "BIRTH CERTIFICATE",
            "Giấy chứng nhận khai sinh": "Birth Registration Certificate",
            "Trích lục khai sinh": "Birth Certificate Extract",
            "Sổ đăng ký khai sinh": "Birth Registration Book",

            # Child info
            "Họ và tên khai sinh": "Full Name at Birth",
            "Họ và tên trẻ": "Child's Full Name",
            "Giới tính của trẻ": "Child's Sex",
            "Con thứ": "Birth Order",
            "Con đầu lòng": "First-born Child",

            # Birth details
            "Ngày, tháng, năm sinh": "Date of Birth (DD/MM/YYYY)",
            "Nơi sinh": "Place of Birth",
            "Giờ sinh": "Time of Birth",
            "Sinh tại": "Born at",
            "Cơ sở y tế": "Medical Facility / Hospital",
            "Tại nhà": "At home",

            # Parents
            "Họ và tên cha": "Father's Full Name",
            "Họ và tên mẹ": "Mother's Full Name",
            "Dân tộc của cha": "Father's Ethnicity",
            "Dân tộc của mẹ": "Mother's Ethnicity",
            "Quốc tịch của cha": "Father's Nationality",
            "Quốc tịch của mẹ": "Mother's Nationality",
            "Nghề nghiệp của cha": "Father's Occupation",
            "Nghề nghiệp của mẹ": "Mother's Occupation",
            "Nơi thường trú của cha": "Father's Permanent Residence",
            "Nơi thường trú của mẹ": "Mother's Permanent Residence",
            "Người cha": "Father",
            "Người mẹ": "Mother",
            "Cha": "Father",
            "Mẹ": "Mother",

            # Registration
            "Đăng ký khai sinh": "Birth Registration",
            "Người đi đăng ký": "Person Registering",
            "Quan hệ với trẻ": "Relationship to Child",
            "Cán bộ tư pháp": "Civil Registry Officer",
            "Đã ghi vào Sổ đăng ký khai sinh": "Entered in the Birth Registration Book",

            # Adoption
            "Con nuôi": "Adopted Child",
            "Nhận con nuôi": "Adoption",
        }
        base.update(specific)
        return base

    @property
    def keywords(self) -> list[str]:
        return [
            "giấy khai sinh", "giấy chứng nhận khai sinh", "trích lục khai sinh",
            "họ và tên cha", "họ và tên mẹ", "khai sinh", "ngày tháng năm sinh"
        ]


class PowerOfAttorneyGlossary(GeneralLegalGlossary):
    """Glossary for power of attorney and authorization documents."""

    @property
    def terms(self) -> dict[str, str]:
        base = super().terms
        specific = {
            # Document name
            "Giấy ủy quyền": "Power of Attorney",
            "GIẤY ỦY QUYỀN": "POWER OF ATTORNEY",
            "Giấy uỷ quyền": "Power of Attorney",
            "Văn bản ủy quyền": "Authorization Document",
            "Hợp đồng ủy quyền": "Authorization Agreement",

            # Parties
            "Bên ủy quyền": "Authorizing Party (Principal)",
            "Bên uỷ quyền": "Authorizing Party (Principal)",
            "Bên được ủy quyền": "Authorized Party (Agent)",
            "Bên được uỷ quyền": "Authorized Party (Agent)",
            "Người ủy quyền": "Grantor / Principal",
            "Người được ủy quyền": "Attorney-in-Fact / Agent",

            # Scope
            "Phạm vi ủy quyền": "Scope of Authorization",
            "Nội dung ủy quyền": "Subject Matter of Authorization",
            "Công việc được ủy quyền": "Authorized Activities",
            "Ủy quyền cho": "Authorizes / Grants authority to",
            "Thay mặt": "On behalf of",
            "Đại diện": "Representative",
            "Quyền hạn": "Authority / Powers",
            "Toàn quyền": "Full Authority",

            # Duration
            "Thời hạn ủy quyền": "Duration of Authorization",
            "Có hiệu lực từ": "Effective from",
            "Đến ngày": "Until",
            "Hết hạn": "Expiry",
            "Vô thời hạn": "Indefinite / Without time limit",
            "Chấm dứt ủy quyền": "Revocation of Authorization",

            # Specific authorizations
            "Ký kết hợp đồng": "Sign contracts",
            "Đại diện trước pháp luật": "Represent before the law",
            "Thực hiện các thủ tục": "Carry out procedures",
            "Thu hồi ủy quyền": "Revoke the authorization",
            "Ủy quyền lại": "Sub-delegation of authority",
        }
        base.update(specific)
        return base

    @property
    def keywords(self) -> list[str]:
        return [
            "giấy ủy quyền", "giấy uỷ quyền", "bên ủy quyền",
            "bên được ủy quyền", "ủy quyền cho", "phạm vi ủy quyền"
        ]
