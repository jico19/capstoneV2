import { useState } from "react";


import FacebookIcon  from "/src/assets/about-icons/facebook.png";
import GithubIcon    from "/src/assets/about-icons/github.png";
import InstagramIcon from "/src/assets/about-icons/instagram.png";

const SOCIALS = [
  { icon: FacebookIcon,  label: "Facebook",  color: "#1877f2", filter: "invert(27%) sepia(89%) saturate(1500%) hue-rotate(205deg) brightness(95%)" },
  { icon: GithubIcon,    label: "GitHub",    color: "#6e5494", filter: "invert(30%) sepia(20%) saturate(800%) hue-rotate(240deg) brightness(85%)" },
  { icon: InstagramIcon, label: "Instagram", color: "#e1306c", filter: "invert(24%) sepia(80%) saturate(1500%) hue-rotate(310deg) brightness(95%)" },
];

export default function LandingProfileCard({
  photo,
  name,
  position,
  facebook  = "#",   
  github    = "#",  
  instagram = "#",  
}) {
  const [hovered, setHovered] = useState(null);

  const links = { Facebook: facebook, GitHub: github, Instagram: instagram };

  return (
    <div className="profile-card">
      <img src={photo} alt={name} className="profile-card-img" />

      <section className="profile-card-section">
        <h2 className="profile-card-name">{name}</h2>
        <p className="profile-card-position">{position}</p>

        <div className="profile-card-socials">
          {SOCIALS.map(({ icon, label, color, filter }) => (
            <a
              key={label}
              href={links[label]}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-card-social-btn"
              onMouseEnter={() => setHovered(label)}
              onMouseLeave={() => setHovered(null)}
            >
              <img
                src={icon}
                alt={label}
                className="profile-card-social-icon"
                style={hovered === label ? { filter } : {}}
              />
              <span
                className="profile-card-tooltip"
                style={{ "--tooltip-color": color }}
              >
                {label}
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}