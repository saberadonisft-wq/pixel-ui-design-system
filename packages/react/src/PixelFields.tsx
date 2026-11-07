import { forwardRef, useId, type ForwardedRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { PixelStyleProps } from "./types";
import { cx, pixelData } from "./utils";

interface FieldMeta { label: ReactNode; helper?: ReactNode; error?: ReactNode; success?: ReactNode; }

function FieldShell({ id, label, helper, error, success, children, className }: FieldMeta & { id: string; children: ReactNode; className?: string }) {
  const message = error ?? success ?? helper;
  const state = error ? "error" : success ? "success" : undefined;
  return <div className={cx("px-field", className)} data-state={state}><label htmlFor={id}>{label}</label>{children}<div id={`${id}-message`} className="px-field__message" role={error ? "alert" : undefined}>{message}</div></div>;
}

export interface PixelInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, FieldMeta, Pick<PixelStyleProps, "size" | "tone" | "loading"> {}
export const PixelInput = forwardRef<HTMLInputElement, PixelInputProps>(function PixelInput({ id, className, label, helper, error, success, size = "md", tone = "neutral", loading, disabled, ...props }, ref) {
  const generated = useId(); const inputId = id ?? generated;
  return <FieldShell id={inputId} label={label} helper={helper} error={error} success={success} className={className}><span className="px-field__control" {...pixelData({ size, tone, loading })}><input ref={ref} id={inputId} disabled={disabled} aria-invalid={Boolean(error) || undefined} aria-describedby={`${inputId}-message`} {...props} /><i aria-hidden="true" /></span></FieldShell>;
});

export interface PixelTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldMeta, Pick<PixelStyleProps, "size" | "tone" | "loading"> {}
export const PixelTextarea = forwardRef<HTMLTextAreaElement, PixelTextareaProps>(function PixelTextarea({ id, className, label, helper, error, success, size = "md", tone = "neutral", loading, disabled, ...props }, ref) {
  const generated = useId(); const inputId = id ?? generated;
  return <FieldShell id={inputId} label={label} helper={helper} error={error} success={success} className={className}><span className="px-field__control px-field__control--area" {...pixelData({ size, tone, loading })}><textarea ref={ref} id={inputId} disabled={disabled} aria-invalid={Boolean(error) || undefined} aria-describedby={`${inputId}-message`} {...props} /></span></FieldShell>;
});

export interface PixelSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">, FieldMeta, Pick<PixelStyleProps, "size" | "tone" | "loading"> {}
export const PixelSelect = forwardRef<HTMLSelectElement, PixelSelectProps>(function PixelSelect({ id, className, label, helper, error, success, size = "md", tone = "neutral", loading, disabled, children, ...props }, ref) {
  const generated = useId(); const inputId = id ?? generated;
  return <FieldShell id={inputId} label={label} helper={helper} error={error} success={success} className={className}><span className="px-field__control px-field__control--select" {...pixelData({ size, tone, loading })}><select ref={ref} id={inputId} disabled={disabled} aria-invalid={Boolean(error) || undefined} aria-describedby={`${inputId}-message`} {...props}>{children}</select><i aria-hidden="true" /></span></FieldShell>;
});

interface ChoiceProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type">, Pick<PixelStyleProps, "tone" | "size"> { label: ReactNode; }

function Choice({ className, label, tone = "accent", size = "md", ...props }: ChoiceProps, type: "checkbox" | "radio", ref: ForwardedRef<HTMLInputElement>) {
  return <label className={cx("px-choice", className)} {...pixelData({ tone, size })}><input ref={ref} type={type} {...props} /><span className="px-choice__mark" aria-hidden="true" /><span>{label}</span></label>;
}

export const PixelCheckbox = forwardRef<HTMLInputElement, ChoiceProps>(function PixelCheckbox(props, ref) { return Choice(props, "checkbox", ref); });
export const PixelRadio = forwardRef<HTMLInputElement, ChoiceProps>(function PixelRadio(props, ref) { return Choice(props, "radio", ref); });

export interface PixelSwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "role">, Pick<PixelStyleProps, "tone" | "size"> { label: ReactNode; }
export const PixelSwitch = forwardRef<HTMLInputElement, PixelSwitchProps>(function PixelSwitch({ className, label, tone = "accent", size = "md", ...props }, ref) {
  return <label className={cx("px-switch", className)} {...pixelData({ tone, size })}><input ref={ref} type="checkbox" role="switch" {...props} /><span className="px-switch__track" aria-hidden="true"><i /></span><span>{label}</span></label>;
});
