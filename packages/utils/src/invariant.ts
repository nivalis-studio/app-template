/**
 * Runtime assertion helper.
 *
 * Throws an error if the given condition is falsy. Useful for
 * narrowing types and asserting preconditions at runtime.
 *
 * @example
 * ```ts
 * import { invariant } from "@nivalis/utils"
 *
 * const user: User | undefined = getUser(id)
 * invariant(user, "User not found")
 * // `user` is narrowed to `User` after this line
 * ```
 */
export function invariant(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Converts a string into a URL-friendly slug.
 *
 * Lowercases the input, replaces non-alphanumeric characters with
 * hyphens, collapses consecutive hyphens, and trims leading/trailing
 * hyphens.
 *
 * @example
 * ```ts
 * import { slugify } from "@nivalis/utils"
 *
 * slugify("Hello World!") // "hello-world"
 * slugify("  Foo  Bar  ") // "foo-bar"
 * ```
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
