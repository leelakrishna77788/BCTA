import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { assets } from "../../assets/assets";

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white shadow-md" : "bg-white/90 backdrop-blur"
      }`}
    >
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between relative">
        {/* LOGO */}
        <div
          className="flex items-center"
          style={{ marginLeft: '0.75rem' }}
        >
          <Link
            to="/"
            className="flex items-center"
            style={{
              transform: isHome ? 'scale(1.7) translateY(12px)' : 'scale(1) translateY(0px)',
              filter: isHome ? 'drop-shadow(0 0 25px rgba(0,0,80,0.9))' : 'none',
              transition: 'transform 0.5s ease-in-out, filter 0.5s ease-in-out',
              display: 'inline-flex',
            }}
          >
            <img
              src={assets.logo}
              alt="BCTA Logo"
              className="w-10 h-10 sm:w-14 sm:h-14 object-contain rounded-xl"
            />
          </Link>
        </div>

        {/* MENU */}
        <nav className="hidden md:flex gap-6 lg:gap-10 font-medium text-blue-900 absolute left-1/2 -translate-x-1/2">
          <Link to="/" className="hover:text-blue-600 transition text-sm lg:text-base">
            Home
          </Link>
          <Link to="/about" className="hover:text-blue-600 transition text-sm lg:text-base">
            About
          </Link>
          <Link to="/services" className="hover:text-blue-600 transition text-sm lg:text-base">
            Services
          </Link>
          <Link to="/presidents" className="hover:text-blue-600 transition text-sm lg:text-base">
            Presidents
          </Link>
          <Link to="/contact" className="hover:text-blue-600 transition text-sm lg:text-base">
            Contact
          </Link>
        </nav>

        {/* MOBILE MENU & LOGIN */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
          >
            Login
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-blue-900 hover:bg-blue-50 rounded-lg transition"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-blue-100 shadow-lg">
          <nav className="flex flex-col px-4 py-4 space-y-2">
            <Link to="/" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
              Home
            </Link>
            <Link to="/about" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
              About
            </Link>
            <Link to="/services" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
              Services
            </Link>
            <Link to="/presidents" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
              Presidents
            </Link>
            <Link to="/contact" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-blue-900 hover:bg-blue-50 rounded-lg transition font-medium">
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
