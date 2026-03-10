import { NuqsAdapter } from "nuqs/adapters/next/app";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-900 text-gray-200 px-6 py-3 text-sm flex gap-6">
        <span className="font-semibold text-white">nihongo.lv admin</span>
        <a href="/admin/characters" className="hover:text-white">Characters</a>
      </nav>
      <main className="p-6">
        <NuqsAdapter>{children}</NuqsAdapter>
      </main>
    </div>
  );
}
