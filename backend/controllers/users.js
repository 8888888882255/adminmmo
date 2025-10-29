const userService = require("../services/users");

// Lấy tất cả
exports.getAllUsers = (req, res) => {
  res.json(userService.getAll());
};

// Lấy theo ID
exports.getUserById = (req, res) => {
  const user = userService.getById(req.params.id);
  if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
  res.json(user);
};

// Thêm mới
exports.addUser = (req, res) => {
  const user = userService.addUser(req.body);
  res.status(201).json(user);
};

// Cập nhật
exports.updateUser = (req, res) => {
  const updated = userService.updateUser(req.params.id, req.body);
  if (!updated) return res.status(404).json({ message: "Không tìm thấy người dùng" });
  res.json(updated);
};

// Xóa
exports.deleteUser = (req, res) => {
  userService.deleteUser(req.params.id);
  res.json({ message: "Đã xóa thành công" });
};

// Tìm kiếm
exports.searchUser = (req, res) => {
  const { keyword } = req.query;
  res.json(userService.searchByName(keyword || ""));
};

// Lọc theo dịch vụ chính
exports.filterByMainService = (req, res) => {
  const { service } = req.query;
  res.json(userService.filterByMainService(service || ""));
};

// Lọc theo trạng thái
exports.filterByStatus = (req, res) => {
  const { status } = req.query;
  res.json(userService.filterByStatus(status));
};

// Lọc theo vai trò
exports.filterByRole = (req, res) => {
  const { role } = req.query;
  res.json(userService.filterByRole(role));
};
