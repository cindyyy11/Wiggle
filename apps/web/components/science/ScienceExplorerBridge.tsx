'use client';
import { useContext, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ExplorerContext } from '../universe/ExplorerContext';
import type { ScienceZoneId } from '../worlds/subjectRoute';
import { nearbyScienceLand } from './scienceInvitation';
import { SCIENCE_LANDS } from './scienceLands';
import { SurfaceGroup } from './ScienceLandScenery';
import { Html } from '@react-three/drei/web/Html';
export function ScienceExplorerBridge({ onNearby, onVisit, paused }: { onNearby: (land: ScienceZoneId | null) => void; onVisit: (land: ScienceZoneId) => void; paused: boolean }) {
  const input = useContext(ExplorerContext);
  const previous = useRef<ScienceZoneId | null>(null);
  useFrame(() => {
    if (!input || paused) return;
    const next = nearbyScienceLand(input.current.position, previous.current);
    if (next !== previous.current) { previous.current = next; onNearby(next); }
  });
  return paused ? null : <group>{SCIENCE_LANDS.map(land => <SurfaceGroup key={land.id} destination={land.destination}><Html center occlude position={[0, .9, 0]} distanceFactor={5} zIndexRange={[2, 0]}><button type="button" className="science-land-sign" onClick={() => onVisit(land.id)} aria-label={`Walk to ${land.name}`}>{land.name}</button></Html></SurfaceGroup>)}</group>;
}
