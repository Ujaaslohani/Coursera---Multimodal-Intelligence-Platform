import Link from "next/link";

const LINKS = [
  { href: "/assets", label: "Asset Intake" },
  { href: "/processing", label: "Processing Monitor" },
  { href: "/query", label: "Query Workspace" },
  { href: "/dashboard", label: "Analytics Dashboard" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/operations", label: "Operations" },
];

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 px-6 py-3 flex gap-6 items-center">
      <span className="font-bold text-blue-900">Coursera MIP</span>
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="text-sm text-gray-700 hover:text-blue-700">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
