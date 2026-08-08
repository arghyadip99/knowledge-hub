import type { Variants } from "framer-motion";

/**
 * Shared motion props for the app's modal overlays/panels. Every modal in App.tsx
 * still owns its own markup (some are `<section>`, some are `<form>`, one has a
 * "wide" variant) — these are spread onto whichever `motion.*` element each modal
 * already renders, rather than imposing a single wrapper component, so existing
 * click-outside-to-close and onSubmit handlers keep working unchanged.
 *
 * Every call site that conditionally renders a modal must wrap the conditional
 * itself in <AnimatePresence> (not just the modal's returned JSX) — otherwise the
 * exit animation never gets a chance to play before React unmounts the element.
 */
export const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15 },
};

export const modalMotion = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 10, scale: 0.98 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

// For the mobile bottom-sheet ("mobile-actions-sheet") rather than a centered dialog.
export const sheetMotion = {
  initial: { opacity: 0, y: "100%" },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: "100%" },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export const pageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: "easeOut" as const },
};
