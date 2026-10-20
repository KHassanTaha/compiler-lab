import { forwardRef, useId } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = "", id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-brand-brown-700">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`rounded-lg border bg-white px-3 py-2 text-sm text-brand-brown-900 placeholder:text-brand-brown-500/60 focus:ring-2 focus:ring-brand-gold-400 focus:ring-offset-1 ${
          error ? "border-status-error-fg" : "border-brand-border"
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-status-error-fg">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-brand-brown-500">{hint}</p>
      ) : null}
    </div>
  );
});
