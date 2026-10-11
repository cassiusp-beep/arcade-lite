import Link from "next/link";

/** Step 2 placeholder: category picker + Arcade generation. */
export default function DesignPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 text-center">
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Coming next</p>
      <h1 className="mt-3 font-display text-4xl leading-tight">Design something in your style</h1>
      <p className="mt-3 text-muted">Pick a product and we&rsquo;ll design it with Arcade from your profile.</p>
      <Link href="/profile" className="mt-8 text-sm underline underline-offset-4">
        Back to my card
      </Link>
    </main>
  );
}
