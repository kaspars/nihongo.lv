"use client";

import { useEffect, useState } from "react";
import { notoSansJP } from "@/lib/fonts";
import type { FsrsState } from "@/lib/fsrs";

type OverviewCard = {
  id: number;
  literal: string;
  keyword: string;
  ktkState: FsrsState;
  kkState: FsrsState;
  ktkDueNow: boolean;
  kkDueNow: boolean;
};

const STATE_PRIORITY: Record<FsrsState, number> = {
  relearning: 0,
  new: 1,
  learning: 2,
  review: 3,
};

function combinedState(a: FsrsState, b: FsrsState): FsrsState {
  return STATE_PRIORITY[a] <= STATE_PRIORITY[b] ? a : b;
}

const STATE_CLASSES: Record<FsrsState, string> = {
  new:        "bg-gray-100 text-gray-500 border-gray-200",
  learning:   "bg-amber-50 text-amber-800 border-amber-300",
  relearning: "bg-red-50 text-red-700 border-red-300",
  review:     "bg-green-50 text-green-800 border-green-200",
};

export default function DrillKanjiGrid() {
  const [cards, setCards] = useState<OverviewCard[] | null>(null);

  useEffect(() => {
    fetch("/api/drill/overview")
      .then((r) => r.json())
      .then((data) => setCards(Array.isArray(data) ? data : []))
      .catch(() => setCards([]));
  }, []);

  if (cards === null) return null;
  if (cards.length === 0) return null;

  const dueCount = cards.filter((c) => c.ktkDueNow || c.kkDueNow).length;

  return (
    <section className="w-full max-w-4xl mx-auto mt-6">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">Pieejamie kandži</h2>
        <span className="text-sm text-gray-500">
          {cards.length} kopā{dueCount > 0 && `, ${dueCount} jāatkārto`}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {cards.map((card) => {
          const state = combinedState(card.ktkState, card.kkState);
          const due = card.ktkDueNow || card.kkDueNow;
          return (
            <div
              key={card.id}
              className={[
                "w-10 h-10 flex items-center justify-center",
                "rounded border text-lg leading-none select-none",
                STATE_CLASSES[state],
                due ? "ring-2 ring-orange-400 ring-offset-1" : "",
              ]
                .join(" ")
                .trim()}
            >
              <span className={notoSansJP.className} lang="ja">
                {card.literal}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" />
          Jauns
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-300 inline-block" />
          Apgūšanā
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block" />
          Apgūts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-300 inline-block" />
          Aizmirsts
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 ring-2 ring-orange-400 ring-offset-1 inline-block" />
          Jāatkārto
        </span>
      </div>
    </section>
  );
}
