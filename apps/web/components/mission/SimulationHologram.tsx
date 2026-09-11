import type { SimulationReport, StrategyName } from "@wiggle/contracts";
import styles from "./mission.module.css";

const choices = [{ strategy: "standard", label: "Standard" }, { strategy: "visual", label: "Visual" }, { strategy: "visual_gesture", label: "Gesture + Visual" }] as const;

export function SimulationHologram({ report, onSelect }: { report: SimulationReport; onSelect: (strategy: StrategyName) => void }) {
  return <><span className={styles.kicker}>A LITTLE LOOK AHEAD</span><h2>A few ways to explore</h2><p>Which way could help? These are guesses, not grades.</p><div className={styles.predictions}>
    {choices.map(choice => {
      const prediction = report.ranked.find(item => item.strategy === choice.strategy);
      return <div key={choice.strategy} className={styles.prediction} data-recommended={report.recommendedStrategy === choice.strategy}><span>{choice.label}</span><strong data-testid="prediction">{prediction ? `${Math.round(prediction.predictedSuccess * 100)}%` : "—"}</strong><div className={styles.track} aria-hidden="true"><i style={{ width: `${(prediction?.predictedSuccess ?? 0) * 100}%` }} /></div></div>;
    })}
  </div><button className={styles.primary} onClick={() => onSelect("visual_gesture")}>Try Gesture + Visual <span aria-hidden="true">↗</span></button></>;
}
