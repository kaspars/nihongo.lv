"use client";

import { useEffect, useRef } from "react";

const KANJIVG_BASE =
  "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji";

const CANVAS_SIZE = 240;

interface Props {
  character: string;
  showOutline: boolean;
  onComplete: (averageScore: number) => void;
}

export default function KakuRenCanvas({ character, showOutline, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Keep refs so cleanup can access the instances
    let disposed = false;
    let kakuInstance: { dispose(): void } | null = null;
    let renInstance: { dispose(): void } | null = null;

    async function init() {
      const { Kaku, KanjiVGProvider } = await import("@kaspars/kaku");
      const { KakuRen } = await import("@kaspars/kaku-ren");

      if (disposed || !container) return;

      const provider = new KanjiVGProvider({ basePath: KANJIVG_BASE });

      const kaku = new Kaku({
        provider,
        container,
        size: CANVAS_SIZE,
        showOutline,
        outlineColor: "#d8d8d8",
        strokeColor: "#1a1a1a",
      });

      const ren = new KakuRen({
        kaku,
        container,
        size: CANVAS_SIZE,
        showGuide: false,
        strokeColor: "#1a1a1a",
        hintColor: "#cc3333",
        onComplete: (score) => onCompleteRef.current(score),
      });

      kakuInstance = kaku;
      renInstance = ren;

      await kaku.load(character);
      if (!disposed) ren.refresh();
    }

    init().catch(console.error);

    return () => {
      disposed = true;
      renInstance?.dispose();
      kakuInstance?.dispose();
    };
  }, [character, showOutline]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="relative border border-gray-200 rounded"
      style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
    />
  );
}
