import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { controlClasses, FieldWrapper } from "./field";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
  error?: string;
  /** Static unit shown at the end of the field, e.g. "сум" or "%". */
  suffix?: string;
  /** className of the outer wrapper; use `className` for the control itself. */
  wrapperClassName?: string;
};

export function Input({
  label,
  helper,
  error,
  suffix,
  wrapperClassName,
  className,
  id,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const control = (
    <input
      id={inputId}
      aria-invalid={error ? true : undefined}
      className={controlClasses(Boolean(error), cn(suffix && "pr-12", className))}
      {...rest}
    />
  );
  return (
    <FieldWrapper
      id={inputId}
      label={label}
      helper={helper}
      error={error}
      className={wrapperClassName}
    >
      {suffix ? (
        <div className="relative">
          {control}
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-zinc-400">
            {suffix}
          </span>
        </div>
      ) : (
        control
      )}
    </FieldWrapper>
  );
}
