"use client";
import { useState } from "react";
export function CopyAddress({ address }: { address: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "manual">("idle");
  return (
    <>
      <button
        className="button quiet"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(address);
            setStatus("copied");
          } catch {
            setStatus("manual");
          }
        }}
      >
        Copy full address
      </button>
      <span className="tiny" role="status">
        {status === "copied"
          ? "Full address copied."
          : status === "manual"
            ? "Select and copy the complete address below."
            : ""}
      </span>
      {status === "manual" && (
        <div className="form-field">
          <label htmlFor="contract-copy">Full contract address</label>
          <input
            id="contract-copy"
            readOnly
            value={address}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}
    </>
  );
}
