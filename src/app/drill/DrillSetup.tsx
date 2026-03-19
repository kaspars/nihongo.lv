"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COUNTS = [5, 10, 20, 50] as const;

export default function DrillSetup() {
  const router = useRouter();
  const [count, setCount] = useState<number>(10);
  const [direction, setDirection] = useState<"keyword_to_kanji" | "kanji_to_keyword">(
    "keyword_to_kanji",
  );

  function start() {
    router.push(`/drill/session?count=${count}&direction=${direction}`);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Kanji treniņš</h1>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kārtis vienā sesijā
          </label>
          <div className="flex gap-2">
            {COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`flex-1 py-2 rounded border text-sm font-medium transition-colors ${
                  count === n
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Virziens</label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                value="keyword_to_kanji"
                checked={direction === "keyword_to_kanji"}
                onChange={() => setDirection("keyword_to_kanji")}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-gray-900">Atslēgvārds → Kanji</div>
                <div className="text-sm text-gray-500">
                  Redzi latviešu atslēgvārdu, zīmē kanji
                </div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                value="kanji_to_keyword"
                checked={direction === "kanji_to_keyword"}
                onChange={() => setDirection("kanji_to_keyword")}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-gray-900">Kanji → Atslēgvārds</div>
                <div className="text-sm text-gray-500">
                  Redzi kanji, atceries latviešu atslēgvārdu
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={start}
          className="w-full py-3 bg-gray-900 text-white rounded font-medium hover:bg-gray-700 transition-colors"
        >
          Sākt sesiju
        </button>
      </div>
    </div>
  );
}
