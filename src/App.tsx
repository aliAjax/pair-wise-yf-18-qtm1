import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import { seedChanges, seedOrders, seedStones } from "./data";
import RingDiagram from "./RingDiagram";
import StonePicker from "./StonePicker";
import type { ChangeEntry, Disposition, Position, Rejection, RepairOrder, Stone } from "./types";
import { TOLERANCE_MM, positionState, validateReplacement } from "./types";

function formatTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function stoneLine(s: Stone): string {
  return `${s.kind}${s.shape} · ${s.sizeMm}mm · ${s.color}/${s.clarity} · ${s.carat}ct`;
}

function App() {
  const [stones, setStones] = useState<Stone[]>(seedStones);
  const [orders, setOrders] = useState<RepairOrder[]>(seedOrders);
  const [changes, setChanges] = useState<ChangeEntry[]>(seedChanges);
  const [rejections, setRejections] = useState<Rejection[]>([]);
  const [activeOrderId, setActiveOrderId] = useState(seedOrders[0].id);
  const [pickingPosId, setPickingPosId] = useState<string | null>(null);
  const [selectedPosId, setSelectedPosId] = useState<string | null>(null);
  const [logScope, setLogScope] = useState<"order" | "all">("order");
  const [toast, setToast] = useState<string | null>(null);
  const batchRef = useRef(seedChanges.length);

  const stoneById = useMemo(() => new Map(stones.map((s) => [s.id, s])), [stones]);
  const activeOrder = orders.find((o) => o.id === activeOrderId) ?? orders[0];
  const pickingPosition = activeOrder.positions.find((p) => p.id === pickingPosId) ?? null;
  const pickingOriginal = pickingPosition ? stoneById.get(pickingPosition.originalStoneId) : undefined;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- 汇总指标：随每次操作更新 ----
  const allPositions = orders.flatMap((o) => o.positions);
  const scrappedCount = stones.filter((s) => s.status === "报废").length;
  const keptCount = stones.filter((s) => s.status === "留库").length;
  const pendingCount = allPositions.filter((p) => p.removed && !p.newStoneId).length;
  const swappedCount = allPositions.filter((p) => p.newStoneId).length;

  function mutatePosition(orderId: string, positionId: string, fn: (p: Position) => Position) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id !== orderId ? o : { ...o, positions: o.positions.map((p) => (p.id === positionId ? fn(p) : p)) }
      )
    );
  }

  /** 拆下旧石：记作报废 / 留库，原位置随即空出 */
  function removeOriginal(positionId: string, disposition: Disposition) {
    const pos = activeOrder.positions.find((p) => p.id === positionId);
    if (!pos || pos.removed) return;
    setStones((prev) =>
      prev.map((s) =>
        s.id === pos.originalStoneId ? { ...s, status: disposition, holderOrderId: undefined } : s
      )
    );
    mutatePosition(activeOrder.id, positionId, (p) => ({ ...p, removed: true, disposition }));
    setToast(`${pos.name} 旧石 ${pos.originalStoneId} 已拆下并记作${disposition}，镶嵌位已空出`);
  }

  /** 撤销拆石：旧石回到原位置 */
  function undoRemoval(positionId: string) {
    const pos = activeOrder.positions.find((p) => p.id === positionId);
    if (!pos || !pos.removed || pos.newStoneId) return;
    setStones((prev) =>
      prev.map((s) =>
        s.id === pos.originalStoneId ? { ...s, status: "已镶嵌", holderOrderId: activeOrder.id } : s
      )
    );
    mutatePosition(activeOrder.id, positionId, (p) => ({ ...p, removed: false, disposition: undefined }));
    setToast(`${pos.name} 已撤销拆石，旧石 ${pos.originalStoneId} 回到原位置`);
  }

  /** 确认换石：校验尺寸公差与颜色、净度等级；不达标则拦截并留痕 */
  function confirmReplacement(candidateId: string) {
    if (!pickingPosition) return;
    const original = stoneById.get(pickingPosition.originalStoneId);
    const candidate = stoneById.get(candidateId);
    if (!original || !candidate) return;

    if (candidate.status !== "在库") {
      setToast(`${candidate.id} 已分给订单 ${candidate.holderOrderId}，不能重复分配`);
      return;
    }

    const reasons = validateReplacement(original, candidate);
    const now = formatTime(new Date());
    if (reasons.length > 0) {
      setRejections((prev) => [
        {
          id: `RJ-${String(prev.length + 1).padStart(2, "0")}`,
          time: now,
          orderId: activeOrder.id,
          positionName: pickingPosition.name,
          candidateId: candidate.id,
          reasons,
          original: { id: original.id, sizeMm: original.sizeMm, color: original.color, clarity: original.clarity },
        },
        ...prev,
      ]);
      setToast(`已拦截：${candidate.id} 不达标，原因与原石信息已留存到拦截记录`);
      return;
    }

    batchRef.current += 1;
    const batchNo = `PC-${String(batchRef.current).padStart(2, "0")}`;
    setStones((prev) =>
      prev.map((s) => (s.id === candidate.id ? { ...s, status: "已分配", holderOrderId: activeOrder.id } : s))
    );
    mutatePosition(activeOrder.id, pickingPosition.id, (p) => ({ ...p, newStoneId: candidate.id }));
    setChanges((prev) => [
      {
        batchNo,
        time: now,
        orderId: activeOrder.id,
        positionName: pickingPosition.name,
        oldStoneId: original.id,
        disposition: pickingPosition.disposition ?? "留库",
        newStoneId: candidate.id,
      },
      ...prev,
    ]);
    setPickingPosId(null);
    setSelectedPosId(pickingPosition.id);
    setToast(`批次 ${batchNo}：${pickingPosition.name} 换石完成，${original.id} → ${candidate.id}`);
  }

  /** 撤销换石：替石退回在库，位置回到空位待镶，批次记录同步移除 */
  function unassign(positionId: string) {
    const pos = activeOrder.positions.find((p) => p.id === positionId);
    if (!pos?.newStoneId) return;
    const newStoneId = pos.newStoneId;
    setStones((prev) =>
      prev.map((s) => (s.id === newStoneId ? { ...s, status: "在库", holderOrderId: undefined } : s))
    );
    mutatePosition(activeOrder.id, positionId, (p) => ({ ...p, newStoneId: undefined }));
    setChanges((prev) =>
      prev.filter((c) => !(c.orderId === activeOrder.id && c.positionName === pos.name && c.newStoneId === newStoneId))
    );
    setToast(`${pos.name} 已撤销换石，替石 ${newStoneId} 退回在库`);
  }

  function focusPosition(positionId: string) {
    setSelectedPosId(positionId);
    document.getElementById(`pos-${positionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function switchOrder(orderId: string) {
    setActiveOrderId(orderId);
    setPickingPosId(null);
    setSelectedPosId(null);
  }

  const visibleChanges = logScope === "all" ? changes : changes.filter((c) => c.orderId === activeOrder.id);

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62006 · 珠宝镶嵌工作室 · Port 62006</p>
        <h1>返修换石台</h1>
        <span>
          返修戒指拆下的旧石登记报废或留库，原位置随即空出；按尺寸、颜色、净度筛选替石并分配到镶嵌位，
          已分给别的订单的替石会被挡住并显示占用编号。尺寸差超出 ±{TOLERANCE_MM}mm 公差，或颜色、净度低于原石的
          替换不能确认，原因与原石信息自动留痕。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>报废旧石</small>
          <strong>{scrappedCount}</strong>
        </article>
        <article>
          <small>留库旧石</small>
          <strong>{keptCount}</strong>
        </article>
        <article>
          <small>待镶嵌空位</small>
          <strong>{pendingCount}</strong>
        </article>
        <article>
          <small>已完成换石</small>
          <strong>{swappedCount}</strong>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>返修订单</h2>
          <div className="order-list">
            {orders.map((o) => {
              const empty = o.positions.filter((p) => p.removed && !p.newStoneId).length;
              const done = o.positions.filter((p) => p.newStoneId).length;
              return (
                <button
                  key={o.id}
                  className={`order-item ${o.id === activeOrder.id ? "active" : ""}`}
                  onClick={() => switchOrder(o.id)}
                >
                  <b>{o.id}</b>
                  <span>
                    {o.customer} · {o.ringSku}
                  </span>
                  <small>
                    已换 {done}/{o.positions.length} 位{empty > 0 ? ` · 空位 ${empty}` : ""} · 收货 {o.receivedAt}
                  </small>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel">
          <div className="heading">
            <div>
              <p>当前工单</p>
              <h2>
                {activeOrder.id} · {activeOrder.customer}
              </h2>
            </div>
            <span className="order-meta">
              {activeOrder.ringSku} · 收货 {activeOrder.receivedAt}
            </span>
          </div>

          <div className="ring-wrap">
            <RingDiagram order={activeOrder} selectedPosId={selectedPosId} onSelect={focusPosition} />
            <ul className="legend">
              <li>
                <i className="dot st-intact" /> 原石在位
              </li>
              <li>
                <i className="dot st-empty" /> 空位待镶
              </li>
              <li>
                <i className="dot st-swapped" /> 已换石
              </li>
            </ul>
          </div>

          <div className="pos-grid">
            {activeOrder.positions.map((p) => {
              const original = stoneById.get(p.originalStoneId);
              const newStone = p.newStoneId ? stoneById.get(p.newStoneId) : undefined;
              const state = positionState(p);
              if (!original) return null;
              return (
                <article
                  key={p.id}
                  id={`pos-${p.id}`}
                  className={`pos-card ${selectedPosId === p.id ? "active" : ""}`}
                  onClick={() => setSelectedPosId(p.id)}
                >
                  <div className="pos-head">
                    <h3>{p.name}</h3>
                    <span
                      className={`badge ${
                        state === "已换石" ? "b-green" : state === "空位待镶" ? "b-amber" : "b-purple"
                      }`}
                    >
                      {state}
                    </span>
                  </div>
                  <p className="stone-line">
                    原石 {original.id} · {stoneLine(original)}
                  </p>
                  {p.removed && p.disposition && (
                    <p className="disp">旧石去向：{p.disposition} · 位置已空出</p>
                  )}
                  {newStone && (
                    <p className="stone-line new">
                      新石 {newStone.id} · {stoneLine(newStone)}
                    </p>
                  )}
                  <div className="pos-actions">
                    {!p.removed && (
                      <>
                        <button onClick={() => removeOriginal(p.id, "报废")}>拆石 · 报废</button>
                        <button onClick={() => removeOriginal(p.id, "留库")}>拆石 · 留库</button>
                      </>
                    )}
                    {p.removed && !p.newStoneId && (
                      <>
                        <button
                          className="primary"
                          onClick={() => {
                            setPickingPosId(p.id);
                            setSelectedPosId(p.id);
                          }}
                        >
                          选择替石
                        </button>
                        <button onClick={() => undoRemoval(p.id)}>撤销拆石</button>
                      </>
                    )}
                    {p.newStoneId && <button onClick={() => unassign(p.id)}>撤销换石</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      {pickingPosition && pickingOriginal && (
        <section className="panel picker-panel">
          <StonePicker
            key={`${activeOrder.id}-${pickingPosition.id}`}
            order={activeOrder}
            position={pickingPosition}
            original={pickingOriginal}
            stones={stones}
            onClose={() => setPickingPosId(null)}
            onConfirm={confirmReplacement}
          />
        </section>
      )}

      <section className="bottom-grid">
        <div className="panel">
          <div className="heading">
            <div>
              <p>批次留痕</p>
              <h2>新旧宝石变更记录</h2>
            </div>
            <div className="chips">
              <button className={logScope === "order" ? "on" : ""} onClick={() => setLogScope("order")}>
                当前订单
              </button>
              <button className={logScope === "all" ? "on" : ""} onClick={() => setLogScope("all")}>
                全部订单
              </button>
            </div>
          </div>
          {visibleChanges.length === 0 ? (
            <p className="empty">暂无变更记录，完成换石后按批次显示</p>
          ) : (
            <table className="cand">
              <thead>
                <tr>
                  <th>批次号</th>
                  <th>时间</th>
                  <th>订单</th>
                  <th>镶嵌位</th>
                  <th>旧宝石 → 去向</th>
                  <th>新宝石</th>
                </tr>
              </thead>
              <tbody>
                {visibleChanges.map((c) => (
                  <tr key={c.batchNo}>
                    <td>{c.batchNo}</td>
                    <td>{c.time}</td>
                    <td>{c.orderId}</td>
                    <td>{c.positionName}</td>
                    <td>
                      {c.oldStoneId} →{" "}
                      <span className={`badge ${c.disposition === "报废" ? "b-red" : "b-green}"}`}>
                        {c.disposition}
                      </span>
                    </td>
                    <td>{c.newStoneId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="panel">
          <div className="heading">
            <div>
              <p>不达标拦截</p>
              <h2>拦截记录</h2>
            </div>
            <span className="badge b-red">{rejections.length} 条</span>
          </div>
          {rejections.length === 0 ? (
            <p className="empty">暂无拦截。尺寸超公差或颜色、净度低于原石的确认会记录在这里</p>
          ) : (
            <table className="cand">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>订单 / 镶嵌位</th>
                  <th>候选替石</th>
                  <th>拦截原因</th>
                  <th>原石信息</th>
                </tr>
              </thead>
              <tbody>
                {rejections.map((r) => (
                  <tr key={r.id}>
                    <td>{r.time}</td>
                    <td>
                      {r.orderId} / {r.positionName}
                    </td>
                    <td>{r.candidateId}</td>
                    <td>
                      <ul className="reasons">
                        {r.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      {r.original.id} · {r.original.sizeMm}mm · {r.original.color} · {r.original.clarity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
