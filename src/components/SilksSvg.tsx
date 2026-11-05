/**
 * The owner's silks as an SVG jersey with sleeves (front view, sleeves arching down both sides), in the
 * colours and patterns of `Silks`. Scales to any size without blurring.
 */
import { useId } from "react";
import type { Silks } from "../lib/horses";

const BODY = "M330 40 Q640 -14 950 40 L922 300 Q890 470 902 720 L378 720 Q390 470 358 300 Z";
const LEFT = "M330 40 L252 70 Q64 250 40 720 L196 720 Q214 420 358 300 Z";
const RIGHT = "M950 40 L1028 70 Q1216 250 1240 720 L1084 720 Q1066 420 922 300 Z";

function bodyPattern(p: Silks["pattern"], c: string) {
  switch (p) {
    case "cross": return <g stroke={c} strokeWidth={120}><line x1={300} y1={-40} x2={980} y2={760} /><line x1={980} y1={-40} x2={300} y2={760} /></g>;
    case "sash": return <line x1={300} y1={-40} x2={980} y2={760} stroke={c} strokeWidth={130} />;
    case "hoops": return <g fill={c}>{[150, 350, 550].map((y) => <rect key={y} x={0} y={y} width={1280} height={90} />)}</g>;
    case "stripes": return <g fill={c}>{[400, 530, 660, 790].map((x) => <rect key={x} x={x} y={0} width={64} height={720} />)}</g>;
    case "halves": return <rect x={640} y={0} width={640} height={720} fill={c} />;
    case "chevron": return <polyline points="320,240 640,520 960,240" fill="none" stroke={c} strokeWidth={110} />;
    case "spots": return <g fill={c}>{[[520, 170], [760, 170], [640, 320], [500, 470], [780, 470], [640, 620]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={46} />)}</g>;
    default: return null;
  }
}

function sleevePattern(p: Silks["sleevePattern"], c: string) {
  if (p === "stripes") {
    // two bands following the arc of each sleeve
    return (
      <g fill="none" stroke={c} strokeWidth={38}>
        <path d="M268 92 Q100 270 82 720" /><path d="M318 236 Q178 400 164 720" />
        <path d="M1012 92 Q1180 270 1198 720" /><path d="M962 236 Q1102 400 1116 720" />
      </g>
    );
  }
  if (p === "hoops") return <g fill={c}>{[260, 440, 620].map((y) => <rect key={y} x={0} y={y} width={1280} height={70} />)}</g>;
  return null;
}

export function SilksSvg({ silks: s, className }: { silks: Silks; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 1280 720" className={className} role="img" aria-label="สีเสื้อเจ้าของ" data-testid="silks-svg">
      <defs>
        <clipPath id={`${id}b`}><path d={BODY} /></clipPath>
        <clipPath id={`${id}s`}><path d={LEFT} /><path d={RIGHT} /></clipPath>
      </defs>
      <g clipPath={`url(#${id}s)`}>
        <rect width={1280} height={720} fill={s.sleeves} />
        {sleevePattern(s.sleevePattern, s.sleeveAccent)}
      </g>
      <g clipPath={`url(#${id}b)`}>
        <rect width={1280} height={720} fill={s.body} />
        {bodyPattern(s.pattern, s.accent)}
      </g>
      <g fill="none" stroke="#111" strokeWidth={8} strokeLinejoin="round"><path d={LEFT} /><path d={RIGHT} /><path d={BODY} /></g>
    </svg>
  );
}
