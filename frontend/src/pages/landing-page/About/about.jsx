import AboutHero from "./sections/AboutHero";
import AboutContent from "./sections/AboutContent";
import AboutContact from "./sections/AboutContact";
import AboutMap from "./sections/AboutMap";

export default function LandingAbout() {
  return (
    <div className="w-full bg-brand-bg overflow-x-hidden">
      <AboutHero />
      <AboutContent />
      <AboutContact />
      <AboutMap />
    </div>
  );
}