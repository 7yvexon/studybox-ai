# Design QA

## Source Visual Truth

- Selected direction: agent dock concept, option 2.
- Normalized source: `design-qa-artifacts/source-agent-dock-1440x1024.png`.
- Original generated source: `design-qa-artifacts/source-agent-dock-original-1487x1058.png`.
- Desktop implementation: `design-qa-artifacts/implementation-agent-home-1440x1024.png`.
- Mobile implementation: `design-qa-artifacts/implementation-agent-home-mobile-390x844.png`.
- Full comparison: `design-qa-artifacts/comparison-agent-home-full.png`.
- Focused workspace comparison: `design-qa-artifacts/comparison-agent-home-workspace.png`.

## Viewport And State

- Desktop: 1440 × 1024 viewport, signed-out home, default `풀이 코치`, `보통`, `보통 길이`, empty composer.
- Mobile: 390 × 844 viewport override, signed-out home, default `풀이 코치`, collapsed dock represented by the native coach selector.
- Browser-rendered evidence was captured in the Codex in-app browser from `http://127.0.0.1:5173/`.
- Desktop document metrics were 1440px wide by 1024px high with no horizontal or vertical overflow.
- Mobile document width remained within the viewport with no horizontal overflow; vertical scrolling exposed the example list normally.

## Full-view Comparison Evidence

- The normalized source and final desktop implementation were combined side by side in `comparison-agent-home-full.png` before judgment.
- The final implementation matches the source hierarchy: slim dark header, 260px agent dock, oversized centered Korean headline, one dominant prompt composer, three example rows, and the centered helper line.
- Agent spacing, active blue rail, header CTA, workspace width, composer position, and below-composer rhythm align without a material composition or density mismatch.
- The implementation intentionally uses live semantic controls rather than rasterized UI while retaining the source geometry and visual treatment.

## Focused Region Comparison Evidence

- `comparison-agent-home-workspace.png` compares the headline, subtitle, composer, setting controls, CTA, and example rows at the same crop.
- Typography scale, composer width and height, dividers, radii, control grouping, and row spacing remain consistent with the source at readable zoom.
- Phosphor icons use one regular-weight line family and replace all visible source icons without custom SVG, CSS drawings, emoji, or placeholder assets.

## Required Fidelity Surfaces

- Fonts and typography: the existing SF/Apple Korean system stack is preserved. The display heading uses the source-like heavy weight, tight tracking, and balanced Korean wrapping; body and control copy remain readable at 14–16px-equivalent sizes.
- Spacing and layout rhythm: the 74px header, 260px dock, 940px workspace, 20px composer radius, agent cadence, and example dividers match the selected direction. Mobile spacing converts to a single-column flow without clipped controls.
- Colors and tokens: black and charcoal surfaces, white primary text, muted gray secondary text, and `#0071e3`/`#2997ff` action and selected states reuse the existing StudyBox token system.
- Image quality and asset fidelity: the design contains no raster artwork. The stored source remains sharp, and all interface symbols come from the Phosphor icon package rather than improvised assets.
- Copy and content: the headline, five Korean coach labels, descriptions, settings, example questions, and helper copy are coherent and match the approved agent-first brief.

## Interaction And Accessibility Evidence

- Browser checks passed for desktop coach switching, dynamic example replacement, example-to-composer filling, native level selection, submit-button enablement, and mobile coach switching.
- Automated coverage passes for Enter submission, Shift+Enter newline behavior, Korean IME composition protection, empty-submit prevention, pending-question persistence, one-time automatic sending, and failure restoration.
- DOM snapshots expose a labeled main region, complementary agent dock, `aria-pressed` coach buttons, labeled native selects, labeled textarea, disabled empty submit state, and keyboard-reachable controls.
- Desktop and mobile console error checks returned no errors.

## Comparison History

1. Initial implementation pass
   - [P2] Desktop headline and dock items were smaller and denser than the selected visual.
   - [P2] The active coach used a stronger filled card than the source, and the header login action lacked the source's solid blue emphasis.
   - [P2] The composer and example block did not share the source's vertical rhythm.
2. Correction pass
   - Increased display typography and brand scale, expanded and repositioned the dock cadence, removed the active-card fill, restored the solid blue login action, and tuned the composer sections.
   - Re-captured desktop and mobile states, normalized the source to 1440 × 1024, and rebuilt full and focused comparisons.
3. Final pass
   - No actionable P0, P1, or P2 layout, typography, color, icon, copy, responsive, interaction, or accessibility findings remain.
   - Mobile remains vertically scrollable with no horizontal overflow, and primary controls stay visible and operable.

## Findings

- No actionable P0, P1, or P2 findings remain.

## Open Questions

- None.

## Implementation Checklist

- Agent-first single-screen home implemented.
- Five coach modes and dynamic examples implemented.
- Native settings and keyboard composer behavior implemented.
- Pending question auto-send and failure recovery implemented.
- Desktop and mobile browser evidence captured.
- Type checking, automated tests, production build, and console checks passed.

## Follow-up Polish

- [P3] The signed-in home header can later add a compact recent-conversation affordance if product scope expands beyond the current single-task entry point.

final result: passed
