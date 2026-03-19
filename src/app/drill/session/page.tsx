"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ratingFromScore, type CardState } from "@/lib/fsrs";
import { Rating } from "ts-fsrs";

const KakuRenCanvas = dynamic(() => import("@/components/KakuRenCanvas"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center w-60 h-60 border border-gray-200 rounded text-sm text-gray-400">Loading…</div>,
});

// A card that hasn't passed the session yet is mastered when score ≥ PASS_THRESHOLD
const PASS_THRESHOLD = 0.75;

type DrillCard = {
  id:       number;
  literal:  string;
  keyword:  string;
  cardState: CardState;
};

type SessionPhase = "loading" | "drilling" | "complete" | "error";
type CardPhase    = "input" | "feedback";

type LastResult = {
  rawScore: number | null;
  passed:   boolean;
};

function isPassed(rating: number, rawScore: number | null): boolean {
  if (rawScore !== null) return rawScore >= PASS_THRESHOLD;
  return rating >= Rating.Good;
}

export default function SessionPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const count     = parseInt(searchParams.get("count") ?? "10", 10);
  const direction = searchParams.get("direction") ?? "keyword_to_kanji";

  // Rotating queue: queue[0] is always the current card.
  // Passed cards are removed; failed cards are rotated to the back.
  const [queue,      setQueue]      = useState<DrillCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [phase,      setPhase]      = useState<SessionPhase>("loading");
  const [cardPhase,  setCardPhase]  = useState<CardPhase>("input");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  // Incremented each time we advance; used as key to remount KakuRenCanvas
  const [attemptKey, setAttemptKey] = useState(0);
  const [errorMsg,   setErrorMsg]   = useState("");

  const directionRef = useRef(direction);

  // ─── Load cards ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch(
          `/api/drill/cards?count=${count}&direction=${direction}`,
        );
        if (res.status === 401) {
          router.push("/api/auth/signin");
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as Array<{
          id:        number;
          literal:   string;
          keyword:   string;
          cardState: Record<string, unknown>;
        }>;

        if (data.length === 0) {
          setErrorMsg(
            "No cards available. Make sure there are approved Latvian keywords in the database.",
          );
          setPhase("error");
          return;
        }

        const initial: DrillCard[] = data.map((c) => ({
          id:      c.id,
          literal: c.literal,
          keyword: c.keyword,
          cardState: {
            ...c.cardState,
            dueAt:        new Date(c.cardState.dueAt as string),
            lastReviewAt: c.cardState.lastReviewAt
              ? new Date(c.cardState.lastReviewAt as string)
              : null,
          } as CardState,
        }));

        setQueue(initial);
        setTotalCount(initial.length);
        setPhase("drilling");
      } catch (e) {
        setErrorMsg(String(e));
        setPhase("error");
      }
    }
    fetchCards();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Review handler ────────────────────────────────────────────────────────

  const handleReview = useCallback(
    (rating: number, rawScore: number | null) => {
      const card = queue[0];
      if (!card) return;

      const passed = isPassed(rating, rawScore);
      setLastResult({ rawScore, passed });
      setCardPhase("feedback");

      // Fire-and-forget: save to DB, then update local reps so next encounter
      // has the correct outline setting
      fetch("/api/drill/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId:    card.id,
          drillType: directionRef.current,
          rating,
          rawScore,
        }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const { cardState: newState } = (await res.json()) as {
            cardState: CardState;
          };
          // Update card state in queue wherever the card is (it may have moved)
          setQueue((prev) =>
            prev.map((c) =>
              c.id === card.id ? { ...c, cardState: newState } : c,
            ),
          );
        })
        .catch(console.error);
    },
    [queue],
  );

  // Transition to complete when queue drains during a session
  useEffect(() => {
    if (phase === "drilling" && totalCount > 0 && queue.length === 0) {
      setPhase("complete");
    }
  }, [phase, totalCount, queue.length]);

  // ─── Advance to next card ──────────────────────────────────────────────────

  const advance = useCallback(() => {
    if (!lastResult) return;
    const { passed } = lastResult;

    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [head, ...tail] = prev;
      return passed ? tail : [...tail, head];
    });

    setLastResult(null);
    setCardPhase("input");
    setAttemptKey((k) => k + 1);
  }, [lastResult]);

  // Keep advance in a ref so the setTimeout inside handleSelfAssessStable
  // always calls the latest version (with fresh lastResult)
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // ─── Kanji→Keyword: self-assess ───────────────────────────────────────────

  const handleSelfAssessStable = useCallback(
    (rating: Rating) => {
      handleReview(rating, null);
      // Auto-advance after brief feedback; use ref so we get the latest advance
      setTimeout(() => advanceRef.current(), 900);
    },
    [handleReview],
  );

  // ─── Keyword→Kanji: kaku-ren complete ─────────────────────────────────────

  const handleKakuComplete = useCallback(
    (averageScore: number) => {
      const rating = ratingFromScore(averageScore);
      handleReview(rating, averageScore);
      // User sees score + Continue button; advance is manual
    },
    [handleReview],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  const currentCard  = queue[0] ?? null;
  const passedCount  = totalCount - queue.length;

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading cards…</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-gray-800 mb-4">{errorMsg}</p>
          <button
            onClick={() => router.push("/drill")}
            className="text-gray-700 underline"
          >
            ← Back to setup
          </button>
        </div>
      </main>
    );
  }

  if (phase === "complete") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center max-w-md w-full">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h1>
          <p className="text-gray-600 mb-6">
            You mastered all {totalCount} kanji in this session.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/drill")}
              className="px-5 py-2 border border-gray-300 rounded text-gray-700 hover:border-gray-500"
            >
              New Session
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2 bg-gray-900 text-white rounded hover:bg-gray-700"
            >
              Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!currentCard) return null;

  const showOutline = currentCard.cardState.reps === 0;

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-50 py-8 px-4">
      {/* Header bar */}
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push("/drill")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Exit
          </button>
          <span className="text-sm text-gray-700">
            {passedCount} / {totalCount} mastered
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (passedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Drill card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full max-w-lg">
        {direction === "keyword_to_kanji" ? (
          <KeywordToKanjiCard
            card={currentCard}
            showOutline={showOutline}
            cardPhase={cardPhase}
            attemptKey={attemptKey}
            lastResult={lastResult}
            onComplete={handleKakuComplete}
            onAdvance={advance}
          />
        ) : (
          <KanjiToKeywordCard
            card={currentCard}
            cardPhase={cardPhase}
            onAssess={handleSelfAssessStable}
          />
        )}
      </div>

      {queue.length > 1 && (
        <p className="mt-4 text-xs text-gray-400">
          {queue.length} card{queue.length !== 1 ? "s" : ""} remaining
        </p>
      )}
    </main>
  );
}

