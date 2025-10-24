import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];

interface User {
  id: number;
  name: string;
  role: "admin" | "qtv";
  avatar: string;
  status: "active" | "inactive";
  soTaiKhoan: string;
  nganHang: string;
  ngayThamGia: string;
  slug: string;
  facebook: { chinh: string; phu?: string };
  zalo?: string;
  web?: string;
  baoHiem: { ngayDangKy: string; soTien: number; nguoiBaoHiem: string };
  dichVu: string[];
  chuTaiKhoan: string;
  stkKhac: { nganHang: string; soTaiKhoan: string }[];
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusesData, setStatusesData] = useState<{ name: string; value: number }[]>([]);
  const [joinData, setJoinData] = useState<{ date: string; users: number }[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalInsurance, setTotalInsurance] = useState(0);
  const [totalServices, setTotalServices] = useState(0);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/user.json");
        if (!response.ok) throw new Error("Không thể tải dữ liệu người dùng");
        const data: User[] = await response.json();
        const filtered = data.filter((u) => u.role === "admin" || u.role === "qtv");
        setUsers(filtered);

        const statusCounts = filtered.reduce((acc, user) => {
          acc[user.status] = (acc[user.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        setStatusesData(
          Object.entries(statusCounts).map(([name, value]) => ({
            name: name === "active" ? "Đang hoạt động" : "Ngừng hoạt động",
            value,
          }))
        );

        const sortedDates = [...filtered].sort(
          (a, b) => new Date(a.ngayThamGia).getTime() - new Date(b.ngayThamGia).getTime()
        );
        const cumulative = sortedDates.map((user, index) => ({
          date: new Date(user.ngayThamGia).toLocaleDateString("vi-VN"),
          users: index + 1,
        }));
        setJoinData(cumulative);

        setTotalUsers(filtered.length);
        setTotalInsurance(filtered.reduce((sum, user) => sum + user.baoHiem.soTien, 0));
        setTotalServices(filtered.reduce((sum, user) => sum + user.dichVu.length, 0));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 py-4 md:px-4 md:py-6 lg:px-6 lg:py-8 max-w-7xl">
        <div className="space-y-4 md:space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            📊 Thống kê quản trị
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-pink-100 to-pink-200 dark:from-pink-900 dark:to-pink-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tổng số quản trị viên</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-pink-600 dark:text-pink-300">{totalUsers}</div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tổng tiền bảo hiểm (VND)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">
                    {totalInsurance.toLocaleString("vi-VN")}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Tổng số dịch vụ</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-300">{totalServices}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
              <CardHeader>
                <CardTitle className="text-green-700 dark:text-green-300">
                  Số lượng quản trị viên theo thời gian
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] md:h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={joinData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="users"
                        name="Danh sách Admin"
                        stroke="#22c55e"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800">
              <CardHeader>
                <CardTitle className="text-yellow-700 dark:text-yellow-300">Trạng thái tài khoản</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[250px] md:h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={statusesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" name="Trạng thái Admin" radius={[4, 4, 0, 0]}>
                        {statusesData.map((entry, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))} </Bar>

                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
