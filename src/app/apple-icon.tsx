import { ImageResponse } from "next/og";

export const runtime = "edge";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f0e6",
          color: "#2d1b12",
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 36,
            background: "linear-gradient(180deg, #f7e4bf 0%, #8c6239 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 92,
            boxShadow: "0 16px 30px rgba(75, 43, 20, 0.2)",
          }}
        >
          ☕
        </div>
      </div>
    ),
    {
      width: 180,
      height: 180,
    },
  );
}
