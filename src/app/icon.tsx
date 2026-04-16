import { ImageResponse } from "next/og";

export const runtime = "edge";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, #f8edd9 0%, #f0d7a5 42%, #8c6239 100%)",
          color: "#2d1b12",
        }}
      >
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: 96,
            background: "rgba(255,255,255,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 24px 60px rgba(75, 43, 20, 0.25)",
          }}
        >
          <div
            style={{
              width: 250,
              height: 250,
              borderRadius: 72,
              background: "#fff8ef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 118, lineHeight: 1 }}>☕</div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              riwak
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}
