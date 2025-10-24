import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="mt-10 border-t bg-card">
      <div className="container mx-auto px-4 py-8 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo + mô tả */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-primary">© 2025 AdminMmo</p>
            <p>Hệ thống kiểm tra uy tín hàng đầu Việt Nam.</p>
          </div>

          {/* Thông tin thống kê */}
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-2 text-xs text-muted-foreground">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
              8,542 Lượt kiểm tra
            </span>
            <span className="px-3 py-1 rounded-full bg-success/10 text-success font-medium">
              97% Đánh giá uy tín
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
