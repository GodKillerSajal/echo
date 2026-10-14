import { cn } from "@/lib/utils";

const gradients = [
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-indigo-600",
  "from-pink-400 to-rose-600",
  "from-amber-400 to-orange-600",
  "from-violet-400 to-fuchsia-600",
];

export function ContactAvatar({
  name, initials, size = "md", className,
}: { name: string; initials: string; size?: "sm" | "md" | "lg" | "xl"; className?: string }) {
  const idx = name.charCodeAt(0) % gradients.length;
  const sizes = {
    sm: "size-8 text-xs",
    md: "size-11 text-sm",
    lg: "size-14 text-base",
    xl: "size-20 text-2xl",
  } as const;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-sm ring-1 ring-black/5",
        gradients[idx],
        sizes[size],
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}
