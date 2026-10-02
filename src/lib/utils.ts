import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export type { WithElementRef, WithoutChildrenOrChild } from "bits-ui";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Formats a level or depth for display. */
export function nice(n: number): string {
	return n === 69 ? "69 (nice)" : String(n);
}
