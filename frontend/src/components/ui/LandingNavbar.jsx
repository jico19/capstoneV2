import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import LandingButton from './LandingButton';
import AgriLogo from '../../assets/sariaya-agri-logo.jpg';

const NAV_LINKS = [
  { key: "home", label: "Home" },
  { key: "requirements", label: "Requirements" },
  { key: "about", label: "About Us" },
  { key: "faqs", label: "FAQs" },
];

export default function LandingNavbar({ activePage }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const SVG_W = 420;
  const SVG_H = 44;

  const getActivePage = () => {
    const path = location.pathname;
    if (path.startsWith("/requirements")) return "requirements";
    if (path.startsWith("/about")) return "about";
    if (path.startsWith("/faqs")) return "faqs";
    return "home";
  };

  const currentActivePage = activePage || getActivePage();

  const handleNav = (key) => {
    const routes = {
      home: "/",
      requirements: "/requirements",
      about: "/about",
      faqs: "/faqs",
    };
    navigate(routes[key] || "/");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="animate-navbar-drop w-full h-[68px] bg-white border-b border-[#e8e8e8] flex items-center px-10 relative z-[100] font-jakarta max-[910px]:px-5 max-[910px]:justify-between">

        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="hidden max-[910px]:flex flex-col justify-center items-center gap-[5px] w-9 h-9 bg-transparent border-none cursor-pointer p-1 shrink-0 -order-1"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className={`block w-[22px] h-[2px] bg-[#0a2a1a] rounded-sm origin-center transition-all duration-300 ${menuOpen ? "translate-y-[7px] rotate-45" : ""}`} />
          <span className={`block w-[22px] h-[2px] bg-[#0a2a1a] rounded-sm origin-center transition-all duration-200 ${menuOpen ? "opacity-0 w-0" : ""}`} />
          <span className={`block w-[22px] h-[2px] bg-[#0a2a1a] rounded-sm origin-center transition-all duration-300 ${menuOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
        </button>

        {/* Logo */}
        <Link
          to="/"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setMenuOpen(false);
          }}
          className="animate-navbar-drop-logo flex items-center gap-[10px] no-underline shrink-0 max-[910px]:absolute max-[910px]:left-1/2 max-[910px]:-translate-x-1/2"
        >
          <div className="flex items-center -space-x-2">
            <img src={AgriLogo} alt="Sariaya" className="w-8 h-8 rounded-full shrink-0 object-cover border border-stone-100" />
          </div>
          <span className="font-archivo text-[25px] text-[#1b6b3a] tracking-[0.01em] max-[910px]:hidden">
            FarmPass
          </span>
        </Link>

        {/* Nav links — desktop only */}
        <div
          className="animate-navbar-drop-links relative mx-auto max-[910px]:hidden"
          style={{ width: SVG_W, height: SVG_H }}
        >
          <div className="absolute inset-0 flex flex-row items-center px-2 gap-1">
            {NAV_LINKS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`nav-link relative px-[18px] py-[6px] text-[15px] cursor-pointer rounded-[22px] whitespace-nowrap bg-transparent border-none font-jakarta transition-colors duration-150
                  hover:bg-[#0a2a1a] hover:text-[#f5a623]
                  ${currentActivePage === key
                    ? "font-bold underline underline-offset-[3px] text-[#0a2a1a]"
                    : "font-medium text-[#0a2a1a]"
                  }`}
                onClick={() => handleNav(key)}
              >
                {label}
              </button>
            ))}
            <svg
              className="absolute inset-0 pointer-events-none overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              width={SVG_W}
              height={SVG_H}
              overflow="visible"
            >
              <rect
                className="navbar-links-rect"
                x={0} y={0}
                width={SVG_W} height={SVG_H}
                rx={22} ry={22}
                pathLength={100}
              />
            </svg>
          </div>
        </div>

        {/* Right actions */}
        <div className="animate-navbar-drop-actions flex items-center gap-3 shrink-0">
          <button
            type="button"
            className="text-[15px] font-medium text-[#0a2a1a] bg-transparent border-none cursor-pointer px-4 py-2 rounded-lg font-jakarta transition-colors duration-150 hover:text-[#1b6b3a] max-[910px]:text-sm max-[910px]:px-1"
            onClick={() => {
              navigate("/login");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Sign In
          </button>
          <div className="w-[110px] h-[38px] max-[910px]:hidden">
            <LandingButton
              label="Sign Up"
              bgColor="#1b6b3a"
              textColor="#f5a623"
              baseColor="#0a2a1a"
              onClick={() => {
                navigate("/register");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        </div>

      </nav>

      {/* MOBILE DROPDOWN */}
      <div
        className={`fixed top-[68px] left-0 right-0 bg-white border-b border-[#e8e8e8] flex-col gap-[2px] shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-[99] overflow-hidden transition-[max-height,opacity,padding] duration-350 ease-in-out hidden max-[910px]:flex
          ${menuOpen ? "max-h-[360px] opacity-100 px-5 pt-3 pb-5" : "max-h-0 opacity-0 px-5 py-0"}`}
      >
        {NAV_LINKS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`w-full text-left px-4 py-3 text-[15px] border-none rounded-[10px] cursor-pointer font-jakarta transition-all duration-150
              hover:bg-[#0a2a1a] hover:text-[#f5a623]
              ${currentActivePage === key
                ? "font-bold bg-[#f0f7f3] text-[#0a2a1a]"
                : "font-medium text-[#0a2a1a] bg-transparent"
              }`}
            onClick={() => handleNav(key)}
          >
            {label}
          </button>
        ))}
        <div className="pt-2 mt-2 border-t border-[#f0f0f0] flex flex-col gap-2">
          <button
            type="button"
            className="w-full text-center py-2.5 text-[15px] font-medium text-[#0a2a1a] bg-[#f8faf8] border border-[#e2ece6] rounded-[10px] cursor-pointer font-jakarta transition-colors hover:text-[#1b6b3a]"
            onClick={() => {
              navigate("/login");
              setMenuOpen(false);
            }}
          >
            Sign In
          </button>
          <LandingButton
            label="Sign Up"
            bgColor="#1b6b3a"
            textColor="#f5a623"
            baseColor="#0a2a1a"
            onClick={() => {
              navigate("/register");
              setMenuOpen(false);
            }}
          />
        </div>
      </div>
    </>
  );
}
