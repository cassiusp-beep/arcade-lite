"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { encodeProfile, profileFromAnswers, saveProfile, type QuizAnswer } from "@/lib/profile";
import { QUESTIONS, START_QUESTION_ID } from "@/lib/quiz/questions";

/** Typical path length, used only to pace the progress bar. */
const EXPECTED_LENGTH = 7;

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);

  const last = answers.at(-1);
  const currentId = last
    ? QUESTIONS[last.questionId].options.find((o) => o.id === last.optionId)?.next ?? null
    : START_QUESTION_ID;
  const question = currentId ? QUESTIONS[currentId] : null;
  const progress = Math.min(answers.length / EXPECTED_LENGTH, 0.95);

  function choose(optionId: string) {
    if (!question) return;
    const nextAnswers = [...answers, { questionId: question.id, optionId }];
    const option = question.options.find((o) => o.id === optionId);
    if (option?.next) {
      setAnswers(nextAnswers);
      return;
    }
    const profile = profileFromAnswers(nextAnswers);
    saveProfile(profile);
    router.push(`/profile?p=${encodeProfile(profile)}&new=1`);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3">
        {answers.length > 0 ? (
          <button
            type="button"
            onClick={() => setAnswers(answers.slice(0, -1))}
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
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      {question && (
        <section key={question.id} className="flex flex-1 flex-col pt-8 animate-rise">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-accent">{question.kicker}</p>
          <h1 className="mt-3 font-display text-[2.1rem] leading-[1.05] tracking-tight">{question.prompt}</h1>

          <ul className="mt-auto flex flex-col gap-3 pt-8">
            {question.options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => choose(option.id)}
                  className="flex min-h-14 w-full items-center gap-4 rounded-2xl border border-line bg-white/60 px-4 py-3 text-left text-[1.05rem] leading-snug transition active:scale-[0.98] active:bg-ink active:text-paper"
                >
                  <span aria-hidden className="text-2xl">{option.emoji}</span>
                  <span>{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
