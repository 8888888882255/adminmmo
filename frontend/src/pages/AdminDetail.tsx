import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ShieldCheck,
  Lock,
  Facebook,
  MessageCircle,
  Loader2,
  Wallet,
} from "lucide-react";

interface MediaInfo {
  Src: string;
  Alt: string;
  Title: string;
  Description: string;
}

interface FacebookInfo {
  id: string;
  url: string;
  title: string;
  description: string;
  type: string;
}

interface DichVu {
  ten: string;
  moTa: string;
  link: string;
}

interface TaiKhoanPhu {
  nganHang: string;
  soTaiKhoan: string;
  chuTaiKhoan: string;
  moTa: string;
}

interface ZaloInfo {
  SoDienThoai: string;
  Url: string;
  Title?: string;
  Description?: string;
}

interface User {
  Id: number;
  HoTen: string;
  TenPhu?: string;
  VaiTro: string;
  TrangThai: string;
  Media: {
    Avt: MediaInfo;
    Bia: MediaInfo;
  };
  Slug: string;
  GioiThieu: string;
  FaceBook: {
    Chinh?: FacebookInfo;
    Phu?: FacebookInfo[];
  };
  Zalo?: string | ZaloInfo;
  LinkWeb?: string;
  NgayDangKy?: string;
  SoTien?: number;
  DichVu?: {
    chinh?: DichVu[];
    phu?: DichVu[];
  };
  Stk?: {
    chinh?: TaiKhoanPhu;
    phu?: TaiKhoanPhu[];
  };
}

