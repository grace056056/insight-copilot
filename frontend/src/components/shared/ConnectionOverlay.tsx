import { useEffect, useRef, useState } from "react";

/**
 * ConnectionOverlay — the literal thread from claim to proof.
 *
 * Draws an animated, glowing bezier from the selected insight card's right
 * edge to the evidence panel, with a light pulse traveling along it. The
 * card is located by its [data-insight-card][data-selected] attributes and
 * the panel by [data-evidence-panel], so the overlay needs no ref plumbing
 * through the component tree. Re-measures on resize and on any scroll
 * (capture phase catches the feed's inner scroller).
 */
export function ConnectionOverlay({ selectedId }: { selectedId: string | null }) {
  const [path, setPath] = useState<string | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    if (!selectedId) {
      setPath(null);
      return;
    }

    const measure = () => {
      const card = document.querySelector<HTMLElement>(
        '[data-insight-card][data-selected="true"]'
      );
      const panel = document.querySelector<HTMLElement>("[data-evidence-panel]");
      const feed = card?.closest("main");
      if (!card || !panel || !feed) {
        setPath(null);
        return;
      }
      const c = card.getBoundingClientRect();
      const f = feed.getBoundingClientRect();
      // Hide while the selected card is scrolled out of the feed viewport
      if (c.bottom < f.top + 24 || c.top > f.bottom - 24) {
        setPath(null);
        return;
      }
      const p = panel.getBoundingClientRect();
      const x1 = c.right;
      const y1 = c.top + c.height / 2;
      const x2 = p.left + 1;
      const y2 = Math.min(Math.max(y1, p.top + 56), p.bottom - 56);
      const mx = (x1 + x2) / 2;
      setPath(`M${x1} ${y1} C${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`);
    };

    measure();
    const schedule = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      cancelAnimationFrame(raf.current);
    };
  }, [selectedId]);

  if (!path) return null;

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-30"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      {/* soft glow underlay */}
      <path
        d={path}
        fill="none"
        stroke="rgba(34,211,238,0.16)"
        strokeWidth="5"
        style={{ filter: "blur(3px)" }}
      />
      {/* marching wire */}
      <path
        d={path}
        fill="none"
        stroke="rgba(34,211,238,0.55)"
        strokeWidth="1.2"
        strokeDasharray="6 8"
        className="animate-dash"
      />
      {/* traveling light pulse */}
      <circle r="2.6" fill="#a5f3fc" style={{ filter: "drop-shadow(0 0 6px #22d3ee)" }}>
        <animateMotion dur="1.7s" repeatCount="indefinite" path={path} />
      </circle>
    </svg>
  );
}
