import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #070a05 0%, #16210c 60%, #0b3b34 100%)",
          color: "#f6fbee",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#2dd4bf", letterSpacing: 4 }}>{"> whoami"}</div>
        <div style={{ fontSize: 96, fontWeight: 800, marginTop: 24, lineHeight: 1.05 }}>
          {profile.name.split(" ").slice(0, 3).join(" ")}
        </div>
        <div style={{ fontSize: 44, color: "#a3e635", marginTop: 20 }}>{profile.role}</div>
        <div style={{ fontSize: 28, color: "#a9b39a", marginTop: 36, maxWidth: 900 }}>
          {profile.tagline}
        </div>
      </div>
    ),
    size
  );
}
