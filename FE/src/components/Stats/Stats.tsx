import { useEffect, useRef, useState } from 'react';

const STATS = [
  { value: 15000, suffix: '+', label: 'Active Creators' },
  { value: 50000, suffix: '+', label: 'Chapters Published' },
  { value: 2000000, suffix: '+', label: 'Active Readers' },
  { value: 98, suffix: '%', label: 'Satisfaction Rate' },
];

function formatNumber(n: number, suffix: string): string {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M${suffix}`;
  if (n >= 1_000) return `${Math.floor(n / 1_000)}K${suffix}`;
  return `${n}${suffix}`;
}

function useCountUp(target: number, suffix: string, duration = 1800) {
  const [display, setDisplay] = useState('0');
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();
    let raf: number;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      setDisplay(formatNumber(current, suffix));

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [started, target, suffix, duration]);

  return { ref, display };
}

export default function Stats() {
  return (
    <section className="bg-neutral-50 border-b border-neutral-200 py-12" id="stats">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {STATS.map((stat) => (
            <StatItem key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatItem({ stat }: { stat: (typeof STATS)[number] }) {
  const { ref, display } = useCountUp(stat.value, stat.suffix);

  return (
    <div className="text-center" ref={ref}>
      <div className="text-3xl lg:text-4xl font-bold text-neutral-900 mb-2 leading-none">
        {display}
      </div>
      <div className="text-sm text-neutral-600">{stat.label}</div>
    </div>
  );
}
