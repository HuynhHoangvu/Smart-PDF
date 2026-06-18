from .base import BaseGlossary
from .general_legal import GeneralLegalGlossary


class SchoolTranscriptGlossary(GeneralLegalGlossary):
    """Glossary for school transcripts, academic records, and diplomas."""

    @property
    def terms(self) -> dict[str, str]:
        base = super().terms
        specific = {
            # Document types
            "Học bạ": "School Report / Academic Transcript",
            "HỌC BẠ": "SCHOOL REPORT / ACADEMIC TRANSCRIPT",
            "Bảng điểm": "Grade Transcript",
            "BẢNG ĐIỂM": "GRADE TRANSCRIPT",
            "Bảng kết quả học tập": "Academic Results Summary",
            "Phiếu điểm": "Grade Sheet",
            "Bằng tốt nghiệp": "Graduation Diploma",
            "BẰNG TỐT NGHIỆP": "GRADUATION DIPLOMA",
            "Chứng chỉ": "Certificate",
            "Giấy chứng nhận tốt nghiệp": "Graduation Certificate",
            "Văn bằng": "Degree / Diploma",

            # School levels
            "Trường tiểu học": "Primary School",
            "Trường trung học cơ sở": "Lower Secondary School",
            "Trường trung học phổ thông": "Upper Secondary School",
            "THCS": "Lower Secondary",
            "THPT": "Upper Secondary",
            "Trường đại học": "University",
            "Cao đẳng": "College",
            "Trung cấp": "Vocational / Intermediate Level",
            "Mầm non": "Kindergarten",
            "Tiểu học": "Primary Level",

            # Personnel
            "Hiệu trưởng": "Principal",
            "Hiệu phó": "Vice Principal",
            "Giáo viên chủ nhiệm": "Homeroom Teacher",
            "Giáo viên bộ môn": "Subject Teacher",
            "Học sinh": "Student",
            "Sinh viên": "Student (university level)",
            "Lớp trưởng": "Class President",

            # Academic performance
            "Kết quả học tập": "Academic Results",
            "Kết quả rèn luyện": "Conduct Assessment",
            "Hạnh kiểm": "Conduct / Behavior",
            "Xếp loại học lực": "Academic Performance Classification",
            "Xếp loại hạnh kiểm": "Conduct Classification",
            "Điểm trung bình": "Grade Point Average (GPA)",
            "Điểm tổng kết": "Final Grade",
            "Điểm kiểm tra": "Test Score",
            "Điểm thi": "Exam Score",
            "Điểm thành phần": "Component Score",

            # Grades / classifications
            "Xuất sắc": "Excellent",
            "Giỏi": "Very Good",
            "Khá": "Good",
            "Trung bình": "Average",
            "Yếu": "Below Average",
            "Kém": "Poor / Fail",
            "Đạt": "Pass",
            "Không đạt": "Fail",
            "Loại giỏi": "Distinction",
            "Loại khá": "Merit",
            "Loại trung bình": "Pass",

            # Subjects (common)
            "Toán": "Mathematics",
            "Văn": "Literature",
            "Ngữ văn": "Vietnamese Language & Literature",
            "Tiếng Anh": "English",
            "Tiếng Việt": "Vietnamese",
            "Vật lý": "Physics",
            "Hóa học": "Chemistry",
            "Sinh học": "Biology",
            "Lịch sử": "History",
            "Địa lý": "Geography",
            "Giáo dục công dân": "Civic Education",
            "Thể dục": "Physical Education",
            "Tin học": "Information Technology",
            "Công nghệ": "Technology",
            "Âm nhạc": "Music",
            "Mỹ thuật": "Fine Arts",
            "Ngoại ngữ": "Foreign Language",

            # Academic terms
            "Năm học": "Academic Year",
            "Học kỳ I": "Semester I / First Semester",
            "Học kỳ II": "Semester II / Second Semester",
            "Cả năm": "Full Year",
            "Lên lớp": "Promoted to Next Grade",
            "Ở lại lớp": "Repeated Grade",
            "Tốt nghiệp": "Graduated",
            "Thi lại": "Re-examination",
            "Số buổi nghỉ": "Number of Absences",
            "Học lực": "Academic Performance",
            "Rèn luyện": "Personal Development / Conduct",

            # School info
            "Năm tốt nghiệp": "Year of Graduation",
            "Chuyên ngành": "Major / Specialization",
            "Ngành học": "Field of Study",
            "Khoa": "Faculty / Department",
            "Mã số học sinh": "Student ID Number",
        }
        base.update(specific)
        return base

    @property
    def keywords(self) -> list[str]:
        return [
            "học bạ", "bảng điểm", "xếp loại học lực", "hạnh kiểm",
            "giáo viên chủ nhiệm", "hiệu trưởng", "học sinh",
            "kết quả học tập", "điểm trung bình", "năm học"
        ]
