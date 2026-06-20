import { GridLines } from "@/components/GridLines";

/**
 * Download CTA above the footer. Black canvas with vertical grid lines, a top
 * hairline, a faint ⊕ crosshair near the right edge, a small mono section label,
 * a huge brutalist headline, and a bordered mono button lower-right.
 */
export function DownloadCta() {
  return (
    <section
      id="download"
      aria-labelledby="download-heading"
      className="relative isolate overflow-hidden border-t border-[color:var(--color-hairline)] bg-black"
    >
      <GridLines />

      <div className="shell relative z-10">
        <div className="flex min-h-[78vh] flex-col justify-between py-[clamp(80px,12vh,200px)]">
          {/* Top: mono section label */}
          <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
            .get memento
          </p>

          {/* Headline */}
          <h2
            id="download-heading"
            className="mt-[clamp(48px,9vh,140px)] max-w-[16ch] font-sans font-semibold text-white text-[clamp(2.75rem,8.5vw,6rem)] leading-[1.0] tracking-[-0.02em]"
          >
            free, open source, and yours to keep — download memento for macOS
          </h2>

          {/* Bottom row: button lower-left */}
          <div className="mt-[clamp(48px,8vh,120px)] flex justify-start">
            <a
              href="#"
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
          </div>
        </div>
      </div>
    </section>
  );
}
