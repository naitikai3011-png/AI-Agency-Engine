export type ChsBand = "critical" | "poor" | "fair" | "good" | "thriving";

interface AvatarProps {
  band: ChsBand;
  score?: number;
  mini?: boolean;
}

type BandConfig = {
  color: string;
  dimColor: string;
  glowRgba: string;
  orbSpeed: string;
  innerSpeed: string | null;
  pulseAnim: string;
  pulseSpeed: string;
  tendrilLen: number;
  tendrilCount: number;
  dashArray: string;
  outerOp: number;
  distort: boolean;
  glowR: number;
};

const BAND: Record<ChsBand, BandConfig> = {
  critical: {
    color: "#ef4444", dimColor: "#450a0a", glowRgba: "rgba(239,68,68,0.12)",
    orbSpeed: "22s", innerSpeed: null, pulseAnim: "av-glitch", pulseSpeed: "5s",
    tendrilLen: 28, tendrilCount: 2, dashArray: "3 22", outerOp: 0.3,
    distort: true, glowR: 0,
  },
  poor: {
    color: "#f97316", dimColor: "#431407", glowRgba: "rgba(249,115,22,0.12)",
    orbSpeed: "16s", innerSpeed: "28s", pulseAnim: "av-breathe", pulseSpeed: "3.2s",
    tendrilLen: 42, tendrilCount: 3, dashArray: "6 16", outerOp: 0.45,
    distort: false, glowR: 0,
  },
  fair: {
    color: "#eab308", dimColor: "#78350f", glowRgba: "rgba(234,179,8,0.12)",
    orbSpeed: "12s", innerSpeed: "20s", pulseAnim: "av-breathe", pulseSpeed: "2.5s",
    tendrilLen: 56, tendrilCount: 4, dashArray: "9 12", outerOp: 0.6,
    distort: false, glowR: 0,
  },
  good: {
    color: "#3b82f6", dimColor: "#1e3a8a", glowRgba: "rgba(59,130,246,0.18)",
    orbSpeed: "8s", innerSpeed: "14s", pulseAnim: "av-breathe", pulseSpeed: "1.8s",
    tendrilLen: 70, tendrilCount: 5, dashArray: "12 8", outerOp: 0.75,
    distort: false, glowR: 5,
  },
  thriving: {
    color: "#22c55e", dimColor: "#14532d", glowRgba: "rgba(34,197,94,0.22)",
    orbSpeed: "5s", innerSpeed: "9s", pulseAnim: "av-breathe-fast", pulseSpeed: "1.2s",
    tendrilLen: 80, tendrilCount: 6, dashArray: "16 4", outerOp: 0.9,
    distort: false, glowR: 9,
  },
};

function hexPts(cx: number, cy: number, r: number, startDeg = -30): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 + startDeg) * (Math.PI / 180);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

const TENDRIL_ANGLES = [0, 60, 120, 180, 240, 300];

const PARTICLES = [
  { cx: 70, cy: 45, dx: -18, dy: -22 },
  { cx: 155, cy: 62, dx: 20, dy: -18 },
  { cx: 170, cy: 130, dx: 22, dy: 14 },
  { cx: 55, cy: 158, dx: -18, dy: 18 },
  { cx: 135, cy: 168, dx: 14, dy: 22 },
  { cx: 30, cy: 100, dx: -24, dy: 0 },
];

