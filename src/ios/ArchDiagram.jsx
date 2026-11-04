import { useState } from 'react';

const WIDTH = 340;
const KINDS = ['flow', 'async', 'fail'];

const center = (n) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 });

// Distance along direction d from point p (inside rect) to the rect's border.
const exitT = (r, p, d) => {
  const tx = d.x > 0 ? (r.x + r.w - p.x) / d.x : d.x < 0 ? (r.x - p.x) / d.x : Infinity;
  const ty = d.y > 0 ? (r.y + r.h - p.y) / d.y : d.y < 0 ? (r.y - p.y) / d.y : Infinity;
  return Math.min(tx, ty);
};

// Straight edge from the border of one box to the border of the other.
const edgeGeometry = (from, to, shiftX = 0) => {
  const a = center(from);
  const b = center(to);
  a.x += shiftX;
  b.x += shiftX;
  const d = { x: b.x - a.x, y: b.y - a.y };
  const start = { x: a.x + d.x * exitT(from, a, d), y: a.y + d.y * exitT(from, a, d) };
  const back = { x: -d.x, y: -d.y };
  const tEnd = exitT(to, b, back);
  const end = { x: b.x + back.x * tEnd, y: b.y + back.y * tEnd };
  return { start, end, vertical: Math.abs(d.y) > Math.abs(d.x) };
};

const ArchDiagram = ({ id, diagram }) => {
  const [selected, setSelected] = useState(null);
  const byId = Object.fromEntries(diagram.nodes.map((n) => [n.id, n]));
  const node = selected ? byId[selected] : null;
  const marker = (kind) => `arch-${id}-${kind}`;

  const toggle = (nodeId) => setSelected((s) => (s === nodeId ? null : nodeId));

  return (
    <div className="card arch">
      <svg className="arch-svg" viewBox={`0 0 ${WIDTH} ${diagram.height}`} role="group" aria-label={diagram.summary}>
        <defs>
          {KINDS.map((k) => (
            <marker
              key={k}
              id={marker(k)}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" className={`arch-head arch-head--${k}`} />
            </marker>
          ))}
        </defs>

        {(diagram.dividers || []).map((dv) => (
          <g key={dv.y} className="arch-divider" aria-hidden="true">
            <line x1="4" x2={WIDTH - 4} y1={dv.y} y2={dv.y} />
            <text x={WIDTH - 6} y={dv.y - 5} textAnchor="end">
              {dv.label}
            </text>
          </g>
        ))}

        {diagram.edges.map((e) => {
          const kind = e.kind || 'flow';
          const { start, end, vertical } = edgeGeometry(byId[e.from], byId[e.to], e.shiftX);
          const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
          const left = e.side === 'left';
          return (
            <g key={`${e.from}-${e.to}`} className={`arch-edge arch-edge--${kind}`} aria-hidden="true">
              <path d={`M${start.x} ${start.y} L${end.x} ${end.y}`} markerEnd={`url(#${marker(kind)})`} />
              {e.label &&
                (vertical ? (
                  <text x={mid.x + (left ? -6 : 6)} y={mid.y + 3} textAnchor={left ? 'end' : 'start'}>
                    {e.label}
                  </text>
                ) : (
                  <text x={mid.x} y={mid.y - 6} textAnchor="middle">
                    {e.label}
                  </text>
                ))}
            </g>
          );
        })}

        {diagram.nodes.map((n) => {
          const c = center(n);
          return (
            <g
              key={n.id}
              className={`arch-node arch-node--${n.kind} ${selected === n.id ? 'is-selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={selected === n.id}
              aria-label={`${n.label}${n.sub ? `, ${n.sub}` : ''}`}
              onClick={() => toggle(n.id)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  toggle(n.id);
                }
              }}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="10" />
              <text className="arch-label" x={c.x} y={n.sub ? c.y - 2 : c.y + 4} textAnchor="middle">
                {n.label}
              </text>
              {n.sub && (
                <text className="arch-sub" x={c.x} y={c.y + 11} textAnchor="middle">
                  {n.sub}
                </text>
              )}
            </g>
          );
        })}

        {diagram.footnote && (
          <text className="arch-foot" x={WIDTH / 2} y={diagram.height - 6} textAnchor="middle">
            {diagram.footnote}
          </text>
        )}
      </svg>
      <p className="arch-note" aria-live="polite">
        {node ? (
          <>
            <b>{node.label}:</b> {node.note}
          </>
        ) : (
          'Tap any box to see what it does.'
        )}
      </p>
    </div>
  );
};

export default ArchDiagram;
