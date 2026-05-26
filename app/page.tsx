import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "SEO Agent Demo — Automated SEO for Next.js",
  description:
    "An automated SEO agent that audits your website daily, " +
    "fixes metadata, checks broken links, and publishes " +
    "SEO-optimized blog posts automatically.",
};

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center bg-white dark:bg-black">
      <Image
        className="dark:invert mb-10"
        src="/next.svg"
        alt="Next.js logo"
        width={120}
        height={24}
        priority
      />
      <h1 className="text-4xl font-bold text-zinc-900 dark:text-white max-w-2xl leading-tight mb-6">
        Automated SEO Agent for Your Next.js Website
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-xl leading-8 mb-10">
        This agent audits your site every morning, fixes broken metadata, checks
        all links, discovers competitors, and automatically publishes
        SEO-optimized blog posts — with zero human involvement.
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <Link
          href="/blog"
          className="px-6 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-black font-medium text-sm hover:opacity-80 transition-opacity"
        >
          Read our Blog
        </Link>
        <Link
          href="/about"
          className="px-6 py-3 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
        >
          About
        </Link>
      </div>
    </main>
  );
}
