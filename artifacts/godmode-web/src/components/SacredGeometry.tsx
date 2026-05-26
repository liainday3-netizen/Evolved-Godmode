import React from "react";

const BASE = 320;
const CX = BASE / 2;
const CY = BASE / 2;

const OUTER_R = 148;
const STAR_R = 106;
const FLOWER_R = 60;
const INNER_HEX_R = 43;
const MID_RING_R = 78;
const CORE_R_OUTER = 22;
const CORE_R_INNER = 9;
const CORE_R_DOT = 4;

function pt(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function toStr(pts: Array<{ x: number; y: number }>) {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

const outerNodes = Array.from({ length: 12 }, (_, i) => pt(i * 30, OUTER_R));
const flowerCenters = [
  { x: CX, y: CY },
  ...Array.from({ length: 6 }, (_, i) => pt(i * 60, FLOWER_R)),
];

const metatronLines: Array<[number, number, number, number]> = [];
for (let i = 0; i < flowerCenters.length; i++) {
  for (let j = i + 1; j < flowerCenters.length; j++) {
    metatronLines.push([
      flowerCenters[i].x, flowerCenters[i].y,
      flowerCenters[j].x, flowerCenters[j].y,
    ]);
  }
}

const tri1 = Array.from({ length: 3 }, (_, i) => pt(i * 120, STAR_R));
const tri2 = Array.from({ length: 3 }, (_, i) => pt(60 + i * 120, STAR_R));
const innerHex = Array.from({ length: 6 }, (_, i) => pt(i * 60, INNER_HEX_R));
const midHex = Array.from({ length: 6 }, (_, i) => pt(30 + i * 60, MID_RING_R));
const outerHex1 = [0, 2, 4, 6, 8, 10].map((i) => outerNodes[i]);
const outerHex2 = [1, 3, 5, 7, 9, 11].map((i) => outerNodes[i]);

interface Props {
  size?: number;
  accentColor?: string;
  goldColor?: string;
  opacity?: number;
}

export function SacredGeometry({
  size = BASE,
  accentColor = "#00D4FF",
  goldColor = "#C8A84B",
  opacity = 1,
}: Props) {
  const scale = size / BASE;

  return (
    <>
      <style>{`
        @keyframes sgRotateCW88 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sgRotateCCW52 {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes sgRotateCW32 {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes sgRotateCW70 {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes sgPulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.07); }
        }
      `}</style>
      <div
        style={{
          width: BASE,
          height: BASE,
          opacity,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Layer 0: Static Metatron + Flower of Life */}
        <div style={{ position: "absolute", inset: 0 }}>
          <svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
            {metatronLines.map(([x1, y1, x2, y2], i) => (
              <line
                key={`ml${i}`}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={accentColor}
                strokeWidth="0.55"
                strokeOpacity={0.14}
              />
            ))}
            {flowerCenters.map((c, i) => (
              <circle
                key={`fc${i}`}
                cx={c.x} cy={c.y} r={FLOWER_R}
                stroke={accentColor}
                strokeWidth="0.6"
                strokeOpacity={0.13}
                fill="none"
              />
            ))}
          </svg>
        </div>

        {/* Layer 1: Outer ring — slow CW (88s) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "sgRotateCW88 88s linear infinite",
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
            <circle cx={CX} cy={CY} r={OUTER_R} stroke={accentColor} strokeWidth="0.7" strokeOpacity={0.22} fill="none" />
            <polygon points={toStr(outerHex1)} stroke={accentColor} strokeWidth="0.7" strokeOpacity={0.28} fill="none" />
            <polygon points={toStr(outerHex2)} stroke={goldColor} strokeWidth="0.7" strokeOpacity={0.25} fill="none" />
            {outerNodes.map((p, i) => (
              <circle key={`nd${i}`} cx={p.x} cy={p.y} r={i % 3 === 0 ? 3 : 2} fill={i % 3 === 0 ? goldColor : accentColor} fillOpacity={i % 3 === 0 ? 0.85 : 0.6} />
            ))}
            {[0, 2, 4, 6, 8, 10].map((i) => (
              <line key={`sk${i}`} x1={outerNodes[i].x} y1={outerNodes[i].y} x2={CX} y2={CY} stroke={accentColor} strokeWidth="0.45" strokeOpacity={0.1} />
            ))}
          </svg>
        </div>

        {/* Layer 2: Mid ring — medium CW (70s) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "sgRotateCW70 70s linear infinite",
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
            <circle cx={CX} cy={CY} r={MID_RING_R} stroke={goldColor} strokeWidth="0.6" strokeOpacity={0.18} fill="none" />
            <polygon points={toStr(midHex)} stroke={goldColor} strokeWidth="0.8" strokeOpacity={0.22} fill={goldColor} fillOpacity={0.025} />
            {midHex.map((p, i) => (
              <circle key={`mh${i}`} cx={p.x} cy={p.y} r={2} fill={goldColor} fillOpacity={0.6} />
            ))}
          </svg>
        </div>

        {/* Layer 3: Star of David — medium CCW (52s) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "sgRotateCCW52 52s linear infinite",
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
            <polygon points={toStr(tri1)} stroke={goldColor} strokeWidth="1.1" strokeOpacity={0.55} fill={goldColor} fillOpacity={0.04} />
            <polygon points={toStr(tri2)} stroke={goldColor} strokeWidth="1.1" strokeOpacity={0.55} fill={goldColor} fillOpacity={0.04} />
            {[...tri1, ...tri2].map((p, i) => (
              <circle key={`sp${i}`} cx={p.x} cy={p.y} r={2.5} fill={goldColor} fillOpacity={0.75} />
            ))}
            <circle cx={CX} cy={CY} r={STAR_R} stroke={goldColor} strokeWidth="0.5" strokeOpacity={0.15} fill="none" />
          </svg>
        </div>

        {/* Layer 4: Inner hexagon — faster CW (32s) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "sgRotateCW32 32s linear infinite",
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
            <polygon points={toStr(innerHex)} stroke={accentColor} strokeWidth="1.3" strokeOpacity={0.65} fill={accentColor} fillOpacity={0.05} />
            {innerHex.map((p, i) => (
              <line key={`il${i}`} x1={p.x} y1={p.y} x2={CX} y2={CY} stroke={accentColor} strokeWidth="0.6" strokeOpacity={0.3} />
            ))}
            <circle cx={CX} cy={CY} r={INNER_HEX_R} stroke={accentColor} strokeWidth="0.8" strokeOpacity={0.35} fill="none" />
            {innerHex.map((p, i) => (
              <circle key={`iv${i}`} cx={p.x} cy={p.y} r={2} fill={accentColor} fillOpacity={0.75} />
            ))}
          </svg>
        </div>

        {/* Layer 5: Pulsing core */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "sgPulse 3.2s ease-in-out infinite",
            transformOrigin: `${CX}px ${CY}px`,
          }}
        >
          <svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
            <circle cx={CX} cy={CY} r={CORE_R_OUTER + 6} fill={accentColor} fillOpacity={0.04} />
            <circle cx={CX} cy={CY} r={CORE_R_OUTER} stroke={accentColor} strokeWidth="1.4" strokeOpacity={0.85} fill={accentColor} fillOpacity={0.1} />
            <circle cx={CX} cy={CY} r={CORE_R_INNER} fill={accentColor} fillOpacity={0.9} />
            <circle cx={CX} cy={CY} r={CORE_R_DOT} fill="white" fillOpacity={0.95} />
          </svg>
        </div>
      </div>
    </>
  );
}
