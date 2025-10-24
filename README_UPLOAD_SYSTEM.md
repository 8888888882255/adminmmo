# Hệ thống Upload File và Ảnh - Multi-tenant

## 🎯 **Tổng quan**

Hệ thống cho phép `tenant_admin` mua gói dịch vụ và kích hoạt tính năng upload file/ảnh cho tất cả `tenant_user` trong cùng tenant.

## 🔄 **Luồng hoạt động**

### 1. **Tenant Admin mua gói dịch vụ**
- `tenant_admin` đăng nhập và vào trang Shop
- Chọn gói dịch vụ phù hợp (Basic, Premium, Enterprise)
- Thanh toán qua PayPal
- Sau khi thanh toán thành công, hệ thống tự động:
  - Cập nhật trạng thái purchase thành `completed`
  - Tạo/update `TenantOfferedPackage` với status `active`
  - **Kích hoạt service data cho TẤT CẢ users trong tenant**

### 2. **Kích hoạt cho Tenant Users**
Khi `tenant_admin` mua gói thành công, hệ thống sẽ:
```javascript
// Lấy tất cả users trong tenant
const tenantUsers = await User.findAll({
  where: { tenant_id: purchase.tenant_id }
});

// Tạo service data cho từng user
for (const user of tenantUsers) {
  const [serviceData, created] = await ServiceData.findOrCreate({
    where: {
      tenant_id: purchase.tenant_id,
      user_id: user.user_id,
      package_id: purchase.package_id
    },
    defaults: {
      object_key: `tenant_${purchase.tenant_id}_user_${user.user_id}`,
      file_size: 0,
      bandwidth_used: 0,
      database_used: 0,
      api_calls_used: 0,
      status: 'active'  // ← Quan trọng!
    }
  });
}
```

### 3. **Tenant User upload file**
- `tenant_user` đăng nhập và vào trang Service Data
- Hệ thống kiểm tra xem có service data active không
- Nếu có → cho phép upload file/ảnh
- Nếu không → hiển thị thông báo yêu cầu tenant_admin mua gói

## 🔧 **Các API Endpoints**

### Upload File
```
POST /api/file-upload/upload
Content-Type: multipart/form-data

Body:
- file: File to upload
- tenant_id: Tenant ID
- user_id: User ID
- package_id: Package ID (optional - sẽ tự động tìm)
```

### Debug Service Data
```
GET /api/file-upload/debug/service-data?tenant_id=1&user_id=2
```

### Check Tenant Activation
```
GET /api/file-upload/tenant/:tenant_id/activation
```

## 📊 **Database Schema**

### ServiceData Table
```sql
CREATE TABLE service_data (
  data_id INT PRIMARY KEY,
  tenant_id INT,
  user_id INT,
  package_id INT,
  object_key VARCHAR(255),
  file_size BIGINT DEFAULT 0,
  bandwidth_used BIGINT DEFAULT 0,
  database_used BIGINT DEFAULT 0,
  api_calls_used INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### TenantOfferedPackage Table
```sql
CREATE TABLE tenant_offered_packages (
  tenant_id INT,
  package_id INT,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  PRIMARY KEY (tenant_id, package_id)
);
```

## 🚀 **Cách test**

### 1. **Test với Tenant Admin**
```bash
# 1. Đăng nhập với tenant_admin
# 2. Vào trang Shop
# 3. Mua gói dịch vụ
# 4. Thanh toán thành công
# 5. Kiểm tra Service Data page
```

### 2. **Test với Tenant User**
```bash
# 1. Đăng nhập với tenant_user (cùng tenant)
# 2. Vào trang Service Data
# 3. Click "Debug Service Data" để kiểm tra
# 4. Thử upload file/ảnh
```

## 🔍 **Debug và Troubleshooting**

### Kiểm tra trạng thái
1. **Debug Service Data**: Click nút "Debug Service Data" trong ServiceDataPage
2. **Kiểm tra logs**: Xem console logs trong backend
3. **Database check**: Kiểm tra bảng `service_data` và `tenant_offered_packages`

### Các vấn đề thường gặp

#### 1. **"Service not activated" error**
**Nguyên nhân**: Không có service data active
**Giải pháp**: 
- Kiểm tra tenant_admin đã mua gói chưa
- Kiểm tra bảng `service_data` có record với status = 'active'
- Restart backend server

#### 2. **"Storage limit exceeded" error**
**Nguyên nhân**: Vượt quá giới hạn lưu trữ
**Giải pháp**: 
- Mua gói có dung lượng lớn hơn
- Xóa file cũ

#### 3. **MinIO connection error**
**Nguyên nhân**: MinIO chưa được cấu hình
**Giải pháp**: 
- Kiểm tra environment variables
- Đảm bảo MinIO server đang chạy

## 📝 **Environment Variables**

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_BUCKET_NAME=tenant-files
MINIO_USE_SSL=false

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

## 🎯 **Kết luận**

Hệ thống hoạt động theo nguyên tắc:
- **Tenant Admin mua gói** → **Kích hoạt cho toàn bộ tenant**
- **Tenant User sử dụng** → **Tự động có quyền upload**
- **Kiểm tra giới hạn** → **Đảm bảo không vượt quota**

Đảm bảo restart backend server sau khi thay đổi code để áp dụng các cập nhật! 