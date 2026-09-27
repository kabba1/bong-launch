"use client";
import { useRef } from "react";
import { Icon } from "./Icon";
export function ConfirmDialog({
  label,
  title,
  children,
  onConfirm,
  disabled = false,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        className="button small quiet"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
      >
        {label}
      </button>
      <dialog ref={dialog} aria-label={title}>
        <div className="dialog-top">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close confirmation"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        {children}
        <div className="form-actions">
          <button
            className="button dark"
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            Confirm
          </button>
          <button
            className="button quiet"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}
