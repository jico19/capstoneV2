import { useState, useRef, useEffect } from "react";

const CATEGORIES = [
  {
    title: "Getting Started",
    items: [
      {
        q: "What is FarmPass?",
        a: "FarmPass is the official livestock transport permitting portal for the Sariaya Municipal Agriculture Office. It processes transport applications, validates documentary requirements, and issues digital permits with QR verification."
      },
      {
        q: "Who can use FarmPass?",
        a: "Licensed traders, haulers, and livestock owners transporting animals in Sariaya can use FarmPass. Users register an account and attach valid credentials to apply."
      },
      {
        q: "Is FarmPass free to use?",
        a: "Creating an account is free. You only pay official municipal permit fees once your application is reviewed and approved."
      },
    ],
  },
  {
    title: "Documents & Requirements",
    items: [
      {
        q: "What documents do I need?",
        a: "Required documents: Handler's License, Transport Carrier Registration, Trader's Pass, Certificate of Inspection (CIS), and Barangay Endorsement (Pagpapatunay, required only for transport outside Sariaya). All files must be in PDF, JPG, or PNG format under 10MB each."
      },
      {
        q: "How long are documents valid?",
        a: "Handler's License and Transport Carrier Registration must be active. The Trader's Pass must be within 60 days of issuance. Always verify document validity before submitting."
      },
    ],
  },
  {
    title: "Application Process",
    items: [
      {
        q: "How long does approval take?",
        a: "15 to 30 minutes during regular office hours (Monday to Friday, 8:00 AM to 5:00 PM). Staff reviews your application after automated credential extraction. You receive SMS notifications at each status update."
      },
      {
        q: "Can I track my application?",
        a: "Sign in and open \"My Applications\" or enter your SMS tracking number to check your status: Submitted, Under Review, Approved (Payment Pending), or Released."
      },
      {
        q: "What if my application is rejected?",
        a: "You will receive an SMS explaining the reason for rejection. Correct the flagged items and submit an updated application. Rejected applications incur no fees; you only pay upon approval."
      },
    ],
  },
  {
    title: "Fees & Payment",
    items: [
      {
        q: "How much does a permit cost?",
        a: "Standard statutory permit fees:\n• Veterinary Health Certificate: ₱50\n• Transportation Pass: ₱50\n• Local Transport Permit (Sariaya): ₱50\n\nTotal: ₱150 statutory fee per application."
      },
      {
        q: "What payment methods are accepted?",
        a: "Online: GCash, Maya, and credit/debit card (via PayMongo)\nIn-Person: Cash at Sariaya Municipal Treasury / MAO (Monday to Friday, 8:00 AM to 5:00 PM)"
      },
      {
        q: "When do I need to pay?",
        a: "Payment is required only after your application has been reviewed and approved by the Municipal Agriculture Office and Provincial Veterinarian. If your application is rejected or requires revisions, you pay nothing."
      },
    ],
  },
  {
    title: "Data Privacy & Protection",
    items: [
      {
        q: "Is my data protected and what is it used for?",
        a: "All data collected in FarmPass is strictly protected under the Data Privacy Act of 2012 (Republic Act No. 10173). All collected information is used solely and exclusively for municipal livestock transport operations, official biosecurity verification, and statutory permit issuance. Your data is never sold, shared with unauthorized third parties, or used outside official municipal operations."
      },
      {
        q: "How is my personal information secured?",
        a: "Sensitive citizen records—including mobile contact numbers, origin farm details, and uploaded credentials—are encrypted at rest using industry-standard AES encryption. Access is strictly restricted through role-based permissions to authorized Municipal Agriculture Office (MAO) and Provincial Veterinary Office (OPV) personnel."
      },
      {
        q: "Can I access or export my personal data?",
        a: "Yes. In compliance with citizen rights under the Data Privacy Act of 2012, registered users can view their credentials, review permit activity, and request an official machine-readable export of their personal data archive at any time."
      },
    ],
  },
  {
    title: "Technical",
    items: [
      {
        q: "Can I use this on my phone?",
        a: "FarmPass runs on smartphones, tablets, and desktop computers. You can also add it to your mobile home screen for quick access in the field."
      },
      {
        q: "Do I need an internet connection at checkpoint scans?",
        a: "Checkpoints can verify the authenticity of issued permits instantly by scanning the embedded QR code on your printed or digital permit document."
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