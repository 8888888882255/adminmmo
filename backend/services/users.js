const fs = require("fs");
const path = require("path");
const usersPath = path.join(__dirname, "../public/users.json");

// 🔧 Hàm hỗ trợ xóa dấu tiếng Việt
const removeVietnameseTones = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, "-");
};

// 🔧 Đọc dữ liệu JSON
const readUsers = () => {
  if (!fs.existsSync(usersPath)) return [];
  const data = fs.readFileSync(usersPath, "utf8");
  return data ? JSON.parse(data) : [];
};

// 🔧 Ghi dữ liệu JSON
const writeUsers = (users) => {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), "utf8");
};

// 🔧 Sinh metadata mặc định (SEO)
const autoFillSEO = (user) => {
  if (!user.Slug) user.Slug = removeVietnameseTones(user.HoTen || "nguoi-dung");

  if (!user.Media) user.Media = {};
  if (!user.Media.Avt) user.Media.Avt = {};
  if (!user.Media.Avt.Alt) user.Media.Avt.Alt = `Ảnh đại diện của ${user.HoTen}`;
  if (!user.Media.Avt.Title) user.Media.Avt.Title = `Ảnh đại diện hồ sơ ${user.HoTen}`;
  if (!user.Media.Avt.Description) user.Media.Avt.Description = `Ảnh đại diện chính thức của ${user.HoTen}`;

  if (!user.Media.Bia) user.Media.Bia = {};
  if (!user.Media.Bia.Alt) user.Media.Bia.Alt = `Ảnh bìa của ${user.HoTen}`;
  if (!user.Media.Bia.Title) user.Media.Bia.Title = `Ảnh bìa nổi bật của ${user.HoTen}`;
  if (!user.Media.Bia.Description) user.Media.Bia.Description = `Ảnh bìa thể hiện phong cách của ${user.HoTen}`;

  if (!user.FaceBook) user.FaceBook = { Chinh: {} };
  if (!user.FaceBook.Chinh.title) user.FaceBook.Chinh.title = `${user.HoTen} - Trang Facebook chính thức`;
  if (!user.FaceBook.Chinh.description) user.FaceBook.Chinh.description = `Theo dõi ${user.HoTen} trên Facebook để cập nhật thông tin và hỗ trợ.`;
  if (!user.FaceBook.Chinh.type) user.FaceBook.Chinh.type = "Trang chính thức";

  if (!user.Zalo) user.Zalo = {};
  if (!user.Zalo.Title) user.Zalo.Title = `Liên hệ ${user.HoTen} qua Zalo`;
  if (!user.Zalo.Description) user.Zalo.Description = `Kết nối với ${user.HoTen} qua Zalo để được hỗ trợ nhanh nhất.`;

  if (user.DichVu) {
    ["chinh", "phu"].forEach((type) => {
      (user.DichVu[type] || []).forEach((dv) => {
        if (!dv.moTa) dv.moTa = `Dịch vụ ${dv.ten} do ${user.HoTen} cung cấp.`;
      });
    });
  }

  if (user.Stk) {
    if (user.Stk.chinh && !user.Stk.chinh.moTa)
      user.Stk.chinh.moTa = "Tài khoản chính dùng cho giao dịch chính thức.";
    (user.Stk.phu || []).forEach((stk) => {
      if (!stk.moTa) stk.moTa = "Tài khoản phụ phục vụ giao dịch phụ.";
    });
  }

  return user;
};

// 🔹 Lấy toàn bộ
exports.getAll = () => {
  let users = readUsers();
  return users.sort((a, b) => b.SoTien - a.SoTien);
};

// 🔹 Lấy theo ID
exports.getById = (id) => {
  const users = readUsers();
  return users.find((u) => u.Id === parseInt(id));
};

// 🔹 Thêm mới
exports.addUser = (userData) => {
  let users = readUsers();
  userData.Id = users.length ? Math.max(...users.map(u => u.Id)) + 1 : 1;
  userData = autoFillSEO(userData);
  users.push(userData);
  writeUsers(users);
  return userData;
};

// 🔹 Cập nhật
exports.updateUser = (id, newData) => {
  let users = readUsers();
  const index = users.findIndex((u) => u.Id === parseInt(id));
  if (index === -1) return null;
  users[index] = { ...users[index], ...autoFillSEO(newData) };
  writeUsers(users);
  return users[index];
};

// 🔹 Xóa
exports.deleteUser = (id) => {
  let users = readUsers();
  users = users.filter((u) => u.Id !== parseInt(id));
  writeUsers(users);
  return true;
};

// 🔹 Tìm kiếm theo tên
exports.searchByName = (keyword) => {
  const users = readUsers();
  return users.filter((u) => u.HoTen.toLowerCase().includes(keyword.toLowerCase()));
};

// 🔹 Lọc theo dịch vụ chính
exports.filterByMainService = (serviceName) => {
  const users = readUsers();
  return users.filter((u) => 
    u.DichVu?.chinh?.some(dv => dv.ten.toLowerCase().includes(serviceName.toLowerCase()))
  );
};

// 🔹 Lọc theo trạng thái (1=hoạt động, 0=khoá)
exports.filterByStatus = (status) => {
  const users = readUsers();
  return users.filter((u) => u.TrangThai == status);
};

// 🔹 Lọc theo vai trò (1=admin, 2=kiểm duyệt)
exports.filterByRole = (role) => {
  const users = readUsers();
  return users.filter((u) => u.VaiTro == role);
};
