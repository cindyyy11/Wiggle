// @vitest-environment jsdom
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ScienceStarterSession, type StarterProgress } from './ScienceStarterSession';
import { SCIENCE_ACTIVITIES, type StarterLand } from './scienceActivities';
afterEach(cleanup);
function Harness({ land }: { land: StarterLand }) {
  const [progress, setProgress] = useState<StarterProgress>({ observed: [], matched: [] });
  return <ScienceStarterSession land={land} graphics={false} progress={progress} onProgress={setProgress} onClose={vi.fn()} />;
}
for (const land of ['animals', 'colors', 'life-cycle'] as const) it(`finishes ${land} only after discoveries and correct matches`, () => {
  const camera = vi.fn(); Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: camera } });
  render(<Harness land={land} />);
  expect(screen.getByRole('button', { name: /Next:/ }).hasAttribute('disabled')).toBe(true);
  const activity = SCIENCE_ACTIVITIES[land];
  for (const item of activity.items) fireEvent.click(screen.getByRole('button', { name: `Discover ${item.name}` }));
  fireEvent.click(screen.getByRole('button', { name: /Next:/ }));
  fireEvent.click(screen.getByRole('button', { name: `Grab ${activity.items[0].name}` }));
  const wrong = activity.targets.find(target => target.id !== activity.items[0].target)!;
  fireEvent.click(screen.getByRole('button', { name: `${wrong.name} Release here` }));
  expect(screen.getByRole('status').textContent).toContain('Try again');
  expect(screen.queryByRole('button', { name: /Finish/ })).toBeNull();
  for (const item of activity.items) {
    fireEvent.click(screen.getByRole('button', { name: `Grab ${item.name}` }));
    fireEvent.click(screen.getByRole('button', { name: `${activity.targets.find(target => target.id === item.target)!.name} Release here` }));
  }
  expect(screen.getByRole('button', { name: /Finish/ })).toBeTruthy();
  expect(camera).not.toHaveBeenCalled();
});
