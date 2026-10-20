import { forwardRef, useId, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { passwordStrength } from "../../lib/validation";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Render the four-segment strength meter beneath the field. */
  showStrength?: boolean;
}

const STRENGTH_COLORS = [
  "bg-brand-beige-200",
  "bg-status-error-fg",
  "bg-status-warning-fg",
  "bg-brand-gold-500",
  "bg-status-success-fg",
];

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ label, error, showStrength = false, className = "", id, ...rest }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [visible, setVisible] = useState(false);
    const value = typeof rest.value === "string" ? rest.value : "";
    const strength = passwordStrength(value);

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-xs font-medium text-brand-brown-700">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`w-full rounded-lg border bg-white px-3 py-2 pr-16 text-sm text-brand-brown-900 focus:ring-2 focus:ring-brand-gold-400 focus:ring-offset-1 ${
              error ? "border-status-error-fg" : "border-brand-border"
            } ${className}`}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setVisible((open) => !open)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-2 my-auto h-7 rounded-md px-2 text-xs text-brand-brown-500 hover:bg-brand-cream-100"
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>

        {showStrength && value.length > 0 && (
          <div className="mt-1 flex items-center gap-2" aria-live="polite">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((segment) => (
                <span
                  key={segment}
                  className={`h-1.5 flex-1 rounded-full ${
                    segment <= strength.score ? STRENGTH_COLORS[strength.score] : "bg-brand-beige-200"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-brand-brown-500">{strength.label}</span>
          </div>
        )}

        {error && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-status-error-fg">
            {error}
          </p>
        )}
      </div>
    );
  },
);