// ─── Keyword → Kanji sub-component ────────────────────────────────────────────

function KeywordToKanjiCard({
  card,
  showOutline,
  cardPhase,
  attemptKey,
  lastResult,
  onComplete,
  onAdvance,
}: {
  card:       DrillCard;
  showOutline: boolean;
  cardPhase:  CardPhase;
  attemptKey: number;
  lastResult: LastResult | null;
  onComplete: (score: number) => void;
  onAdvance:  () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500">Draw the kanji for:</p>
      <p className="text-3xl font-bold text-gray-900">{card.keyword}</p>

      <KakuRenCanvas
        key={attemptKey}
        character={card.literal}
        showOutline={showOutline}
        onComplete={onComplete}
      />

      {cardPhase === "feedback" && lastResult && (
        <div className="w-full text-center space-y-3">
          <p
            className={`text-xl font-semibold ${
              lastResult.passed ? "text-green-600" : "text-red-600"
            }`}
          >
            {lastResult.rawScore !== null
              ? `${Math.round(lastResult.rawScore * 100)}%`
              : ""}
            {lastResult.passed ? " ✓" : " — try again"}
          </p>
          <button
            onClick={onAdvance}
            className="px-6 py-2 bg-gray-900 text-white rounded font-medium hover:bg-gray-700 transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Kanji → Keyword sub-component ────────────────────────────────────────────

function KanjiToKeywordCard({
  card,
  cardPhase,
  onAssess,
}: {
  card:      DrillCard;
  cardPhase: CardPhase;
  onAssess:  (rating: Rating) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm text-gray-500">What is the keyword for:</p>

      <p className="text-7xl font-cjk-ja-sans leading-none" lang="ja">
        {card.literal}
      </p>

      {cardPhase === "input" && (
        <>
          <p className="text-sm text-gray-500">How well did you remember?</p>
          <div className="grid grid-cols-2 gap-2 w-full">
            <RatingButton
              label="Again"
              onClick={() => onAssess(Rating.Again)}
              hoverClass="hover:bg-red-50 hover:border-red-400 hover:text-red-700"
            />
            <RatingButton
              label="Hard"
              onClick={() => onAssess(Rating.Hard)}
              hoverClass="hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700"
            />
            <RatingButton
              label="Good"
              onClick={() => onAssess(Rating.Good)}
              hoverClass="hover:bg-green-50 hover:border-green-400 hover:text-green-700"
            />
            <RatingButton
              label="Easy"
              onClick={() => onAssess(Rating.Easy)}
              hoverClass="hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
            />
          </div>
        </>
      )}

      {cardPhase === "feedback" && (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">Keyword:</p>
          <p className="text-2xl font-bold text-gray-900">{card.keyword}</p>
        </div>
      )}
    </div>
  );
}

function RatingButton({
  label,
  onClick,
  hoverClass,
}: {
  label:      string;
  onClick:    () => void;
  hoverClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-2.5 border border-gray-300 rounded text-sm font-medium text-gray-700 transition-colors ${hoverClass}`}
    >
      {label}
    </button>
  );
}
