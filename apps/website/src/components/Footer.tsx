import Link from "next/link";

const REPO_URL = "https://github.com/GithubAnant/memento";
const X_URL = "https://x.com/anant_hq";

const FOOTER_LINKS = [
  { label: "snapshots", href: "#projects", external: false },
  { label: "about", href: "#about", external: false },
  { label: "download", href: "#download", external: false },
  { label: "github", href: REPO_URL, external: true },
  { label: "contact", href: X_URL, external: true },
] as const;

/**
 * Minimal footer on black: one top hairline, lots of black space.
 * Left brand "memento" (sans), right repeated mono nav links, and a
 * bottom small-print row. Vertical grid lines echo the .nitro frame.
 */
export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[color:var(--color-hairline)] bg-black text-white">
      <div className="shell relative z-10">
        <div className="flex flex-col gap-16 pt-24 pb-12 md:flex-row md:items-end md:justify-between md:pt-32 md:pb-16">
          <Link
            href="#top"
            className="font-sans text-[clamp(2.5rem,8vw,5.5rem)] font-semibold leading-[0.95] tracking-tight text-white transition-colors duration-150 hover:text-[color:var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            memento
          </Link>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-sm sm:gap-x-7 md:justify-end">
              {FOOTER_LINKS.map(({ label, href, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="text-white/85 transition-colors duration-150 hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <span aria-hidden className="text-white/55">
                      [
                    </span>
                    {label}
                    <span aria-hidden className="text-white/55">
                      ]
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-[color:var(--color-hairline)] py-6 font-mono text-xs text-[color:var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 memento</span>
        </div>
      </div>
    </footer>
  );
}
