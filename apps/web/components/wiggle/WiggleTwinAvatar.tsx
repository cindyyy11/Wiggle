import { useId, type CSSProperties } from "react";
import type { TwinVisualState } from "@wiggle/contracts";
import { twinVisualCopy } from "@wiggle/contracts";
import styles from "./wiggleTwin.module.css";

export interface WiggleTwinAvatarProps {
  state: TwinVisualState;
  size?: number;
  /** The child's mic is active and the Twin leans in to listen. */
  listening?: boolean;
  /** Lexi's reply is playing; the Twin's mouth moves along with the caption. */
  speaking?: boolean;
  className?: string;
  /** Defaults to the state's own child-safe line (see twinVisualCopy). */
  label?: string;
}

const ACCENTS: Readonly<Record<TwinVisualState, string>> = {
  ready: "#a9d9ee",
  overwhelmed: "#c7d6da",
  stuck: "#ef8b78",
  progressing: "#9dc99a",
  needs_reset: "#cfe6f2",
  mastered: "#f4c95d",
};

const MOUTHS: Readonly<Record<TwinVisualState, string>> = {
  ready: "M 74 138 Q 90 150 106 138",
  overwhelmed: "M 76 140 Q 90 136 104 140",
  stuck: "M 76 141 Q 90 133 104 141",
  progressing: "M 72 136 Q 90 154 108 136",
  needs_reset: "M 78 139 Q 90 135 102 139",
  mastered: "M 70 134 Q 90 158 110 134",
};

/**
 * The child's cute Learner Digital Twin — a soft blob-like space companion, never a
 * realistic human. Its posture, color, and expression are driven entirely by
 * `state`, which should come from getTwinVisualState(twin) so the avatar always
 * reflects the same backend numbers the parent and child screens do.
 */
