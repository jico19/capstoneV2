import FAQsHero      from "./sections/FAQsHero";
import FAQsAccordion from "./sections/FAQsAccordion";
import FAQsCTA       from "./sections/FAQsCTA";

export default function LandingFAQs() {
  return (
    <div className="w-full bg-brand-bg overflow-x-hidden">
      <FAQsHero />
      <FAQsAccordion />
      <FAQsCTA />
    </div>
  );
}