"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuraCard } from "@/components/aura-card";
import { encodeProfile, profileFromAnswers, saveProfile, type QuizAnswer } from "@/lib/profile";
import { drawQuiz, fallbackQuiz, type AuraOption, type VibeQuestion } from "@/lib/quiz/bank";

const DEMO_SEED = 42;

type Step = { question: VibeQuestion; picked: AuraOption | null };

export default function QuizPage() {
  const router = useRouter();
  const [quiz, setQuiz] = useState<VibeQuestion[] | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);

  // Draw after mount so server and client render the same first frame. ?demo=1 is always the same quiz.
  useEffect(() => {
    const demo = new URLSearchParams(location.search).get("demo") === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time random draw on the client
    setQuiz(drawQuiz(demo ? DEMO_SEED : Date.now()) ?? fallbackQuiz());
  }, []);

  if (!quiz) return <main className="flex-1" />;

  const index = steps.length;
  const question = quiz[index];
  const picked = steps.flatMap((s) => (s.picked ? [s.picked] : []));

  function finish(all: Step[]) {
    const answers: QuizAnswer[] = all.flatMap((s) => (s.picked ? [{ questionId: s.question.id, optionId: s.picked.id }] : []));
    const profile = profileFromAnswers(answers);
    saveProfile(profile);
    router.push(`/profile?p=${encodeProfile(profile)}&new=1`);
  }

  function answer(option: AuraOption | null) {
    const next = [...steps, { question, picked: option }];
    if (next.length >= quiz!.length) return finish(next);
    setSteps(next);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        {index > 0 ? (
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
          <div className="h-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${(index / quiz.length) * 100}%` }} />
        </div>
        <button type="button" onClick={() => finish(steps)} className="h-11 px-1 text-sm text-muted underline underline-offset-4">
          Skip quiz
        </button>
      </header>

      <div className="mt-3">
        <AuraCard colors={picked.map((p) => p.color)} keywords={picked.map((p) => p.keyword)} total={quiz.length} />
      </div>

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
    </main>
  );
}
