"use client";

import { useEffect, useRef } from "react";

const KANJIVG_BASE =
  "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji";

interface Props {
  character: string;
  size?: number;
}

export default function KakuDisplay({ character, size = 200 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let kakuInstance: { dispose(): void } | null = null;

    async function init() {
      const { Kaku, KanjiVGProvider } = await import("@kaspars/kaku");
      if (disposed || !container) return;

      const kaku = new Kaku({
        provider: new KanjiVGProvider({ basePath: KANJIVG_BASE }),
        container,
        size,
        strokeColor: "#1a1a1a",
        animation: { strokeEffect: "none", strokeDuration: 0, autoplay: false },
      });

      kakuInstance = kaku;
      await kaku.load(character);
      if (disposed) return;

      // Show all strokes instantly — no animation.
      kaku.play();
    }

    init().catch(console.error);

    return () => {
      disposed = true;
      kakuInstance?.dispose();
    };
  }, [character, size]);

  return <div ref={containerRef} style={{ width: size, height: size }} />;
}
