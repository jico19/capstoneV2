import { useState, useRef, useEffect } from "react";

const CATEGORIES = [
  {
    title: "Getting Started",
    items: [
      { q: "What is FarmPass?",
        a: "FarmPass is a web-based livestock transport permit issuance system for Sariaya Municipal Agriculture Office. It uses OCR document validation, Machine Learning fraud detection, and Geospatial monitoring to process permits quickly and securely — all online, 24/7." },
      { q: "Who can use FarmPass?",
        a: "Licensed traders, haulers, and livestock owners can use FarmPass to apply for transport permits. All users must have valid licenses and register an account to access the system." },
      { q: "Is FarmPass free to use?",
        a: "Creating an account is FREE. You only pay the standard government permit fees when you apply for a transport permit." },
    ],
  },
  {
    title: "Documents & Requirements",
    items: [
      { q: "What documents do I need?",
        a: "You need 6 documents: Handler's License, Transport Carrier Registration, Trader's Pass, Certificate of Immediate Slaughter (if applicable), Endorsement Form and Pagpapatunay. All must be in PDF, JPG, or PNG format (max 5MB each)." },
      { q: "How long are documents valid?",
        a: "Handler's License and Transport Carrier Registration must be current. Trader's Pass must be within 60 days from issue date. Always check validity before uploading." },
    ],
  },
  {
    title: "Application Process",
    items: [
      { q: "How long does approval take?",
        a: "15–30 minutes during office hours (Mon–Fri, 8AM–5PM). The system validates documents automatically, then staff reviews your application. You'll receive SMS updates on status changes." },
      { q: "Can I track my application?",
        a: "Yes! Login and go to \"My Applications\" or use your tracking number (sent via SMS) to see real-time status: Submitted → Under Review → Approved/Rejected." },
      { q: "What if my application is rejected?",
        a: "You'll receive an SMS with the rejection reason. Fix the issues and submit a new application. Rejected applications don't incur charges — you only pay after approval." },
    ],
  },
  {
    title: "Fees & Payment",
    items: [
      { q: "How much does a permit cost?",
        a: "Standard permit fees:\n• VHC (Veterinary Health Certificate) – ₱50\n• Animal Inspection Certificate – ₱50\n• MAO Certificate – ₱50\n• Shipping Permit – ₱50\n\nTotal: ₱200 per application." },
      { q: "What payment methods are accepted?",
        a: "Online: GCash, PayMaya, Bank Transfer\nIn-Person: Cash at Sariaya Agriculture Office (Mon–Fri, 8AM–5PM)" },
      { q: "When do I need to pay?",
        a: "Payment is required AFTER you submit your application. Process: Submit → Pay → Approved → Receive Permit." },
    ],
  },
  {
    title: "Technical",
    items: [
      { q: "Can I use this on my phone?",
        a: "Yes! FarmPass is a Progressive Web App that works on phones, tablets, and computers. You can even install it on your home screen for an app-like experience." },
      { q: "Is my information secure?",
        a: "Yes! We use secure servers, access controls, and comply with the Data Privacy Act. Your information is never shared with third parties." },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }) {
  const bodyRef = useRef(null);

  return (
    <div className={`bg-white border rounded-xl overflow-hidden box-border transition-[border-color,box-shadow] duration-[250ms]
      ${isOpen ? "border-brand-primary-mid shadow-[0_0.25rem_1rem_rgba(10,42,26,0.07)]" : "border-[#e2ece6]"}`}>

      <button onClick={onToggle}
        className={`w-full flex items-center justify-between gap-4 px-5 py-4 bg-transparent border-none cursor-pointer text-left
          font-jakarta text-[clamp(0.88rem,1.2vw,1.1rem)] font-semibold transition-colors duration-200 box-border
          ${isOpen ? "text-brand-primary-mid" : "text-brand-primary"}`}>
        <span>{item.q}</span>

        {/* +/× icon */}
        <div className={`w-[1.6rem] h-[1.6rem] rounded-full flex items-center justify-center shrink-0 relative
          transition-[background,transform] duration-300
          ${isOpen ? "bg-brand-primary rotate-45" : "bg-brand-primary-mid"}`}>
          {/* horizontal bar */}
          <span className="absolute w-[0.7rem] h-[0.12rem] bg-white rounded-sm" />
          {/* vertical bar */}
          <span className="absolute w-[0.12rem] h-[0.7rem] bg-white rounded-sm" />
        </div>
      </button>

      {/* Animated answer */}
      <div style={{ maxHeight: isOpen ? (bodyRef.current?.scrollHeight ?? 400) + "px" : "0px" }}
        className="overflow-hidden transition-[max-height] duration-[400ms] ease-[ease]">
        <div ref={bodyRef} className="px-5 pb-5 border-t border-[#e2ece6]">
          {item.a.split("\n").filter(l => l.trim()).map((line, i) => (
            <p key={i} className="font-jakarta text-[clamp(0.85rem,1.2vw,1rem)] text-[#555] leading-[1.8] mt-2.5 mb-0">{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function Category({ cat }) {
  const [openIndex, setOpenIndex] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("is-visible"); observer.unobserve(el); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="reveal-block">
      <h2 className="font-archivo text-[clamp(1.15rem,2vw,2rem)] text-brand-primary tracking-[-0.01em] mb-3 pb-[0.65rem] border-b-2 border-brand-primary-mid">
        {cat.title}
      </h2>
      <div className="flex flex-col gap-2">
        {cat.items.map((item, i) => (
          <AccordionItem key={i} item={item} isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)} />
        ))}
      </div>
    </div>
  );
}

export default function FAQsAccordion() {
  return (
    <section className="bg-brand-bg pt-16 pb-8 relative overflow-hidden max-[640px]:pt-12 max-[640px]:pb-6">

      {/* Circle */}
      <div className="absolute top-1/2 -translate-y-1/2 -left-24 w-[22rem] h-[22rem] rounded-full border-[4rem] border-brand-primary-mid/[0.06] pointer-events-none max-[640px]:hidden" />
      <div className="absolute top-1/2 -translate-y-1/2 -right-24 w-[18rem] h-[18rem] rounded-full border-[3.5rem] border-brand-primary-mid/[0.05] pointer-events-none max-[640px]:hidden" />

      <div className="max-w-[65rem] mx-auto px-8 flex flex-col gap-10 max-[640px]:px-5">
        {CATEGORIES.map((cat, i) => <Category key={i} cat={cat} />)}
      </div>
    </section>
  );
}