/**
 * Join class names, dropping falsy entries. The whole app's className
 * composition goes through this — no template-string concatenation, so a
 * conditional class can never leave a stray "undefined" in the DOM.
 */
export function cx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
