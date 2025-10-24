import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, CheckCircle2, TrendingUp } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-hero py-16 px-4 text-center">
          <div className="container mx-auto max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
              Về AdminMmo
            </h1>
            <p className="text-base md:text-lg text-muted-foreground animate-slide-up leading-relaxed">
              AdminMmo là nền tảng giúp người dùng kiểm tra uy tín của cá nhân,
              tổ chức hoặc thương hiệu trước khi giao dịch, nhằm xây dựng môi trường
              minh bạch và đáng tin cậy tại Việt Nam.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="mb-12 text-center md:text-left">
              <h2 className="text-3xl font-bold mb-4">Sứ mệnh của AdminMmo</h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                Chúng tôi mong muốn tạo ra một hệ sinh thái kiểm tra uy tín minh bạch,
                nơi người dùng có thể dễ dàng tra cứu thông tin, chia sẻ đánh giá
                và xác minh độ tin cậy của đối tác, người bán, hoặc dịch vụ.
              </p>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="animate-slide-up">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Đánh giá uy tín</h3>
                      <p className="text-sm text-muted-foreground">
                        Cung cấp công cụ để người dùng tra cứu, đánh giá và chấm điểm độ uy tín của đối tác hoặc tổ chức.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Cộng đồng minh bạch</h3>
                      <p className="text-sm text-muted-foreground">
                        Xây dựng cộng đồng người dùng chia sẻ đánh giá và phản hồi chân thực về trải nghiệm thực tế.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Xác minh thông tin</h3>
                      <p className="text-sm text-muted-foreground">
                        Hỗ trợ xác minh thông tin, giúp đảm bảo dữ liệu chính xác và khách quan.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="animate-slide-up" style={{ animationDelay: "300ms" }}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Phát triển bền vững</h3>
                      <p className="text-sm text-muted-foreground">
                        Không ngừng nâng cấp tính năng và mở rộng dữ liệu để hỗ trợ người dùng tra cứu chính xác hơn.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 px-4 bg-muted/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-center md:text-left">Cách hoạt động</h2>
            <div className="space-y-6">
              {[
                {
                  step: 1,
                  title: "Tra cứu thông tin",
                  desc: "Người dùng nhập tên, số điện thoại, email hoặc tài khoản mạng xã hội để kiểm tra độ uy tín.",
                },
                {
                  step: 2,
                  title: "Xem đánh giá & điểm uy tín",
                  desc: "Kết quả hiển thị các đánh giá, phản hồi và điểm uy tín được tổng hợp từ cộng đồng.",
                },
                {
                  step: 3,
                  title: "Gửi đánh giá của bạn",
                  desc: "Người dùng có thể gửi nhận xét hoặc chấm điểm uy tín để đóng góp cho cộng đồng.",
                },
                {
                  step: 4,
                  title: "Xây dựng môi trường tin cậy",
                  desc: "Mọi người cùng nhau góp phần tạo ra không gian giao dịch minh bạch và an toàn.",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 text-white font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Community Guidelines */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-center md:text-left">
              Quy tắc cộng đồng AdminMmo
            </h2>
            <div className="space-y-4 text-muted-foreground text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <p>Chia sẻ đánh giá trung thực và dựa trên trải nghiệm thực tế.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <p>Không đăng tải thông tin sai lệch, mang tính công kích hoặc xúc phạm người khác.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <p>Tôn trọng quyền riêng tư và bảo mật thông tin người dùng.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <p>Không quảng cáo, spam hoặc lợi dụng nền tảng cho mục đích thương mại.</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <p>Hợp tác với quản trị viên khi có yêu cầu xác minh thông tin.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
