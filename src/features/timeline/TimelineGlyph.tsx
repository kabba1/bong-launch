import type { ReactNode } from "react";

export function TimelineGlyph({ id }: { id: string }) {
  let marks: ReactNode;

  switch (id) {
    case "handaxes":
      marks = (
        <>
          <path d="m25 5 9 9 5 14-4 11-9 4-10-5-6-10 5-15Z" />
          <path d="m25 5-4 16-11 7m11-7 14 18M21 21l13-7M21 21l-5 17m5-17 18 7" />
        </>
      );
      break;
    case "writing":
      marks = (
        <>
          <rect x="11" y="7" width="26" height="34" rx="4" />
          <path d="M17 15h14M17 22h14M17 29h10M17 35h6" />
        </>
      );
      break;
    case "printing":
      marks = (
        <>
          <rect x="9" y="7" width="30" height="6" rx="3" />
          <rect x="9" y="35" width="30" height="6" rx="3" />
          <path d="M13 13v22m22-22v22M19 20h10M19 27h10" />
        </>
      );
      break;
    case "telescope":
      marks = (
        <>
          <path d="m9 21 23-13 5 9-23 13Zm19-11 5 9M11 25l-6 3 3 5 6-3" />
          <path d="M24 25v8m-10 10 10-10 10 10M24 33v10" />
        </>
      );
      break;
    case "flight":
      marks = (
        <path d="m24 5 3 3v12l14 9v4l-14-5v9l5 4v3l-8-3-8 3v-3l5-4v-9L7 33v-4l14-9V8Z" />
      );
      break;
    case "moon":
      marks = (
        <>
          <circle cx="24" cy="24" r="17" />
          <circle cx="18" cy="17" r="4" />
          <circle cx="30" cy="28" r="5" />
          <circle cx="17" cy="33" r="2" />
        </>
      );
      break;
    case "web":
      marks = (
        <>
          <circle cx="24" cy="24" r="18" />
          <ellipse cx="24" cy="24" rx="8" ry="18" />
          <path d="M8 16h32M8 32h32" />
        </>
      );
      break;
    default:
      marks = (
        <>
          <circle cx="24" cy="24" r="17" />
          <path d="M24 13v12l8 5" />
        </>
      );
  }

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="32"
      height="32"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {marks}
    </svg>
  );
}
