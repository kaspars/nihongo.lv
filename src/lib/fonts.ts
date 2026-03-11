/**
 * CJK font definitions via next/font/google.
 *
 * Next.js downloads these at build time and self-hosts them — no runtime
 * dependency on Google CDN, but with Google's unicode-range subsetting so
 * only character chunks actually rendered on a page are fetched.
 *
 * Each font exposes a CSS variable (e.g. --font-cjk-ja-sans) via the
 * .variable className applied to <html>. CSS classes in globals.css
 * reference these variables to apply the right typeface per context.
 *
 * preload: false — CJK fonts are large; let the browser load subsets on
 * demand via unicode-range rather than preloading upfront.
 */

import {
  Noto_Sans_JP, Noto_Serif_JP,
  Noto_Sans_SC, Noto_Serif_SC,
  Noto_Sans_TC, Noto_Serif_TC,
  Noto_Sans_KR, Noto_Serif_KR,
} from "next/font/google";

const base = { preload: false as const, display: "swap" as const };
const w    = { weight: ["400", "700"] as const };

export const notoSansJP  = Noto_Sans_JP({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-ja-sans"  });
export const notoSerifJP = Noto_Serif_JP({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-ja-serif" });
export const notoSansSC  = Noto_Sans_SC({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-zhs-sans"  });
export const notoSerifSC = Noto_Serif_SC({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-zhs-serif" });
export const notoSansTC  = Noto_Sans_TC({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-zht-sans"  });
export const notoSerifTC = Noto_Serif_TC({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-zht-serif" });
export const notoSansKR  = Noto_Sans_KR({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-ko-sans"   });
export const notoSerifKR = Noto_Serif_KR({ ...base, ...w, subsets: ["latin"], variable: "--font-cjk-ko-serif"  });

/** All CJK font variable classNames joined — apply to <html> to register
 *  all CSS custom properties as global. */
export const cjkFontVariables = [
  notoSansJP.variable,  notoSerifJP.variable,
  notoSansSC.variable,  notoSerifSC.variable,
  notoSansTC.variable,  notoSerifTC.variable,
  notoSansKR.variable,  notoSerifKR.variable,
].join(" ");
