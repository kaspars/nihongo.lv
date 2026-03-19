import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold">nihongo.lv</h1>
      <nav className="flex flex-col items-center gap-3">
        <Link
          href="/drill"
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Kanji Drill
        </Link>
      </nav>
    </main>
  );
}
