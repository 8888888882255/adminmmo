import { useEffect, useState, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Edit, Trash2, Plus, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FacebookInfo {
  chinh: string;
  phu?: string;
}

interface BaoHiem {
  ngayDangKy: string;
  soTien: number;
  nguoiBaoHiem: string;
}

interface TaiKhoanPhu {
  nganHang: string;
  soTaiKhoan: string;
}

interface User {
  id: string;
  name: string;
  role: "admin" | "qtv";
  avatar: string;
  status: "active" | "inactive";
  soTaiKhoan: string;
  nganHang: string;
  ngayThamGia: string;
  slug: string;
  facebook: FacebookInfo;
  zalo?: string;
  web?: string;
  baoHiem: BaoHiem;
  dichVu: string[];
  chuTaiKhoan: string;
  stkKhac: TaiKhoanPhu[];
}

const AdminList = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form states for multi-input fields
  const [dichVuInputs, setDichVuInputs] = useState<string[]>([""]);
  const [stkKhacInputs, setStkKhacInputs] = useState<{ nganHang: string; soTaiKhoan: string }[]>([{ nganHang: "", soTaiKhoan: "" }]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/user.json");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        const mappedUsers = data.map((u: any, index: number) => ({
          ...u,
          id: (index + 1).toString(),
        }));
        setUsers(mappedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách quản trị viên.",
          variant: "destructive",
        });
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (editingUser) {
      setDichVuInputs(editingUser.dichVu.length > 0 ? [...editingUser.dichVu] : [""]);
      setStkKhacInputs(editingUser.stkKhac.length > 0 ? [...editingUser.stkKhac] : [{ nganHang: "", soTaiKhoan: "" }]);
    } else {
      setDichVuInputs([""]);
      setStkKhacInputs([{ nganHang: "", soTaiKhoan: "" }]);
    }
  }, [editingUser]);

  const filteredUsers = useCallback(() => {
    return users.filter((user) => {
      const matchesSearch = JSON.stringify(user).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter])();

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredUsers.length / itemsPerPage); i++) {
    pageNumbers.push(i);
  }

  const handleOpenForm = (user?: User) => {
    setEditingUser(user || null);
    setIsFormOpen(true);
  };

  const addDichVuInput = () => {
    setDichVuInputs((prev) => [...prev, ""]);
  };

  const removeDichVuInput = (index: number) => {
    setDichVuInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDichVuInput = (index: number, value: string) => {
    setDichVuInputs((prev) => {
      const newInputs = [...prev];
      newInputs[index] = value;
      return newInputs;
    });
  };

  const addStkKhacInput = () => {
    setStkKhacInputs((prev) => [...prev, { nganHang: "", soTaiKhoan: "" }]);
  };

  const removeStkKhacInput = (index: number) => {
    setStkKhacInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStkKhacInput = (index: number, field: "nganHang" | "soTaiKhoan", value: string) => {
    setStkKhacInputs((prev) => {
      const newInputs = [...prev];
      newInputs[index] = { ...newInputs[index], [field]: value };
      return newInputs;
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const slug = (formData.get("slug") as string) || name.toLowerCase().replace(/\s+/g, "-");
    const facebookPhu = formData.get("facebookPhu") as string;
    const zalo = formData.get("zalo") as string;
    const web = formData.get("web") as string;
    const newUser: User = {
      id: editingUser ? editingUser.id : Date.now().toString(),
      name,
      role: formData.get("role") as "admin" | "qtv",
      avatar: formData.get("avatar") as string,
      status: formData.get("status") as "active" | "inactive",
      soTaiKhoan: formData.get("soTaiKhoan") as string,
      nganHang: formData.get("nganHang") as string,
      ngayThamGia: formData.get("ngayThamGia") as string,
      slug,
      facebook: {
        chinh: formData.get("facebookChinh") as string,
        phu: facebookPhu ? facebookPhu : undefined,
      },
      zalo: zalo ? zalo : undefined,
      web: web ? web : undefined,
      baoHiem: {
        ngayDangKy: formData.get("baoHiemNgayDangKy") as string,
        soTien: parseInt(formData.get("baoHiemSoTien") as string, 10) || 0,
        nguoiBaoHiem: formData.get("baoHiemNguoiBaoHiem") as string,
      },
      dichVu: dichVuInputs.filter((dv) => dv.trim()),
      chuTaiKhoan: formData.get("chuTaiKhoan") as string,
      stkKhac: stkKhacInputs.filter((stk) => stk.nganHang.trim() && stk.soTaiKhoan.trim()),
    };

    if (editingUser) {
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? newUser : u))
      );
      toast({
        title: "Đã cập nhật quản trị viên",
        description: `${name} đã được cập nhật.`,
      });
    } else {
      setUsers((prev) => [...prev, newUser]);
      toast({
        title: "Đã thêm quản trị viên",
        description: `${name} đã được thêm vào hệ thống.`,
      });
    }
    setIsFormOpen(false);
  };

  const handleDelete = () => {
    if (selectedUser) {
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      toast({
        title: "Đã xóa quản trị viên",
        description: `${selectedUser.name} đã được xóa khỏi hệ thống.`,
      });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "qtv":
        return "default";
      default:
        return "outline";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold">👨‍💻 Danh sách Admin</h1>
            </div>
            <Button onClick={() => handleOpenForm()} className="gap-2">
              <Plus className="h-4 w-4" />
              Thêm Admin
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Lọc theo quyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả quyền</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="qtv">QTV</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Không hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hidden md:block rounded-lg border bg-card shadow-soft">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Quyền</TableHead>
                  <TableHead>Ngày tham gia</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-primary/5 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.ngayThamGia).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "success" : "destructive"}
                      >
                        {user.status === "active" ? "🟢 Hoạt động" : "🔴 Không hoạt động"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-4">
            {currentUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-lg border bg-card p-4 shadow-soft space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{user.name}</h3>
                    </div>
                  </div>
                  <Badge
                    variant={user.status === "active" ? "success" : "destructive"}
                  >
                    {user.status === "active" ? "🟢" : "🔴"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {user.role.toUpperCase()}
                  </Badge>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {new Date(user.ngayThamGia).toLocaleDateString("vi-VN")}
                  </span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenForm(user)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Không tìm thấy quản trị viên nào.
              </p>
            </div>
          )}

          {filteredUsers.length > 0 && (
            <div className="flex justify-center gap-2 pt-4 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Trước
              </Button>
              {pageNumbers.map((number) => (
                <Button
                  key={number}
                  variant={currentPage === number ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(number)}
                >
                  {number}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pageNumbers.length}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Chỉnh sửa Quản trị viên" : "Thêm Quản trị viên"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-h-[60vh] overflow-y-auto pr-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Tên
                </label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingUser?.name || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="slug" className="block text-sm font-medium mb-1">
                  Slug
                </label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={editingUser?.slug || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="role" className="block text-sm font-medium mb-1">
                  Quyền hạn
                </label>
                <Select
                  name="role"
                  defaultValue={editingUser?.role || "qtv"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn quyền hạn" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="qtv">QTV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="avatar" className="block text-sm font-medium mb-1">
                  Avatar URL
                </label>
                <Input
                  id="avatar"
                  name="avatar"
                  defaultValue={editingUser?.avatar || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">
                  Trạng thái
                </label>
                <Select
                  name="status"
                  defaultValue={editingUser?.status || "active"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Hoạt động</SelectItem>
                    <SelectItem value="inactive">Không hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="ngayThamGia" className="block text-sm font-medium mb-1">
                  Ngày tham gia
                </label>
                <Input
                  id="ngayThamGia"
                  name="ngayThamGia"
                  type="date"
                  defaultValue={editingUser?.ngayThamGia || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="facebookChinh" className="block text-sm font-medium mb-1">
                  Facebook chính
                </label>
                <Input
                  id="facebookChinh"
                  name="facebookChinh"
                  defaultValue={editingUser?.facebook.chinh || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="facebookPhu" className="block text-sm font-medium mb-1">
                  Facebook phụ (tùy chọn)
                </label>
                <Input
                  id="facebookPhu"
                  name="facebookPhu"
                  defaultValue={editingUser?.facebook.phu || ""}
                />
              </div>
              <div>
                <label htmlFor="zalo" className="block text-sm font-medium mb-1">
                  Zalo/SĐT (tùy chọn)
                </label>
                <Input
                  id="zalo"
                  name="zalo"
                  defaultValue={editingUser?.zalo || ""}
                />
              </div>
              <div>
                <label htmlFor="web" className="block text-sm font-medium mb-1">
                  Website (tùy chọn)
                </label>
                <Input
                  id="web"
                  name="web"
                  defaultValue={editingUser?.web || ""}
                />
              </div>
              <div>
                <label htmlFor="baoHiemNgayDangKy" className="block text-sm font-medium mb-1">
                  Ngày đăng ký bảo hiểm
                </label>
                <Input
                  id="baoHiemNgayDangKy"
                  name="baoHiemNgayDangKy"
                  type="date"
                  defaultValue={editingUser?.baoHiem.ngayDangKy || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="baoHiemSoTien" className="block text-sm font-medium mb-1">
                  Số tiền bảo hiểm
                </label>
                <Input
                  id="baoHiemSoTien"
                  name="baoHiemSoTien"
                  type="number"
                  defaultValue={editingUser?.baoHiem.soTien || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="baoHiemNguoiBaoHiem" className="block text-sm font-medium mb-1">
                  Người bảo hiểm
                </label>
                <Input
                  id="baoHiemNguoiBaoHiem"
                  name="baoHiemNguoiBaoHiem"
                  defaultValue={editingUser?.baoHiem.nguoiBaoHiem || ""}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Dịch vụ cung cấp
                </label>
                {dichVuInputs.map((dv, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <Input
                      value={dv}
                      onChange={(e) => updateDichVuInput(index, e.target.value)}
                      placeholder={`Dịch vụ ${index + 1}`}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => addDichVuInput()}
                      disabled={index !== dichVuInputs.length - 1}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => removeDichVuInput(index)}
                      disabled={dichVuInputs.length === 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div>
                <label htmlFor="chuTaiKhoan" className="block text-sm font-medium mb-1">
                  Chủ tài khoản
                </label>
                <Input
                  id="chuTaiKhoan"
                  name="chuTaiKhoan"
                  defaultValue={editingUser?.chuTaiKhoan || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="nganHang" className="block text-sm font-medium mb-1">
                  Ngân hàng chính
                </label>
                <Input
                  id="nganHang"
                  name="nganHang"
                  defaultValue={editingUser?.nganHang || ""}
                  required
                />
              </div>
              <div>
                <label htmlFor="soTaiKhoan" className="block text-sm font-medium mb-1">
                  Số tài khoản chính
                </label>
                <Input
                  id="soTaiKhoan"
                  name="soTaiKhoan"
                  defaultValue={editingUser?.soTaiKhoan || ""}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tài khoản phụ
                </label>
                {stkKhacInputs.map((stk, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <Input
                      value={stk.nganHang}
                      onChange={(e) => updateStkKhacInput(index, "nganHang", e.target.value)}
                      placeholder={`Ngân hàng phụ ${index + 1}`}
                    />
                    <Input
                      value={stk.soTaiKhoan}
                      onChange={(e) => updateStkKhacInput(index, "soTaiKhoan", e.target.value)}
                      placeholder={`Số TK phụ ${index + 1}`}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => addStkKhacInput()}
                      disabled={index !== stkKhacInputs.length - 1}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => removeStkKhacInput(index)}
                      disabled={stkKhacInputs.length === 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full">
              Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa quản trị viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa {selectedUser?.name}? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Xóa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminList;