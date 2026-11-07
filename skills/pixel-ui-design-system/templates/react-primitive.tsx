import { forwardRef, type ButtonHTMLAttributes } from "react";

type PrimitiveProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  density?: "low" | "medium" | "high";
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  variant?: "solid" | "outline" | "inset" | "ghost";
  loading?: boolean;
};

export const Primitive = forwardRef<HTMLButtonElement, PrimitiveProps>(function Primitive(
  { density = "medium", tone = "neutral", variant = "solid", loading = false, disabled, ...props },
  ref
) {
  return <button ref={ref} className="px-control" data-px-density={density} data-px-tone={tone} data-px-variant={variant} aria-busy={loading || undefined} disabled={disabled || loading} {...props} />;
});
