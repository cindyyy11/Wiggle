"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";

const TEXTURE_SIZE = 128;

/** Draws `text` centred on a square canvas, bold with a dark outline so it reads on any stone or gem. */
function drawText(canvas: HTMLCanvasElement, text: string, color: string, outline: string): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;
  context.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  context.font = `800 ${text.length > 1 ? 84 : 104}px "Trebuchet MS", "Segoe UI", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = 14;
  context.strokeStyle = outline;
  context.strokeText(text, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 6);
  context.fillStyle = color;
  context.fillText(text, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2 + 6);
  return true;
}

/** A number (or "?", "+", "−") on a square plane facing the camera. */
export function NumberPlate({ text, size = .3, color = "#ffffff", outline = "#173e55" }: { text: string; size?: number; color?: string; outline?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    if (!drawText(canvas, text, color, outline)) return null;
    const made = new CanvasTexture(canvas);
    made.colorSpace = SRGBColorSpace;
    return made;
  }, [text, color, outline]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return <mesh>
    <planeGeometry args={[size, size]} />
    <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
  </mesh>;
}
