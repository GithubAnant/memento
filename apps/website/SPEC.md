# Memento Landing — .nitro Replica Spec (single source of truth)

Replicate the `.nitro` Framer template 1:1, re-themed for **Memento** (local-first markdown
editor over a GitHub-backed AI-agent memory repo). Dark, brutalist-editorial, monospace labels +
huge sans headlines, vertical grid lines, sticky-stacking project cards.

## Fonts (load via next/font/google)

- **Manrope** — headlines + body sans. Weights 400/500/600/700.
- **DM Mono** — all small UPPER/lower mono labels (nav-adjacent tags, `.about`, `.say hello`,
  badges, year/category meta on cards). Weights 400/500.

CSS vars: `--font-manrope`, `--font-dm-mono`. Tailwind: `font-sans` → Manrope, `font-mono` → DM Mono.

## Palette

- bg `#000000`, surface lines `rgba(255,255,255,0.10)`
- text primary `#ffffff`, muted `#949494`
- accent green `#00DB0B` (nav "get template" → for us a CTA), bright mint `#00FF77`
- card: bizz→ orange `#FF6200`, aquaflow→ blue `#1F00FF` on white, snackify→ mint `#B3FFCB` on dark `#0E1413`
- meta text on cards uses the card's accent tint, mono font.

## Layout frame

- Max content width ~1600px, generous side padding (~clamp 24px..64px).
- **Vertical grid lines**: faint full-height vertical rules dividing the page into ~6 columns,
  `rgba(255,255,255,0.06)`. Present behind hero + sections.
- A thin top horizontal hairline under the navbar.

## Sections (top → bottom)

1. **Navbar** (fixed, transparent, blends on black): left brand `.nitro` → rename **`memento`**
   (lowercase, Manrope ~20px). Right nav, DM Mono ~14px lowercase, muted, hover white:
   `projects  about  notes  contact` then **`get template`** → rename **`download`** in accent green `#00DB0B`.
2. **Hero**: under a hairline, top row: left `Hey, I'm Nick` → **`Hey, it's Memento`** (DM Mono, white).
   Right: green dot + `available for new projects` → **`now in early access`** (DM Mono, muted, leading `●` green).
   Huge headline, Manrope ~600 weight, tight leading (~0.95), size clamp up to ~9rem:
   **`a local-first editor for your AI agent's memory`** (3 lines). White.
3. **Projects / Screenshots — sticky stacking cards.** Heading mono label `.projects`.
   Cards stack and overlap on scroll (each `position: sticky; top: ~96px`, later card slides up
   over the previous, slight scale-down of the one behind). Each card: rounded ~28px, full-bleed
   color, a meta header row (mono): left `2024`, right category; big title (Manrope ~ semibold,
   black or accent text) with a corner arrow `↗`; below, a large screenshot/preview image.
   Three cards, re-themed:
   - **`the editor`** — orange `#FF6200`, black text, category `Markdown` — image `/shots/editor.png`.
   - **`source control`** — white bg, blue `#1F00FF` text, category `Git Sync` — image `/shots/editor.png` (reuse; tinted frame).
   - **`agent memory`** — dark `#0E1413`, mint `#B3FFCB` text, category `GitHub` — image `/shots/editor.png`.
4. **Story / About**: left mono label `.about`; big Manrope text (~3rem, line-height ~1.15):
   rewrite Nick's blurb into Memento's origin (from README "Why I made this"):
   **`I gave my AI agent write access to a private GitHub repo so its memory would finally last.
Memento is the editor for that repo — markdown on disk, synced like code, quiet enough to live in.`**
   Right: a portrait/visual block — use the editor screenshot in a tall framed panel (grainy dark).
   Below-left a bordered button `about me ↗` → **`read the story ↗`** (mono, bordered box).
5. **Download CTA (above footer)**: mono label `.get memento` (was `.say hello`); huge Manrope text:
   **`free, open source, and yours to keep — download memento for macOS`**. A bordered button
   centered/right `contact me ↗` → **`download for mac ↗`**. Vertical grid lines + a small `⊕`
   crosshair marker near the right edge (decorative, like the reference).
6. **Footer**: minimal. Left brand `memento`. Center/right repeated nav links (mono, muted).
   A row with small print: `© 2024 memento` and a `built with care` style tag. Keep it clean,
   lots of black space, one hairline on top.

## Motion (match the Framer feel)

- Hero headline + badges: fade/slide-up on load (stagger ~60ms), `motion`/CSS.
- Sticky cards: pure CSS `position: sticky` stacking; the incoming card has rounded top and
  casts a soft shadow over the outgoing one; outgoing card scales to ~0.96 and dims slightly
  (use scroll-driven `animation-timeline: view()` if available, else a small JS/IntersectionObserver,
  else accept the static sticky stack — stacking is the priority).
- Nav links + buttons: color transition on hover (150ms). Arrow `↗` nudges on hover.
- Respect `prefers-reduced-motion`: disable transforms, keep opacity.

## Tech constraints

- Next.js App Router, RSC by default; mark only interactive/motion pieces `"use client"`.
- Tailwind v4 (`@import "tailwindcss"` + `@theme`). No external UI libs required; `motion` optional.
- Componentize under `src/app/(components)` or `src/components`: `Nav`, `Hero`, `GridLines`,
  `ProjectCards`, `Story`, `DownloadCta`, `Footer`. Page composes them.
- Must build clean (`next build`) and run on **port 3002**.
- Accessibility: semantic landmarks, alt text, focus-visible rings, contrast on colored cards.

```

```
