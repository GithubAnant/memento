/**
 * Faint full-height vertical rules that divide the page into N columns,
 * echoing the .nitro template's background grid. Decorative only.
 *
 * Each rule is an absolutely-positioned 1px line that spans the full height
 * of the parent (top-0 → bottom-0), so the grid never collapses regardless
 * of content. `columns` columns → `columns + 1` rules (both outer edges).
 *
 * `lineColor` overrides the rule color (defaults to the theme grid token).
 * `className` is merged onto the root so callers can change stacking /
 * blend mode — e.g. an overlay layer using `mix-blend-difference` so the
 * rules stay visible as they cross the white headline. `style` passes through
 * (used for mask gradients).
 */
export function GridLines({
  columns = 6,
  className = "z-0",
  lineColor = "var(--color-grid)",
  style,
}: {
  columns?: number;
  className?: string;
  lineColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 mx-auto max-w-[1600px] px-[clamp(20px,4vw,64px)] ${className}`}
      style={style}
    >
      <div className="relative h-full w-full">
        {Array.from({ length: columns + 1 }).map((_, i) => {
          const isLast = i === columns;
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px"
              style={{
                backgroundColor: lineColor,
                left: isLast ? undefined : `${(i / columns) * 100}%`,
                right: isLast ? 0 : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
