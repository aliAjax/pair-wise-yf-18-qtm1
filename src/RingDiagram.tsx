import type { RepairOrder, SlotState } from "./types";

export const SLOT_STYLE: Record<SlotState, { fill: string; stroke: string }> = {
  待拆: { fill: "#fef3c7", stroke: "#d97706" },
  空位: { fill: "#f8fafc", stroke: "#94a3b8" },
  待镶嵌: { fill: "#ccfbf1", stroke: "#0f766e" },
  已镶嵌: { fill: "#dcfce7", stroke: "#15803d" },
};

interface Props {
  order: RepairOrder;
  selectedSlotId: string;
  onSelect: (slotId: string) => void;
}

export function RingDiagram({ order, selectedSlotId, onSelect }: Props) {
  const cx = 160;
  const cy = 160;
  const r = 96;
  return (
    <svg viewBox="0 0 320 320" className="ring-diagram" role="img" aria-label="镶嵌位示意图">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={16} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#cbd5e1" strokeWidth={1.5} />
      {order.slots.map((s) => {
        const rad = (s.angle * Math.PI) / 180;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        const lx = cx + (r + 40) * Math.cos(rad);
        const ly = cy + (r + 40) * Math.sin(rad);
        const st = SLOT_STYLE[s.state];
        const rr = s.label.includes("主石") ? 21 : 15;
        const selected = s.id === selectedSlotId;
        return (
          <g key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: "pointer" }}>
            {selected && (
              <circle cx={x} cy={y} r={rr + 6} fill="none" stroke="#172033" strokeWidth={1.5} strokeDasharray="3 3" />
            )}
            <circle
              cx={x}
              cy={y}
              r={rr}
              fill={st.fill}
              stroke={st.stroke}
              strokeWidth={2}
              strokeDasharray={s.state === "空位" ? "4 3" : undefined}
            />
            {s.state !== "空位" && (
              <path
                d={`M ${x} ${y - 7} L ${x + 6} ${y} L ${x} ${y + 7} L ${x - 6} ${y} Z`}
                fill="#ffffff"
                stroke={st.stroke}
                strokeWidth={1.2}
              />
            )}
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="#475569">
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
