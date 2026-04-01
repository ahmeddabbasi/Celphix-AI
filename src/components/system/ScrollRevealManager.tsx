import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const REVEAL_SELECTOR = "[data-reveal]";

function reducedMotionEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function markRevealed(element: Element) {
  element.setAttribute("data-revealed", "true");
}

export function ScrollRevealManager() {
  const location = useLocation();

  useEffect(() => {
    const shouldReduce = reducedMotionEnabled();

    const pending = new Set<Element>();

    const scan = () => {
      const elements = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
      let idx = 0;

      for (const element of elements) {
        if (element.getAttribute("data-revealed") === "true") continue;
        if (element.getAttribute("data-reveal-bound") === "true") continue;

        element.setAttribute("data-reveal-bound", "true");

        // Stagger in 60ms steps.
        const delay = Math.min(idx, 14) * 60;
        (element as HTMLElement).style.setProperty("--reveal-delay", `${delay}ms`);
        idx += 1;

        pending.add(element);
      }
    };

    // First pass: ensure attributes are set before layout/paint.
    scan();

    if (shouldReduce) {
      for (const element of pending) markRevealed(element);
      pending.clear();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          markRevealed(entry.target);
          pending.delete(entry.target);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -12% 0px",
      },
    );

    for (const element of pending) observer.observe(element);

    // Watch for late-mounted content (tables, async cards, route transitions).
    const mutation = new MutationObserver(() => {
      scan();
      for (const element of pending) observer.observe(element);
    });

    mutation.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutation.disconnect();
      observer.disconnect();
    };
  }, [location.pathname]);

  return null;
}
