# Cập nhật Quản lý Tài liệu - Phiên bản Đơn giản hóa

## Tổng quan thay đổi

Đã loại bỏ hoàn toàn các tính năng phức tạp và chỉ giữ lại quản lý tài liệu cơ bản theo đúng backend API.

## Các tính năng đã loại bỏ

### ❌ Đã xóa:
- ✓ Phân loại theo thư mục (file_type/folder)
- ✓ Phân quyền người dùng (role_user)  
- ✓ Phân quyền khoa/phòng ban (role_subject/department)
- ✓ Các component phức tạp: DepartmentSelector, UserSelector
- ✓ Các API liên quan: ALL_USERS, DEPARTMENTS, SEARCH_USER, SEARCH_DEPARTMENT
- ✓ Filter theo loại tài liệu
- ✓ Quản lý danh sách người dùng và phòng ban

### ✅ Giữ lại:
- ✓ Upload tài liệu (file + uploaded_by)
- ✓ Xem danh sách tài liệu
- ✓ Tìm kiếm tài liệu
- ✓ Sửa tên tài liệu và người tải lên
- ✓ Xóa tài liệu
- ✓ Xem chi tiết tài liệu
- ✓ Phân trang

## Cấu trúc dữ liệu mới

### Document Object:
```javascript
{
  _id: string,           // UUID
  filename: string,      // Tên file
  url: string,          // Đường dẫn file
  uploaded_by: string,  // Người tải lên
  createdAt: string     // Timestamp ISO 8601
}
```

## API Endpoints sử dụng

### 1. Upload tài liệu
```
POST /documents/vector/add
FormData: {
  file: File,
  uploaded_by: string
}
```

### 2. Lấy danh sách tài liệu
```
GET /documents/list?q={search}&limit={limit}&skip={skip}
```

### 3. Xem chi tiết tài liệu
```
GET /documents/vector/{doc_id}
```

### 4. Cập nhật tài liệu
```
PUT /documents/vector/{doc_id}
FormData: {
  filename: string (không có extension),
  uploaded_by: string
}
```

### 5. Xóa tài liệu
```
DELETE /documents/vector/{doc_id}
```

## Files thay đổi

### Mới:
- `DocumentsViewSimple.jsx` - Component chính đơn giản hóa (tất cả trong 1 file)

### Đã cập nhật:
- `App.jsx` - Import DocumentsViewSimple thay vì DocumentsView
- `api.js` - Thêm endpoint VECTOR_GET

### Có thể xóa (nếu muốn):
- `DocumentsView.jsx` (phiên bản cũ)
- `DocumentsView_old.jsx`
- `DocumentView/DepartmentSelector.jsx`
- `DocumentView/UserSelector.jsx`

## Giao diện mới

### 1. Header
- Tiêu đề "Quản lý Tài liệu"
- Nút "Thêm Tài liệu"

### 2. Tìm kiếm
- Chỉ có ô tìm kiếm văn bản đơn giản
- Không có filter loại tài liệu

### 3. Bảng tài liệu
| Tên tài liệu | Người tải lên | Ngày tạo | Hành động |
|--------------|---------------|----------|-----------|
| file.pdf     | admin         | 30/10/2025 | Xem/Sửa/Xóa |

### 4. Modal Upload
- Chọn file
- Người tải lên (auto-fill từ user hiện tại, disabled)

### 5. Modal Sửa
- Tên tài liệu (không cần extension)
- Người tải lên

### 6. Modal Xóa
- Xác nhận xóa

### 7. Modal Chi tiết
- Tên tài liệu
- Người tải lên
- Ngày tạo
- Kích thước file (nếu có)

## Hướng dẫn sử dụng

### Khởi động ứng dụng:
```bash
npm run dev
```

### Test các chức năng:
1. **Upload**: Click "Thêm Tài liệu" → Chọn file → "Tải lên"
2. **Tìm kiếm**: Gõ từ khóa vào ô tìm kiếm
3. **Xem**: Click "Xem" ở hàng tài liệu
4. **Sửa**: Click "Sửa" → Thay đổi tên/người tải → "Cập nhật"
5. **Xóa**: Click "Xóa" → Xác nhận

## Lưu ý kỹ thuật

### Token Management:
- Auto-refresh token khi sắp hết hạn (< 5 phút)
- Clear token khi logout
- Validate token trước mỗi API call

### Error Handling:
- Hiển thị lỗi rõ ràng
- Auto-dismiss sau 5 giây (có thể click X để đóng sớm)

### Debouncing:
- Tìm kiếm debounce 500ms để tránh gọi API liên tục

### Loading States:
- Loading khi khởi tạo
- Loading khi tìm kiếm
- Loading trong modal

## So sánh trước/sau

### Trước:
- 1018 dòng code
- 12 files components
- 6 API endpoints
- 4 modal components
- Phân quyền phức tạp

### Sau:
- 1 file duy nhất (~1000 dòng bao gồm cả modal)
- 0 dependencies components
- 5 API endpoints đơn giản
- All-in-one component
- Chỉ quản lý tài liệu thuần túy

## Tương lai mở rộng

Nếu cần thêm tính năng sau này:
1. Thêm filter loại file (.pdf, .docx, v.v.)
2. Thêm sort theo tên/ngày
3. Thêm bulk delete
4. Thêm download file
5. Thêm preview file

Chỉ cần thêm vào `DocumentsViewSimple.jsx` - không cần tạo thêm files.

## Checklist hoàn thành

- [x] Loại bỏ file_type/folder
- [x] Loại bỏ role_user
- [x] Loại bỏ role_subject/department
- [x] Tạo DocumentsViewSimple.jsx
- [x] Cập nhật App.jsx
- [x] Cập nhật api.js
- [x] Test upload
- [x] Test search
- [x] Test view/edit/delete
- [x] Viết documentation

---

**Ngày cập nhật**: 30/10/2025  
**Phiên bản**: 2.0 - Simplified Edition
