import { useEffect, useRef, useState } from "react";

function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count;
}

// TODO:
// use real data from the backend
const STATS = [
  { value: 500,  suffix: "+",    label: "Permits Issued",           delay: "0s"    },
  { value: 15,   suffix: " min", label: "Average Processing Time",  delay: "0.1s"  },
  { value: 24,   suffix: "/7",   label: "Application Submission",   delay: "0.2s"  },
];  

function StatItem({ value, suffix, label, delay, animate }) {
  const count = useCounter(value, 1800, animate);
  return (
    <div className="stats-item relative px-8 py-11 text-center
        after:content-[''] after:absolute after:right-0 after:top-[25%] after:h-[50%] after:w-px
        after:[background:linear-gradient(to_bottom,transparent,rgba(255,255,255,0.1),transparent)]
        last:after:hidden"
      style={{ animationDelay: delay }}>
      <div className="font-archivo text-[clamp(32px,4vw,48px)] text-brand-amber leading-none mb-[10px] tracking-[-0.02em]">
        {count}{suffix}
      </div>
      <div className="font-jakarta text-[13.5px] text-white/50 font-medium tracking-[0.03em] uppercase">
        {label}
      </div>
    </div>
  );
}

export default function Stats() {
  const ref = useRef(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAnimate(true);
          el.classList.add("stats-is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-[#0f3320] relative overflow-hidden">
      {/* Diagonal texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(-60deg, transparent, transparent 30px, rgba(255,255,255,0.02) 30px, rgba(255,255,255,0.02) 31px)" }} />

      <div className="relative z-[1] max-w-[1200px] mx-auto px-10 grid grid-cols-4 max-[768px]:grid-cols-2 max-[768px]:px-6 max-[480px]:grid-cols-2">
        {STATS.map((stat, i) => (
          <StatItem key={i} {...stat} animate={animate} />
        ))}
      </div>
    </section>
  );
}