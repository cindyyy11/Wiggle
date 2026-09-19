# Numeria Science-Style Learning Experience

## Goal

Turn Numeria into a complete Maths counterpart to the Science Planet experience. Numeria should use the same interaction model, visual hierarchy, navigation rhythm, and feedback patterns as Science while retaining a distinct, colorful Maths identity and Maths-specific content.

## Experience

The learner arrives at Numeria and sees four clearly separated, raised regions on the planet. Selecting a region updates a consistent planet HUD with its name, short description, activity progress, and an Explore action. Choosing Explore moves the learner into a focused activity frame. Completing the activity gives immediate positive feedback, records progress for the current visit, and offers a clear route back to Numeria.

Numeria remains playable. Unavailable English and Bahasa Melayu planets remain visually muted and keep a lock icon centered on the visible face of each planet.

## Regions and Activities

### Fraction Forest

Learners build and compare simple fractions using visual fraction pieces. The existing fraction mission and its content should be preserved where practical, but presented through the same session entry and exit pattern as the other Numeria activities.

### Number Valley

Learners arrange number cards and complete short number patterns. Challenges use large targets, small sets, and immediate correction so the activity stays manageable for younger learners.

### Geometry Ridge

Learners identify and match shapes using visual properties such as sides and corners. A later challenge may include rotation, but the initial implementation should prioritize recognition and matching over precise drag mechanics.

### Crystal Crater

Learners complete addition and subtraction sequences represented by crystals. Questions remain short and visual, with one clear action at a time.

Each activity should contain a compact sequence of challenges rather than an open-ended worksheet. Completion is earned after the sequence, not after a single answer.

## Architecture

Numeria will mirror the proven Science composition without copying entire components. Shared structural behavior should be extracted only where Science and Maths genuinely behave alike:

- planet destination selection;
- selected-region HUD presentation;
- activity session framing;
- return-to-planet navigation;
- completion and progress presentation.

Science and Maths retain separate world definitions, scene content, labels, colors, and activity implementations. This avoids coupling Maths content to Science terminology while keeping interaction behavior consistent.

The Maths planet controller will own the selected region, exploration state, active activity, and in-visit completion state. World configuration will define the four regions and map each region to its activity. The existing universe scene and Numeria model remain responsible for the 3D planet and landmarks.

## Visual Direction

Numeria keeps its brighter multi-region palette. Each region should be recognizable through both color and form so meaning does not depend on color alone. The selected region receives the same kind of restrained focus treatment used by Science: clear selection emphasis, supporting label information, and an obvious Explore action.

Activity screens reuse Science Planet's spacing, panel treatment, typography, buttons, and transitions. Maths-specific illustrations use the project's icon library and CSS/3D shapes; UI emoji are not introduced.

Motion should remain calm and purposeful for ADHD-friendly use. Ambient planet motion may continue, while selection and answer feedback are short and localized. Only one primary call to action is emphasized at a time.

## State and Data Flow

1. The Maths world definition supplies the four destination records.
2. The planet scene reports the selected destination to the Maths controller.
3. The controller passes the destination and progress into the HUD.
4. Explore resolves the destination to its activity component.
5. An activity reports progress and completion through a small shared contract.
6. The controller records completion for the current visit and returns the learner to Numeria on request.

Activity state stays local to each activity. Cross-activity state is limited to completion status and navigation, preventing one activity from affecting another.

## Feedback and Recovery

Incorrect answers should keep the learner in place, explain the correction visually, and allow another attempt. No activity should end because of an incorrect answer. Controls must prevent accidental double submission while feedback is displayed.

If an activity mapping is missing, the system returns safely to Numeria and shows a friendly unavailable message rather than rendering an empty screen. Back controls remain available from every activity state.

## Accessibility

- All actions must be keyboard accessible.
- Interactive targets must have accessible names and visible focus treatment.
- Instructions must not rely on color alone.
- Reduced-motion preferences must be respected.
- Disabled controls must be semantically disabled, not merely greyed out.
- Text and controls must retain suitable contrast over the space background.

## Testing

Tests will cover:

- the four Maths destinations and activity mappings;
- selecting each region and opening its activity;
- correct and incorrect answer behavior for each mini-activity;
- completion state and return navigation;
- safe fallback for an unavailable mapping;
- keyboard-accessible controls and semantic disabled states;
- unavailable planet lock presentation remaining intact;
- existing Science Planet behavior remaining unchanged.

The final verification will run the focused component tests, TypeScript checks, linting, and the production web build.

## Scope Boundaries

This change does not add backend persistence, accounts, scoring leaderboards, or a general content-authoring platform. Progress is limited to the current client experience unless an existing persistence mechanism can be reused without expanding the design. Science content is not redesigned; only genuinely shared presentation and navigation pieces may be extracted.
