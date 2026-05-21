import Hero from "./sections/Hero";
import Stats from "./sections/Stats";
import Features from "./sections/Features";
import HowItWorks from "./sections/HowItWorks";
import Benefits from "./sections/Benefits";
import CTA from "./sections/CTA";



export default function LandingHome() {
  return (
    <div className="w-full bg-brand-bg">
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <Benefits />
      <CTA />
    </div>
  );
}