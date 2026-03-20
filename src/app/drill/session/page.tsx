"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ratingFromScore, scheduleReview, type CardState } from "@/lib/fsrs";
import { Rating } from "ts-fsrs";

const KakuRenCanvas = dynamic(() => import("@/components/KakuRenCanvas"), {
  ssr: false,
});

const KakuDisplay = dynamic(() => import("@/components/KakuDisplay"), {
  ssr: false,
});

const PASS_THRESHOLD = 0.75;

type DrillCard = {
  id:        number;
  literal:   string;
  keyword:   string;
  drillType: string;
  cardState: CardState;
  /** Number of real (non-preview) attempts in the current session. */
  attempts:  number;
  /**
   * True once the guided outline preview has been completed for this card.
   * Only relevant for new cards (reps === 0); flipped to true after the
   * first kaku-ren run so the real (unguided) attempt can follow.
   */
  previewed: boolean;
};

type SessionPhase = "loading" | "drilling" | "complete" | "error";
type CardPhase    = "input" | "feedback";

type LastResult = {
  rawScore: number | null;
  rating:   Rating;
  passed:   boolean;
};

function isPassed(rating: Rating, rawScore: number | null): boolean {
  if (rawScore !== null) return rawScore >= PASS_THRESHOLD;
  return rating >= Rating.Good;
}

