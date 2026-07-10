# Design QA

**Source visual truth**

- Reference URL: `https://www.apple.com/kr/macbook-pro/`

**Implementation screenshot paths**

- `design-qa-artifacts/implementation-studybox-1280x720.png`
- `design-qa-artifacts/implementation-studybox-mobile-390x844.png`
- `design-qa-artifacts/implementation-light-section-mobile-390x844.png`
- `design-qa-artifacts/implementation-chat-desktop-1280x720.png`
- `design-qa-artifacts/implementation-chat-mobile-390x844.png`
- `design-qa-artifacts/implementation-chat-settings-mobile-390x844.png`

**Viewport and state**

- Desktop comparison: 1280 × 720, signed-out landing hero, default concept mode.
- Mobile checks: 390 × 844, signed-out landing, login, light marketing section, authenticated empty chat, settings collapsed and expanded.
- Reduced motion: browser-emulated `prefers-reduced-motion: reduce`, all five story panels visible in the normal document flow.

**Full-view comparison evidence**

- The live Apple reference and `design-qa-artifacts/implementation-studybox-1280x720.png` were reviewed side by side at 1280 × 720. The third-party source capture is intentionally not persisted in the repository.
- The implementation matches the intended black product-story canvas, compact navigation, oversized Korean display typography, blue gradient emphasis, pill CTA, generous negative space, and a product visual entering at the bottom of the first viewport.
- The Apple hardware image is intentionally replaced by the real StudyBox learning interface specified in the brief; no Apple imagery, logo, code, placeholder art, custom SVG, or CSS illustration is copied.

**Focused region comparison evidence**

- A separate crop was not needed because the 1280 × 720 source and implementation views keep the navigation, display copy, CTA, product visual edge, typography, spacing, and colors readable at original resolution.
- Product-specific UI detail was checked separately in the desktop and mobile chat captures because it has no one-to-one counterpart in the reference hardware image.

**Required fidelity surfaces**

- Fonts and typography: system SF/Apple Korean fallbacks are used without external font downloads; display headings use a tight Apple-like scale, weight, line height, and letter spacing while body copy remains readable.
- Spacing and layout rhythm: the 1180px marketing container, 32–36px product radii, full-viewport story stages, light card spacing, and responsive gutters preserve the reference rhythm without copying its content structure.
- Colors and visual tokens: black and charcoal marketing surfaces transition to `#f5f5f7` and white product surfaces; `#0071e3` and `#2997ff` are limited to actions and selected states. Dark and light headers switch with the page theme.
- Image quality and asset fidelity: the redesign uses the real rendered StudyBox UI as its product visual. There are no missing raster assets, stretched images, fake icons, or placeholder artwork.
- Copy and content: all product guidance remains Korean, realistic, and tied to the five supported learning modes.
- Accessibility and behavior: semantic labels, visible focus styles, selected states, mobile `aria-expanded`, disabled composer state, keyboard-reachable controls, and reduced-motion fallback are present.

**Comparison history**

1. Initial pass
   - [P2] The real product preview began entirely below the desktop fold, leaving the first viewport visually empty compared with the reference.
   - [P2] The landing header stayed dark after entering light sections, weakening contrast and continuity.
   - [P2] Chat level and response-length options wrapped vertically in the desktop sidebar.
2. Fixes
   - Reduced hero top spacing and section gap so the StudyBox product surface is visible in the first viewport.
   - Added scroll-aware dark/light header switching and an opaque light header surface.
   - Changed chat secondary settings to full-width rows with three stable columns.
3. Final pass
   - The revised desktop hero shows the product surface above the fold.
   - The mobile light-section capture shows the light header with correct contrast.
   - The desktop and expanded mobile chat captures show unbroken option labels and usable controls.
   - Browser console checks returned no JavaScript errors, and the preview-mode and mobile-settings interactions passed.

**Findings**

- No actionable P0, P1, or P2 findings remain.

**Open Questions**

- None.

**Implementation Checklist**

- Landing, auth, account, and chat themes are implemented.
- Preview mode selection updates the final learning setting.
- Sticky story motion and reduced-motion fallback are implemented.
- Mobile settings expansion and composer states are verified.
- Type checking, automated tests, production build, and browser console checks pass.

**Follow-up Polish**

- [P3] If a future brand asset is created, the hero can support an additional bespoke learning visual without changing the current layout.

final result: passed
