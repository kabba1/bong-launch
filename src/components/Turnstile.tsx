"use client";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
export function Turnstile({
  siteKey,
  action,
  onToken,
  nonce,
  resetKey = 0,
}: {
  siteKey?: string;
  action: "auth" | "upload" | "report";
  onToken: (token: string) => void;
  nonce?: string;
  resetKey?: number;
}) {
  const element = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    if (!ready || !siteKey || !element.current || !window.turnstile) return;
    callback.current("");
    const id = window.turnstile.render(element.current, {
      sitekey: siteKey,
      action,
      theme: "light",
      callback: (token: string) => callback.current(token),
      "expired-callback": () => callback.current(""),
      "error-callback": () => callback.current(""),
    });
    return () => window.turnstile?.remove(id);
  }, [ready, siteKey, action, resetKey]);
  if (!siteKey)
    return (
      <p className="notice">
        Verification is unavailable right now. Please try again later.
      </p>
    );
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        nonce={nonce}
        onReady={onReady}
      />
      <div ref={element} className="challenge" />
    </>
  );
}
