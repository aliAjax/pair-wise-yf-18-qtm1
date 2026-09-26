import { useMemo, useState } from "react";
import type { Position, RepairOrder, Stone } from "./types";
import {
  CLARITY_GRADES,
  COLOR_GRADES,
  TOLERANCE_MM,
  clarityRank,
  colorRank,
  validateReplacement,
} from "./types";

interface Props {
  order: RepairOrder;
  position: Position;
  original: Stone;
  stones: Stone[];
  onClose: () => void;
  onConfirm: (stoneId: string) => void;
}

/** 替石筛选台：按尺寸 / 颜色 / 净度过滤库存，占用石挡住并显示占用编号，确认前做达标预检 */
export default function StonePicker({ order, position, original, stones, onClose, onConfirm }: Props) {
  const [sizeMin, setSizeMin] = useState((original.sizeMm - TOLERANCE_MM).toFixed(1));
  const [sizeMax, setSizeMax] = useState((original.sizeMm + TOLERANCE_MM).toFixed(1));
  const [minColor, setMinColor] = useState("不限");
  const [minClarity, setMinClarity] = useState("不限");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const lo = Number(sizeMin);
    const hi = Number(sizeMax);
    return stones
      .filter((s) => s.status === "在库" || s.status === "已分配")
      .filter((s) => Number.isNaN(lo) || s.sizeMm >= lo)
      .filter((s) => Number.isNaN(hi) || s.sizeMm <= hi)
      .filter((s) => minColor === "不限" || colorRank(s.color) >= colorRank(minColor))
      .filter((s) => minClarity === "不限" || clarityRank(s.clarity) >= clarityRank(minClarity))
      .filter((s) => !keyword.trim() || s.id.toLowerCase().includes(keyword.trim().toLowerCase()))
      .sort((a, b) => (a.status === b.status ? a.id.localeCompare(b.id) : a.status === "在库" ? -1 : 1));
  }, [stones, sizeMin, sizeMax, minColor, minClarity, keyword]);

  const selected = selectedId ? stones.find((s) => s.id === selectedId) ?? null : null;
  const problems = selected ? validateReplacement(original, selected) : [];
  const sizeDiff = selected ? Math.abs(selected.sizeMm - original.sizeMm) : 0;

  return (
    <div>
      <div className="heading">
        <div>
          <p>替石筛选 · 尺寸公差 ±{TOLERANCE_MM}mm</p>
          <h2>
            {order.id} / {position.name} · 选择替石
          </h2>
        </div>
        <button onClick={onClose}>收起</button>
      </div>

      <p className="orig-strip">
        原石留档：<b>{original.id}</b> · {original.kind}
        {original.shape} · {original.sizeMm}mm · 颜色 {original.color} · 净度 {original.clarity} ·{" "}
        {original.carat}ct · {original.cut}
      </p>

      <div className="filters">
        <label>
          <span>尺寸下限 mm</span>
          <input type="number" step="0.1" value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} />
        </label>
        <label>
          <span>尺寸上限 mm</span>
          <input type="number" step="0.1" value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} />
        </label>
        <label>
          <span>颜色不低于</span>
          <select value={minColor} onChange={(e) => setMinColor(e.target.value)}>
            <option>不限</option>
            {COLOR_GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label>
          <span>净度不低于</span>
          <select value={minClarity} onChange={(e) => setMinClarity(e.target.value)}>
            <option>不限</option>
            {CLARITY_GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label>
          <span>编号搜索</span>
          <input placeholder="如 ST-2003" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </label>
      </div>

      <table className="cand">
        <thead>
          <tr>
            <th></th>
            <th>宝石编号</th>
            <th>种类 / 形状</th>
            <th>尺寸 mm</th>
            <th>颜色</th>
            <th>净度</th>
            <th>切工</th>
            <th>克拉</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((s) => {
            const occupied = s.status !== "在库";
            return (
              <tr
                key={s.id}
                className={`${selectedId === s.id ? "sel" : ""} ${occupied ? "occupied" : ""}`}
                onClick={() => !occupied && setSelectedId(s.id)}
              >
                <td>
                  <input type="radio" checked={selectedId === s.id} disabled={occupied} readOnly />
                </td>
                <td>{s.id}</td>
                <td>
                  {s.kind} · {s.shape}
                </td>
                <td>{s.sizeMm.toFixed(1)}</td>
                <td>{s.color}</td>
                <td>{s.clarity}</td>
                <td>{s.cut}</td>
                <td>{s.carat.toFixed(2)}</td>
                <td>
                  {occupied ? (
                    <span className="badge b-red">占用 {s.holderOrderId}</span>
                  ) : (
                    <span className="badge b-green">在库可选</span>
                  )}
                </td>
              </tr>
            );
          })}
          {candidates.length === 0 && (
            <tr>
              <td colSpan={9} className="empty">
                当前筛选条件下没有替石，可放宽尺寸范围或等级要求
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <div className="preview">
          <div className="preview-cols">
            <div>
              <small>原石</small>
              <p>
                {original.id} · {original.sizeMm}mm · {original.color} · {original.clarity}
              </p>
            </div>
            <div>
              <small>替石</small>
              <p>
                {selected.id} · {selected.sizeMm}mm · {selected.color} · {selected.clarity}
              </p>
            </div>
            <ul className="checks">
              <li className={sizeDiff <= TOLERANCE_MM + 1e-9 ? "ok" : "bad"}>
                尺寸差 {sizeDiff.toFixed(2)}mm（公差 ±{TOLERANCE_MM}mm）
              </li>
              <li className={colorRank(selected.color) >= colorRank(original.color) ? "ok" : "bad"}>
                颜色 {selected.color} / 原石 {original.color}
              </li>
              <li className={clarityRank(selected.clarity) >= clarityRank(original.clarity) ? "ok" : "bad"}>
                净度 {selected.clarity} / 原石 {original.clarity}
              </li>
            </ul>
          </div>
          {problems.length > 0 && (
            <p className="warn">存在不达标项，点击确认将被拦截，原因与原石信息会留存到拦截记录。</p>
          )}
          <div className="preview-actions">
            <button className="primary" onClick={() => onConfirm(selected.id)}>
              确认换石
            </button>
            <button onClick={() => setSelectedId(null)}>重选</button>
          </div>
        </div>
      )}
    </div>
  );
}
