import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className = "", id, ...rest },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={textareaId} className="text-xs font-medium text-brand-brown-700">
        {label}
      </label>
      <textarea
        ref={ref}
        id={textareaId}
        className={`min-h-24 rounded-lg border bg-white px-3 py-2 font-mono text-sm text-brand-brown-900 focus:ring-2 focus:ring-brand-gold-400 focus:ring-offset-1 ${
          error ? "border-status-error-fg" : "border-brand-border"
        } ${className}`}
        {...rest}
      />
      {error && (
        <p role="alert" className="text-xs text-status-error-fg">
          {error}
        </p>
      )}
    </div>
  );
});
