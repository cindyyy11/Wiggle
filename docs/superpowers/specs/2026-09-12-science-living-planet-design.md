# Science living planet and activity invitations

## Approved direction

Populate the whole Science sphere with bright miniature 3D landscapes. Walking near a landmark offers a friendly invitation; pressing B or tapping “Let’s explore” opens an activity overlay. Do not open activities automatically. Keep the planet visible behind the session and return the child to their original exploration position on closing.

## Whole-planet scenery

Extend the four themed lands around the front, back and poles, with continuous terrain colours and readable boundaries. Magnet Lands has campsites, trees, streams and magnetic rock formations. Animal Types has miniature horses, frogs, birds and fish ponds. Colors Canyon has colourful mountain groups and rainbow waterfalls. Life Cycle Garden has crop patches, gardens and growth-stage plants. Add connecting paths and landmark signs. Leave clear walking corridors and activity clearings; do not fill every surface with obstacles. Use reusable low-poly geometry and bounded scenery counts to retain mobile performance. Preserve Numeria and the existing splash/subject selector.

## Invitation and entry

A proximity detector reads the existing explorer position and chooses the closest eligible land landmark. Use separate enter/leave radii to avoid flickering at the boundary. Show only one invitation, with the land name, a friendly guide message, a B key hint, “Let’s explore”, and “Not now”. Dismissal lasts until the child leaves the landmark area. Visiting a land using its existing navigation control walks there and produces the same invitation on arrival.

B opens only the currently visible invitation. Ignore repeated keys, modified shortcuts, and input/textarea/contenteditable targets. Tapping the invitation button provides the same path on touch devices. In graphics fallback mode, native land controls offer equivalent entry without physical proximity.

## Activity overlay

Use one accessible, clearly labelled session overlay with focus containment, a visible close button and Escape to close. Suspend background walking and invitation hotkeys while it is open. Preserve the exploration position and camera so closing restores the same place. Keep a visible dimmed planet backdrop. Frame activity content away from instructions and webcam preview.

Camera access remains opt-in through “Use hand gestures”; opening a session never requests permission. Provide live tracking feedback and the existing retry/denial guidance. Stop camera tracks and clear held-object state when closing or switching sessions. Pointer, touch and keyboard controls remain equivalent, including when WebGL or camera access is unavailable. Respect reduced motion.

## Subject sessions

Magnet retains Explore and Learn, Attract or Not, and Hidden Magnet with sequential progress. Hidden Magnet remains a walkable search experience: its overlay chrome must not block exploring the campsite. Store the pre-session exploration position separately from activity movement and restore it on close.

The other lands currently have no implemented activities. Proposed starter scope for this change:

- Animal Types: point to discover the horse, frog, bird and fish; then pinch and place them into matching named habitat targets. Explain that frogs use both water and land; do not force them into a single incorrect category.
- Colors Canyon: point to discover colours, then match coloured objects to targets labelled with both colour names and symbols, so colour alone is never required.
- Life Cycle Garden: arrange seed, sprout and flowering plant in order, with a short explanation and immediate feedback.

These are small complete starter activities, not a claim to implement a full subject curriculum. Share gesture input and overlay infrastructure but keep each subject's content and progress separate. Incorrect attempts provide a hint and allow retry; tracking loss never scores or completes an action. Do not mark a land complete just for opening its session.

## Boundaries and verification

Keep scenery placement, landmark proximity, invitation UI, session lifecycle, and subject activity state in separate focused modules. Reuse the existing renderer, explorer input and hand-tracking hook. Do not introduce new remote services or dependencies.

Test proximity entry/exit and dismissal, B key guards, touch entry, focus and Escape behaviour, position restoration, camera cleanup, correct/incorrect activity responses and tracking-loss protection. Run unit tests, typecheck and lint. Browser-check all four land journeys on desktop/mobile, denied-camera and WebGL fallback paths. Visually inspect multiple globe angles and session layouts. Report synthetic gesture verification separately from human webcam testing.

## Review status

Concept approved in conversation. Written specification awaiting user review, particularly the three new subject starter activities. Self-reviewed for scope, state ownership, camera consent, accessible alternatives and restoration behaviour.
