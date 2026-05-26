"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-8 py-4 flex items-center gap-8">
      <Link href="/" className="font-semibold text-zinc-900 dark:text-white text-lg">
        SEO Agent Demo
      </Link>
      <div className="flex gap-6">
        <Link
          href="/"
          className={`text-sm transition-colors ${
            pathname === "/"
              ? "text-zinc-900 dark:text-white font-medium"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          Home
        </Link>
        <Link
          href="/blog"
          className={`text-sm transition-colors ${
            pathname?.startsWith("/blog")
              ? "text-zinc-900 dark:text-white font-medium"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          Blog
        </Link>
      </div>
    </nav>
  );
}
