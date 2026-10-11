import type { Metadata } from "next";
import { decodeProfile } from "@/lib/profile";
import { ProfileView } from "./profile-view";

// The card is a pure function of ?p=, so rendering per request is cheap and fine.
export const instant = false;

export async function generateMetadata({ searchParams }: PageProps<"/profile">): Promise<Metadata> {
  const { p } = await searchParams;
  const code = typeof p === "string" ? p : null;
  const profile = decodeProfile(code);
  if (!profile || !code) return { title: "Your style · Arcade Lite" };
  const title = `I'm a ${profile.styleName} · Arcade Lite`;
  return {
    title,
    description: `${profile.tagline} ${profile.keywords.join(" · ")}`,
    openGraph: { title, images: [`/api/card?p=${code}`] },
    twitter: { card: "summary_large_image", title, images: [`/api/card?p=${code}`] },
  };
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { p, new: isNew } = await searchParams;
  const code = typeof p === "string" ? p : null;
  return <ProfileView shared={decodeProfile(code)} code={code} isNew={isNew === "1"} />;
}
