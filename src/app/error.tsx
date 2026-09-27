"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="page narrow">
      <p className="eyebrow">A small interruption</p>
      <h1>That didn’t quite work.</h1>
      <p>Something interrupted this page. Try loading it again.</p>
      <button className="button primary" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
