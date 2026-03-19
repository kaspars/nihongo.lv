import { auth, signOut } from "@/lib/auth";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-gray-200 px-6 py-3 text-sm flex items-center gap-6">
        <a href="/admin" className="font-semibold text-white hover:text-gray-200">nihongo.lv admin</a>
        <a href="/admin/characters" className="hover:text-white">Characters</a>
        <div className="ml-auto flex items-center gap-4">
          <a href="/" className="hover:text-white">← Site</a>
          <span className="text-gray-400">{session?.user?.name}</span>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}>
            <button type="submit" className="hover:text-white">Sign out</button>
          </form>
        </div>
      </nav>
      <main className="p-6">
        <NuqsAdapter>{children}</NuqsAdapter>
      </main>
    </div>
  );
}
