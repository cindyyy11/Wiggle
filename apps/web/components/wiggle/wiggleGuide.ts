const TIPS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^Back to Worlds$/, "This takes you back to the map of all the planets."],
  [/^Close activity$/, "All done for now? Tap to go back to the planet."],
  [/^Run$/, "Turn Run on to walk faster. Tap it again to walk slowly."],
  [/^Hop/, "Hop! Jump up and down on the ground."],
  [/^Walk forward$/, "Hold this to walk forward. You can use the up arrow key too."],
  [/^Walk back$/, "Hold this to walk backward. You can use the down arrow key too."],
  [/^Walk left$/, "Hold this to walk left. You can use the left arrow key too."],
  [/^Walk right$/, "Hold this to walk right. You can use the right arrow key too."],
  [/^Zoom in$/, "Look closer at the planet."],
  [/^Zoom out$/, "Step back to see more of the planet."],
  [/^Reset view$/, "Lost? This puts the camera back where it started."],
  [/^Follow explorer$/, "Follow your explorer as they walk around."],
  [/^View whole planet$/, "See the whole planet from far away."],
  [/^Previous planet$/, "See the planet before this one."],
  [/^Next planet$/, "See the next planet."],
  [/^Explore Numeria$/, "Numeria is the maths planet. Tap to play with numbers and shapes."],
  [/^Explore Science Planet$/, "The Science Planet is full of magnets, animals and colours. Tap to explore."],
  [/coming soon\)?$/, "A new world is still hiding here. Come back soon!"],
  [/^Visit Magnet Lands$/, "Magnet Lands: find out what sticks and what does not."],
  [/^Visit Animal Types$/, "Animal Types: meet animals and sort them into groups."],
  [/^Visit Colors Canyon$/, "Colors Canyon: spot and match colours."],
  [/^Visit Life Cycle Garden$/, "Life Cycle Garden: watch living things grow and change."],
  [/^Visit Fraction Forest$/, "Fraction Forest: share things into equal parts."],
  [/^Visit Number Valley$/, "Number Valley: count and put numbers in order."],
  [/^Visit Geometry Ridge$/, "Geometry Ridge: play with shapes."],
  [/^Visit Crystal Crater$/, "Crystal Crater: solve little puzzles."],
  [/^Explore /, "Tap here to start the activity in this place."],
  [/^Let.s explore/, "Tap to start exploring together."],
  [/^Not now$/, "No problem. You can come back to it any time."],
  [/^Parent mission control$/, "This part is for grown-ups."],
];

const TARGETS = "[data-wiggle-tip], button, a, summary, [role='button']";

export function guideTipFor(element: Element | null): string | null {
  const target = element?.closest?.(TARGETS);
  if (!target) return null;
  const explicit = target.getAttribute("data-wiggle-tip");
  if (explicit) return explicit;
  const labels = [target.getAttribute("aria-label"), target.getAttribute("title"), target.textContent]
    .map(value => (value ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  for (const label of labels) {
    const match = TIPS.find(([pattern]) => pattern.test(label));
    if (match) return match[1];
  }
  return null;
}