export default function SessionPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const count     = parseInt(searchParams.get("count") ?? "10", 10);
  const direction = searchParams.get("direction") ?? "keyword_to_kanji";

  // Rotating queue: queue[0] is always the current card.
  // Passed cards are removed; failed cards rotate to the back.
  const [queue,      setQueue]      = useState<DrillCard[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [phase,      setPhase]      = useState<SessionPhase>("loading");
  const [cardPhase,  setCardPhase]  = useState<CardPhase>("input");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  // Incremented on every advance; used as key to remount KakuRenCanvas
  const [attemptKey, setAttemptKey] = useState(0);
  const [errorMsg,   setErrorMsg]   = useState("");

  // ─── Load cards ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchCards() {
      try {
        const res = await fetch(`/api/drill/cards?count=${count}&direction=${direction}`);
        if (res.status === 401) { router.push("/api/auth/signin"); return; }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as Array<{
          id:        number;
          literal:   string;
          keyword:   string;
          drillType: string;
          cardState: Record<string, unknown>;
        }>;

        if (data.length === 0) {
          setErrorMsg("Nav pieejamu kārtis. Pārliecinieties, ka datubāzē ir apstiprināti latviešu atslēgvārdi.");
          setPhase("error");
          return;
        }

        const initial: DrillCard[] = data.map((c) => ({
          id:        c.id,
          literal:   c.literal,
          keyword:   c.keyword,
          drillType: c.drillType,
          attempts:  0,
          previewed: false,
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

  // ─── Complete when queue drains ──────────────────────────────────────────────

  useEffect(() => {
    if (phase === "drilling" && totalCount > 0 && queue.length === 0) {
      setPhase("complete");
    }
  }, [phase, totalCount, queue.length]);

  // ─── Review handler ──────────────────────────────────────────────────────────

  const handleReview = useCallback(
    (rating: Rating, rawScore: number | null) => {
      const card = queue[0];
      if (!card) return;

      const passed    = isPassed(rating, rawScore);
      const newAttempts = card.attempts + 1;

      const projectedState = scheduleReview(card.cardState, rating);

      setLastResult({ rawScore, rating, passed });
      setCardPhase("feedback");

      setQueue((prev) =>
        prev.map((c) =>
          c.id === card.id
            ? { ...c, attempts: newAttempts, cardState: projectedState }
            : c,
        ),
      );

      fetch("/api/drill/review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId:    card.id,
          drillType: card.drillType,
          rating,
          rawScore,
          isFinal:   false,
        }),
      }).catch(console.error);
    },
    [queue],
  );

  // ─── Advance to next card ────────────────────────────────────────────────────

  const advance = useCallback(() => {
    if (!lastResult) return;
    const { passed, rating, rawScore } = lastResult;
    const card = queue[0];
    if (!card) return;

    if (passed) {
      fetch("/api/drill/review", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId:          card.id,
          drillType:       card.drillType,
          rating,
          rawScore,
          isFinal:         true,
          sessionAttempts: card.attempts,
        }),
      }).catch(console.error);
    }

    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [head, ...tail] = prev;
      return passed ? tail : [...tail, head];
    });

    setLastResult(null);
    setCardPhase("input");
    setAttemptKey((k) => k + 1);
  }, [lastResult, queue]);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // ─── Kanji→Keyword: self-assess ─────────────────────────────────────────────
  // keyword_to_kanji mode: 900 ms so the score is briefly visible after drawing.
  // kanji_to_keyword mode: 50 ms — just enough for React state to settle before
  // advance() reads lastResult; the user has already seen the answer, no delay needed.

  const handleSelfAssessStable = useCallback(
    (rating: Rating) => {
      handleReview(rating, null);
      setTimeout(() => advanceRef.current(), 900);
    },
    [handleReview],
  );

  const handleSelfAssessKanjiMode = useCallback(
    (rating: Rating) => {
      handleReview(rating, null);
      setTimeout(() => advanceRef.current(), 50);
    },
    [handleReview],
  );

  // ─── Keyword→Kanji: outline preview done ────────────────────────────────────

  const handlePreviewDone = useCallback(() => {
    setQueue((prev) => {
      if (prev.length === 0) return prev;
      const [head, ...tail] = prev;
      return [...tail, { ...head, previewed: true }];
    });
  }, []);

  // ─── Keyword→Kanji: kaku-ren complete (real attempt) ────────────────────────

  const handleKakuComplete = useCallback(
    (averageScore: number) => {
      handleReview(ratingFromScore(averageScore), averageScore);
    },
    [handleReview],
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  const currentCard = queue[0] ?? null;
  const passedCount = totalCount - queue.length;

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Ielādē kārtis…</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-gray-800 mb-4">{errorMsg}</p>
          <button onClick={() => router.push("/drill")} className="text-gray-700 underline">
            ← Atpakaļ uz iestatījumiem
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sesija pabeigta!</h1>
          <p className="text-gray-600 mb-6">Tu apguvi visus {totalCount} kandži šajā sesijā.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/drill")}
              className="px-5 py-2 border border-gray-300 rounded text-gray-700 hover:border-gray-500"
            >
              Jauna sesija
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-5 py-2 bg-gray-900 text-white rounded hover:bg-gray-700"
            >
              Sākums
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!currentCard) return null;

  const isPreview  = currentCard.drillType === "keyword_to_kanji" &&
                     currentCard.cardState.reps === 0 && !currentCard.previewed;
  const showOutline = isPreview;

  return (
    // 100dvh keeps the drill contained to the visible viewport with no scrolling.
    // h-screen is a fallback for browsers without dvh support.
    <main
      className="flex flex-col overflow-hidden bg-gray-50 h-screen"
      style={{ height: "100dvh" }}
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2 max-w-lg mx-auto">
          <button
            onClick={() => router.push("/drill")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Iziet
          </button>
          <span className="text-sm text-gray-700">{passedCount} / {totalCount} apgūti</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-lg mx-auto">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (passedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Drill card — fills remaining height */}
      <div className="flex-1 min-h-0 px-4 pb-4 flex flex-col max-w-lg mx-auto w-full">
        <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {currentCard.drillType === "keyword_to_kanji" ? (
            <KeywordToKanjiCard
              card={currentCard}
              isPreview={isPreview}
              showOutline={showOutline}
              cardPhase={cardPhase}
              attemptKey={attemptKey}
              lastResult={lastResult}
              onPreviewDone={handlePreviewDone}
              onComplete={handleKakuComplete}
              onAdvance={advance}
            />
          ) : (
            <KanjiToKeywordCard
              key={attemptKey}
              card={currentCard}
              cardPhase={cardPhase}
              onAssess={handleSelfAssessKanjiMode}
            />
          )}
        </div>
      </div>
    </main>
  );
}

// ─── Keyword → Kanji ──────────────────────────────────────────────────────────

