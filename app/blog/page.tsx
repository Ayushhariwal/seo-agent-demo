import Link from "next/link";
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import matter from "gray-matter";

export const metadata = {
  title: "Blog | SEO Agent Demo",
  description:
    "SEO tips, keyword analysis, and content strategy — " +
    "automatically published by our SEO agent.",
};

interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
}

function getPosts(): PostMeta[] {
  // Correct path: app/blog/ at project root (no src/)
  const blogDir = join(process.cwd(), "app/blog");

  try {
    const entries = readdirSync(blogDir, { withFileTypes: true });
    const posts: PostMeta[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const mdxPath = join(blogDir, entry.name, "page.mdx");
      const tsxPath = join(blogDir, entry.name, "page.tsx");

      if (existsSync(mdxPath)) {
        const raw = readFileSync(mdxPath, "utf8");
        const { data } = matter(raw);
        posts.push({
          slug: entry.name,
          title: data.title || entry.name,
          description: data.description || "",
          date: data.date || "",
          tags: data.tags || [],
        });
      } else if (existsSync(tsxPath)) {
        // Existing tsx posts without frontmatter
        posts.push({
          slug: entry.name,
          title: entry.name
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          description: "Read this post to learn more.",
          date: "",
          tags: [],
        });
      }
    }

    return posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  } catch {
    return [];
  }
}

export default function BlogIndex() {
  const posts = getPosts();

  return (
    <main className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">
        Blog
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-12">
        SEO insights and content — automatically generated and published by our
        AI SEO agent.
      </p>

      {posts.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg">No posts yet.</p>
          <p className="text-sm mt-2">
            The SEO agent will publish posts here automatically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
                {post.date && (
                  <span className="text-xs text-zinc-400 ml-auto">
                    {post.date}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                {post.title}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-6">
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
