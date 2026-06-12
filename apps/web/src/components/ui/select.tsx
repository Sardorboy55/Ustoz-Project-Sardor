import { useId, type SelectHTMLAttributes } from "react";
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
      <select
        id={selectId}
        aria-invalid={error ? true : undefined}
        className={cn(controlClasses(Boolean(error)), "appearance-none", className)}
        {...rest}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
