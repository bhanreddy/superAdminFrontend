# NexSyrus workspace UI

The shared design system applies across authenticated roles, navigation, forms,
statistic cards, tables, empty states, drawers and founder dashboard surfaces.
Connect retains its Slack-like layout and input/render optimizations. Sign-in uses
the same typography, form controls and light/dark theme surfaces.

Colour is a functional design choice, not a claim that everyone has the same
psychological response. Blue anchors overview and administration; teal identifies
school operations; emerald identifies finance; violet identifies collaboration and
content; rose identifies people; warm amber identifies sales. Status colours are
independent: success, attention, error and information always retain their meaning.
Labels and icons accompany colour. Light/dark preference persists when navigating.

Opaque surfaces replace shared backdrop blurs and layered inset shadows. Shared
buttons and form focus use simple state feedback. Page-wide theme transitions and
KPI entrance animations were removed from shared controls. Keyboard focus remains
visible; CSS transitions respect reduced-motion preferences. This does not claim
that every legacy animation has been removed or that physical-device FPS is known.

Navigation has a permission-filtered page finder, one deepest active item, and a
mobile modal that dismisses on navigation, backdrop or platform back. Shared tables
use labelled cards below 520px unless a screen explicitly requests a table.
Shared text fields use visible labels, 16px text, multiline space, Android underline
reset and an explicit required label. Shared actions have at least 44px touch size.
Metric values fit narrow cards without splitting grouped digits.

Validation:

- Contrast tests check module accent/tint pairs, white action labels, semantic
  status pairs, and shared text/surface pairs in light and dark themes against
  the WCAG normal-text 4.5:1 threshold. This is not a full app accessibility audit.
- Regression tests cover route selection, colour inheritance, form value/focus
  retention, loading actions, navigation filtering, and existing Connect flows for
  all roles.
- `node tests/workspace-preview.cjs` serves actual shared UI with synthetic data.
  The welcome copy and records in this fixture are examples, not production content.
  Browser checks cover desktop, 390px and 320px layouts, themes, page finding,
  table filtering, multiline editing and mobile menu dismissal.
- Production web and Android JavaScript exports validate bundling. Native apps
  still need their normal rebuild/distribution; no physical-device FPS claim.

References: [WCAG contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
[use of colour](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html),
[React Native performance](https://reactnative.dev/docs/performance).
