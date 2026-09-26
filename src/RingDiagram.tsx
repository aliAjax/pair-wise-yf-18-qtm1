import type { Position, RepairOrder } from "./types";
import { positionState } from "./types";

interface Props {
  order: RepairOrder;
  selectedPosId: string | null;
  onSelect: (positionId: string) => void;
}

function shortName(name: string): string {
  return name.replace("主石位", "主").replace("围石", "").replace("副石", "");
}

function stateClass(p: Position): string {
  const s = positionState(p);
  if (s === "已换石") return "st-swapped";
  if (s === "空位待镶") return "st-empty";
  return "st-intact";
}

/** 戒指俯视示意：主石居中，围石/副石沿戒托分布，点击定位到对应镶嵌位卡片 */
export default function RingDiagram({ order, selectedPosId, onSelect }: Props) {
  const cx = 170;
  const cy = 158;
  const R = 108;
  const mains = order.positions.filter((p) => p.name.includes("主石"));
  const sats = order.positions.filter((p) => !p.name.includes("主石"));

  const renderNode = (p: Position, x: number, y: number, r: number) => (
    <g
      key={p.id}
      className={`ring-node ${stateClass(p)} ${selectedPosId === p.id ? "sel" : ""}`}
      onClick={() => onSelect(p.id)}
    >
      <title>
        {p.name} · {positionState(p)}
      </title>
      <circle cx={x} cy={y} r={r} />
      <text x={x} y={y} dominantBaseline="central" textAnchor="middle">
        {shortName(p.name)}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 340 316" className="ring-svg" role="img" aria-label="镶嵌位置示意图">
      {/* 戒托 */}
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e7cf9b" strokeWidth="15" />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#c8a24f" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={R - 15} fill="none" stroke="#eadfc4" strokeWidth="1" strokeDasharray="3 5" />
      {sats.map((p, i) => {
        const angle = (-90 + (360 / sats.length) * i) * (Math.PI / 180);
        return renderNode(p, cx + R * Math.cos(angle), cy + R * Math.sin(angle), 17);
      })}
      {mains.map((p) => renderNode(p, cx, cy, 30))}
    </svg>
  );
}
