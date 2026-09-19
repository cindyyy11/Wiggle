import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { trendSummary, type Tone } from "./insightCopy";
import styles from "./parent.module.css";

const W = 320;
const H = 150;
const PAD = { left: 38, right: 14, top: 18, bottom: 30 };
const GRID = [0, 0.5, 1] as const;

const percent = (value: number) => `${Math.round(value * 100)}%`;
const toneClass: Record<Tone, string> = {
  sage: styles.toneSage,
  blue: styles.toneBlue,
  mustard: styles.toneMustard,
  coral: styles.toneCoral,
};

/**
 * A small line chart with a 0-100% axis, the first and latest labels, and the change in words.
 * The drawing is decorative (aria-hidden); the same numbers are in a text list for assistive tech.
 */
export function TrendChart({ title, points, description, tone = "sage", summarize }: {
  title: string;
  points: readonly { label: string; value: number }[];
  description: string;
  tone?: Tone;
  /** Replaces the default "Up N points since …" line when a metric reads better another way. */
  summarize?: (points: readonly { label: string; value: number }[]) => string;
}) {
  const shown = points.slice(-8);
  const summary = trendSummary(shown);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (index: number) => PAD.left + (shown.length === 1 ? plotW / 2 : (index * plotW) / (shown.length - 1));
  const y = (value: number) => PAD.top + (1 - Math.min(1, Math.max(0, value))) * plotH;
  const line = shown.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const area = shown.length > 1 ? `${line} L${x(shown.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : "";
  const last = shown[shown.length - 1];
  const Arrow = summary?.change == null || summary.change === 0 ? Minus : summary.change > 0 ? TrendingUp : TrendingDown;

  return <article className={`${styles.panel} ${toneClass[tone]}`}>
    <div className={styles.panelTop}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {summary ? <p className={styles.latestChip} aria-label={`Latest ${summary.latest}%`}>{summary.latest}%</p> : null}
    </div>
    <p className={styles.panelLead}>{description}</p>
    {summary && last ? <>
      <p className={styles.trendSummary}>{summarize ? null : <Arrow className={styles.btnIcon} aria-hidden="true" />}{summarize ? summarize(shown) : summary.text}</p>
      <svg className={styles.chart} data-tone={tone} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
        {GRID.map(value => <g key={value}>
          <line className={styles.chartGrid} x1={PAD.left} x2={W - PAD.right} y1={y(value)} y2={y(value)} />
          <text className={styles.chartAxis} x={PAD.left - 8} y={y(value) + 4} textAnchor="end">{percent(value)}</text>
        </g>)}
        {area ? <path className={styles.chartArea} d={area} /> : null}
        {shown.length > 1 ? <path className={styles.chartLine} d={line} /> : null}
        {shown.map((point, index) => <circle key={index} className={index === shown.length - 1 ? styles.chartDotLast : styles.chartDot} cx={x(index)} cy={y(point.value)} r={index === shown.length - 1 ? 5.5 : 3.5}>
          <title>{`${point.label}: ${percent(point.value)}`}</title>
        </circle>)}
        <text className={styles.chartValue} x={Math.min(x(shown.length - 1), W - PAD.right - 12)} y={Math.max(y(last.value) - 11, 11)} textAnchor="middle">{percent(last.value)}</text>
        <text className={styles.chartAxis} x={PAD.left} y={H - 8} textAnchor={shown.length === 1 ? "middle" : "start"}>{shown[0].label}</text>
        {shown.length > 1 ? <text className={styles.chartAxis} x={W - PAD.right} y={H - 8} textAnchor="end">{last.label}</text> : null}
      </svg>
      <ol className={styles.srOnly}>{shown.map((point, index) => <li key={index}>{point.label}: {percent(point.value)}</li>)}</ol>
    </> : <p className={styles.empty}>A trend will appear after completed missions. There isn’t enough history yet.</p>}
  </article>;
}
