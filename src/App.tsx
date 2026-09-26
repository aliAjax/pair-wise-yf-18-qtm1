import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  CLARITY_SCALE,
  COLOR_SCALES,
  KINDS,
  clarityRank,
  colorRank,
  gemBrief,
} from "./types";
import type { ChangeRecord, Disposition, Gem, RejectRecord, RepairOrder, Slot } from "./types";
import { seedGems, seedOrders } from "./data";
import { RingDiagram, SLOT_STYLE } from "./RingDiagram";

const now = () => new Date().toLocaleString("zh-CN", { hour12: false });

const sizeDiff = (g: Gem, s: Slot) =>
  Math.round(Math.abs(g.sizeMm - s.targetSizeMm) * 100) / 100;

/** 换石校验：返回 null 表示可确认，否则返回拦截原因 */
function validateGem(s: Slot, g: Gem): string | null {
  if (g.status === "已分配") return `替石已分给订单 ${g.assignedOrderId}（占用）`;
  if (g.status !== "在库") return `替石状态为${g.status}，不可用`;
  if (g.kind !== s.originalGem.kind)
    return `种类不符：替石为${g.kind}，原石为${s.originalGem.kind}`;
  const diff = sizeDiff(g, s);
  if (diff > s.toleranceMm)
    return `尺寸差 ${diff.toFixed(2)}mm 超出公差 ±${s.toleranceMm.toFixed(2)}mm`;
  if (colorRank(g.kind, g.color) > colorRank(s.originalGem.kind, s.originalGem.color))
    return `颜色 ${g.color} 低于原石 ${s.originalGem.color}`;
  if (clarityRank(g.clarity) > clarityRank(s.originalGem.clarity))
    return `净度 ${g.clarity} 低于原石 ${s.originalGem.clarity}`;
  return null;
}

function buildChecks(s: Slot, g: Gem) {
  const diff = sizeDiff(g, s);
  const kindOk = g.kind === s.originalGem.kind;
  return [
    {
      ok: g.status === "在库",
      label: "占用",
      detail:
        g.status === "在库"
          ? "在库可分配"
          : g.status === "已分配"
            ? `已分给订单 ${g.assignedOrderId}`
            : g.status,
    },
    { ok: kindOk, label: "种类", detail: `${g.kind} / 原石 ${s.originalGem.kind}` },
    {
      ok: diff <= s.toleranceMm,
      label: "尺寸",
      detail: `差 ${diff.toFixed(2)}mm / 公差 ±${s.toleranceMm.toFixed(2)}mm`,
    },
    {
      ok:
        kindOk &&
        colorRank(g.kind, g.color) <= colorRank(s.originalGem.kind, s.originalGem.color),
      label: "颜色",
      detail: `${g.color} / 原石 ${s.originalGem.color}`,
    },
    {
      ok: clarityRank(g.clarity) <= clarityRank(s.originalGem.clarity),
      label: "净度",
      detail: `${g.clarity} / 原石 ${s.originalGem.clarity}`,
    },
  ];
}

