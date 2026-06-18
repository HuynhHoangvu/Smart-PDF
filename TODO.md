# TODO - PDF to Word (Giai đoạn 1)

## Mục tiêu
Triển khai chức năng chuyển PDF sang Word với luồng UI giống mergeResult ở mức khả dụng ban đầu:
- Upload PDF
- Convert qua backend
- Hiển thị màn hình kết quả
- Tải file DOCX và bắt đầu lại

## Các bước thực hiện

- [x] B1. Backend service:
  - Tạo `backend/services/pdf_to_word.py`
  - Trích xuất text từ PDF bằng `pymupdf`
  - Tạo file `.docx` bằng `python-docx`

- [x] B2. Backend API:
  - Cập nhật `backend/main.py`
  - Thêm endpoint `POST /api/pdf-to-word`
  - Validate file theo giới hạn dung lượng hiện có
  - Trả về stream file `.docx`

- [x] B3. Frontend result UI:
  - Tạo `frontend/src/components/WordResult.jsx`
  - UI tương tự MergeResult cho kết quả DOCX
  - Nút tải xuống + bắt đầu lại

- [x] B4. Frontend workspace:
  - Tạo `frontend/src/components/PdfToWordWorkspace.jsx`
  - Quản lý file đầu vào (giai đoạn 1: 1 file chính)
  - Gọi API `/api/pdf-to-word`
  - Điều hướng sang `WordResult` khi thành công

- [x] B5. Tích hợp ToolPage:
  - Cập nhật `frontend/src/pages/ToolPage.jsx`
  - Dùng `PdfToWordWorkspace` cho `toolId === "pdf-to-word"`

- [ ] B6. Rà soát nhanh:
  - Kiểm tra luồng frontend/backend
  - Đảm bảo không ảnh hưởng tool merge hiện tại
