/**
 * The owner's silks as an SVG jersey with sleeves (front view, sleeves arching down both sides), in the
 * colours and patterns of `Silks`. Patterns follow the JRA list (netkeiba) and the US / European names
 * (Breeders' Cup). Scales to any size without blurring.
 */
import { useId, type ReactNode } from "react";
import type { Silks } from "../lib/horses";

const BODY = "M330 40 Q640 -14 950 40 L922 300 Q890 470 902 720 L378 720 Q390 470 358 300 Z";
const LEFT = "M330 40 L252 70 Q64 250 40 720 L196 720 Q214 420 358 300 Z";
const RIGHT = "M950 40 L1028 70 Q1216 250 1240 720 L1084 720 Q1066 420 922 300 Z";
const CX = 640;

/** A five-pointed star centred on (x, y). */
function star(x: number, y: number, r: number, key?: string | number) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
  return <polygon key={key} points={pts} />;
}
const diamond = (x: number, y: number, w: number, h: number, key?: string | number) =>
  <polygon key={key} points={`${x},${y - h} ${x + w},${y} ${x},${y + h} ${x - w},${y}`} />;
/** Squares of a checkerboard over the whole picture (clipped to the part). */
const checks = (size: number) => {
  const out: ReactNode[] = [];
  for (let y = 0; y < 720; y += size) for (let x = 0; x < 1280; x += size) if (((x + y) / size) % 2 === 0) out.push(<rect key={`${x}-${y}`} x={x} y={y} width={size} height={size} />);
  return out;
};

function bodyPattern(p: Silks["pattern"], c: string): ReactNode {
  switch (p) {
    case "hoop1": return <rect x={0} y={300} width={1280} height={110} fill={c} />;
    case "hoop2": return <g fill={c}><rect x={0} y={220} width={1280} height={90} /><rect x={0} y={420} width={1280} height={90} /></g>;
    case "hoop3": return <g fill={c}>{[150, 350, 550].map((y) => <rect key={y} x={0} y={y} width={1280} height={80} />)}</g>;
    case "belt": return <rect x={0} y={260} width={1280} height={210} fill={c} />;
    case "sash": return <line x1={300} y1={-40} x2={980} y2={760} stroke={c} strokeWidth={130} />;
    case "cross": return <g stroke={c} strokeWidth={120}><line x1={300} y1={-40} x2={980} y2={760} /><line x1={980} y1={-40} x2={300} y2={760} /></g>;
    case "stripes": return <g fill={c}>{[400, 530, 660, 790].map((x) => <rect key={x} x={x} y={0} width={64} height={720} />)}</g>;
    case "seams": return <rect x={CX - 9} y={0} width={18} height={720} fill={c} />;
    case "braces": return <g fill={c}><rect x={470} y={0} width={46} height={720} /><rect x={764} y={0} width={46} height={720} /></g>;
    case "halves": return <rect x={CX} y={0} width={640} height={720} fill={c} />;
    case "quartered": return <g fill={c}><rect x={CX} y={0} width={640} height={340} /><rect x={0} y={340} width={CX} height={380} /></g>;
    case "check": return <g fill={c}>{checks(96)}</g>;
    case "harlequin": {
      const out: ReactNode[] = [];
      for (let row = 0; row < 8; row++) for (let col = -1; col < 8; col++) out.push(diamond(358 + col * 96 + (row % 2) * 48, 70 + row * 96, 48, 48, `${row}-${col}`));
      return <g fill={c}>{out}</g>;
    }
    case "diamondBand": return <g fill={c}>{[430, 535, 640, 745, 850].map((x) => diamond(x, 210, 52, 62, x))}</g>;
    case "chevron": return <polyline points="320,240 640,520 960,240" fill="none" stroke={c} strokeWidth={110} />;
    case "bigV": return <polygon points="372,30 470,30 640,420 810,30 908,30 640,600" fill={c} />;
    case "sawtooth": return <polyline points={Array.from({ length: 11 }, (_, i) => `${340 + i * 60},${i % 2 ? 250 : 340}`).join(" ")} fill="none" stroke={c} strokeWidth={60} strokeLinejoin="miter" />;
    case "hash": return <g fill={c}><rect x={500} y={0} width={46} height={720} /><rect x={734} y={0} width={46} height={720} /><rect x={0} y={240} width={1280} height={46} /><rect x={0} y={470} width={1280} height={46} /></g>;
    case "yoke": return <path d="M0 0 H1280 V200 H922 L640 250 L358 200 H0 Z" fill={c} />;
    case "spots": return <g fill={c}>{[[520, 170], [760, 170], [640, 320], [500, 470], [780, 470], [640, 620]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r={46} />)}</g>;
    case "stars": return <g fill={c}>{[[520, 170], [760, 170], [640, 320], [500, 470], [780, 470], [640, 620]].map(([x, y], i) => star(x, y, 58, i))}</g>;
    case "star": return <g fill={c}>{star(CX, 330, 150)}</g>;
    case "ring": return <circle cx={CX} cy={340} r={130} fill="none" stroke={c} strokeWidth={50} />;
    case "diamond": return <g fill={c}>{diamond(CX, 360, 170, 230)}</g>;
    default: return null;
  }
}

