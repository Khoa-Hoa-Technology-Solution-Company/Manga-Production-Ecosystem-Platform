# MangaFlow Design System

This is the shared visual language for the web dashboard and mobile companion.
The interface is intentionally monochrome: white paper, ink-black type, and a
quiet graphite scale for hierarchy. Colour is reserved for user-provided manga
artwork and explicit error states.

## Genre

Modern-minimal with an editorial workbench rhythm.

## Macrostructure family

- Marketing pages: Marquee Hero with typography-first artwork.
- App pages: Workbench shell — persistent navigation, compact utility header,
  then dense content sections with clear reading order.
- Content pages: Long Document with generous margins and strong section rules.

## Theme

- Paper: `oklch(99% 0.006 95)`
- Paper 2: `oklch(96% 0.008 95)`
- Ink: `oklch(16% 0.012 95)`
- Ink 2: `oklch(42% 0.012 95)`
- Rule: `oklch(88% 0.012 95)`
- Accent: `oklch(16% 0.012 95)`
- Focus: `oklch(48% 0.018 95)`

## Typography

- Display: Avenir Next (Segoe UI fallback), 700, roman
- Body: Inter, 400–600
- Mono: ui-monospace, 500
- Display tracking: `-0.035em`

## Spacing and motion

Use the 4-point tokens in `tokens.css`. Motion is restrained: transform/opacity
only, 220ms ease-out, with opacity-only fallbacks for reduced motion.

## Component voice

Cards use a 16px radius, 1px graphite rules, and low-contrast shadows. Buttons
use compact pill geometry, a visible focus ring, and quiet pressed states.
