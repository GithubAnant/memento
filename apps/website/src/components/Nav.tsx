import Link from "next/link";

const REPO_URL = "https://github.com/GithubAnant/memento";
const X_URL = "https://x.com/anant_hq";

const NAV_LINKS = [
  { label: "snapshots", href: "#projects" },
  { label: "about", href: "#about" },
] as const;

export function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="relative">
        {/* Progressive blur: stacked layers, each masked so the blur ramps
            from sharp at the very top to fully blurred at the bottom edge —
            no hard cut line, unlike a single backdrop-blur. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{
              maskImage: "linear-gradient(to bottom, black 0%, black 100%)",
            }}
          />
          <div
            className="absolute inset-0 backdrop-blur-[6px]"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 12%, black 55%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 12%, black 55%)",
            }}
          />
          <div
            className="absolute inset-0 backdrop-blur-[14px]"
            style={{
              maskImage: "linear-gradient(to bottom, transparent 45%, black 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 45%, black 100%)",
            }}
          />
          {/* faint tint for legibility, also fading downward */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
        </div>
        <nav
          aria-label="Primary"
          className="shell relative z-10 flex h-16 items-center justify-between gap-4 border-b border-[color:var(--color-hairline)]"
        >
          <Link
            href="/"
            className="font-sans text-[20px] font-normal leading-none tracking-tight text-white outline-none transition-opacity duration-150 hover:opacity-80 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            memento
          </Link>

          <ul className="flex items-center gap-5 font-mono text-[14px] font-normal lowercase tracking-tight sm:gap-7">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-white/85 outline-none transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  <span aria-hidden className="text-white/55">
                    [
                  </span>
                  {link.label}
                  <span aria-hidden className="text-white/55">
                    ]
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a
                href={X_URL}
                target="_blank"
                rel="noreferrer"
                className="text-white/85 outline-none transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span aria-hidden className="text-white/55">
                  [
                </span>
                contact
                <span aria-hidden className="text-white/55">
                  ]
                </span>
              </a>
            </li>
            <li>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                aria-label="memento on GitHub"
                className="flex items-center gap-2 text-white/85 outline-none transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <svg aria-hidden viewBox="0 0 16 16" fill="currentColor" className="size-[18px]">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                github
              </a>
            </li>
            <li>
              <a
                href="#download"
                className="text-[color:var(--color-accent)] outline-none transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#00DB0B]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <span aria-hidden className="opacity-50">
                  [
                </span>
                download
                <span aria-hidden className="opacity-50">
                  ]
                </span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
