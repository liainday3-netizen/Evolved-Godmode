import React, { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

// ─── Geometry Constants ───────────────────────────────────────────────────────
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

// Outer 12 nodes
const outerNodes = Array.from({ length: 12 }, (_, i) => pt(i * 30, OUTER_R));

// Flower of Life centers (center + 6 petals)
const flowerCenters = [
  { x: CX, y: CY },
  ...Array.from({ length: 6 }, (_, i) => pt(i * 60, FLOWER_R)),
];

// Metatron's cube: connect every pair of flower centers (21 lines)
const metatronLines: Array<[number, number, number, number]> = [];
for (let i = 0; i < flowerCenters.length; i++) {
  for (let j = i + 1; j < flowerCenters.length; j++) {
    metatronLines.push([
      flowerCenters[i].x, flowerCenters[i].y,
      flowerCenters[j].x, flowerCenters[j].y,
    ]);
  }
}

// Star of David triangles
const tri1 = Array.from({ length: 3 }, (_, i) => pt(i * 120, STAR_R));
const tri2 = Array.from({ length: 3 }, (_, i) => pt(60 + i * 120, STAR_R));

// Inner hexagons
const innerHex = Array.from({ length: 6 }, (_, i) => pt(i * 60, INNER_HEX_R));
const midHex = Array.from({ length: 6 }, (_, i) => pt(30 + i * 60, MID_RING_R));

// Outer dodecagon star (every node connected to form two hexagons)
const outerHex1 = [0, 2, 4, 6, 8, 10].map((i) => outerNodes[i]);
const outerHex2 = [1, 3, 5, 7, 9, 11].map((i) => outerNodes[i]);

// ─── Component ────────────────────────────────────────────────────────────────
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
  const rot1 = useSharedValue(0); // outer ring — slow CW
  const rot2 = useSharedValue(0); // hexagram — medium CCW
  const rot3 = useSharedValue(0); // inner hex — faster CW
  const rot4 = useSharedValue(0); // mid ring — medium CW
  const pulse = useSharedValue(0); // breathing pulse

  useEffect(() => {
    rot1.value = withRepeat(
      withTiming(360, { duration: 88000, easing: Easing.linear }),
      -1,
      false
    );
    rot2.value = withRepeat(
      withTiming(-360, { duration: 52000, easing: Easing.linear }),
      -1,
      false
    );
    rot3.value = withRepeat(
      withTiming(360, { duration: 32000, easing: Easing.linear }),
      -1,
      false
    );
    rot4.value = withRepeat(
      withTiming(-360, { duration: 70000, easing: Easing.linear }),
      -1,
      false
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sine) }),
      -1,
      true
    );
  }, []);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot1.value}deg` }],
  }));

  const hexStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot2.value}deg` }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot3.value}deg` }],
  }));

  const midStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot4.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.55,
    transform: [{ scale: 1 + pulse.value * 0.07 }],
  }));

  const scale = size / BASE;

  return (
    <View
      style={{
        width: BASE,
        height: BASE,
        opacity,
        transform: scale !== 1 ? [{ scale }] : undefined,
      }}
    >
      {/* ── LAYER 0: Static Metatron + Flower of Life ──────────────────── */}
      <View style={{ position: "absolute", width: BASE, height: BASE }}>
        <Svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
          {metatronLines.map(([x1, y1, x2, y2], i) => (
            <Line
              key={`ml${i}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={accentColor}
              strokeWidth="0.55"
              strokeOpacity={0.14}
            />
          ))}
          {flowerCenters.map((c, i) => (
            <Circle
              key={`fc${i}`}
              cx={c.x} cy={c.y} r={FLOWER_R}
              stroke={accentColor}
              strokeWidth="0.6"
              strokeOpacity={0.13}
              fill="none"
            />
          ))}
        </Svg>
      </View>

      {/* ── LAYER 1: Outer ring — slow CW ──────────────────────────────── */}
      <Animated.View
        style={[{ position: "absolute", width: BASE, height: BASE }, outerStyle]}
      >
        <Svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
          {/* Outer circle border */}
          <Circle
            cx={CX} cy={CY} r={OUTER_R}
            stroke={accentColor}
            strokeWidth="0.7"
            strokeOpacity={0.22}
            fill="none"
          />
          {/* Two interlocked outer hexagons */}
          <Polygon
            points={toStr(outerHex1)}
            stroke={accentColor}
            strokeWidth="0.7"
            strokeOpacity={0.28}
            fill="none"
          />
          <Polygon
            points={toStr(outerHex2)}
            stroke={goldColor}
            strokeWidth="0.7"
            strokeOpacity={0.25}
            fill="none"
          />
          {/* 12 nodes — alternating gold & cyan */}
          {outerNodes.map((p, i) => (
            <Circle
              key={`nd${i}`}
              cx={p.x} cy={p.y}
              r={i % 3 === 0 ? 3 : 2}
              fill={i % 3 === 0 ? goldColor : accentColor}
              fillOpacity={i % 3 === 0 ? 0.85 : 0.6}
            />
          ))}
          {/* Thin spokes from every other node to center */}
          {[0, 2, 4, 6, 8, 10].map((i) => (
            <Line
              key={`sk${i}`}
              x1={outerNodes[i].x} y1={outerNodes[i].y}
              x2={CX} y2={CY}
              stroke={accentColor}
              strokeWidth="0.45"
              strokeOpacity={0.1}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* ── LAYER 2: Mid ring — medium CW ──────────────────────────────── */}
      <Animated.View
        style={[{ position: "absolute", width: BASE, height: BASE }, midStyle]}
      >
        <Svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
          <Circle
            cx={CX} cy={CY} r={MID_RING_R}
            stroke={goldColor}
            strokeWidth="0.6"
            strokeOpacity={0.18}
            fill="none"
          />
          <Polygon
            points={toStr(midHex)}
            stroke={goldColor}
            strokeWidth="0.8"
            strokeOpacity={0.22}
            fill={goldColor}
            fillOpacity={0.025}
          />
          {midHex.map((p, i) => (
            <Circle
              key={`mh${i}`}
              cx={p.x} cy={p.y} r={2}
              fill={goldColor}
              fillOpacity={0.6}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* ── LAYER 3: Star of David — medium CCW ─────────────────────────── */}
      <Animated.View
        style={[{ position: "absolute", width: BASE, height: BASE }, hexStyle]}
      >
        <Svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
          <Polygon
            points={toStr(tri1)}
            stroke={goldColor}
            strokeWidth="1.1"
            strokeOpacity={0.55}
            fill={goldColor}
            fillOpacity={0.04}
          />
          <Polygon
            points={toStr(tri2)}
            stroke={goldColor}
            strokeWidth="1.1"
            strokeOpacity={0.55}
            fill={goldColor}
            fillOpacity={0.04}
          />
          {/* Star point dots */}
          {[...tri1, ...tri2].map((p, i) => (
            <Circle
              key={`sp${i}`}
              cx={p.x} cy={p.y} r={2.5}
              fill={goldColor}
              fillOpacity={0.75}
            />
          ))}
          <Circle
            cx={CX} cy={CY} r={STAR_R}
            stroke={goldColor}
            strokeWidth="0.5"
            strokeOpacity={0.15}
            fill="none"
          />
        </Svg>
      </Animated.View>

      {/* ── LAYER 4: Inner hexagon — faster CW ─────────────────────────── */}
      <Animated.View
        style={[{ position: "absolute", width: BASE, height: BASE }, innerStyle]}
      >
        <Svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
          <Polygon
            points={toStr(innerHex)}
            stroke={accentColor}
            strokeWidth="1.3"
            strokeOpacity={0.65}
            fill={accentColor}
            fillOpacity={0.05}
          />
          {innerHex.map((p, i) => (
            <Line
              key={`il${i}`}
              x1={p.x} y1={p.y} x2={CX} y2={CY}
              stroke={accentColor}
              strokeWidth="0.6"
              strokeOpacity={0.3}
            />
          ))}
          <Circle
            cx={CX} cy={CY} r={INNER_HEX_R}
            stroke={accentColor}
            strokeWidth="0.8"
            strokeOpacity={0.35}
            fill="none"
          />
          {innerHex.map((p, i) => (
            <Circle
              key={`iv${i}`}
              cx={p.x} cy={p.y} r={2}
              fill={accentColor}
              fillOpacity={0.75}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* ── LAYER 5: Pulsing core ────────────────────────────────────────── */}
      <Animated.View
        style={[{ position: "absolute", width: BASE, height: BASE }, pulseStyle]}
      >
        <Svg width={BASE} height={BASE} viewBox={`0 0 ${BASE} ${BASE}`}>
          {/* Outer glow halo */}
          <Circle
            cx={CX} cy={CY} r={CORE_R_OUTER + 6}
            fill={accentColor}
            fillOpacity={0.04}
          />
          {/* Main core ring */}
          <Circle
            cx={CX} cy={CY} r={CORE_R_OUTER}
            stroke={accentColor}
            strokeWidth="1.4"
            strokeOpacity={0.85}
            fill={accentColor}
            fillOpacity={0.1}
          />
          {/* Inner core */}
          <Circle
            cx={CX} cy={CY} r={CORE_R_INNER}
            fill={accentColor}
            fillOpacity={0.9}
          />
          {/* Bright white center */}
          <Circle
            cx={CX} cy={CY} r={CORE_R_DOT}
            fill="white"
            fillOpacity={0.95}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
