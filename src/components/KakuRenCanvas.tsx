"use client";

import { useEffect, useRef } from "react";

const KANJIVG_BASE =
  "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji";

interface Props {
  character: string;
  showOutline: boolean;
  onComplete: (averageScore: number) => void;
  size?: number;
}

export default function KakuRenCanvas({ character, showOutline, onComplete, size = 240 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
        size,
        showOutline,
        outlineColor: "#d8d8d8",
        strokeColor: "#1a1a1a",
        // Strokes must appear instantly after the morph — no re-draw animation.
        animation: { strokeEffect: "none", strokeDuration: 0, autoplay: false },
      });

      const ren = new KakuRen({
        kaku,
        container,
        size,
        strokeColor: "#1a1a1a",
        hintColor: "#cc3333",
        onComplete: (score) => onCompleteRef.current(score),
      });

      // Store immediately so the cleanup function can always dispose them,
      // even if the effect is torn down while kaku.load() is in flight.
      kakuInstance = kaku;
      renInstance = ren;

      await kaku.load(character);
      if (disposed) return;

      // Sync the KakuRen overlay with the freshly loaded character.
      ren.refresh();
    }

    init().catch(console.error);

    return () => {
      disposed = true;
      renInstance?.dispose();
      kakuInstance?.dispose();
    };
  }, [character, showOutline, size]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="relative border border-gray-200 rounded"
      style={{ width: size, height: size }}
    />
  );
}
