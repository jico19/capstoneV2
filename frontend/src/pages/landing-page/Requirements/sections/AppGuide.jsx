import { useRef, useEffect } from "react";
import useScrollReveal from "/src/hooks/useScrollReveal";
import AppGuideIcon from "/src/assets/requirements-icons/app-guide-icon.png";

const STEPS = [
  { n: "1", title: "Create Account & Login",
    desc: "Register on FarmPass with your mobile number for SMS notifications. Verify your account through the code sent to your phone. Login to access the application dashboard." },
  { n: "2", title: "Prepare Documents",
    desc: "Gather all 5 required documents: Handler's License, Transport Carrier Registration, Trader's Pass, Certificate of Immediate Slaughter (if applicable), and Endorsement Form. Scan or take clear photos ensuring files are under size limits." },
  { n: "3", title: "Fill Application Form",
    desc: "Complete the online form with source details (owner name, barangay, address), livestock information (type, quantity), destination details, and transport information. Provide accurate data for all required fields." },
  { n: "4", title: "Upload Documents",
    desc: "Upload all required documents in acceptable formats (PDF, JPG, PNG). System will automatically extract data using OCR and validate document authenticity using ML fraud detection. Documents will be cross-checked with census data." },
  { n: "5", title: "Review & Submit",
    desc: "Review all entered information and uploaded documents for accuracy. Make any necessary corrections. Once satisfied, confirm and submit your application. You'll receive immediate SMS confirmation with your tracking number." },
  { n: "6", title: "Make Payment",
    desc: "Pay the permit fee through available payment options: online payment (GCash, PayMaya, Bank Transfer) or in-person at the office. Upload payment proof if paying online or get official receipt if paying at the office." },
  { n: "7", title: "Wait for Approval",
    desc: "Agriculture office staff will review your application and verify payment. Average processing time: 15–30 minutes during office hours. You'll receive SMS updates on status changes (Under Review, Approved, or Rejected with reasons)." },
  { n: "8", title: "Receive Permit",
    desc: "Once approved and payment confirmed, download your digital permit with QR code from your dashboard or collect printed copy from the office. Permit is valid for the specified transport date and route only. Present QR code at checkpoints during transport." },
];

function GuideStep({ step, index }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            el.style.opacity = "1";
            el.style.transform = "translateX(0)";
          }, index * 10);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div ref={ref}
      style={{ opacity: 0, transform: "translateX(-2rem)", transition: "opacity 0.5s ease, transform 0.5s ease" }}
      className="guide-step flex gap-4 items-start py-5 border-b border-[#eef2ef] last:border-b-0">

      <div className="w-10 h-10 rounded-full bg-brand-primary text-brand-amber font-archivo text-[1rem] flex items-center justify-center shrink-0 basis-10 shadow-[0_4px_12px_rgba(10,42,26,0.2)]">
        {step.n}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-archivo text-[clamp(0.92rem,1.3vw,1.2rem)] text-brand-primary mb-[0.35rem] tracking-[-0.01em]">{step.title}</h3>
        <p className="font-jakarta text-[clamp(0.82rem,1.1vw,0.9rem)] text-[#6c757d] leading-[1.75]">{step.desc}</p>
      </div>
    </div>
  );
}

export default function AppGuide() {
  const headerRef = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="bg-brand-bg py-16 relative max-[640px]:py-12
      after:content-[''] after:absolute after:-bottom-24 after:-right-24 after:w-96 after:h-96
      after:rounded-full after:border-[5rem] after:border-brand-primary/[0.03] after:pointer-events-none after:overflow-hidden">

      <div className="max-w-[54rem] mx-auto px-8 max-[640px]:px-5">

        {/* Header */}
        <div ref={headerRef} className="reveal-block flex items-center gap-3 pb-[0.9rem] border-b-2 border-[#e2ece6] mb-[0.6rem]">
          <img src={AppGuideIcon} alt="" className="w-7 h-7 object-contain" />
          <h2 className="font-archivo text-[clamp(1.2rem,2vw,2rem)] text-brand-primary tracking-[-0.01em]">Step-by-Step Application Guide</h2>
        </div>
        <p className="font-jakarta text-[clamp(0.88rem,1.2vw,0.97rem)] text-[#6c757d] leading-[1.75] mb-6">
          Follow these steps to successfully apply for your livestock transport permit
        </p>

        <div className="flex flex-col">
          {STEPS.map((step, i) => <GuideStep key={i} step={step} index={i} />)}
        </div>
      </div>
    </section>
  );
}