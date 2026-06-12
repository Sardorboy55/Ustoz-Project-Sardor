import { useId, type InputHTMLAttributes } from "react";
import { controlClasses, FieldWrapper } from "./field";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helper?: string;
  error?: string;
  /** className of the outer wrapper; use `className` for the control itself. */
  wrapperClassName?: string;
};

export function Input({
  label,
  helper,
  error,
  wrapperClassName,
  className,
  id,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper
      id={inputId}
      label={label}
      helper={helper}
      error={error}
      className={wrapperClassName}
    >
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={controlClasses(Boolean(error), className)}
        {...rest}
      />
    </FieldWrapper>
  );
}