export default function AdminDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [admin, setAdmin] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5083";

  useEffect(() => {
    const fetchAdmin = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/users`);
        if (!response.ok) throw new Error("Không thể kết nối đến máy chủ.");

        const data: User[] = await response.json();
        const foundAdmin = data.find((user) => user.Slug === slug);

        if (!foundAdmin) {
          toast.error("Không tìm thấy thông tin admin.");
          setAdmin(null);
          return;
        }

        setAdmin(foundAdmin);
      } catch (error) {
        toast.error("Đã xảy ra lỗi khi tải dữ liệu.");
        console.error("Lỗi khi fetch dữ liệu:", error);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchAdmin();
  }, [slug, API_URL]);

  // Helper: Lấy số điện thoại từ Zalo
  const getZaloPhone = (zalo?: string | ZaloInfo): string | null => {
    if (!zalo) return null;
    if (typeof zalo === "string") return zalo;
    if (typeof zalo === "object" && "SoDienThoai" in zalo) {
      return zalo.SoDienThoai;
    }
    return null;
  };

  const zaloPhone = admin ? getZaloPhone(admin.Zalo) : null;
  const zaloUrl =
    admin && typeof admin.Zalo === "object" && "Url" in admin.Zalo
      ? admin.Zalo.Url
      : zaloPhone
      ? `https://zalo.me/${zaloPhone}`
      : null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-3" />
        <p className="text-gray-600 dark:text-gray-300 font-medium">
          Đang tải thông tin admin...
        </p>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-lg text-gray-700 dark:text-gray-200">
          Không tìm thấy admin nào với slug này.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 to-pink-100 dark:from-gray-900 dark:to-gray-900 transition-all duration-500">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto bg-white/80 dark:bg-gray-800/90 rounded-3xl shadow-2xl p-6 md:p-10 border border-pink-100 dark:border-gray-700 backdrop-blur-md">

          {/* Ảnh bìa */}
          <div className="relative -mt-6 mb-8">
            <img
              src={admin.Media.Bia.Src}
              alt={admin.Media.Bia.Alt}
              title={admin.Media.Bia.Title}
              className="w-full h-56 md:h-64 object-cover rounded-2xl shadow-lg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl"></div>
          </div>

          {/* Avatar & Tên */}
          <div className="flex flex-col items-center -mt-20 relative z-10">
            <img
              src={admin.Media.Avt.Src}
              alt={admin.Media.Avt.Alt}
              title={admin.Media.Avt.Title}
              className="w-32 h-32 md:w-36 md:h-36 rounded-full border-4 border-white dark:border-gray-800 shadow-xl object-cover"
            />
            <h1 className="mt-4 text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent text-center">
              {admin.HoTen}
            </h1>
            {admin.TenPhu && (
              <p className="text-lg text-gray-600 dark:text-gray-400 text-center">({admin.TenPhu})</p>
            )}
          </div>

          {/* Nút liên kết: Chỉ Facebook + Zalo */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {admin.FaceBook?.Chinh && (
              <a href={admin.FaceBook.Chinh.url} target="_blank" rel="noopener noreferrer">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                  <Facebook className="w-4 h-4" /> Facebook Chính
                </Button>
              </a>
            )}
            {zaloUrl && (
              <a href={zaloUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Zalo
                </Button>
              </a>
            )}
          </div>

          {/* === HÀNG 1: 2 CỘT CÂN BẰNG CHIỀU CAO === */}
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* Cột 1: Thông tin liên hệ */}
            <Card className="p-5 border-2 border-yellow-300 dark:border-yellow-500 bg-white/70 dark:bg-gray-800/70 flex flex-col h-full">
              <h2 className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5" /> Thông tin liên hệ
              </h2>
              <ul className="space-y-2 text-sm flex-1">
                {admin.FaceBook?.Chinh && (
                  <li className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    <span>Facebook chính:</span>
                    <a href={admin.FaceBook.Chinh.url} target="_blank" rel="noopener noreferrer" className="font-mono text-blue-600 hover:underline">
                      {admin.FaceBook.Chinh.id}
                    </a>
                  </li>
                )}
                {admin.FaceBook?.Phu?.map((fb, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-gray-500" />
                    <span>Facebook phụ:</span>
                    <a href={fb.url} target="_blank" rel="noopener noreferrer" className="font-mono text-gray-600 hover:underline">
                      {fb.id}
                    </a>
                  </li>
                ))}
                {zaloPhone && (
                  <li className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-indigo-600" />
                    <span>Zalo/SĐT:</span>
                    <a href={zaloUrl!} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {zaloPhone}
                    </a>
                  </li>
                )}
              </ul>
            </Card>

            {/* Cột 2: Quỹ Bảo Hiểm AdminMMO */}
            {admin.NgayDangKy && admin.SoTien ? (
              <Card className="p-5 border-2 border-pink-300 dark:border-pink-500 bg-pink-50/70 dark:bg-gray-800/70 relative overflow-hidden flex flex-col justify-center h-full">
                <h2 className="font-semibold text-pink-700 dark:text-pink-400 flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5" /> Quỹ Bảo Hiểm AdminMMO
                </h2>
                <p className="text-sm leading-relaxed">
                  Từ ngày <strong className="text-pink-600 dark:text-pink-400">
                    {new Date(admin.NgayDangKy).toLocaleDateString("vi-VN")}
                  </strong>, hệ thống đảm bảo an toàn với số tiền{" "}
                  <strong className="text-pink-700 dark:text-pink-300">
                    {admin.SoTien.toLocaleString("vi-VN")} đ
                  </strong> thuộc <strong className="text-pink-700 dark:text-pink-400">{admin.HoTen}</strong>.
                </p>
                <Lock className="absolute right-3 bottom-3 w-10 h-10 text-pink-400 opacity-30" />
              </Card>
            ) : (
              <div className="h-full" /> /* Giữ chỗ nếu không có thông tin quỹ bảo hiểm */
            )}
          </div>

          {/* === HÀNG 2: 1 CỘT DUY NHẤT - GỘP 3 PHẦN === */}
          <div className="mt-8">
            <Card className="p-6 border-2 border-purple-300 dark:border-purple-500 bg-purple-50/30 dark:bg-gray-800/70 space-y-6">
              
              {/* 1. Dịch vụ cung cấp */}
              {(admin.DichVu?.chinh || admin.DichVu?.phu) && (
                <div className="pb-4 border-b border-purple-200 dark:border-purple-700">
                  <h3 className="font-semibold text-purple-700 dark:text-purple-400 mb-2">Dịch vụ cung cấp</h3>
                  {admin.DichVu?.chinh && (
                    <>
                      <p className="font-medium text-sm mb-1 text-purple-600 dark:text-purple-300">Dịch vụ chính:</p>
                      <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                        {admin.DichVu.chinh.map((dv, i) => (
                          <li key={i}>
                            {dv.link ? (
                              <a href={dv.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                                {dv.ten}
                              </a>
                            ) : (
                              <span>{dv.ten}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  {admin.DichVu?.phu && (
                    <>
                      <p className="font-medium text-sm mb-1 text-purple-600 dark:text-purple-300">Dịch vụ phụ:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {admin.DichVu.phu.map((dv, i) => (
                          <li key={i}>
                            {dv.link ? (
                              <a href={dv.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {dv.ten}
                              </a>
                            ) : (
                              <span>{dv.ten}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* 2. Thông tin tài khoản */}
              {(admin.Stk?.chinh || admin.Stk?.phu) && (
                <div className="pb-4 border-b border-purple-200 dark:border-purple-700">
                  <h3 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5" /> Thông tin tài khoản
                  </h3>
                  {admin.Stk?.chinh && (
                    <div className="mb-3 p-3 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="font-medium">{admin.Stk.chinh.nganHang}</p>
                      <p className="text-lg font-bold">{admin.Stk.chinh.soTaiKhoan}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{admin.Stk.chinh.chuTaiKhoan}</p>
                      {admin.Stk.chinh.moTa && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{admin.Stk.chinh.moTa}</p>}
                    </div>
                  )}
                  {admin.Stk?.phu && admin.Stk.phu.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Tài khoản phụ:</p>
                      {admin.Stk.phu.map((stk, i) => (
                        <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <p className="font-medium text-sm">{stk.nganHang}</p>
                          <p className="font-mono">{stk.soTaiKhoan}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{stk.chuTaiKhoan}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Trạng thái tài khoản */}
              <div>
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5" /> Trạng thái tài khoản
                </h3>
                <div className="flex justify-between text-sm">
                  <span>Vai trò:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {admin.VaiTro === "1" ? "Admin" : "Kiểm duyệt viên"}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Trạng thái:</span>
                  <span className={`font-bold ${admin.TrangThai === "1" ? "text-green-600" : "text-red-600"}`}>
                    {admin.TrangThai === "1" ? "Hoạt động" : "Bị khóa"}
                  </span>
                </div>
              </div>

            </Card>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}