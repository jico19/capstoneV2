import { useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Globe } from "lucide-react";
import LogoImg      from '../../assets/farmpass-logo.png';
import AgriLogo     from '../../assets/sariaya-agri-logo.jpg';

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

const GMAPS_URL = "https://www.google.com/maps/place/New+Sariaya+Municipal+Hall/@13.9569516,121.5118002,1151m/data=!3m1!1e3!4m6!3m5!1s0x33bd4f001084db1b:0xb64703c8f579b191!8m2!3d13.9566288!4d121.5140318!16s%2Fg%2F11xd8mkr77?entry=ttu";

const CONTACT_ITEMS = [
  { icon: Phone,  alt: "Phone",    label: "(042) 525-8200 (MAO Sariaya)",         href: "tel:0425258200"             },
  { icon: Mail,   alt: "Email",    label: "agri@sariaya.gov.ph",                  href: "mailto:agri@sariaya.gov.ph" },
  { icon: MapPin, alt: "Location", label: "New Municipal Hall, Sariaya, Quezon", href: GMAPS_URL                    },
  { icon: Globe,  alt: "Website",  label: "sariaya.gov.ph",                       href: "https://www.sariaya.gov.ph" },
];

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="relative bg-[#061a0f] text-white font-jakarta border-t border-stone-800">
      {/* Inner grid */}
      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 pt-16 pb-12
                      grid grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-12
                      max-[1024px]:grid-cols-2 max-[600px]:grid-cols-1 max-[600px]:px-6 max-[600px]:pt-10 max-[600px]:pb-8">

        {/* COL 1: Brand */}
        <div className="max-[1024px]:col-span-2 max-[600px]:col-span-1">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center -space-x-2">
              <img src={LogoImg} alt="FarmPass" className="w-9 h-9 object-contain shrink-0 bg-white p-0.5 z-[1] border border-stone-700 rounded-md" />
              <img src={AgriLogo} alt="Sariaya Agri" className="w-9 h-9 object-cover shrink-0 border border-stone-700 rounded-md" />
            </div>
            <span className="font-archivo text-xl text-white tracking-tight">FarmPass</span>
          </div>

          {/* Tagline */}
          <p className="text-sm leading-relaxed text-stone-400 mb-6 max-w-[280px] max-[1024px]:max-w-full">
            Municipal livestock transport permit management for Sariaya, Quezon. Fast, auditable, and compliant with local agricultural ordinances.
          </p>

          {/* Official badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-950/80 border border-green-800/80 text-[11px] font-medium text-green-300 tracking-wider uppercase rounded-md">
            Official Municipal Agriculture Portal
          </div>
        </div>

        {/* COL 2: Quick Links */}
        <div className="flex flex-col">
          <h4 className="font-archivo text-xs tracking-wider uppercase text-stone-300 mb-5 font-semibold">
            Navigation
          </h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {NAV_LINKS.map(({ label, path }) => (
              <li key={label}>
                <button
                  className="bg-transparent border-none cursor-pointer font-jakarta text-sm text-stone-400 py-1 text-left transition-colors duration-150 hover:text-white"
                  onClick={() => { navigate(path); window.scrollTo(0, 0); }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* COL 3: Account */}
        <div className="flex flex-col">
          <h4 className="font-archivo text-xs tracking-wider uppercase text-stone-300 mb-5 font-semibold">
            Portals
          </h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {ACCOUNT_LINKS.map(({ label, path, disabled }) => (
              <li key={label}>
                <button
                  className={`bg-transparent border-none font-jakarta text-sm py-1 text-left transition-colors duration-150
                    ${disabled
                      ? "opacity-40 cursor-default text-stone-500"
                      : "cursor-pointer text-stone-400 hover:text-white"
                    }`}
                  onClick={() => { if (!disabled) { navigate(path); window.scrollTo(0, 0); } }}
                >
                  {label}
                  {disabled && (
                    <span className="text-[10px] font-medium tracking-wide uppercase bg-stone-800 text-stone-400 border border-stone-700 px-1.5 py-0.5 rounded ml-2">
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
          <h4 className="font-archivo text-xs tracking-wider uppercase text-stone-300 mb-5 font-semibold">
            Contact
          </h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {CONTACT_ITEMS.map(({ icon: Icon, alt, label, href }) => (
              <li key={alt} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-stone-900 border border-stone-800 flex items-center justify-center shrink-0 rounded-md">
                  <Icon size={16} className="text-stone-400 group-hover:text-white transition-colors" />
                </div>
                <a
                  href={href}
                  className="text-xs text-stone-400 no-underline leading-normal pt-1.5 break-words transition-colors duration-150 hover:text-white"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Bottom bar */}
      <div className="relative z-[1] border-t border-stone-800">
        <div className="max-w-[1200px] mx-auto px-10 py-5 flex items-center justify-between gap-4 flex-wrap max-[600px]:flex-col max-[600px]:items-start max-[600px]:px-6 max-[600px]:py-4 max-[600px]:gap-2">
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} FarmPass · Municipality of Sariaya, Quezon · Municipal Agriculture Office
          </p>
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span>Republic of the Philippines</span>
            <span className="text-stone-700">·</span>
            <span>Data Privacy Act of 2012</span>
          </div>
        </div>
      </div>
    </footer>
  );
}