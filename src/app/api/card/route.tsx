import { ImageResponse } from "next/og";
import { decodeProfile } from "@/lib/profile";

/** Share image (1200×630) for a style profile: /api/card?p=<share code> */
export async function GET(request: Request) {
  const profile = decodeProfile(new URL(request.url).searchParams.get("p"));
  if (!profile) return new Response("Unknown profile", { status: 404 });

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f4efe6", padding: 56, fontFamily: "serif" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            background: "#ffffff",
            border: "4px solid #161412",
            borderRadius: 32,
            boxShadow: "12px 12px 0 #161412",
            padding: 56,
          }}
        >
          <div style={{ fontSize: 30, color: "#6b645b" }}>Arcade Lite · I&apos;m a</div>
          <div style={{ fontSize: 96, color: "#161412", lineHeight: 1, marginTop: 8 }}>{profile.styleName}</div>
          <div style={{ fontSize: 32, color: "#161412", marginTop: 20 }}>{profile.tagline}</div>
          <div style={{ display: "flex", marginTop: "auto", gap: 0, height: 90, borderRadius: 16, overflow: "hidden" }}>
            {profile.palette.map((s) => (
              <div key={s.hex} style={{ flex: 1, background: s.hex }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
            {profile.keywords.map((k) => (
              <div key={k} style={{ fontSize: 28, border: "3px solid #161412", borderRadius: 999, padding: "6px 22px" }}>
                {k}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=86400, immutable" } },
  );
}