export function WiggleTwinAvatar({ state, size = 160, listening = false, speaking = false, className = "", label }: WiggleTwinAvatarProps) {
  const accent = ACCENTS[state];
  const celebrating = state === "mastered";
  const furrowed = state === "stuck" || state === "overwhelmed";
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ref = (name: string) => `url(#${uid}-${name})`;
  return (
    <figure
      className={`${styles.avatar} ${className}`}
      data-state={state}
      data-listening={listening}
      data-speaking={speaking}
      style={{ "--twin-size": `${size}px`, "--twin-accent": accent } as CSSProperties}
    >
      <svg viewBox="0 0 180 210" role="img" aria-label={label ?? twinVisualCopy[state]}>
        <defs>
          <radialGradient id={`${uid}-glow`} cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor={accent} stopOpacity=".55" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-body`} cx="36%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="42%" stopColor={accent} />
            <stop offset="100%" stopColor={accent} />
          </radialGradient>
          <linearGradient id={`${uid}-shade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="55%" stopColor="#285c85" stopOpacity="0" />
            <stop offset="100%" stopColor="#285c85" stopOpacity=".3" />
          </linearGradient>
          <linearGradient id={`${uid}-visor`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14335a" />
            <stop offset="100%" stopColor="#2a6a9e" />
          </linearGradient>
          <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="50%" stopColor="#f4c95d" />
            <stop offset="100%" stopColor="#d9a83a" />
          </linearGradient>
          <linearGradient id={`${uid}-mitt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e6dcc6" />
          </linearGradient>
          <radialGradient id={`${uid}-tip`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={celebrating ? "#f4c95d" : "#ef8b78"} stopOpacity=".7" />
            <stop offset="100%" stopColor={celebrating ? "#f4c95d" : "#ef8b78"} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className={styles.glow} cx="90" cy="120" r="72" fill={ref("glow")} />

        {(listening ? [0, 1] : []).map(index => (
          <circle key={index} className={styles.listenRing} cx="90" cy="118" r="66" fill="none" stroke={accent} strokeWidth="3" />
        ))}

        <ellipse className={styles.shadow} cx="90" cy="201" rx="44" ry="6.5" fill="#0b1a2a" />

        <g className={styles.body}>
          {/* Small hand-flippers with a gold cuff */}
          <g className={styles.hand}>
            <ellipse cx="34" cy="132" rx="14" ry="10" fill={ref("mitt")} stroke="#285c85" strokeWidth="2" />
            <path d="M 42 124 Q 46 132 42 140" fill="none" stroke={ref("gold")} strokeWidth="3" strokeLinecap="round" />
          </g>
          <g className={`${styles.hand} ${styles.handRight}`}>
            <ellipse cx="146" cy="132" rx="14" ry="10" fill={ref("mitt")} stroke="#285c85" strokeWidth="2" />
            <path d="M 138 124 Q 134 132 138 140" fill="none" stroke={ref("gold")} strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Antenna with a softly glowing tip */}
          <g className={styles.antenna}>
            <line x1="90" y1="47" x2="90" y2="24" stroke="#285c85" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="90" cy="47" rx="8" ry="3.2" fill={ref("gold")} stroke="#285c85" strokeWidth="1.5" />
            <circle className={styles.antennaGlow} cx="90" cy="16" r="15" fill={ref("tip")} />
            <circle cx="90" cy="16" r="7" fill={celebrating ? "#f4c95d" : "#ef8b78"} stroke="#285c85" strokeWidth="1.5" />
            <circle cx="87.6" cy="13.6" r="2" fill="#ffffff" opacity=".85" />
          </g>

          {/* Body, with depth, a rim light and a glass sheen */}
          <ellipse cx="90" cy="120" rx="62" ry="70" fill={ref("body")} stroke="#285c85" strokeWidth="3" />
          <ellipse cx="90" cy="120" rx="62" ry="70" fill={ref("shade")} />
          <path d="M 139 148 Q 128 181 95 188" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".5" />
          <ellipse cx="64" cy="84" rx="20" ry="11" fill="#ffffff" opacity=".4" transform="rotate(-24 64 84)" />

          {/* Comm pods */}
          <circle cx="29.5" cy="106" r="6.5" fill={ref("gold")} stroke="#285c85" strokeWidth="1.5" />
          <circle cx="150.5" cy="106" r="6.5" fill={ref("gold")} stroke="#285c85" strokeWidth="1.5" />

          {/* Glass face plate with a gold trim */}
          <ellipse cx="90" cy="116" rx="52" ry="38" fill={ref("visor")} />
          <ellipse cx="90" cy="116" rx="52" ry="38" fill="none" stroke="#a9d9ee" strokeWidth="1.5" opacity=".55" />
          <ellipse cx="90" cy="116" rx="54.5" ry="40.5" fill="none" stroke={ref("gold")} strokeWidth="3.5" />
          <path d="M 54 92 Q 66 82 90 81" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity=".32" />
          <circle cx="47" cy="103" r="2" fill="#ffffff" opacity=".4" />

          {/* Eyebrows: only furrowed states show them */}
          {furrowed && (
            <>
              <path d="M 58 92 Q 68 86 78 93" fill="none" stroke="#fff7e7" strokeWidth="3" strokeLinecap="round" />
              <path d="M 122 92 Q 112 86 102 93" fill="none" stroke="#fff7e7" strokeWidth="3" strokeLinecap="round" />
            </>
          )}

          {/* Eyes */}
          <g className={styles.eyeGroup}>
            <ellipse cx="68" cy="112" rx="17" ry="20" fill="#fff7e7" />
            <ellipse cx="112" cy="112" rx="17" ry="20" fill="#fff7e7" />
            <g className={styles.pupils}>
              <circle cx="70" cy="116" r="9" fill="#1f4f78" />
              <circle cx="114" cy="116" r="9" fill="#1f4f78" />
              <circle cx="70" cy="116" r="4.6" fill="#0d2540" />
              <circle cx="114" cy="116" r="4.6" fill="#0d2540" />
              <circle cx="66" cy="110" r="3" fill="#ffffff" />
              <circle cx="110" cy="110" r="3" fill="#ffffff" />
              <circle cx="73.5" cy="120" r="1.4" fill="#ffffff" opacity=".8" />
              <circle cx="117.5" cy="120" r="1.4" fill="#ffffff" opacity=".8" />
            </g>
          </g>

          {/* Mouth */}
          <path className={styles.mouth} d={MOUTHS[state]} fill="none" stroke="#fff7e7" strokeWidth="3" strokeLinecap="round" />

          {/* Gold belt with a star badge */}
          <path d="M 40 160 Q 90 182 140 160" fill="none" stroke={ref("gold")} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="90" cy="172" r="8.5" fill="#1f4f78" stroke={ref("gold")} strokeWidth="2" />
          <path d="M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z" fill="#f4c95d" transform="translate(90 172)" />
        </g>

        {celebrating && [0, 1, 2].map(index => (
          <path
            key={index}
            className={styles.sparkle}
            d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z"
            fill="#f4c95d"
            transform={`translate(${44 + index * 46} ${38 + (index % 2) * 10})`}
          />
        ))}

        {state === "needs_reset" && (
          <g className={styles.resetBadge} transform="translate(134 40)">
            <circle r="14" fill="#fff7e7" stroke="#285c85" strokeWidth="2" />
            <path d="M 4 -8 A 9 9 0 1 0 4 8 A 7 7 0 1 1 4 -8 Z" fill="#285c85" />
          </g>
        )}
      </svg>
    </figure>
  );
}
