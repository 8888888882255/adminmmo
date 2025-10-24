import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, Lock, Facebook, Globe, MessageCircle } from "lucide-react";

interface FacebookInfo {
  chinh?: string;
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
  id: number;
  name: string;
  username?: string;
  role: string;
  avatar: string;
  status: string;
  soTaiKhoan: string;
  nganHang: string;
  ngayThamGia: string;
  slug: string;
  facebook?: FacebookInfo;
  zalo?: string;
  web?: string;
  baoHiem?: BaoHiem;
  dichVu?: string[];
  chuTaiKhoan?: string;
  stkKhac?: TaiKhoanPhu[];
}

export default function AdminDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [admin, setAdmin] = useState<User | null>(null);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const response = await fetch("/user.json");
        if (!response.ok) throw new Error("Network response was not ok");
        const data: User[] = await response.json();
        const foundAdmin = data.find((user) => user.slug === slug);
        
        if (!foundAdmin) {
          toast.error("Không tìm thấy admin!");
          setAdmin(null);
          return;
        }
        
        setAdmin(foundAdmin);
      } catch (error) {
        toast.error("Lỗi khi tải dữ liệu admin.");
        console.error("Fetch error:", error);
      }
    };

    fetchAdmin();
  }, [slug]);

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
        <p className="text-lg">Không tìm thấy admin nào.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 to-pink-100 dark:from-gray-900 dark:to-gray-900 transition-all duration-500">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 text-gray-800 dark:text-gray-200">
        <div className="max-w-3xl mx-auto bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-xl p-8 border border-pink-100 dark:border-gray-700 backdrop-blur-md">
          <img
            src={admin.avatar}
            alt={admin.name}
            className="w-32 h-32 rounded-full mx-auto border-4 border-pink-400 dark:border-pink-500 shadow-lg"
          />
          <h1 className="text-3xl font-bold mt-4 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent text-center">
            {admin.name}
          </h1>
          {admin.username && (
            <p className="text-gray-500 dark:text-gray-400 text-center mb-4">@{admin.username}</p>
          )}
          
          <div className="flex justify-center gap-3 mb-6 flex-wrap">
            {admin.facebook?.chinh && (
              <a
                href={`https://facebook.com/${admin.facebook.chinh}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                  <Facebook className="w-4 h-4" /> Check Facebook
                </Button>
              </a>
            )}
            {admin.zalo && (
              <a
                href={`https://zalo.me/${admin.zalo}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Check Zalo
                </Button>
              </a>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="p-5 border-2 border-yellow-300 dark:border-yellow-500 bg-white/80 dark:bg-gray-800/60">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                <ShieldCheck className="w-5 h-5" /> Thông tin liên hệ
              </h2>
              <ul className="space-y-2 text-sm">
                {admin.facebook?.chinh && (
                  <li className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-blue-600" />
                    Facebook chính: 
                    <a
                      href={`https://facebook.com/${admin.facebook.chinh}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {admin.facebook.chinh}
                    </a>
                  </li>
                )}
                {admin.facebook?.phu && (
                  <li className="flex items-center gap-2">
                    <Facebook className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                     Facebook phụ: 
                    <a
                      href={`https://facebook.com/${admin.facebook.phu}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                     {admin.facebook.phu}
                    </a>
                  </li>
                )}
                {admin.zalo && (
                  <li className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-500" />
                    Zalo/SĐT: 
                    <a
                      href={`https://zalo.me/${admin.zalo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {admin.zalo}
                    </a>
                  </li>
                )}
                {admin.web && (
                  <li className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    Website: 
                    <a
                      href={admin.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {admin.web}
                    </a>
                  </li>
                )}
              </ul>
            </Card>

            <Card className="p-5 border-2 border-pink-300 dark:border-pink-500 bg-pink-50/70 dark:bg-gray-800/60 relative">
              <h2 className="font-semibold mb-3 flex items-center gap-2 text-pink-700 dark:text-pink-400">
                <Lock className="w-5 h-5" /> Quỹ Bảo Hiểm AdminMMO
              </h2>
              <p className="text-sm leading-relaxed">
                Từ ngày{" "}
                <span className="font-semibold text-pink-600 dark:text-pink-400">
                  {new Date(admin.baoHiem?.ngayDangKy || "").toLocaleDateString("vi-VN")}
                </span>
                , hệ thống đảm bảo an toàn với số tiền{" "}
                <span className="font-bold text-pink-600 dark:text-pink-400">
                  {admin.baoHiem?.soTien.toLocaleString("vi-VN")}đ
                </span>{" "}
                thuộc{" "}
                <span className="font-semibold text-pink-700 dark:text-pink-400">
                  {admin.baoHiem?.nguoiBaoHiem}
                </span>
                .
              </p>
              <Lock className="absolute right-4 bottom-4 w-8 h-8 text-pink-400 opacity-50" />
            </Card>
          </div>

          <Card className="p-5 border-2 border-yellow-300 dark:border-yellow-500 bg-white/80 dark:bg-gray-800/60">
            <h2 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-400">
              Dịch vụ cung cấp:
            </h2>
            <ul className="list-disc list-inside text-sm mb-4 space-y-1">
              {admin.dichVu?.map((dichVu, index) => (
                <li key={index}>{dichVu}</li>
              ))}
            </ul>
            <h2 className="font-semibold mb-2 text-yellow-700 dark:text-yellow-400">
              Chủ tài khoản: {admin.chuTaiKhoan}
            </h2>
            <ul className="text-sm space-y-1">
              <li>
                {admin.nganHang}: <strong>{admin.soTaiKhoan}</strong>
              </li>
              {admin.stkKhac?.map((stk, index) => (
                <li key={index}>
                  {stk.nganHang}: <strong>{stk.soTaiKhoan}</strong>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}