function App() {
  const [orders, setOrders] = useState<RepairOrder[]>(seedOrders);
  const [gems, setGems] = useState<Gem[]>(seedGems);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [rejects, setRejects] = useState<RejectRecord[]>([]);
  const [batchSeq, setBatchSeq] = useState(0);
  const [currentOrderId, setCurrentOrderId] = useState(seedOrders[0].id);
  const [selectedSlotId, setSelectedSlotId] = useState(seedOrders[0].slots[0].id);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [kindFilter, setKindFilter] = useState("全部");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [colorSel, setColorSel] = useState<string[]>([]);
  const [claritySel, setClaritySel] = useState<string[]>([]);
  const [onlyStock, setOnlyStock] = useState(false);
  const [recordOrder, setRecordOrder] = useState("全部");

  const seqRef = useRef(1);
  const nextId = (p: string) => `${p}-${String(seqRef.current++).padStart(3, "0")}`;

  const order = orders.find((o) => o.id === currentOrderId) ?? orders[0];
  const slot = order.slots.find((s) => s.id === selectedSlotId) ?? order.slots[0];
  const selectedGem = gems.find((g) => g.id === selectedGemId) ?? null;
  const replacement = slot.replacementGemId
    ? (gems.find((g) => g.id === slot.replacementGemId) ?? null)
    : null;
  const origKind = slot.originalGem.kind;

  // 切换镶嵌位时，替石筛选自动按原石种类过滤
  useEffect(() => {
    setKindFilter(origKind);
    setColorSel([]);
  }, [origKind, selectedSlotId]);

  const allSlots = orders.flatMap((o) => o.slots);
  const scrapCount = allSlots.filter((s) => s.disposition === "报废").length;
  const stockCount = allSlots.filter((s) => s.disposition === "留库").length;
  const pendingCount = allSlots.filter((s) => s.state === "待镶嵌").length;
  const pendingInOrder = order.slots.filter((s) => s.state === "待镶嵌").length;

  const colorOptions = useMemo(() => {
    if (kindFilter !== "全部") return COLOR_SCALES[kindFilter] ?? [];
    return Array.from(new Set(Object.values(COLOR_SCALES).flat()));
  }, [kindFilter]);

  const filteredGems = gems.filter((g) => {
    if (g.status === "报废" || g.status === "已镶嵌") return false;
    if (onlyStock && g.status !== "在库") return false;
    if (kindFilter !== "全部" && g.kind !== kindFilter) return false;
    const min = parseFloat(sizeMin);
    const max = parseFloat(sizeMax);
    if (!Number.isNaN(min) && g.sizeMm < min) return false;
    if (!Number.isNaN(max) && g.sizeMm > max) return false;
    if (colorSel.length && !colorSel.includes(g.color)) return false;
    if (claritySel.length && !claritySel.includes(g.clarity)) return false;
    return true;
  });

  const visibleChanges =
    recordOrder === "全部" ? changes : changes.filter((c) => c.orderId === recordOrder);

  const toggle = (list: string[], v: string, set: (x: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /** 旧宝石处置：报废或留库，原位置随即空出；留库旧石回到替石库 */
  const disposeOld = (disposition: Disposition) => {
    if (slot.state !== "待拆") return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id !== order.id
          ? o
          : {
              ...o,
              slots: o.slots.map((s) =>
                s.id !== slot.id ? s : { ...s, disposition, state: "空位" as const }
              ),
            }
      )
    );
    if (disposition === "留库") {
      setGems((prev) => [
        ...prev,
        {
          ...slot.originalGem,
          status: "在库",
          assignedOrderId: null,
          note: `返修留库 · 来自 ${order.id} ${slot.label}`,
        },
      ]);
    }
    setMessage({
      type: "ok",
      text: `${order.id} ${slot.label} 旧宝石 ${slot.originalGem.id} 已记${disposition}，原位置已空出`,
    });
  };

  /** 确认换石：校验不通过则拦截并保留原因与原石信息 */
  const confirmAssign = () => {
    if (!selectedGem || slot.state !== "空位") return;
    const reason = validateGem(slot, selectedGem);
    if (reason) {
      setRejects((prev) => [
        {
          id: nextId("RJ"),
          orderId: order.id,
          slotLabel: slot.label,
          gemId: selectedGem.id,
          reason,
          originalBrief: `${slot.originalGem.id} ${gemBrief(slot.originalGem)}`,
          time: now(),
        },
        ...prev,
      ]);
      setMessage({ type: "err", text: `不能确认：${reason}。已保留拦截记录与原石信息。` });
      return;
    }
    setGems((prev) =>
      prev.map((g) =>
        g.id === selectedGem.id ? { ...g, status: "已分配", assignedOrderId: order.id } : g
      )
    );
    setOrders((prev) =>
      prev.map((o) =>
        o.id !== order.id
          ? o
          : {
              ...o,
              slots: o.slots.map((s) =>
                s.id !== slot.id
                  ? s
                  : { ...s, state: "待镶嵌" as const, replacementGemId: selectedGem.id }
              ),
            }
      )
    );
    setMessage({
      type: "ok",
      text: `替石 ${selectedGem.id} 已分配到 ${order.id} ${slot.label}，待镶嵌`,
    });
  };

  const unassign = () => {
    if (slot.state !== "待镶嵌" || !slot.replacementGemId) return;
    const gid = slot.replacementGemId;
    setGems((prev) =>
      prev.map((g) => (g.id === gid ? { ...g, status: "在库", assignedOrderId: null } : g))
    );
    setOrders((prev) =>
      prev.map((o) =>
        o.id !== order.id
          ? o
          : {
              ...o,
              slots: o.slots.map((s) =>
                s.id !== slot.id
                  ? s
                  : { ...s, state: "空位" as const, replacementGemId: null }
              ),
            }
      )
    );
    setMessage({ type: "ok", text: `${slot.label} 已取消分配，替石 ${gid} 退回在库` });
  };

  /** 结算批次：本单待镶嵌位完成换石，生成新旧宝石变更记录 */
  const settleBatch = () => {
    const pendings = order.slots.filter((s) => s.state === "待镶嵌");
    if (!pendings.length) return;
    const batchId = `PC-${String(batchSeq + 1).padStart(2, "0")}`;
    const time = now();
    const records: ChangeRecord[] = pendings.map((s) => {
      const ng = gems.find((g) => g.id === s.replacementGemId)!;
      return {
        id: nextId("CHG"),
        batchId,
        orderId: order.id,
        slotLabel: s.label,
        oldGemId: s.originalGem.id,
        oldGemBrief: gemBrief(s.originalGem),
        disposition: s.disposition ?? "报废",
        newGemId: ng.id,
        newGemBrief: gemBrief(ng),
        time,
      };
    });
    const ids = new Set(pendings.map((p) => p.replacementGemId));
    setChanges((prev) => [...records, ...prev]);
    setGems((prev) => prev.map((g) => (ids.has(g.id) ? { ...g, status: "已镶嵌" } : g)));
    setOrders((prev) =>
      prev.map((o) =>
        o.id !== order.id
          ? o
          : {
              ...o,
              slots: o.slots.map((s) =>
                s.state === "待镶嵌" ? { ...s, state: "已镶嵌" as const } : s
              ),
            }
      )
    );
    setBatchSeq((n) => n + 1);
    setRecordOrder(order.id);
    setMessage({
      type: "ok",
      text: `批次 ${batchId} 已结算：${pendings.length} 个镶嵌位完成换石，新旧宝石变更记录已生成`,
    });
  };

  /** 一键按原石匹配筛选条件 */
  const matchOriginal = () => {
    const og = slot.originalGem;
    setKindFilter(og.kind);
    setSizeMin((slot.targetSizeMm - slot.toleranceMm).toFixed(2));
    setSizeMax((slot.targetSizeMm + slot.toleranceMm).toFixed(2));
    setColorSel(COLOR_SCALES[og.kind].slice(0, colorRank(og.kind, og.color) + 1));
    setClaritySel(CLARITY_SCALE.slice(0, clarityRank(og.clarity) + 1));
    setOnlyStock(false);
  };

  const resetFilters = () => {
    setKindFilter("全部");
    setSizeMin("");
    setSizeMax("");
    setColorSel([]);
    setClaritySel([]);
    setOnlyStock(false);
  };

  const checks = selectedGem && slot.state === "空位" ? buildChecks(slot, selectedGem) : null;

  const slotBrief = (s: Slot) => {
    if (s.state === "待拆") return `原石 ${s.originalGem.id}`;
    if (s.state === "空位") return `旧石已${s.disposition} · 待选替石`;
    return `替石 ${s.replacementGemId}`;
  };

  return (
    <main className="app">
      <header className="hero">
        <div className="hero-top">
          <div>
            <p>hxyfront-62006 · 珠宝镶嵌工作室</p>
            <h1>返修换石台</h1>
            <span>
              按尺寸、颜色、净度筛选替石并分配到戒指镶嵌位；旧宝石登记报废或留库后原位随即空出；
              尺寸超差或颜色、净度低于原石的替换一律拦截留痕，批次结算后生成新旧宝石变更记录。
            </span>
          </div>
          <button className="primary settle" onClick={settleBatch} disabled={!pendingInOrder}>
            结算批次{pendingInOrder ? ` · 待镶嵌 ${pendingInOrder}` : ""}
          </button>
        </div>
        <div className="order-tabs">
          {orders.map((o) => {
            const done = o.slots.filter(
              (s) => s.state === "待镶嵌" || s.state === "已镶嵌"
            ).length;
            return (
              <button
                key={o.id}
                className={`tab ${o.id === currentOrderId ? "active" : ""}`}
                onClick={() => {
                  setCurrentOrderId(o.id);
                  setSelectedSlotId(o.slots[0].id);
                }}
              >
                <b>{o.id}</b>
                <span>
                  {o.customer} · {o.ringName}
                </span>
                <em>
                  换石 {done}/{o.slots.length}
                </em>
              </button>
            );
          })}
        </div>
      </header>

      <section className="metrics">
        <article className="m-scrap">
          <small>报废（旧宝石）</small>
          <strong>{scrapCount}</strong>
        </article>
        <article className="m-stock">
          <small>留库（旧宝石）</small>
          <strong>{stockCount}</strong>
        </article>
        <article className="m-pending">
          <small>待镶嵌</small>
          <strong>{pendingCount}</strong>
        </article>
        <article className="m-reject">
          <small>拦截记录</small>
          <strong>{rejects.length}</strong>
        </article>
      </section>

      {message && <div className={`banner ${message.type}`}>{message.text}</div>}

      <section className="workspace3">
        <aside className="panel">
          <div className="heading">
            <div>
              <p>RING MAP</p>
              <h2>镶嵌位示意图</h2>
            </div>
          </div>
          <RingDiagram order={order} selectedSlotId={slot.id} onSelect={setSelectedSlotId} />
          <div className="legend">
            {Object.entries(SLOT_STYLE).map(([k, v]) => (
              <span key={k}>
                <i style={{ background: v.stroke }} />
                {k}
              </span>
            ))}
          </div>
          <div className="slot-list">
            {order.slots.map((s) => (
              <button
                key={s.id}
                className={`slot-row ${s.id === slot.id ? "active" : ""}`}
                onClick={() => setSelectedSlotId(s.id)}
              >
                <span className="dot" style={{ background: SLOT_STYLE[s.state].stroke }} />
                <span className="slot-name">{s.label}</span>
                <span className="slot-brief">{slotBrief(s)}</span>
                <span
                  className="chip"
                  style={{
                    color: SLOT_STYLE[s.state].stroke,
                    background: SLOT_STYLE[s.state].fill,
                    borderColor: SLOT_STYLE[s.state].stroke,
                  }}
                >
                  {s.state}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <div className="heading">
            <div>
              <p>REPLACEMENT</p>
              <h2>替石筛选</h2>
            </div>
            <div className="heading-actions">
              <button onClick={matchOriginal}>匹配原石</button>
              <button onClick={resetFilters}>重置</button>
            </div>
          </div>
          <div className="filters">
            <div className="filter-row">
              <span>种类</span>
              <select
                value={kindFilter}
                onChange={(e) => {
                  setKindFilter(e.target.value);
                  setColorSel([]);
                }}
              >
                <option value="全部">全部</option>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={onlyStock}
                  onChange={(e) => setOnlyStock(e.target.checked)}
                />
                仅看在库
              </label>
            </div>
            <div className="filter-row">
              <span>尺寸 mm</span>
              <div className="size-inputs">
                <input
                  value={sizeMin}
                  onChange={(e) => setSizeMin(e.target.value)}
                  placeholder="最小"
                  inputMode="decimal"
                />
                ~
                <input
                  value={sizeMax}
                  onChange={(e) => setSizeMax(e.target.value)}
                  placeholder="最大"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="filter-row">
              <span>颜色</span>
              <div className="chips">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    className={`chipbtn ${colorSel.includes(c) ? "on" : ""}`}
                    onClick={() => toggle(colorSel, c, setColorSel)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-row">
              <span>净度</span>
              <div className="chips">
                {CLARITY_SCALE.map((c) => (
                  <button
                    key={c}
                    className={`chipbtn ${claritySel.includes(c) ? "on" : ""}`}
                    onClick={() => toggle(claritySel, c, setClaritySel)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="stone-list">
            {filteredGems.length === 0 && <div className="empty">无符合筛选条件的替石</div>}
            {filteredGems.map((g) => {
              const held = g.status === "已分配";
              const mine = held && g.assignedOrderId === currentOrderId;
              return (
                <button
                  key={g.id}
                  className={`stone-row ${g.id === selectedGemId ? "active" : ""} ${held ? "blocked" : ""}`}
                  onClick={() => setSelectedGemId(g.id)}
                >
                  <span className="gid">{g.id}</span>
                  <span className="ginfo">
                    <b>
                      {g.kind} · {g.shape} · {g.carat.toFixed(2)}ct
                    </b>
                    <br />
                    {g.sizeMm.toFixed(1)}mm · {g.color} · {g.clarity} · 切工{g.cut}
                    {g.note ? ` · ${g.note}` : ""}
                  </span>
                  {held ? (
                    <span className={`badge ${mine ? "mine" : "held"}`}>
                      {mine ? `本单 ${g.assignedOrderId}` : `占用 ${g.assignedOrderId}`}
                    </span>
                  ) : (
                    <span className="badge stock">在库</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel action-panel">
          <div className="heading">
            <div>
              <p>WORKBENCH</p>
              <h2>操作台</h2>
            </div>
            <span
              className="chip"
              style={{
                color: SLOT_STYLE[slot.state].stroke,
                background: SLOT_STYLE[slot.state].fill,
                borderColor: SLOT_STYLE[slot.state].stroke,
              }}
            >
              {slot.state}
            </span>
          </div>

          <div className="gem-card">
            <b>
              {order.id} · {slot.label} · 原石信息
            </b>
            <div className="kv">
              <span>编号</span>
              <b>{slot.originalGem.id}</b>
            </div>
            <div className="kv">
              <span>种类形状</span>
              <b>
                {slot.originalGem.kind} · {slot.originalGem.shape} ·{" "}
                {slot.originalGem.carat.toFixed(2)}ct
              </b>
            </div>
            <div className="kv">
              <span>尺寸</span>
              <b>
                {slot.originalGem.sizeMm.toFixed(1)}mm（目标 {slot.targetSizeMm.toFixed(1)} ±{" "}
                {slot.toleranceMm.toFixed(2)}）
              </b>
            </div>
            <div className="kv">
              <span>颜色/净度</span>
              <b>
                {slot.originalGem.color} / {slot.originalGem.clarity}
              </b>
            </div>
            {slot.defect && (
              <div className="kv">
                <span>缺陷备注</span>
                <b className="warn-text">{slot.defect}</b>
              </div>
            )}
            {slot.disposition && (
              <div className="kv">
                <span>旧石处置</span>
                <b>
                  <span className={slot.disposition === "报废" ? "tag-scrap" : "tag-stock"}>
                    {slot.disposition}
                  </span>
                </b>
              </div>
            )}
          </div>

          {slot.state === "待拆" && (
            <>
              <p className="hint">旧宝石仍在位。先登记处置方式，拆下后原位置随即空出：</p>
              <div className="actions">
                <button className="btn-danger" onClick={() => disposeOld("报废")}>
                  记报废 · 拆下
                </button>
                <button className="btn-purple" onClick={() => disposeOld("留库")}>
                  记留库 · 拆下
                </button>
              </div>
            </>
          )}

          {slot.state === "空位" && (
            <>
              <p className="hint">位置已空出。从替石列表选择一颗替石，确认前请核对校验项：</p>
              {selectedGem ? (
                <div className="gem-card">
                  <b>
                    替石 {selectedGem.id}
                    {selectedGem.status === "已分配"
                      ? `（已分给 ${selectedGem.assignedOrderId}）`
                      : ""}
                  </b>
                  <div className="kv">
                    <span>规格</span>
                    <b>
                      {gemBrief(selectedGem)} · {selectedGem.carat.toFixed(2)}ct
                    </b>
                  </div>
                </div>
              ) : (
                <div className="empty">未选择替石</div>
              )}
              {checks && (
                <ul className="checks">
                  {checks.map((c) => (
                    <li key={c.label} className={c.ok ? "ok" : "no"}>
                      {c.ok ? "✓" : "✗"} {c.label}：{c.detail}
                    </li>
                  ))}
                </ul>
              )}
              <div className="actions">
                <button className="primary" disabled={!selectedGem} onClick={confirmAssign}>
                  确认换石
                </button>
              </div>
            </>
          )}

          {slot.state === "待镶嵌" && replacement && (
            <>
              <div className="gem-card">
                <b>待镶嵌替石 {replacement.id}</b>
                <div className="kv">
                  <span>规格</span>
                  <b>
                    {gemBrief(replacement)} · {replacement.carat.toFixed(2)}ct
                  </b>
                </div>
              </div>
              <p className="hint">结算批次后，该位完成换石并生成新旧宝石变更记录。</p>
              <div className="actions">
                <button onClick={unassign}>取消分配 · 退回在库</button>
              </div>
            </>
          )}

          {slot.state === "已镶嵌" && replacement && (
            <div className="gem-card">
              <b>已镶嵌 {replacement.id}</b>
              <div className="kv">
                <span>规格</span>
                <b>
                  {gemBrief(replacement)} · {replacement.carat.toFixed(2)}ct
                </b>
              </div>
              <div className="kv">
                <span>状态</span>
                <b>批次已结算，详见下方变更记录</b>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section className="records-grid">
        <div className="panel">
          <div className="heading">
            <div>
              <p>BATCH LOG</p>
              <h2>新旧宝石变更记录</h2>
            </div>
            <select value={recordOrder} onChange={(e) => setRecordOrder(e.target.value)}>
              <option value="全部">全部订单</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.id}
                </option>
              ))}
            </select>
          </div>
          {visibleChanges.length === 0 ? (
            <div className="empty">暂无变更记录，结算批次后生成</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>批次</th>
                    <th>订单</th>
                    <th>镶嵌位</th>
                    <th>旧宝石</th>
                    <th>处置</th>
                    <th>新宝石</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleChanges.map((r) => (
                    <tr key={r.id}>
                      <td>{r.batchId}</td>
                      <td>{r.orderId}</td>
                      <td>{r.slotLabel}</td>
                      <td>
                        <b>{r.oldGemId}</b>
                        <br />
                        <span className="muted">{r.oldGemBrief}</span>
                      </td>
                      <td>
                        <span className={r.disposition === "报废" ? "tag-scrap" : "tag-stock"}>
                          {r.disposition}
                        </span>
                      </td>
                      <td>
                        <b>{r.newGemId}</b>
                        <br />
                        <span className="muted">{r.newGemBrief}</span>
                      </td>
                      <td className="muted">{r.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="heading">
            <div>
              <p>BLOCKED</p>
              <h2>拦截记录</h2>
            </div>
          </div>
          {rejects.length === 0 ? (
            <div className="empty">暂无拦截记录</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>订单 / 镶嵌位</th>
                    <th>替石</th>
                    <th>拦截原因</th>
                    <th>原石信息</th>
                  </tr>
                </thead>
                <tbody>
                  {rejects.map((r) => (
                    <tr key={r.id}>
                      <td className="muted">{r.time}</td>
                      <td>
                        {r.orderId}
                        <br />
                        <span className="muted">{r.slotLabel}</span>
                      </td>
                      <td>
                        <b>{r.gemId}</b>
                      </td>
                      <td className="reason">{r.reason}</td>
                      <td className="muted">{r.originalBrief}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
