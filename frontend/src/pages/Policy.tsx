import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

export default function Policy() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4 md:py-16">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center md:text-left animate-fade-in">
            Chính sách & Điều khoản - AdminMmo
          </h1>

          <div className="space-y-8">
            {/* 1. Chính sách bảo mật */}
            <Card className="animate-slide-up">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">1. Chính sách bảo mật</h2>
                <div className="space-y-4 text-muted-foreground text-sm md:text-base">
                  <p>
                    AdminMmo cam kết bảo vệ quyền riêng tư của người dùng. Chúng tôi chỉ thu thập
                    các thông tin cần thiết để cung cấp dịch vụ kiểm tra uy tín và không chia sẻ dữ liệu cá nhân
                    với bên thứ ba nếu không có sự đồng ý của bạn.
                  </p>
                  <p className="font-semibold">Thông tin chúng tôi thu thập bao gồm:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Thông tin đăng ký tài khoản (email, tên người dùng)</li>
                    <li>Dữ liệu phản hồi hoặc đánh giá về uy tín</li>
                    <li>Thông tin liên hệ tự nguyện (được bảo mật tuyệt đối)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 2. Điều khoản sử dụng */}
            <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">2. Điều khoản sử dụng</h2>
                <div className="space-y-4 text-muted-foreground text-sm md:text-base">
                  <p>Khi sử dụng AdminMmo, bạn đồng ý rằng:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Cung cấp thông tin trung thực, chính xác và minh bạch</li>
                    <li>Không đăng tải nội dung sai sự thật, bôi nhọ hoặc gây hiểu nhầm</li>
                    <li>Tôn trọng quyền riêng tư và danh dự của cá nhân, tổ chức khác</li>
                    <li>Không sử dụng hệ thống vào mục đích thương mại trái phép</li>
                    <li>Tuân thủ các quy định pháp luật Việt Nam và chính sách nền tảng</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 3. Trách nhiệm của người dùng */}
            <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">3. Trách nhiệm của người dùng</h2>
                <div className="space-y-4 text-muted-foreground text-sm md:text-base">
                  <p>Người dùng cần đảm bảo:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Chỉ gửi thông tin chính xác và có căn cứ</li>
                    <li>Không spam hoặc gửi các đánh giá trùng lặp, gây nhiễu hệ thống</li>
                    <li>Không tiết lộ dữ liệu cá nhân của người khác</li>
                    <li>Chịu trách nhiệm hoàn toàn với nội dung mình đăng tải</li>
                    <li>Phối hợp với quản trị viên khi có yêu cầu xác minh</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 4. Quyền xử lý vi phạm */}
            <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">4. Xử lý vi phạm</h2>
                <div className="space-y-4 text-muted-foreground text-sm md:text-base">
                  <p>
                    AdminMmo có quyền thực hiện các biện pháp phù hợp khi phát hiện hành vi vi phạm:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Xóa hoặc ẩn nội dung không phù hợp</li>
                    <li>Tạm khóa hoặc xóa tài khoản vi phạm</li>
                    <li>Từ chối đăng tải đánh giá không xác thực</li>
                    <li>Yêu cầu cung cấp thêm thông tin xác minh</li>
                    <li>Hợp tác với cơ quan chức năng nếu cần thiết</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* 5. Giới hạn trách nhiệm */}
            <Card className="animate-slide-up" style={{ animationDelay: "400ms" }}>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">5. Giới hạn trách nhiệm</h2>
                <div className="space-y-4 text-muted-foreground text-sm md:text-base">
                  <p>
                    AdminMmo là nền tảng chia sẻ thông tin đánh giá uy tín dựa trên đóng góp của cộng đồng.
                    Chúng tôi không chịu trách nhiệm đối với:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Tính chính xác tuyệt đối của mọi đánh giá từ người dùng</li>
                    <li>Thiệt hại phát sinh từ việc sử dụng thông tin trên hệ thống</li>
                    <li>Các quyết định cá nhân dựa trên dữ liệu từ nền tảng</li>
                    <li>Tranh chấp giữa các bên người dùng</li>
                  </ul>
                  <p className="mt-4">
                    Người dùng nên tự xem xét, xác minh và chịu trách nhiệm với các hành động của mình.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 6. Liên hệ */}
            <Card className="animate-slide-up" style={{ animationDelay: "500ms" }}>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">6. Liên hệ hỗ trợ</h2>
                <div className="space-y-4 text-muted-foreground text-sm md:text-base">
                  <p>Nếu bạn có bất kỳ thắc mắc nào về chính sách hoặc điều khoản, vui lòng liên hệ:</p>
                  <ul className="space-y-2">
                    <li>
                      <strong>Email:</strong> Miyaru2k5@gmail.com
                    </li>
                    <li>
                      <strong>Zalo:</strong> 0383 277 782
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
