"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { GridLines } from "@/components/GridLines";

type Card = {
  index: number;
  title: string;
  category: string;
  bg: string;
  text: string;
  /** subtle inner tint behind the screenshot frame */
  frame: string;
  /** hairline/border tint for the framed panel */
  frameBorder: string;
};

const CARDS: Card[] = [
  {
    index: 1,
    title: "the editor",
    category: "Markdown",
    bg: "#FF6200",
    text: "#000000",
    frame: "rgba(0,0,0,0.14)",
    frameBorder: "rgba(0,0,0,0.22)",
  },
  {
    index: 2,
    title: "source control",
    category: "Git Sync",
    bg: "#ffffff",
    text: "#1F00FF",
    frame: "rgba(31,0,255,0.06)",
    frameBorder: "rgba(31,0,255,0.18)",
  },
  {
    index: 3,
    title: "agent memory",
    category: "GitHub",
    bg: "#0E1413",
    text: "#B3FFCB",
    frame: "rgba(179,255,203,0.06)",
    frameBorder: "rgba(179,255,203,0.16)",
  },
];

const STICKY_TOP = 96;

function ProjectCard({
  card,
  registerRef,
}: {
  card: Card;
  registerRef: (el: HTMLLIElement | null) => void;
}) {
  const onDark = card.bg === "#0E1413";

  return (
    <li
      ref={registerRef}
      data-card={card.index}
      className="sticky list-none"
      style={{
        top: STICKY_TOP,
        // each later card sits a touch lower so a sliver of the one behind peeks out
        marginTop: card.index === 1 ? 0 : "4vh",
      }}
    >
      <article
        className="card-inner mx-auto origin-top overflow-hidden rounded-[28px] transition-[transform,filter] duration-500 ease-out will-change-transform"
        style={{
          backgroundColor: card.bg,
          color: card.text,
          // shrink whole card ~10% (both dims) without touching the
          // JS-driven transform used for the stacking depth cue
          zoom: 0.9,
          boxShadow: "0 -1px 0 0 rgba(255,255,255,0.04), 0 40px 80px -40px rgba(0,0,0,0.85)",
        }}
      >
        <div className="flex flex-col gap-[clamp(28px,4vw,56px)] p-[clamp(22px,3.4vw,52px)]">
          {/* meta header row */}
          <header className="flex items-start justify-between font-mono text-[12px] uppercase tracking-[0.14em] sm:text-[13px]">
            <span className="opacity-80">{`0${card.index}`}</span>
            <span className="opacity-80">{card.category}</span>
          </header>

          {/* title */}
          <div className="flex items-end justify-between gap-6">
            <h3 className="font-sans font-semibold leading-[0.95] tracking-[-0.02em] text-[clamp(2.4rem,7vw,5.5rem)]">
              {card.title}
            </h3>
          </div>

          {/* framed screenshot */}
          <div
            className="relative overflow-hidden rounded-[18px] border p-[clamp(10px,1.6vw,22px)]"
            style={{
              backgroundColor: card.frame,
              borderColor: card.frameBorder,
            }}
          >
            <div className="overflow-hidden rounded-[12px]">
              <Image
                src="/shots/editor.png"
                alt={`Memento ${card.title} — screenshot of the ${card.category.toLowerCase()} interface`}
                width={3024}
                height={1830}
                priority={card.index === 1}
                sizes="(max-width: 1199px) 90vw, 1400px"
                className="block h-auto w-full"
                style={onDark ? { filter: "saturate(1.02) brightness(0.98)" } : undefined}
              />
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}

export function ProjectCards() {
  const cardRefs = useRef<HTMLLIElement[]>([]);

  // Progressive enhancement: scale/dim the card that's being overlapped.
  // Pure CSS position:sticky already produces the stacking; this only adds
  // the depth cue. Skipped entirely under reduced-motion.
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const items = cardRefs.current.filter(Boolean);
    if (items.length === 0) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const viewportTop = STICKY_TOP;
      for (let i = 0; i < items.length; i++) {
        const inner = items[i].querySelector<HTMLElement>(".card-inner");
        if (!inner) continue;
        const next = items[i + 1];
        if (!next) {
          inner.style.transform = "";
          inner.style.filter = "";
          continue;
        }
        // how far the NEXT card's top has risen past this card's sticky line
        const nextTop = next.getBoundingClientRect().top;
        const cardHeight = inner.getBoundingClientRect().height || 1;
        // progress 0 → next card hasn't reached us; 1 → fully overlapping
        const raw = (viewportTop + cardHeight - nextTop) / cardHeight;
        const p = Math.min(1, Math.max(0, raw));
        const scale = 1 - p * 0.04; // → ~0.96 behind
        const brightness = 1 - p * 0.18; // dim slightly
        inner.style.transform = `scale(${scale.toFixed(4)})`;
        inner.style.filter = `brightness(${brightness.toFixed(3)})`;
      }
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

  return (
    <section
      id="projects"
      aria-label="Projects"
      className="relative w-full bg-black py-[clamp(80px,12vh,160px)]"
    >
      <GridLines />

      <div className="shell relative z-10">
        <p className="mb-[clamp(32px,6vh,72px)] font-mono text-[13px] lowercase tracking-[0.1em] text-[color:var(--color-muted)]">
          .projects
        </p>

        <ul className="m-0 flex flex-col gap-[clamp(40px,8vh,120px)] p-0">
          {CARDS.map((card, i) => (
            <ProjectCard
              key={card.title}
              card={card}
              registerRef={(el) => {
                if (el) cardRefs.current[i] = el;
              }}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
