"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuraCard } from "@/components/aura-card";
import { encodeProfile, personalize, profileFromAnswers, saveProfile, type QuizAnswer } from "@/lib/profile";
import { ARCHETYPES } from "@/lib/quiz/archetypes";
import { drawQuiz, fallbackQuiz, type AuraOption, type VibeQuestion } from "@/lib/quiz/bank";
import { curatedVibe, type SonicVibe } from "@/lib/soundtrack";

const DEMO_SEED = 42;

type Step = { question: VibeQuestion; picked: AuraOption | null };

export default function QuizPage() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<VibeQuestion[] | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [phase, setPhase] = useState<"quiz" | "music">("quiz");
  const [music, setMusic] = useState("");
  const [vibe, setVibe] = useState<SonicVibe | null>(null);
  const [listening, setListening] = useState(false);
  const [connectNote, setConnectNote] = useState(false);
  const [demo, setDemo] = useState(false);
  const [writing, setWriting] = useState(false);

  // Draw after mount so server and client render the same first frame. ?demo=1 is always the same quiz.
  useEffect(() => {
    const isDemo = new URLSearchParams(location.search).get("demo") === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time random draw on the client
    setQuiz(drawQuiz(isDemo ? DEMO_SEED : Date.now()) ?? fallbackQuiz());
    setDemo(isDemo);
    if (isDemo) setMusic("Frank Ocean, Clairo");
  }, []);

  if (!quiz) return <main className="flex-1" />;
  if (writing) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5" aria-live="polite">
        <AuraCard colors={[...steps.flatMap((s) => (s.picked ? [s.picked.color] : [])), ...(vibe?.colors ?? [])]} keywords={[]} answered={steps.filter((s) => s.picked).length} total={quiz.length} music={Boolean(vibe)} />
        <p className="mt-8 text-xs font-medium tracking-[0.2em] uppercase text-accent">Your stylist is writing</p>
        <h1 className="mt-2 font-display text-[2.1rem] leading-[1.05] tracking-tight">Naming your style…</h1>
      </main>
    );
  }

  const index = steps.length;
  const question = quiz[index];
  const picked = steps.flatMap((s) => (s.picked ? [s.picked] : []));
  const auraColors = [...picked.map((p) => p.color), ...(vibe?.colors ?? [])];
  const auraKeywords = [...picked.map((p) => p.keyword), ...(vibe?.keywords ?? [])];

  async function finish(all: Step[], sonic: SonicVibe | null = vibe) {
    const answers: QuizAnswer[] = all.flatMap((s) => (s.picked ? [{ questionId: s.question.id, optionId: s.picked.id }] : []));
    let profile = profileFromAnswers(answers, sonic && music.trim() ? { text: music.trim(), vibe: sonic } : undefined);
    // Step 3: Gemini writes a one-of-a-kind profile on top. Demo mode and outages keep the archetype.
    if (!demo) {
      setWriting(true);
      const gen = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          archetype: profile.styleName,
          secondary: ARCHETYPES[profile.secondaryId].name,
          aura: auraKeywords,
          music: music.trim(),
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (gen?.styleName) profile = personalize(profile, gen);
    }
    saveProfile(profile);
    router.push(`/profile?p=${encodeProfile(profile)}&new=1`);
  }

  async function readVibe() {
    const text = music.trim();
    if (!text) return;
    setListening(true);
    // Demo mode never depends on the LLM; the curated map answers instantly.
    const result: SonicVibe = demo
      ? curatedVibe(text)
      : await fetch("/api/vibe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ music: text }) })
          .then((r) => r.json())
          .then((d) => (d?.colors ? (d as SonicVibe) : curatedVibe(text)))
          .catch(() => curatedVibe(text));
    setVibe(result);
    setListening(false);
  }

  function answer(option: AuraOption | null) {
    const next = [...steps, { question, picked: option }];
    setSteps(next);
    if (next.length >= quiz!.length) setPhase("music");
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        {phase === "music" ? (
          <button
            type="button"
            onClick={() => {
              setPhase("quiz");
              setVibe(null);
              if (steps.length >= quiz.length) setSteps(steps.slice(0, -1));
            }}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl active:bg-line"
            aria-label="Back to the quiz"
          >
            ←
          </button>
        ) : index > 0 ? (
          <button
            type="button"
            onClick={() => setSteps(steps.slice(0, -1))}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl active:bg-line"
            aria-label="Previous question"
          >
            ←
          </button>
        ) : (
          <Link href="/" className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-xl active:bg-line" aria-label="Back to start">
            ←
          </Link>
        )}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={index} aria-valuemin={0} aria-valuemax={quiz.length}>
          <div className="h-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${phase === "music" ? 100 : (index / quiz.length) * 100}%` }} />
        </div>
        {phase === "quiz" && (
          <button type="button" onClick={() => setPhase("music")} className="h-11 px-1 text-sm text-muted underline underline-offset-4">
            Skip quiz
          </button>
        )}
      </header>

      <div className="mt-3">
        <AuraCard colors={auraColors} keywords={auraKeywords} answered={picked.length} total={quiz.length} music={Boolean(vibe)} />
      </div>

      {phase === "music" ? (
        <section className="flex flex-1 flex-col pt-5 animate-rise">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">Soundtrack</p>
          <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">What&rsquo;s on repeat right now?</h1>
          <p className="mt-2 text-muted">One or two artists, or a playlist name. Your music shapes your style too.</p>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConnectNote(true)} className="h-12 rounded-full bg-[#1DB954] text-sm font-semibold text-black">
              Connect Spotify
            </button>
            <button type="button" onClick={() => setConnectNote(true)} className="h-12 rounded-full bg-[#FA2D48] text-sm font-semibold text-white">
              Connect Apple Music
            </button>
          </div>
          {connectNote && <p className="mt-2 text-sm text-muted">Account linking is coming soon. Type it below for now.</p>}

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              readVibe();
            }}
          >
            <input
              value={music}
              onChange={(e) => {
                setMusic(e.target.value);
                setVibe(null);
              }}
              maxLength={120}
              placeholder="e.g. Frank Ocean, Clairo"
              aria-label="Artists or playlist"
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-4 text-base outline-none focus:border-ink"
            />
            <button type="submit" disabled={!music.trim() || listening} className="h-12 shrink-0 rounded-xl border-2 border-ink px-4 text-sm font-semibold disabled:opacity-40">
              {listening ? "Listening…" : "Read it"}
            </button>
          </form>

          {vibe && (
            <p className="mt-4 rounded-2xl bg-white p-4 text-[1.02rem] leading-snug animate-rise" aria-live="polite">
              <span className="mr-1" aria-hidden>
                🎧
              </span>
              {vibe.line}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <button
              type="button"
              onClick={() => finish(steps)}
              className="flex h-14 items-center justify-center rounded-full bg-ink text-base font-semibold text-paper active:scale-[0.98]"
            >
              {vibe ? "See my style" : music.trim() ? "Skip the read, see my style" : "Skip, see my style"}
            </button>
          </div>
        </section>
      ) : (
      <section key={question.id} className="flex flex-1 flex-col pt-5 animate-rise">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">{question.kicker}</p>
        <h1 className="mt-2 font-display text-[1.9rem] leading-[1.05] tracking-tight">{question.prompt}</h1>

        <ul className="mt-auto flex flex-col gap-2.5 pt-6">
          {question.options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => answer(option)}
                className="flex min-h-14 w-full items-center gap-4 rounded-2xl border border-line bg-white/60 px-4 py-3 text-left text-[1.02rem] leading-snug transition active:scale-[0.98] active:bg-ink active:text-paper"
              >
                <span aria-hidden className="text-2xl">
                  {option.emoji}
                </span>
                <span>{option.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => answer(null)} className="mt-2 h-11 text-sm text-muted">
          Skip this one
        </button>
      </section>
      )}
    </main>
  );
}
