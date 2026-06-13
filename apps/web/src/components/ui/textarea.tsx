import { useId, type TextareaHTMLAttributes } from "react";
import { controlClasses, FieldWrapper } from "./field";
import { cn } from "@/lib/cn";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helper?: string;
  error?: string;
  /** className of the outer wrapper; use `className` for the control itself. */
  wrapperClassName?: string;
};

export function Textarea({
  label,
  helper,
  error,
  wrapperClassName,
  className,
  id,
  rows = 4,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  return (
    <FieldWrapper
      id={textareaId}
      label={label}
      helper={helper}
      error={error}
      className={wrapperClassName}
    >
      <textarea
        id={textareaId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(controlClasses(Boolean(error)), "resize-y", className)}
        {...rest}
      />
    </FieldWrapper>
  );
}
