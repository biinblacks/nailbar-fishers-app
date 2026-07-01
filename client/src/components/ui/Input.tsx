import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, htmlFor, error, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-blush-800">
        {label}
      </label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const fieldId = id ?? props.name ?? label;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error}>
      <input id={fieldId} className={`input-field ${className}`} {...props} />
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export function Textarea({ label, error, id, className = "", ...props }: TextareaProps) {
  const fieldId = id ?? props.name ?? label;
  return (
    <FieldWrapper label={label} htmlFor={fieldId} error={error}>
      <textarea id={fieldId} className={`input-field min-h-[100px] resize-y ${className}`} {...props} />
    </FieldWrapper>
  );
}
