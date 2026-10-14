import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

export function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "now";
  if (diff < 86_400_000) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  if (diff < 7 * 86_400_000) return format(d, "EEEE");
  return format(d, "dd/MM/yy");
}

export function bubbleTime(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

export function dayHeading(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMM");
}

export function fromNow(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
