"use client";

import { useEffect, useState } from "react";
import { guideTipFor } from "./wiggleGuide";

const TOUCH_TIP_MS = 5000;

/** The tip Wiggle should say for whatever the child is pointing at, focusing or tapping. */
export function useWiggleGuide(enabled: boolean): string | null {
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) { setTip(null); return; }
    let timer: number | undefined;
    const show = (target: EventTarget | null, autoHide = false) => {
      window.clearTimeout(timer);
      const next = target instanceof Element ? guideTipFor(target) : null;
      setTip(next);
      if (next && autoHide) timer = window.setTimeout(() => setTip(null), TOUCH_TIP_MS);
    };
    const over = (event: PointerEvent) => { if (event.pointerType !== "touch") show(event.target); };
    const down = (event: PointerEvent) => { if (event.pointerType === "touch") show(event.target, true); };
    const focusIn = (event: FocusEvent) => show(event.target);
    const focusOut = (event: FocusEvent) => show(event.relatedTarget);
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerdown", down);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
    };
  }, [enabled]);

  return tip;
}
