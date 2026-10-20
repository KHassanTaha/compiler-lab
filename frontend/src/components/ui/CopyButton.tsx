import { useState } from "react";
import { toast } from "../../lib/toast";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

/** Copies `value` to the clipboard and toasts a confirmation. */
export function CopyButton({ value, label = "Copy", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={`rounded-lg border border-brand-border bg-white px-2.5 py-1 text-xs text-brand-brown-700 hover:bg-brand-cream-100 ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