export function CHSAvatar({ band, score, mini = false }: AvatarProps) {
  const cfg = BAND[band];
  const filterId = `av-filter-${band}`;

  if (mini) {
    return (
      <svg
        width="28"
        height="28"
        viewBox="0 0 200 200"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`CHS ${band}`}
        style={{ overflow: "visible" }}
      >
        <circle
          cx="100" cy="100" r="88"
          fill="none"
          stroke={cfg.color}
          strokeWidth="5"
          strokeDasharray={cfg.dashArray}
          opacity={cfg.outerOp}
          className="av-tf-center"
          style={{ animation: `av-orbit-cw ${cfg.orbSpeed} linear infinite` }}
        />
        <polygon
          points={hexPts(100, 100, 36)}
          fill={cfg.glowRgba}
          stroke={cfg.color}
          strokeWidth="6"
          className="av-tf-center"
          style={{ animation: `${cfg.pulseAnim} ${cfg.pulseSpeed} ease-in-out infinite` }}
        />
        <circle cx="100" cy="100" r="14" fill={cfg.color} />
      </svg>
    );
  }

  const visibleAngles = TENDRIL_ANGLES.slice(0, cfg.tendrilCount);

  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Cognitive Health: ${band}${score !== undefined ? ` (${score})` : ""}`}
      style={{ overflow: "visible" }}
    >
      <defs>
        {(cfg.glowR > 0 || cfg.distort) && (
          cfg.distort ? (
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="turbulence" baseFrequency="0.1" numOctaves="3" seed="7" result="turb" />
              <feDisplacementMap in2="turb" in="SourceGraphic" scale="7" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          ) : (
            <filter id={filterId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={cfg.glowR} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )
        )}
      </defs>

      {cfg.glowR > 0 && (
        <circle cx="100" cy="100" r="72" fill={cfg.glowRgba} opacity="0.55" />
      )}

      <circle
        cx="100" cy="100" r="88"
        fill="none"
        stroke={cfg.color}
        strokeWidth="1.5"
        strokeDasharray={cfg.dashArray}
        opacity={cfg.outerOp}
        className="av-tf-center"
        style={{ animation: `av-orbit-cw ${cfg.orbSpeed} linear infinite` }}
      />

      {visibleAngles.map((angleDeg, i) => {
        const rad = angleDeg * (Math.PI / 180);
        const ex = 100 + cfg.tendrilLen * Math.cos(rad);
        const ey = 100 + cfg.tendrilLen * Math.sin(rad);
        const mx = 100 + cfg.tendrilLen * 0.5 * Math.cos(rad);
        const my = 100 + cfg.tendrilLen * 0.5 * Math.sin(rad);
        return (
          <g
            key={i}
            opacity="0.75"
            style={{ animation: `av-tendril ${cfg.pulseSpeed} ${(i * 0.18).toFixed(2)}s ease-in-out infinite` }}
          >
            <line x1="100" y1="100" x2={ex.toFixed(1)} y2={ey.toFixed(1)} stroke={cfg.color} strokeWidth="1.5" />
            <circle cx={mx.toFixed(1)} cy={my.toFixed(1)} r="2.5" fill={cfg.color} />
            <circle
              cx={ex.toFixed(1)} cy={ey.toFixed(1)} r="4" fill={cfg.color}
              filter={cfg.glowR > 0 ? `url(#${filterId})` : undefined}
            />
          </g>
        );
      })}

      {cfg.innerSpeed && (
        <polygon
          points={hexPts(100, 100, 43, 0)}
          fill={cfg.glowRgba}
          stroke={cfg.color}
          strokeWidth="1"
          opacity="0.35"
          className="av-tf-center"
          style={{ animation: `av-orbit-ccw ${cfg.innerSpeed} linear infinite` }}
        />
      )}

      <g
        className="av-tf-center"
        style={{
          animation: `${cfg.pulseAnim} ${cfg.pulseSpeed} ease-in-out infinite`,
          filter: cfg.glowR > 0 || cfg.distort ? `url(#${filterId})` : undefined,
        }}
      >
        <polygon points={hexPts(100, 100, 27, -30)} fill={cfg.dimColor} stroke={cfg.color} strokeWidth="2.5" />
        <ellipse cx="100" cy="100" rx="10" ry="7" fill={cfg.color} opacity="0.9" />
        <ellipse cx="100" cy="100" rx="5" ry="4" fill="#000" opacity="0.9" />
        <circle cx="103" cy="97" r="2" fill="#fff" opacity="0.65" />
      </g>

      <circle cx="100" cy="100" r="3.5" fill={cfg.color} />

      {band === "thriving" &&
        PARTICLES.map((p, i) => (
          <circle
            key={i}
            cx={p.cx}
            cy={p.cy}
            r="3"
            fill={cfg.color}
            style={{
              animationName: "av-particle",
              animationDuration: "2.2s",
              animationDelay: `${(i * 0.37).toFixed(2)}s`,
              animationIterationCount: "infinite",
              animationTimingFunction: "ease-out",
              ["--pdx" as string]: `${p.dx}px`,
              ["--pdy" as string]: `${p.dy}px`,
            }}
          />
        ))}
    </svg>
  );
}
