export type GemStatus = "在库" | "已分配" | "已镶嵌" | "报废";

export interface Gem {
  id: string;
  kind: string;
  shape: string;
  carat: number;
  sizeMm: number;
  color: string;
  clarity: string;
  cut: string;
  status: GemStatus;
  assignedOrderId: string | null;
  note?: string;
}

export type Disposition = "报废" | "留库";
export type SlotState = "待拆" | "空位" | "待镶嵌" | "已镶嵌";

export interface Slot {
  id: string;
  label: string;
  angle: number;
  targetSizeMm: number;
  toleranceMm: number;
  originalGem: Gem;
  defect?: string;
  disposition: Disposition | null;
  replacementGemId: string | null;
  state: SlotState;
}

export interface RepairOrder {
  id: string;
  customer: string;
  ringName: string;
  slots: Slot[];
}

export interface ChangeRecord {
  id: string;
  batchId: string;
  orderId: string;
  slotLabel: string;
  oldGemId: string;
  oldGemBrief: string;
  disposition: Disposition;
  newGemId: string;
  newGemBrief: string;
  time: string;
}

export interface RejectRecord {
  id: string;
  orderId: string;
  slotLabel: string;
  gemId: string;
  reason: string;
  originalBrief: string;
  time: string;
}

/** 各品类颜色等级，越靠前越好 */
export const COLOR_SCALES: Record<string, string[]> = {
  钻石: ["D", "E", "F", "G", "H", "I", "J"],
  蓝宝石: ["皇家蓝", "矢车菊", "浓蓝", "中蓝", "浅蓝"],
  红宝石: ["鸽血红", "深红", "正红", "浅红"],
  祖母绿: ["沃顿绿", "艳绿", "正绿", "浅绿"],
};

/** 净度等级，越靠前越好 */
export const CLARITY_SCALE = ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1"];

export const KINDS = Object.keys(COLOR_SCALES);

export function colorRank(kind: string, color: string): number {
  const scale = COLOR_SCALES[kind];
  if (!scale) return Number.MAX_SAFE_INTEGER;
  const i = scale.indexOf(color);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

export function clarityRank(clarity: string): number {
  const i = CLARITY_SCALE.indexOf(clarity);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

export function gemBrief(g: Gem): string {
  return `${g.kind} · ${g.shape} · ${g.sizeMm.toFixed(1)}mm · ${g.color} · ${g.clarity}`;
}
