export type Tone = "success" | "error" | "warning" | "info" | "neutral";

/** Maps a run/engine status string to a badge tone. */
export function statusTone(status: string | null | undefined): Tone {
  if (status === "success") return "success";
  if (status === "error") return "error";
  return "neutral";
}
