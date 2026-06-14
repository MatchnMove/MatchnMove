import { ImageResponse } from "next/og";

export const alt = "Match 'n Move - compare free moving quotes across New Zealand";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "radial-gradient(circle at 85% 15%, rgba(56,189,248,0.32), transparent 30%), linear-gradient(135deg, #071525 0%, #12345d 58%, #176b72 100%)",
          color: "white",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "1040px", width: "100%" }}>
          <div
            style={{
              color: "#a7f3d0",
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Match &apos;n Move
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.02,
              marginTop: 28,
            }}
          >
            Compare free moving quotes across New Zealand.
          </div>
          <div style={{ color: "#dbeafe", display: "flex", fontSize: 30, lineHeight: 1.35, marginTop: 30 }}>
            One request. Trusted moving companies. No customer fee.
          </div>
        </div>
      </div>
    ),
    size,
  );
}

