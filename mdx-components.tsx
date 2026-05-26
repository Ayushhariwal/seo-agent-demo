import type { MDXComponents } from "mdx/types";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold mt-8 mb-4 text-zinc-900 dark:text-white">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3 text-zinc-800 dark:text-zinc-100">
        {children}
      </h2>
    ),
    p: ({ children }) => (
      <p className="text-zinc-600 dark:text-zinc-400 leading-8 mb-4">{children}</p>
    ),
    ...components,
  };
}
