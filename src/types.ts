export type Disposition = "报废" | "留库";
export type StoneStatus = "在库" | "已分配" | "已镶嵌" | "报废" | "留库";

export interface Stone {
  id: string; // 宝石编号
  kind: string; // 种类
  shape: string; // 形状
  carat: number; // 克拉重量
  sizeMm: number; // 尺寸（mm，直径或长边）
  color: string; // 颜色等级
  clarity: string; // 净度等级
  cut: string; // 切工
  status: StoneStatus;
  holderOrderId?: string; // 已分配 / 已镶嵌时所在订单编号（占用编号）
}

export interface Position {
  id: string;
  name: string; // 镶嵌位名称：主石位 / 围石A1 / 副石左 …
  originalStoneId: string; // 原石编号（拆下后仍保留，用于换石校验）
  removed: boolean; // 旧石是否已拆下（拆下后位置空出）
  disposition?: Disposition; // 旧石去向
  newStoneId?: string; // 已分配的替石
}

export interface RepairOrder {
  id: string; // 返修订单号
  customer: string;
  ringSku: string; // 戒指款号
  receivedAt: string; // 收货日期
  positions: Position[];
}

export interface ChangeEntry {
  batchNo: string; // 批次号
  time: string;
  orderId: string;
  positionName: string;
  oldStoneId: string;
  disposition: Disposition; // 旧石去向
  newStoneId: string;
}

export interface Rejection {
  id: string;
  time: string;
  orderId: string;
  positionName: string;
  candidateId: string; // 被拦截的替石编号
  reasons: string[]; // 拦截原因
  original: { id: string; sizeMm: number; color: string; clarity: string }; // 原石信息留痕
}

/** 尺寸公差（mm）：替石与原石尺寸差不得超过该值 */
export const TOLERANCE_MM = 0.2;

export const COLOR_GRADES = ["D", "E", "F", "G", "H", "I", "J"] as const;
export const CLARITY_GRADES = [
  "FL",
  "IF",
  "VVS1",
  "VVS2",
  "VS1",
  "VS2",
  "SI1",
  "SI2",
  "I1",
] as const;

export function colorRank(color: string): number {
  const i = COLOR_GRADES.indexOf(color as (typeof COLOR_GRADES)[number]);
  return i === -1 ? 0 : COLOR_GRADES.length - i;
}

export function clarityRank(clarity: string): number {
  const i = CLARITY_GRADES.indexOf(clarity as (typeof CLARITY_GRADES)[number]);
  return i === -1 ? 0 : CLARITY_GRADES.length - i;
}

/** 换石校验：尺寸差超公差，或颜色、净度低于原石 → 返回拦截原因列表（空数组 = 通过） */
export function validateReplacement(original: Stone, candidate: Stone): string[] {
  const reasons: string[] = [];
  const diff = Math.abs(candidate.sizeMm - original.sizeMm);
  if (diff > TOLERANCE_MM + 1e-9) {
    reasons.push(
      `尺寸差 ${diff.toFixed(2)}mm 超出公差 ±${TOLERANCE_MM}mm（原石 ${original.sizeMm}mm / 替石 ${candidate.sizeMm}mm）`
    );
  }
  if (colorRank(candidate.color) < colorRank(original.color)) {
    reasons.push(`颜色 ${candidate.color} 低于原石 ${original.color}`);
  }
  if (clarityRank(candidate.clarity) < clarityRank(original.clarity)) {
    reasons.push(`净度 ${candidate.clarity} 低于原石 ${original.clarity}`);
  }
  return reasons;
}

export function positionState(p: Position): "原石在位" | "空位待镶" | "已换石" {
  if (p.newStoneId) return "已换石";
  if (p.removed) return "空位待镶";
  return "原石在位";
}
