import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface WrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FieldWrapper({ label, htmlFor, error, hint, className = "", children }: WrapperProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-blush-800">
        {label}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-blush-800/60">{hint}</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Input({ label, error, hint, id, name, className = "", wrapperClassName, ...props }: InputProps) {
  const fieldId = id ?? name ?? label;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} className={wrapperClassName}>
      <input
        id={fieldId}
        name={name}
        className={`input-field ${error ? "border-red-300" : ""} ${className}`}
        aria-invalid={!!error}
        {...props}
      />
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
}

export function Textarea({ label, error, hint, id, name, className = "", wrapperClassName, ...props }: TextareaProps) {
  const fieldId = id ?? name ?? label;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} className={wrapperClassName}>
      <textarea
        id={fieldId}
        name={name}
        className={`input-field min-h-[96px] resize-y ${error ? "border-red-300" : ""} ${className}`}
        aria-invalid={!!error}
        {...props}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  children: ReactNode;
}

export function Select({ label, error, hint, id, name, className = "", wrapperClassName, children, ...props }: SelectProps) {
  const fieldId = id ?? name ?? label;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error} hint={hint} className={wrapperClassName}>
      <select
        id={fieldId}
        name={name}
        className={`input-field ${error ? "border-red-300" : ""} ${className}`}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Checkbox({ label, id, name, className = "", ...props }: CheckboxProps) {
  const fieldId = id ?? name ?? label;
  return (
    <label htmlFor={fieldId} className={`flex items-center gap-2 text-sm text-blush-800 ${className}`}>
      <input
        id={fieldId}
        name={name}
        type="checkbox"
        className="h-4 w-4 rounded border-blush-200 text-blush-500 focus:ring-blush-300"
        {...props}
      />
      {label}
    </label>
  );
}
