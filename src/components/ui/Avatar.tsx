import { cx } from "./cx";

export interface AvatarProps {
  /** Full name, used for the initials and the accessible title. */
  name: string;
  /** Override the derived initials (e.g. the project's owner_initials column). */
  initials?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** First letters of the first two words, uppercased. "" → "?". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.slice(0, 2).map((w) => w[0] ?? "");
  return letters.join("").toUpperCase();
}

/** Gold-tinted initials tile. Decorative: the name is always in the DOM too. */
export function Avatar({ name, initials, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cx(
        "avatar",
        size === "sm" && "avatar-sm",
        size === "lg" && "avatar-lg",
        className,
      )}
      title={name}
      aria-hidden="true"
    >
      {initials?.toUpperCase() || initialsOf(name)}
    </span>
  );
}
