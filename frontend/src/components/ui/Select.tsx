import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Option[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, className = "", id, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-xs font-medium text-brand-brown-700">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={`rounded-lg border bg-white px-3 py-2 text-sm text-brand-brown-900 focus:ring-2 focus:ring-brand-gold-400 focus:ring-offset-1 ${
          error ? "border-status-error-fg" : "border-brand-border"
        } ${className}`}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="text-xs text-status-error-fg">
          {error}
        </p>
      )}
    </div>
  );
});
