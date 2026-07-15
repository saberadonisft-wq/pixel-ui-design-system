import { cloneElement, forwardRef, useEffect, useId, useRef, type DialogHTMLAttributes, type ReactElement, type ReactNode } from "react";
import { PixelButton } from "./PixelButton";
import { cx } from "./utils";

export interface PixelTooltipProps { content: ReactNode; children: ReactElement<{ "aria-describedby"?: string }>; className?: string; }
export function PixelTooltip({ content, children, className }: PixelTooltipProps) {
  const id = useId();
  return <span className={cx("px-tooltip", className)}>{cloneElement(children, { "aria-describedby": id })}<span id={id} className="px-tooltip__bubble" role="tooltip">{content}</span></span>;
}

export interface PixelModalProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open" | "onClose" | "title"> {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}

export const PixelModal = forwardRef<HTMLDialogElement, PixelModalProps>(function PixelModal({ open, title, onClose, closeLabel = "Close", className, children, ...props }, forwardedRef) {
  const localRef = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const dialog = localRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  function setRef(node: HTMLDialogElement | null) {
    localRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }
  return <dialog ref={setRef} className={cx("px-modal", className)} onClose={onClose} onCancel={(event) => { event.preventDefault(); onClose(); }} {...props}><header><h2>{title}</h2><PixelButton size="sm" variant="ghost" onClick={onClose}>{closeLabel}</PixelButton></header><div className="px-modal__content">{children}</div></dialog>;
});
