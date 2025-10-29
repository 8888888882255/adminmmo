import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

interface MediaInfo {
  Src: string;
  Alt: string;
}

interface User {
  Id: number;
  HoTen: string;
  TenPhu?: string;
  VaiTro: string; // "1" = Admin, "2" = KDV
  TrangThai: string; // "1" = Hoạt động
  Media: {
    Avt: MediaInfo;
  };
  Slug: string;
  Zalo?: string;
  LinkWeb?: string;
  SoTien?: number;
  Stk?: {
    chinh?: {
      soTaiKhoan: string;
      nganHang: string;
    };
  };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5083";

  // === FETCH DATA FROM BACKEND ===
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`${API_URL}/api/users`);
        if (!response.ok) throw new Error("Không thể kết nối đến máy chủ.");

        const data: User[] = await response.json();

        // Lọc: chỉ hiển thị TrạngThai = "1" (Hoạt động)
        const activeUsers = data.filter((user) => user.TrangThai === "1");

        // Sắp xếp theo SoTien giảm dần
        const sorted = [...activeUsers].sort(
          (a, b) => (b.SoTien || 0) - (a.SoTien || 0)
        );

        setUsers(sorted);
        setFilteredUsers(sorted);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [API_URL]);

  // === TÌM KIẾM ===
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query === "") {
      setFilteredUsers(users);
      return;
    }

    const result = users.filter((user) => {
      const name = user.HoTen.toLowerCase();
      const stk = user.Stk?.chinh?.soTaiKhoan?.toLowerCase() || "";
      const zalo = (typeof user.Zalo === "string" ? user.Zalo : "").toLowerCase();
      const web = user.LinkWeb?.toLowerCase() || "";
      const slug = user.Slug.toLowerCase();

      return (
        name.includes(query) ||
        stk.includes(query) ||
        zalo.includes(query) ||
        web.includes(query) ||
        slug.includes(query)
      );
    });

    setFilteredUsers(result);
  }, [searchQuery, users]);

  // === PHÂN LOẠI ===
  const adminList = filteredUsers.filter((u) => u.VaiTro === "1");
  const kdvList = filteredUsers.filter((u) => u.VaiTro === "2");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-pink-50 via-white to-pink-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 transition-all duration-500">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="absolute inset-0 opacity-15">
            <img
              src={heroImage}
              alt="Hero"
              className="w-full h-full object-cover blur-sm"
            />
          </div>
          <div className="container mx-auto relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
                Cộng đồng Admin{" "}
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  MMO
                </span>{" "}
                Việt Nam
              </h1>
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300">
                Tìm kiếm và xác minh các Admin MMO uy tín trước khi giao dịch.
              </p>
              <div className="mt-8 relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 dark:text-gray-500" />
                <Input
                  type="text"
                  placeholder="Nhập tên, số tài khoản, zalo, website hoặc slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-14 h-14 text-base rounded-2xl border-2 border-pink-300 focus:border-pink-500 shadow-md dark:bg-gray-800 dark:border-gray-700 dark:text-white transition-all"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <section className="container mx-auto px-4 py-12">
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-pink-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Đang tải danh sách...</p>
            </div>
          </section>
        )}

        {/* Error State */}
        {error && (
          <section className="container mx-auto px-4 py-12">
            <div className="text-center py-10">
              <p className="text-red-600 dark:text-red-400 text-lg">
                Không thể tải dữ liệu. Vui lòng thử lại sau.
              </p>
            </div>
          </section>
        )}

        {/* Danh sách KDV (Hàng 1) */}
        {!loading && !error && (
          <section className="container mx-auto px-4 py-12 space-y-12">
            {/* KDV List */}
            {kdvList.length > 0 && (
              <div className="border border-purple-300 rounded-3xl p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-xl">
                <h2 className="flex items-center gap-2 font-bold mb-6 text-lg md:text-xl text-purple-700 dark:text-purple-400">
                  Danh sách KDV MMO
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center">
                  {kdvList.map((kdv, index) => (
                    <div
                      key={kdv.Id}
                      onClick={() => navigate(`/${kdv.Slug}`)}
                      className="cursor-pointer flex flex-col items-center transition-transform duration-300 hover:scale-110 group"
                    >
                      <div className="relative">
                        <img
                          src={kdv.Media.Avt.Src}
                          alt={kdv.HoTen}
                          className="w-20 h-20 rounded-full object-cover border-2 border-purple-300 group-hover:border-purple-500 transition-all shadow-md"
                        />
                        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm font-semibold">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2 leading-tight">
                        {kdv.HoTen}
                      </p>
                      {kdv.TenPhu && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">({kdv.TenPhu})</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin List */}
            {adminList.length > 0 && (
              <div className="border border-pink-300 rounded-3xl p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-xl">
                <h2 className="flex items-center gap-2 font-bold mb-6 text-lg md:text-xl text-pink-700 dark:text-pink-400">
                  Danh sách Admin MMO
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 text-center">
                  {adminList.map((admin, index) => (
                    <div
                      key={admin.Id}
                      onClick={() => navigate(`/${admin.Slug}`)}
                      className="cursor-pointer flex flex-col items-center transition-transform duration-300 hover:scale-110 group"
                    >
                      <div className="relative">
                        <img
                          src={admin.Media.Avt.Src}
                          alt={admin.HoTen}
                          className="w-20 h-20 rounded-full object-cover border-2 border-pink-300 group-hover:border-pink-500 transition-all shadow-md"
                        />
                        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm font-semibold">
                          {index + 1}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2 leading-tight">
                        {admin.HoTen}
                      </p>
                      {admin.TenPhu && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">({admin.TenPhu})</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Không có kết quả */}
            {kdvList.length === 0 && adminList.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-300 italic">
                  Không tìm thấy Admin hoặc KDV nào khớp với từ khóa.
                </p>
              </div>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}