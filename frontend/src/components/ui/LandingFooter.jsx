import { useNavigate } from "react-router-dom";
import PhoneIcon    from "/src/assets/home-icons/phone.png";
import MailIcon     from "/src/assets/home-icons/mail.png";
import LocationIcon from "/src/assets/home-icons/location.png";
import WebIcon      from "/src/assets/home-icons/web.png";
import LogoImg      from "/src/assets/farmpass-logo.png";

const NAV_LINKS = [
  { label: "Home",         path: "/"             },
  { label: "Requirements", path: "/requirements" },
  { label: "About Us",     path: "/about"        },
  { label: "FAQs",         path: "/faqs"         },
];

const ACCOUNT_LINKS = [
  { label: "Sign In",   path: "/login",     disabled: false },
  { label: "Sign Up",   path: "/register",  disabled: false },
];

const CONTACT_ITEMS = [
  { icon: PhoneIcon,    alt: "Phone",    label: "+63 42 123 4567",                          href: "tel:+63421234567"                  },
  { icon: MailIcon,     alt: "Email",    label: "support@farmpass.gov.ph",                  href: "mailto:support@farmpass.gov.ph"    },
  { icon: LocationIcon, alt: "Location", label: "Sariaya Municipal Agriculture Office, Quezon", href: "#"                             },
  { icon: WebIcon,      alt: "Website",  label: "www.farmpass.gov.ph",                      href: "https://farmpass.gov.ph"           },
];

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="relative overflow-hidden bg-[#061a0f] text-white font-jakarta
      before:content-[''] before:absolute before:inset-0 before:pointer-events-none
      before:[background-image:repeating-linear-gradient(-45deg,transparent,transparent_40px,rgba(255,255,255,0.015)_40px,rgba(255,255,255,0.015)_41px)]
      after:content-[''] after:absolute after:-bottom-[120px] after:-left-[80px] after:w-[420px] after:h-[420px] after:rounded-full after:pointer-events-none
      after:[background:radial-gradient(circle,rgba(27,107,58,0.18)_0%,transparent_70%)]">

      {/* Amber accent bar */}
      <div className="h-[3px] bg-gradient-to-r from-transparent via-[#f5a623] to-[#1b6b3a]" />

      {/* Inner grid */}
      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 pt-16 pb-12
                      grid grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-12
                      max-[1024px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:px-6 max-[600px]:pt-10 max-[600px]:pb-8">

        {/* COL 1: Brand */}
        <div className="max-[1024px]:col-span-2 max-[600px]:col-span-1">

          {/* Logo */}
          <div className="flex items-center gap-[10px] mb-5">
            <img src={LogoImg} alt="FarmPass" className="w-[38px] h-[38px] rounded-[8px] object-contain shrink-0" />
            <span className="font-archivo text-[20px] text-white tracking-[0.01em]">FarmPass</span>
          </div>

          {/* Tagline */}
          <p className="text-[14px] leading-[1.7] text-white/50 mb-6 max-w-[260px] max-[1024px]:max-w-full">
            Streamlining livestock transport permits for Filipino farmers — fast, secure, and paperless.
          </p>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-[14px] py-[6px] bg-[#f5a623]/10 border border-[#f5a623]/25 rounded-full text-[11px] font-semibold text-[#f5a623] tracking-[0.04em] uppercase">
            <span className="animate-footer-pulse w-[6px] h-[6px] bg-[#f5a623] rounded-full" />
            Official Municipal Agriculture Portal
          </div>
        </div>

        {/* COL 2: Quick Links */}
        <div className="flex flex-col">
          <h4 className="font-archivo text-[13px] tracking-[0.12em] uppercase text-white mb-5 flex items-center gap-[10px]">
            <span className="block w-5 h-[2px] bg-[#f5a623] rounded-sm shrink-0" />
            Quick Links
          </h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1">
            {NAV_LINKS.map(({ label, path }) => (
              <li key={label}>
                <button
                  className="group flex items-center gap-2 bg-transparent border-none cursor-pointer font-jakarta text-[14px] text-white/55 py-[5px] text-left transition-all duration-200 hover:text-white hover:gap-3 w-fit"
                  onClick={() => { navigate(path); window.scrollTo(0, 0); }}
                >
                  <span className="text-[#f5a623] text-[16px] leading-none transition-transform duration-200 group-hover:translate-x-[3px]">›</span>
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* COL 3: Account */}
        <div className="flex flex-col">
          <h4 className="font-archivo text-[13px] tracking-[0.12em] uppercase text-white mb-5 flex items-center gap-[10px]">
            <span className="block w-5 h-[2px] bg-[#f5a623] rounded-sm shrink-0" />
            Account
          </h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-1">
            {ACCOUNT_LINKS.map(({ label, path, disabled }) => (
              <li key={label}>
                <button
                  className={`group flex items-center gap-2 bg-transparent border-none font-jakarta text-[14px] py-[5px] text-left transition-all duration-200 w-fit
                    ${disabled
                      ? "opacity-45 cursor-default text-white/55"
                      : "cursor-pointer text-white/55 hover:text-white hover:gap-3"
                    }`}
                  onClick={() => { if (!disabled) { navigate(path); window.scrollTo(0, 0); } }}
                >
                  <span className="text-[#f5a623] text-[16px] leading-none transition-transform duration-200 group-hover:translate-x-[3px]">›</span>
                  {label}
                  {disabled && (
                    <span className="text-[9px] font-bold tracking-[0.08em] uppercase bg-[#f5a623]/15 text-[#f5a623] border border-[#f5a623]/30 rounded-[4px] px-[5px] py-[1px] ml-1">
                      Soon
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* COL 4: Contact */}
        <div className="flex flex-col">
          <h4 className="font-archivo text-[13px] tracking-[0.12em] uppercase text-white mb-5 flex items-center gap-[10px]">
            <span className="block w-5 h-[2px] bg-[#f5a623] rounded-sm shrink-0" />
            Contact
          </h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-[14px]">
            {CONTACT_ITEMS.map(({ icon, alt, label, href }) => (
              <li key={alt} className="group flex items-start gap-3">
                <div className="w-[34px] h-[34px] bg-[#1b6b3a]/30 border border-[#1b6b3a]/50 rounded-[8px] flex items-center justify-center shrink-0 transition-all duration-200 group-hover:bg-[#f5a623]/15 group-hover:border-[#f5a623]/40">
                  <img
                    src={icon} alt={alt}
                    className="w-4 h-4 object-contain transition-all duration-200"
                    style={{ filter: "brightness(0) invert(1) opacity(0.7)" }}
                    onMouseEnter={e => e.currentTarget.style.filter = "brightness(0) saturate(100%) invert(75%) sepia(60%) saturate(600%) hue-rotate(350deg)"}
                    onMouseLeave={e => e.currentTarget.style.filter = "brightness(0) invert(1) opacity(0.7)"}
                  />
                </div>
                <a
                  href={href}
                  className="text-[13.5px] text-white/55 no-underline leading-[1.5] pt-[6px] break-words transition-colors duration-200 group-hover:text-white"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="relative z-[1] border-t border-white/[0.07]">
        <div className="max-w-[1200px] mx-auto px-10 py-5 flex items-center justify-between gap-4 flex-wrap max-[600px]:flex-col max-[600px]:items-start max-[600px]:px-6 max-[600px]:py-4 max-[600px]:gap-2">
          <p className="text-[12.5px] text-white/30">
            © {new Date().getFullYear()} FarmPass · Sariaya Municipal Agriculture Office · All rights reserved.
          </p>
          <div className="flex items-center gap-[10px]">
            {["Privacy Policy", "Terms of Use", "Accessibility"].map((item, i, arr) => (
              <span key={item} className="flex items-center gap-[10px]">
                <a href="#" className="text-[12.5px] text-white/30 no-underline transition-colors duration-200 hover:text-[#f5a623]">{item}</a>
                {i < arr.length - 1 && <span className="text-white/15 text-[12px]">·</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}