function KeywordToKanjiCard({
  card, isPreview, showOutline, cardPhase, attemptKey, lastResult,
  onPreviewDone, onComplete, onAdvance,
}: {
  card:          DrillCard;
  isPreview:     boolean;
  showOutline:   boolean;
  cardPhase:     CardPhase;
  attemptKey:    number;
  lastResult:    LastResult | null;
  onPreviewDone: () => void;
  onComplete:    (score: number) => void;
  onAdvance:     () => void;
}) {
  // Measure the canvas container so the drawing pad fills available space.
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<number | null>(null);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const available = Math.min(width, height);
      if (available > 0) {
        setCanvasSize(Math.max(160, Math.min(Math.floor(available), 400)));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      <p className="text-sm text-gray-500 text-center shrink-0">
        {isPreview ? "Ievēro līniju secību:" : "Zīmē kandži priekš:"}
      </p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mt-2 shrink-0">
        {card.keyword}
      </p>

      {/* Canvas container — flex-1 so the drawing pad fills all available height */}
      <div
        ref={canvasContainerRef}
        className="flex-1 min-h-0 flex items-center justify-center py-2"
      >
        {canvasSize !== null && (
          <KakuRenCanvas
            key={attemptKey}
            character={card.literal}
            showOutline={showOutline}
            size={canvasSize}
            onComplete={isPreview ? onPreviewDone : onComplete}
          />
        )}
      </div>

      {/* Action area — fixed height so the canvas container above never shifts. */}
      <div className="shrink-0 h-20 flex flex-col items-center justify-center gap-2">
        {isPreview && (
          <p className="text-xs text-gray-400 text-center">
            Vadlīnijas ieslēgtas — netiek vērtēts
          </p>
        )}
        {!isPreview && cardPhase === "feedback" && lastResult && (
          <>
            <p className={`text-xl font-semibold ${lastResult.passed ? "text-green-600" : "text-red-600"}`}>
              {lastResult.rawScore !== null ? `${Math.round(lastResult.rawScore * 100)}% ` : ""}
              {lastResult.passed ? "✓" : "— mēģini vēlreiz"}
            </p>
            <button
              onClick={onAdvance}
              className="px-6 py-2 bg-gray-900 text-white rounded font-medium hover:bg-gray-700 transition-colors"
            >
              Turpināt
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Kanji → Keyword ──────────────────────────────────────────────────────────
// Flow: show kanji → reveal button → keyword + self-assess → auto-advance.
// `key={attemptKey}` on this component (set in the parent) resets `revealed`
// on every card advance.

function KanjiToKeywordCard({
  card, cardPhase, onAssess,
}: {
  card:      DrillCard;
  cardPhase: CardPhase;
  onAssess:  (rating: Rating) => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      <p className="text-sm text-gray-500 text-center">Kāds ir atslēgvārds priekš:</p>

      {/* Kanji — anchored directly below the prompt; never moves. */}
      <div className="flex justify-center mt-6">
        <KakuDisplay character={card.literal} size={200} />
      </div>

      {/* Action area — mt-auto pins it to the bottom; the gap above absorbs
          height changes so the kanji position stays stable. */}
      <div className="mt-auto">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full py-2.5 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:border-gray-500 transition-colors"
          >
            Atklāt atbildi
          </button>
        ) : cardPhase === "input" ? (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Atslēgvārds:</p>
              <p className="text-2xl font-bold text-gray-900">{card.keyword}</p>
            </div>
            <p className="text-sm text-gray-500 text-center">Cik labi atcerējies?</p>
            <div className="grid grid-cols-2 gap-2">
              <RatingButton label="Slikti"  onClick={() => onAssess(Rating.Again)} hoverClass="hover:bg-red-50 hover:border-red-400 hover:text-red-700" />
              <RatingButton label="Grūti"   onClick={() => onAssess(Rating.Hard)}  hoverClass="hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700" />
              <RatingButton label="Labi"    onClick={() => onAssess(Rating.Good)}  hoverClass="hover:bg-green-50 hover:border-green-400 hover:text-green-700" />
              <RatingButton label="Viegli"  onClick={() => onAssess(Rating.Easy)}  hoverClass="hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700" />
            </div>
          </div>
        ) : null /* feedback phase: blank for ~50 ms while advance() fires */}
      </div>
    </div>
  );
}

function RatingButton({ label, onClick, hoverClass }: {
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
