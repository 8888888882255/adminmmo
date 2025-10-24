import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Moon, Sun, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = () => {
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo + tên thương hiệu */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/Logo.jpg"
              alt="Logo AdminMmo"
              className="w-12 h-12 rounded-2xl object-cover shadow-md group-hover:scale-110 transition-transform duration-300"
            />
            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity">
              AdminMmo
            </span>
          </Link>

          {/* Menu + Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="hero"
                size="default"
                onClick={() => navigate("/")}
                className="whitespace-nowrap font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90 transition-all"
              >
                🚨 Danh Sách Admin
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => navigate("/policy")}
                className="whitespace-nowrap border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                Chính Sách
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => navigate("/about")}
                className="whitespace-nowrap border-purple-400 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
              >
                Giới Thiệu
              </Button>
            </div>

            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-blue-500" />}
            </Button>

            {/* Menu mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMenu}
              className="md:hidden rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="mt-3 flex justify-center md:hidden animate-fade-in">
            <div className="w-[90%] max-w-[340px] flex flex-col gap-3 p-4 border border-gray-300 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-900/90 backdrop-blur-md">
              <Button
                variant="hero"
                size="default"
                onClick={() => {
                  navigate("/");
                  setMenuOpen(false);
                }}
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:opacity-90"
              >
                🚨 Danh Sách Admin
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/policy");
                  setMenuOpen(false);
                }}
                className="border-blue-400 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                Chính Sách
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigate("/about");
                  setMenuOpen(false);
                }}
                className="border-purple-400 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
              >
                Giới Thiệu
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
