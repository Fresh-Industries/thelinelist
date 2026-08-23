import { ImageResponse } from "next/og";

export const alt = "The Line List: Make your food or drink idea real";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#16382d",
        color: "#fffaf1",
        padding: "70px 78px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ width: 58, height: 58, borderRadius: 14, background: "#e8c547" }} />
        <div style={{ display: "flex", fontSize: 34, letterSpacing: -1 }}>The Line List</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 960 }}>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.06, letterSpacing: -3 }}>
          Make your food or drink idea real.
        </div>
        <div style={{ display: "flex", marginTop: 18, fontSize: 35, color: "#e8c547" }}>
          From idea to first run.
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: "Arial, sans-serif", fontSize: 24, color: "#d9d0be" }}>
        Food and beverage manufacturers, explained in plain language
      </div>
    </div>,
    size,
  );
}
