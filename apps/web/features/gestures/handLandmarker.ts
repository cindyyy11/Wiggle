import type { HandFrame } from "./gestureClassifier";

export interface LocalHandTracker { detect(video: HTMLVideoElement, time: number): HandFrame | null; close(): void }

/** Only static model/WASM files are downloaded. Video stays inside detectForVideo. */
export async function loadHandLandmarker(): Promise<LocalHandTracker> {
  const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
  const files = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm");
  const tracker = await HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "CPU" },
    runningMode: "VIDEO", numHands: 1, minHandDetectionConfidence: .7, minHandPresenceConfidence: .7, minTrackingConfidence: .7,
  });
  return {
    detect(video, time) {
      const result = tracker.detectForVideo(video, time);
      const landmarks = result.landmarks[0]; const hand = result.handedness[0]?.[0];
      return landmarks && hand ? { landmarks, handedness: hand.categoryName, confidence: hand.score } : null;
    },
    close: () => tracker.close(),
  };
}
