"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Story / About — black, full-width narrative section with vertical grid lines.
 * The origin story is revealed on scroll, letter by letter: each character
 * starts dim and brightens to white as the section travels up through the
 * viewport, like a spotlight sweeping across the text.
 */

// A paragraph is a list of inline segments. A segment with `href` renders as a
// link (underline on hover, nothing else) while still revealing letter by letter.
type Segment = { text: string; href?: string; italic?: boolean };
const PARAGRAPHS: Segment[][] = [
  [
    { text: "I wanted to give my " },
    { text: "Poke", href: "https://poke.com" },
    { text: " bot a memory layer." },
  ],
  [
    {
      text: "The obvious first option is Poke's own built-in memory, but anyone who's used it knows it ",
    },
    { text: "kind", italic: true },
    { text: " of sucks." },
  ],
  [
    {
      text: "So I pointed it at a private GitHub repo. Now it has a place to write. Save a memory, come back later, append, edit.",
    },
  ],
  [
    {
      text: "Memento is the editor for that repo. An Obsidian-style app where the workspace is a git repo, syncing as the agent writes.",
    },
  ],
];

// Total character count across all paragraphs, so brightness advances
// continuously letter by letter across the whole story.
const TOTAL = PARAGRAPHS.reduce((n, segs) => n + segs.reduce((m, s) => m + s.text.length, 0), 0);

export function Story() {
  const containerRef = useRef<HTMLDivElement>(null);
  // progress 0 → nothing lit; 1 → all letters white
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setProgress(1);
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Reveal window: start when the block's top reaches 75% down the viewport,
      // finish when its bottom passes 35% up. Maps that travel to 0 → 1.
      const start = vh * 0.75;
      const end = vh * 0.35;
      const raw = (start - rect.top) / (start - end + rect.height);
      setProgress(Math.min(1, Math.max(0, raw)));
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // How many characters are "lit" so far; a per-char feather softens the edge.
  const lit = progress * TOTAL;

  let charIndex = -1;
  return (
    <section
      id="about"
      aria-labelledby="about-label"
      className="relative isolate bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
    >
      <div className="relative z-10 border-t border-[color:var(--color-hairline)]">
        <div className="shell pt-[clamp(48px,7vw,110px)] pb-[clamp(80px,12vw,200px)]">
          <h2
            id="about-label"
            className="max-w-[18ch] font-sans text-[clamp(2.25rem,5vw,5rem)] font-semibold leading-[1.0] tracking-[-0.03em] text-[color:var(--color-paper)]"
          >
            why this exists
          </h2>

          <div
            ref={containerRef}
            className="mt-16 max-w-[60ch] font-sans text-[clamp(1.35rem,2.4vw,2.4rem)] font-medium leading-[1.34] tracking-[-0.015em]"
          >
            {PARAGRAPHS.map((segments, p) => (
              <p key={p} className={p === 0 ? "" : "mt-10"}>
                {segments.map((seg, s) => {
                  const chars = Array.from(seg.text).map((ch) => {
                    charIndex += 1;
                    // brightness 0 (muted) → 1 (white) with an 8-char feather
                    const b = Math.min(1, Math.max(0, (lit - charIndex) / 8));
                    // interpolate muted #949494 → paper #ffffff
                    const c = Math.round(0x94 + (0xff - 0x94) * b);
                    return (
                      <span
                        key={charIndex}
                        style={{
                          color: `rgb(${c}, ${c}, ${c})`,
                          transition: "color 90ms linear",
                        }}
                      >
                        {ch}
                      </span>
                    );
                  });

                  if (seg.href) {
                    return (
                      <a
                        key={s}
                        href={seg.href}
                        target="_blank"
                        rel="noreferrer"
                        className="mx-[0.06em] inline-block rounded-lg bg-white/10 px-[0.4em] py-[0.02em] align-baseline font-serif outline-none transition-colors duration-150 hover:bg-white/20 focus-visible:bg-white/20"
                      >
                        {chars}
                      </a>
                    );
                  }
                  return (
                    <span
                      key={s}
                      className={seg.italic ? "mx-[0.12em] inline-block italic" : undefined}
                    >
                      {chars}
                    </span>
                  );
                })}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
