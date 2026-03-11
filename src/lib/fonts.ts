/**
 * CJK font definitions via next/font/google.
 *
 * next/font requires literal object arguments — no spread operators allowed.
 *
 * Fonts are downloaded at build time and self-hosted; Google's unicode-range
 * subsetting means only the character chunks actually rendered get fetched.
 * preload: false — CJK fonts are large, load subsets on demand.
 */

import {
  Noto_Sans_JP, Noto_Serif_JP,
  Noto_Sans_SC, Noto_Serif_SC,
  Noto_Sans_TC, Noto_Serif_TC,
  Noto_Sans_KR, Noto_Serif_KR,
} from "next/font/google";

export const notoSansJP  = Noto_Sans_JP({  weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-ja-sans"  });
export const notoSerifJP = Noto_Serif_JP({ weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-ja-serif" });
export const notoSansSC  = Noto_Sans_SC({  weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-zhs-sans"  });
export const notoSerifSC = Noto_Serif_SC({ weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-zhs-serif" });
export const notoSansTC  = Noto_Sans_TC({  weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-zht-sans"  });
export const notoSerifTC = Noto_Serif_TC({ weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-zht-serif" });
export const notoSansKR  = Noto_Sans_KR({  weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-ko-sans"   });
export const notoSerifKR = Noto_Serif_KR({ weight: ["400", "700"], subsets: ["latin"], preload: false, display: "swap", variable: "--font-cjk-ko-serif"  });

/** Apply to <html> to register all CJK font CSS variables globally. */
export const cjkFontVariables = [
  notoSansJP.variable,  notoSerifJP.variable,
  notoSansSC.variable,  notoSerifSC.variable,
  notoSansTC.variable,  notoSerifTC.variable,
  notoSansKR.variable,  notoSerifKR.variable,
].join(" ");
