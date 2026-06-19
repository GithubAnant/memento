import React from "react";

// Why-did-you-render is a dev-only debug aid. Initialize it without a
// top-level `await` so a slow or failing dynamic import can never block
// `main.tsx`'s module evaluation (and thus the React mount). A slightly
// late patch only costs a few early render logs, never a blank window.
if (import.meta.env.DEV) {
  void (async () => {
    try {
      const { default: wdyr } = await import("@welldone-software/why-did-you-render");
      const zustand = await import("zustand");
      const zustandMutable = { ...zustand };
      wdyr(React, {
        trackAllPureComponents: false,
        trackHooks: true,
        logOnDifferentValues: true,
        trackExtraHooks: [[zustandMutable, "useStore"]],
      });
    } catch (err) {
      console.warn("why-did-you-render failed to initialize", err);
    }
  })();
}
