import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page narrow">
      <p className="eyebrow">404 / A thought gone astray</p>
      <h1>Nothing here. Yet.</h1>
      <p>This page doesn’t exist, or it isn’t available to you.</p>
      <Link className="button primary" href="/">
        Back to the Bong
      </Link>
    </section>
  );
}
