import type { ChangeEntry, RepairOrder, Stone } from "./types";

/** 库存与原石台账。已镶嵌在订单上的为原石；在库/已分配的为替石池 */
export const seedStones: Stone[] = [
  // ---- RO-3001 原石（已镶嵌）----
  { id: "ST-1001", kind: "钻石", shape: "圆形", carat: 1.02, sizeMm: 6.5, color: "D", clarity: "VVS1", cut: "3EX", status: "已镶嵌", holderOrderId: "RO-3001" },
  { id: "ST-1002", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "F", clarity: "VS1", cut: "EX", status: "已镶嵌", holderOrderId: "RO-3001" },
  { id: "ST-1003", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "F", clarity: "VS1", cut: "EX", status: "已镶嵌", holderOrderId: "RO-3001" },
  { id: "ST-1004", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.7, color: "G", clarity: "VS2", cut: "VG", status: "已镶嵌", holderOrderId: "RO-3001" },
  // ---- RO-3002 原石 ----
  { id: "ST-1101", kind: "钻石", shape: "椭圆", carat: 0.9, sizeMm: 6.2, color: "E", clarity: "VS1", cut: "EX", status: "已镶嵌", holderOrderId: "RO-3002" },
  { id: "ST-1102", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "F", clarity: "VS1", cut: "EX", status: "留库" },
  { id: "ST-1103", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "F", clarity: "VS1", cut: "VG", status: "已镶嵌", holderOrderId: "RO-3002" },
  // ---- RO-3003 原石 ----
  { id: "ST-1201", kind: "钻石", shape: "圆形", carat: 0.7, sizeMm: 5.7, color: "D", clarity: "VS2", cut: "3EX", status: "已镶嵌", holderOrderId: "RO-3003" },
  { id: "ST-1202", kind: "钻石", shape: "圆形", carat: 0.06, sizeMm: 2.4, color: "G", clarity: "VS2", cut: "VG", status: "已镶嵌", holderOrderId: "RO-3003" },
  { id: "ST-1203", kind: "钻石", shape: "圆形", carat: 0.06, sizeMm: 2.4, color: "G", clarity: "VS1", cut: "VG", status: "已镶嵌", holderOrderId: "RO-3003" },

  // ---- 替石池：在库 ----
  { id: "ST-2001", kind: "钻石", shape: "圆形", carat: 0.5, sizeMm: 5.1, color: "E", clarity: "VVS2", cut: "EX", status: "在库" },
  { id: "ST-2002", kind: "钻石", shape: "圆形", carat: 1.05, sizeMm: 6.6, color: "F", clarity: "VS1", cut: "EX", status: "在库" },
  { id: "ST-2003", kind: "钻石", shape: "圆形", carat: 1.0, sizeMm: 6.4, color: "D", clarity: "VVS1", cut: "3EX", status: "在库" },
  { id: "ST-2004", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "F", clarity: "VS1", cut: "VG", status: "在库" },
  { id: "ST-2005", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "G", clarity: "VS2", cut: "EX", status: "在库" },
  { id: "ST-2006", kind: "钻石", shape: "圆形", carat: 0.09, sizeMm: 2.9, color: "F", clarity: "VS1", cut: "EX", status: "在库" },
  { id: "ST-2007", kind: "钻石", shape: "椭圆", carat: 0.75, sizeMm: 6.0, color: "D", clarity: "VS1", cut: "EX", status: "在库" },
  { id: "ST-2008", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "F", clarity: "SI2", cut: "VG", status: "在库" },
  { id: "ST-2009", kind: "钻石", shape: "梨形", carat: 0.6, sizeMm: 6.8, color: "E", clarity: "VS2", cut: "EX", status: "在库" },
  { id: "ST-2010", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.7, color: "F", clarity: "VS1", cut: "EX", status: "在库" },
  { id: "ST-2014", kind: "钻石", shape: "圆形", carat: 0.7, sizeMm: 5.8, color: "E", clarity: "VS2", cut: "3EX", status: "在库" },
  { id: "ST-2015", kind: "钻石", shape: "圆形", carat: 0.06, sizeMm: 2.4, color: "G", clarity: "VS1", cut: "VG", status: "在库" },

  // ---- 替石池：已分给别的订单（占用）----
  { id: "ST-2011", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "F", clarity: "VS1", cut: "EX", status: "已分配", holderOrderId: "RO-3002" },
  { id: "ST-2012", kind: "钻石", shape: "圆形", carat: 1.02, sizeMm: 6.5, color: "D", clarity: "VVS2", cut: "3EX", status: "已分配", holderOrderId: "RO-3003" },
  { id: "ST-2013", kind: "钻石", shape: "圆形", carat: 0.08, sizeMm: 2.6, color: "E", clarity: "VS1", cut: "EX", status: "已分配", holderOrderId: "RO-3002" },
];

export const seedOrders: RepairOrder[] = [
  {
    id: "RO-3001",
    customer: "林女士",
    ringSku: "RG-018 六爪钻戒",
    receivedAt: "2026-09-24",
    positions: [
      { id: "P1", name: "主石位", originalStoneId: "ST-1001", removed: false },
      { id: "P2", name: "围石A1", originalStoneId: "ST-1002", removed: false },
      { id: "P3", name: "围石A2", originalStoneId: "ST-1003", removed: false },
      { id: "P4", name: "围石A3", originalStoneId: "ST-1004", removed: false },
    ],
  },
  {
    id: "RO-3002",
    customer: "陈先生",
    ringSku: "RG-102 椭圆女戒",
    receivedAt: "2026-09-25",
    positions: [
      { id: "P1", name: "主石位", originalStoneId: "ST-1101", removed: false },
      { id: "P2", name: "副石左", originalStoneId: "ST-1102", removed: true, disposition: "留库", newStoneId: "ST-2011" },
      { id: "P3", name: "副石右", originalStoneId: "ST-1103", removed: false },
    ],
  },
  {
    id: "RO-3003",
    customer: "王女士",
    ringSku: "RG-077 经典圆戒",
    receivedAt: "2026-09-26",
    positions: [
      { id: "P1", name: "主石位", originalStoneId: "ST-1201", removed: false },
      { id: "P2", name: "围石B1", originalStoneId: "ST-1202", removed: false },
      { id: "P3", name: "围石B2", originalStoneId: "ST-1203", removed: false },
    ],
  },
];

/** 历史批次：RO-3002 副石左已完成换石 */
export const seedChanges: ChangeEntry[] = [
  {
    batchNo: "PC-01",
    time: "2026-09-26 09:40",
    orderId: "RO-3002",
    positionName: "副石左",
    oldStoneId: "ST-1102",
    disposition: "留库",
    newStoneId: "ST-2011",
  },
];
