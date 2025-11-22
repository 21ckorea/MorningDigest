"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 text-slate-900">
      <div
        className={cn(
          "relative w-full rounded-2xl bg-white p-6 shadow-2xl",
          size === "lg" ? "max-w-2xl" : "max-w-lg"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className="absolute right-4 top-4 text-sm text-slate-400 transition hover:text-slate-600"
          onClick={onClose}
          aria-label="닫기"
        >
          ✕
        </button>
        <div>
          <h3 id="modal-title" className="text-xl font-semibold">
            {title}
          </h3>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        <div className="mt-6 space-y-4">{children}</div>
        {footer ? <div className="mt-6 flex justify-end gap-3">{footer}</div> : null}
      </div>
    </div>
  );
}
