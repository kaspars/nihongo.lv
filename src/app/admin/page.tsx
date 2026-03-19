import Link from "next/link";

export const metadata = { title: "Admin — nihongo.lv" };

const sections = [
  { href: "/admin/characters", label: "Characters", description: "Browse and edit the CJK character database" },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Admin</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ href, label, description }) => (
          <Link
            key={href}
            href={href}
            className="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-400 transition-colors"
          >
            <div className="font-semibold text-gray-900">{label}</div>
            <div className="mt-1 text-sm text-gray-600">{description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
