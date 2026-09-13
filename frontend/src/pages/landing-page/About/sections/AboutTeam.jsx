import useScrollReveal from "../../../../hooks/useScrollReveal";
import LandingProfileCard from "../../../../components/ui/LandingProfilecard";
import ItachiPhoto  from "../../../../assets/about-icons/itachi.jpg";
import ShizukuPhoto from "../../../../assets/about-icons/shizuku.jpg";
import TojiPhoto    from "../../../../assets/about-icons/toji.jpg";

const MEMBERS = [
  { photo: ItachiPhoto,  name: "Jerwin Quijano",    position: "Developer · Backend",
    facebook: "https://facebook.com/placeholder", github: "https://github.com/placeholder", instagram: "https://instagram.com/placeholder" },
  { photo: ShizukuPhoto, name: "Jeanne Gianan",    position: "Developer · Frontend",
    facebook: "https://facebook.com/placeholder", github: "https://github.com/placeholder", instagram: "https://instagram.com/placeholder" },
  { photo: TojiPhoto,    name: "Lanse A-gon",  position: "Developer · System Architecture",
    facebook: "https://facebook.com/placeholder", github: "https://github.com/placeholder", instagram: "https://instagram.com/placeholder" },
];

export default function AboutTeam() {
  const headerRef = useScrollReveal({ threshold: 0.2 });

  return (
    <section className="bg-brand-bg py-16 relative overflow-hidden max-[640px]:py-12">
      <div className="max-w-[72rem] mx-auto px-8 max-[640px]:px-5">

        {/* Header */}
        <div ref={headerRef} className="reveal-block text-center mb-12 max-[640px]:mb-8">
          <h2 className="font-archivo text-[clamp(1.6rem,3vw,2.4rem)] text-brand-primary tracking-[-0.02em] mb-2">Development Team</h2>
          <p className="font-jakarta text-[clamp(0.88rem,1.2vw,1rem)] text-[#6c757d] leading-[1.7]">
            IT students from Dalubhasaan ng Lungsod ng Lucena
          </p>
        </div>

        {/* Cards */}
        <div className="flex justify-center gap-20 flex-wrap max-[800px]:gap-8 max-[640px]:gap-5">
          {MEMBERS.map((member, i) => (
            <div key={i} className={i === 1 ? "max-[1056px]:mt-0 mt-20" : ""}>
              <LandingProfileCard {...member} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}