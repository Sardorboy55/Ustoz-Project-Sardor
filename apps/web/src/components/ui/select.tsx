import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { controlClasses, FieldWrapper } from "./field";
import { cn } from "@/lib/cn";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helper?: string;
  error?: string;
  /** className of the outer wrapper; use `className` for the control itself. */
  wrapperClassName?: string;
};

export function Select({
  label,
  helper,
  error,
  wrapperClassName,
  className,
  id,
  children,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <FieldWrapper
      id={selectId}
      label={label}
      helper={helper}
      error={error}
      className={wrapperClassName}
    >
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          className={cn(controlClasses(Boolean(error)), "appearance-none pr-10", className)}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
      </div>
    </FieldWrapper>
  );
}
