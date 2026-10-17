import { useRef, useEffect } from "react";
import useScrollReveal from '../../../../hooks/useScrollReveal';
import { ListOrdered } from "lucide-react";

const STEPS = [
  { n: "1", title: "Create Account & Login",
    desc: "Register on FarmPass with your mobile number for SMS notifications. Verify your account through the code sent to your phone. Login to access the application dashboard." },
  { n: "2", title: "Prepare Documents",
    desc: "Gather required documents: Handler's License, Transport Carrier Registration, Trader's Pass, Certificate of Inspection (CIS), and Barangay Endorsement (if transporting outside Sariaya). Clear scans or photos must be under 10MB each." },
  { n: "3", title: "Fill Application Form",
    desc: "Complete the online form with source details (owner name, barangay, address), livestock information (type, quantity), destination details, and transport information. Provide accurate data for all required fields." },
  { n: "4", title: "Upload Documents",
    desc: "Upload required credentials in PDF, JPG, or PNG format. The system extracts document details using OCR and cross-references declared animal counts against barangay livestock census records." },
  { n: "5", title: "Review & Submit",
    desc: "Review all entered information and uploaded documents for accuracy. Make any necessary corrections. Once satisfied, confirm and submit your application. You will receive an immediate SMS confirmation with your tracking number." },
  { n: "6", title: "Official Review & Approval",
    desc: "Municipal Agriculture Office (MAO) and Provincial Veterinarian (OPV) staff review your submitted application and inspect health documents. Average turnaround: 15 to 30 minutes during office hours. You will receive SMS alerts upon approval." },
  { n: "7", title: "Complete Payment",
    desc: "Once approved, settle the ₱150 statutory fee online (GCash, Maya, or card via PayMongo) or over-the-counter at the Municipal Hall Treasury. Digital permits are released immediately upon payment confirmation." },
  { n: "8", title: "Receive & Download Permit",
    desc: "Your official livestock transport permit with checkpoint QR verification is available in your dashboard. Download the PDF to your device or present the QR code at roadside inspection checkpoints." },
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
      style={{ opacity: 0, transform: "translateX(-1rem)", transition: "opacity 0.3s ease, transform 0.3s ease" }}
      className="guide-step flex gap-4 items-start py-4 border-b border-stone-200 last:border-b-0">

      <div className="w-7 h-7 bg-green-700 text-white font-archivo text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 rounded-md">
        {step.n}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-archivo text-sm sm:text-base font-semibold text-stone-900 mb-1 tracking-tight">{step.title}</h3>
        <p className="font-jakarta text-xs sm:text-sm text-stone-600 leading-relaxed">{step.desc}</p>
      </div>
    </div>
  );
}

export default function AppGuide() {
  const headerRef = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="bg-stone-50 py-16 relative border-b border-stone-200 max-[640px]:py-12">
      <div className="max-w-[54rem] mx-auto px-8 max-[640px]:px-5">

        {/* Header */}
        <div ref={headerRef} className="reveal-block flex items-center gap-3 pb-3 border-b border-stone-200 mb-2">
          <div className="w-10 h-10 bg-sky-50 border border-sky-200 rounded-md flex items-center justify-center shrink-0">
            <ListOrdered className="w-5 h-5 text-sky-700" strokeWidth={2} />
          </div>
          <h2 className="font-archivo text-2xl text-stone-900 font-bold tracking-tight">Step-by-Step Application Guide</h2>
        </div>
        <p className="font-jakarta text-sm text-stone-600 leading-relaxed mb-6">
          Follow these steps to successfully apply for your livestock transport permit
        </p>

        <div className="flex flex-col">
          {STEPS.map((step, i) => <GuideStep key={i} step={step} index={i} />)}
        </div>
      </div>
    </section>
  );
}