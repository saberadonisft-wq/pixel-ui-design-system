import type { ComponentPropsWithoutRef } from "react";

type PrimitiveProps = ComponentPropsWithoutRef<"div"> & {
  density?: "low" | "medium" | "high";
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  variant?: "solid" | "outline" | "inset" | "ghost";
};

export function Primitive({ density = "medium", tone = "neutral", variant = "solid", ...props }: PrimitiveProps) {
  return <div data-px-density={density} data-px-tone={tone} data-px-variant={variant} {...props} />;
}

