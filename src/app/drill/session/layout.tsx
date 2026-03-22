import type { Viewport } from "next";

// Disable user scaling on the drawing screen — pinch/zoom gestures
// interfere with stroke input on iOS.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function DrillSessionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
