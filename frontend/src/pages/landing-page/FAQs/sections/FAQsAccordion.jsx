import { useState, useRef, useEffect } from "react";

const CATEGORIES = [
  {
    title: "Getting Started",
    items: [
      {
        q: "What is FarmPass?",
        a: "FarmPass is a web-based livestock transport permit issuance system for Sariaya Municipal Agriculture Office. It uses OCR document validation, and Geospatial monitoring to process permits quickly and securely, all online, 24/7."
      },
      {
        q: "Who can use FarmPass?",
        a: "Licensed traders, haulers, and livestock owners can use FarmPass to apply for transport permits. All users must have valid licenses and register an account to access the system."
      },
      {
        q: "Is FarmPass free to use?",
        a: "Creating an account is FREE. You only pay the standard government permit fees when you apply for a transport permit."
      },
    ],
  },
  {
    title: "Documents & Requirements",
    items: [
      {
        q: "What documents do I need?",
        a: "Required documents: Handler's License, Transport Carrier Registration, Trader's Pass, Certificate of Inspection (CIS), and Barangay Endorsement (Pagpapatunay — required only for transport outside Sariaya). All must be in PDF, JPG, or PNG format (max 5MB each)."
      },
      {
        q: "How long are documents valid?",
        a: "Handler's License and Transport Carrier Registration must be current. Trader's Pass must be within 60 days from issue date. Always check validity before uploading."
      },
    ],
  },
  {
    title: "Application Process",
    items: [
      {
        q: "How long does approval take?",
        a: "15–30 minutes during office hours (Mon–Fri, 8AM–5PM). The system validates documents automatically, then staff reviews your application. You'll receive SMS updates on status changes."
      },
      {
        q: "Can I track my application?",
        a: "Yes! Login and go to \"My Applications\" or use your tracking number (sent via SMS) to see real-time status: Submitted → Under Review → Approved/Rejected."
      },
      {
        q: "What if my application is rejected?",
        a: "You'll receive an SMS with the rejection reason. Fix the issues and submit a new application. Rejected applications don't incur charges; you only pay after approval."
      },
    ],
  },
  {
    title: "Fees & Payment",
    items: [
      {
        q: "How much does a permit cost?",
        a: "Standard permit fees:\n• Veterinary Health Certificate – ₱50\n• Transportation Pass – ₱50\n• Sariaya Transportation Permit – ₱50\n\nTotal: ₱150 per application."
      },
      {
        q: "What payment methods are accepted?",
        a: "Online: GCash, PayMaya, Bank Transfer\nIn-Person: Cash at Sariaya Agriculture Office (Mon–Fri, 8AM–5PM)"
      },
      {
        q: "When do I need to pay?",
        a: "Payment is required AFTER you submit your application. Process: Submit → Pay → Approved → Receive Permit."
      },
    ],
  },
  {
    title: "Technical",
    items: [
      {
        q: "Can I use this on my phone?",
        a: "Yes! FarmPass is a Progressive Web App that works on phones, tablets, and computers. You can even install it on your home screen for an app-like experience."
      },
      {
        q: "Is my information secure?",
        a: "Yes! We use secure servers, access controls, and comply with the Data Privacy Act. Your information is never shared with third parties."
      },
    ],
  },
];

function AccordionItem({ item, isOpen, onToggle }) {
  return (
    <div className={`bg-white border rounded-lg transition-colors duration-150 overflow-hidden
      ${isOpen ? "border-green-700" : "border-stone-200"}`}>

      <button onClick={onToggle}
        className={`w-full flex items-center justify-between gap-4 px-5 py-4 bg-transparent border-none cursor-pointer text-left
          font-jakarta text-sm sm:text-base font-semibold transition-colors duration-150 box-border
          ${isOpen ? "text-green-800" : "text-stone-900"}`}>
        <span>{item.q}</span>

        {/* +/× icon */}
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 relative transition-transform duration-200
          ${isOpen ? "rotate-45 bg-green-50 text-green-800" : "bg-stone-100 text-stone-500"}`}>
          <span className="text-base leading-none font-medium">+</span>
        </div>
      </button>

      {/* Animated answer */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 border-t border-stone-100">
            {item.a.split("\n").filter(l => l.trim()).map((line, i) => (
              <p key={i} className="font-jakarta text-xs sm:text-sm text-stone-600 leading-relaxed mt-2 mb-0">{line}</p>
            ))}
          </div>
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
      <h2 className="font-archivo text-xl sm:text-2xl font-bold text-stone-900 tracking-tight mb-3 pb-2 border-b border-stone-200 flex items-center justify-between">
        <span>{cat.title}</span>
        <span className="text-xs font-jakarta font-normal text-stone-500">{cat.items.length} questions</span>
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



      <div className="max-w-[65rem] mx-auto px-8 flex flex-col gap-10 max-[640px]:px-5">
        {CATEGORIES.map((cat, i) => <Category key={i} cat={cat} />)}
      </div>
    </section>
  );
}