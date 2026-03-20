import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold">nihongo.lv</h1>
      <nav className="flex flex-col items-center gap-3">
        <Link
          href="/drill"
          className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
        >
          Kandži treniņš
        </Link>
      </nav>
      {session?.user && (
        <form
          action={async () => {
            "use server";
            await signOut();
          }}
        >
          <button
            type="submit"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Iziet ({session.user.name ?? session.user.email})
          </button>
        </form>
      )}
    </main>
  );
}
