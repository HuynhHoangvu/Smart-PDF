from .base import BaseGlossary
from .general_legal import GeneralLegalGlossary


class EmploymentGlossary(GeneralLegalGlossary):
    """Glossary for employment contracts and labor agreements."""

    @property
    def terms(self) -> dict[str, str]:
        base = super().terms
        specific = {
            # Contract types
            "Hợp đồng lao động không xác định thời hạn": "Indefinite-Term Employment Contract",
            "Hợp đồng lao động xác định thời hạn": "Fixed-Term Employment Contract",
            "Hợp đồng lao động theo mùa vụ": "Seasonal Employment Contract",
            "Hợp đồng thử việc": "Probationary Employment Contract",
            "Hợp đồng lao động": "Employment Contract",

            # Parties
            "Người sử dụng lao động": "Employer",
            "Người lao động": "Employee",
            "BÊN A": "PARTY A",
            "BÊN B": "PARTY B",
            "Bên A": "Party A",
            "Bên B": "Party B",
            "Bên sử dụng lao động": "Employer",
            "Bên lao động": "Employee",

            # Company info
            "Tên doanh nghiệp": "Company Name",
            "Tên công ty": "Company Name",
            "Địa chỉ trụ sở": "Registered Office Address",
            "Mã số thuế": "Tax Identification Number",
            "Mã số doanh nghiệp": "Enterprise Registration Number",

            # Employment terms
            "Thời gian thử việc": "Probationary Period",
            "Thời hạn hợp đồng": "Contract Duration",
            "Ngày bắt đầu làm việc": "Commencement Date",
            "Ngày kết thúc hợp đồng": "Contract Expiry Date",
            "Thời hạn": "Term / Duration",

            # Position & workplace
            "Chức danh công việc": "Job Title",
            "Vị trí công việc": "Job Position",
            "Mô tả công việc": "Job Description",
            "Địa điểm làm việc": "Place of Work",
            "Nơi làm việc": "Workplace",
            "Phòng ban": "Department",
            "Bộ phận": "Division / Department",

            # Working hours
            "Thời giờ làm việc": "Working Hours",
            "Thời gian làm việc": "Work Schedule",
            "Giờ làm việc": "Working Hours",
            "Ngày làm việc": "Working Days",
            "Làm việc từ": "Working from",
            "Ngày nghỉ": "Day(s) Off",
            "Nghỉ phép năm": "Annual Leave",
            "Nghỉ lễ": "Public Holiday Leave",
            "Làm thêm giờ": "Overtime Work",

            # Salary & benefits
            "Mức lương": "Salary",
            "Tiền lương": "Salary / Wages",
            "Lương cơ bản": "Basic Salary",
            "Lương thử việc": "Probationary Salary",
            "Phụ cấp": "Allowances",
            "Thưởng": "Bonus",
            "Hình thức trả lương": "Payment Method",
            "Kỳ hạn trả lương": "Payment Frequency",
            "Trả lương theo tháng": "Monthly Salary Payment",

            # Insurance & social benefits
            "Bảo hiểm xã hội": "Social Insurance",
            "Bảo hiểm y tế": "Health Insurance",
            "Bảo hiểm thất nghiệp": "Unemployment Insurance",
            "BHXH": "Social Insurance",
            "BHYT": "Health Insurance",
            "BHTN": "Unemployment Insurance",

            # Rights & obligations
            "Quyền và nghĩa vụ": "Rights and Obligations",
            "Nghĩa vụ của người lao động": "Employee's Obligations",
            "Quyền của người lao động": "Employee's Rights",
            "Nghĩa vụ của người sử dụng lao động": "Employer's Obligations",
            "Quyền của người sử dụng lao động": "Employer's Rights",

            # Termination
            "Chấm dứt hợp đồng lao động": "Termination of Employment Contract",
            "Đơn phương chấm dứt": "Unilateral Termination",
            "Thông báo trước": "Advance Notice",
            "Trợ cấp thôi việc": "Severance Pay",
            "Trợ cấp mất việc": "Redundancy Pay",

            # Dispute resolution
            "Giải quyết tranh chấp": "Dispute Resolution",
            "Tranh chấp lao động": "Labor Dispute",
            "Hòa giải": "Mediation",
        }
        base.update(specific)
        return base

    @property
    def keywords(self) -> list[str]:
        return [
            "hợp đồng lao động", "người sử dụng lao động", "người lao động",
            "thời gian thử việc", "tiền lương", "bảo hiểm xã hội",
            "hợp đồng thử việc", "chức danh công việc"
        ]
