import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted">Arcade Lite · Your personal stylist</p>

      <div className="flex flex-1 flex-col justify-center py-10 animate-rise">
        <h1 className="font-display text-[3.25rem] leading-[0.95] tracking-tight">
          You have taste.
          <br />
          <em className="text-accent">Let&rsquo;s name it.</em>
        </h1>
        <p className="mt-6 max-w-sm text-lg leading-snug text-muted">
          Seven questions, zero judgment. Then we design something that could only be yours and show it in your room before you buy.
        </p>
      </div>

      <Link
        href="/quiz"
        className="flex h-14 items-center justify-center rounded-full bg-ink text-base font-semibold text-paper transition-transform active:scale-[0.98]"
      >
        Find my style
      </Link>
      <p className="mt-3 text-center text-sm text-muted">Takes about a minute</p>
    </main>
  );
}
