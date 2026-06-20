"use client";

import { GridLines } from "@/components/GridLines";

const REPO_URL = "https://github.com/GithubAnant/memento";

/**
 * Full-viewport hero — black, vertical grid lines behind, top hairline,
 * mono status row, then a huge four-line Manrope headline with a
 * lightweight staggered load-in (fade + slide-up).
 */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate min-h-svh overflow-hidden bg-black pb-[18vh] text-white"
    >
      {/* Background grid — sits behind all content (text, buttons, etc.) */}
      <GridLines
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, #000 22%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, #000 22%)",
        }}
      />

      {/* Top hairline spanning the full width, just under the navbar */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-px bg-[color:var(--color-hairline)]"
      />

      <div className="shell relative z-10 flex min-h-svh flex-col">
        {/* Status row under the hairline */}
        <div className="flex flex-col gap-2 pt-8 sm:flex-row sm:items-baseline sm:justify-end sm:pt-10">
          <p
            className="hero-in font-mono text-[13px] tracking-tight text-[color:var(--color-muted)] sm:text-sm"
            style={{ animationDelay: "60ms" }}
          >
            now in early access
          </p>
        </div>

        {/* Huge four-line headline, lifted into the lower-middle */}
        <h1
          id="hero-heading"
          className="mt-auto max-w-[20ch] font-sans font-semibold tracking-[-0.02em] text-white"
          style={{
            fontSize: "clamp(2.25rem, 6.8vw, 7rem)",
            lineHeight: 1.05,
          }}
        >
          <span className="hero-in block" style={{ animationDelay: "140ms" }}>
            a local-first
          </span>
          <span className="hero-in block" style={{ animationDelay: "220ms" }}>
            editor for
          </span>
          <span className="hero-in block" style={{ animationDelay: "300ms" }}>
            your AI agent&apos;s
          </span>
          <span className="hero-in block" style={{ animationDelay: "380ms" }}>
            memory
          </span>
        </h1>

        {/* Action buttons under the headline */}
        <div
          className="hero-in mt-10 flex flex-wrap items-center gap-4 pb-[clamp(7rem,22vh,15rem)]"
          style={{ animationDelay: "460ms" }}
        >
          <a
            href="#download"
            className="group inline-flex items-center gap-3 rounded-none border border-white bg-white px-7 py-4 font-mono text-[13px] lowercase tracking-[0.04em] text-black transition-colors duration-150 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            download for mac
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="currentColor"
              className="size-[16px] -translate-y-[1px]"
            >
              <path d="M11.18 8.49c-.02-1.55 1.27-2.29 1.33-2.33-.72-1.06-1.85-1.2-2.25-1.22-.96-.1-1.87.56-2.36.56-.49 0-1.24-.55-2.04-.53-1.05.02-2.02.61-2.56 1.55-1.09 1.9-.28 4.7.78 6.24.52.75 1.14 1.6 1.95 1.57.78-.03 1.08-.5 2.02-.5.94 0 1.21.5 2.04.49.84-.02 1.37-.77 1.88-1.52.59-.87.84-1.71.85-1.75-.02-.01-1.63-.63-1.65-2.5l.01-.03ZM9.65 3.92c.43-.52.72-1.25.64-1.97-.62.03-1.37.41-1.81.93-.4.46-.75 1.2-.65 1.91.69.05 1.39-.35 1.82-.87Z" />
            </svg>
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-3 rounded-none border border-white/10 bg-[#262626] px-7 py-4 font-mono text-[13px] lowercase tracking-[0.04em] text-white transition-colors duration-150 hover:bg-[#333333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            star on github
            <svg aria-hidden viewBox="0 0 16 16" fill="currentColor" className="size-[16px]">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
      </div>

      <style>{`
        @keyframes hero-rise {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .hero-in {
          opacity: 0;
          animation: hero-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-in {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}