/** Points along the middle of the left sleeve (t from 0 at the shoulder to 1 at the cuff) and the arm's angle there. */
function onSleeve(t: number) {
  const [x0, y0, cx, cy, x1, y1] = [292, 84, 142, 262, 118, 720];
  const u = 1 - t;
  const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
  const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
  return { x, y, deg: (Math.atan2(dy, dx) * 180) / Math.PI - 90 };
}
/** The same mark on both sleeves at each t (the right sleeve mirrored). */
function alongSleeves(ts: number[], mark: (i: number) => ReactNode) {
  return ts.flatMap((t, i) => {
    const { x, y, deg } = onSleeve(t);
    return [
      <g key={`l${i}`} transform={`translate(${x} ${y}) rotate(${deg})`}>{mark(i)}</g>,
      <g key={`r${i}`} transform={`translate(${1280 - x} ${y}) rotate(${-deg}) scale(-1 1)`}>{mark(i)}</g>,
    ];
  });
}

function sleevePattern(p: Silks["sleevePattern"], c: string): ReactNode {
  const bands = (ys: number[], h: number) => <g fill={c}>{ys.map((y) => <rect key={y} x={0} y={y} width={1280} height={h} />)}</g>;
  switch (p) {
    case "hoop1": return bands([470], 70);
    case "hoop2": return bands([400, 540], 64);
    case "hoop3": return bands([330, 460, 590], 60);
    case "cuffs": return bands([640], 80);
    case "halved": return bands([400], 320);
    case "stripes":
      // two bands following the arc of each sleeve
      return (
        <g fill="none" stroke={c} strokeWidth={38}>
          <path d="M268 92 Q100 270 82 720" /><path d="M318 236 Q178 400 164 720" />
          <path d="M1012 92 Q1180 270 1198 720" /><path d="M962 236 Q1102 400 1116 720" />
        </g>
      );
    case "chevrons": return <g fill="none" stroke={c} strokeWidth={30}>{alongSleeves([0.3, 0.5, 0.7, 0.9], () => <polyline points="-60,-30 0,20 60,-30" />)}</g>;
    case "diamonds": return <g fill={c}>{alongSleeves([0.22, 0.4, 0.58, 0.76, 0.94], () => diamond(0, 0, 44, 52))}</g>;
    case "spots": return <g fill={c}>{alongSleeves([0.25, 0.45, 0.65, 0.85], () => <circle r={34} />)}</g>;
    case "stars": return <g fill={c}>{alongSleeves([0.25, 0.45, 0.65, 0.85], () => star(0, 0, 44))}</g>;
    case "check": return <g fill={c}>{checks(72)}</g>;
    default: return null;
  }
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
