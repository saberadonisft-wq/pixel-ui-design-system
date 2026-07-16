import type { PixelStyleProps } from "./types";

export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function pixelData(props: PixelStyleProps) {
  return {
    "data-px-theme": props.theme,
    "data-px-mode": props.mode,
    "data-px-grid": props.grid,
    "data-px-variant": props.variant,
    "data-px-tone": props.tone,
    "data-px-density": props.density,
    "data-px-size": props.size,
    "data-px-selected": props.selected ? "true" : undefined,
    "aria-busy": props.loading || undefined
  } as const;
}
