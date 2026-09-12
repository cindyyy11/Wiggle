import type { CSSProperties } from "react";
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
          <radialGradient id="wiggle-twin-glow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor={accent} stopOpacity=".55" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wiggle-twin-body" cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor={accent} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity=".2" />
          </radialGradient>
        </defs>

        <circle className={styles.glow} cx="90" cy="120" r="72" fill="url(#wiggle-twin-glow)" />

        {(listening ? [0, 1] : []).map(index => (
          <circle key={index} className={styles.listenRing} cx="90" cy="118" r="66" fill="none" stroke={accent} strokeWidth="3" />
        ))}

        <g className={styles.body}>
          {/* Small hand-flippers */}
          <ellipse className={`${styles.hand}`} cx="34" cy="132" rx="14" ry="10" fill="#fff7e7" stroke="#285c85" strokeWidth="2" />
          <ellipse className={`${styles.hand} ${styles.handRight}`} cx="146" cy="132" rx="14" ry="10" fill="#fff7e7" stroke="#285c85" strokeWidth="2" />

          {/* Antenna */}
          <g className={styles.antenna}>
            <line x1="90" y1="46" x2="90" y2="22" stroke="#285c85" strokeWidth="3" strokeLinecap="round" />
            <circle cx="90" cy="16" r="7" fill={state === "mastered" ? "#f4c95d" : "#ef8b78"} />
          </g>

          {/* Body */}
          <ellipse cx="90" cy="120" rx="62" ry="70" fill="url(#wiggle-twin-body)" stroke="#285c85" strokeWidth="3" />
          {/* Helmet-bubble sheen */}
          <ellipse cx="66" cy="88" rx="22" ry="14" fill="#ffffff" opacity=".45" />
          {/* Belly patch */}
          <ellipse cx="90" cy="150" rx="30" ry="24" fill="#fff7e7" opacity=".85" />

          {/* Eyebrows: only furrowed states show them */}
          {(state === "stuck" || state === "overwhelmed") && (
            <>
              <path d="M 58 96 Q 68 90 78 97" fill="none" stroke="#285c85" strokeWidth="3" strokeLinecap="round" />
              <path d="M 122 96 Q 112 90 102 97" fill="none" stroke="#285c85" strokeWidth="3" strokeLinecap="round" />
            </>
          )}

          {/* Eyes */}
          <g className={styles.eyeGroup}>
            <ellipse cx="68" cy="112" rx="17" ry="20" fill="#fff7e7" stroke="#285c85" strokeWidth="2.5" />
            <ellipse cx="112" cy="112" rx="17" ry="20" fill="#fff7e7" stroke="#285c85" strokeWidth="2.5" />
            <circle cx="70" cy="116" r="8" fill="#285c85" />
            <circle cx="114" cy="116" r="8" fill="#285c85" />
            <circle cx="66" cy="110" r="2.6" fill="#fff7e7" />
            <circle cx="110" cy="110" r="2.6" fill="#fff7e7" />
          </g>

          {/* Mouth */}
          <path className={styles.mouth} d={MOUTHS[state]} fill="none" stroke="#285c85" strokeWidth="3" strokeLinecap="round" />
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
