import { useRef, useEffect, useState } from 'react';

/* ─── BAR CHART ─── */
export function BarChart({ theme: C, data = [], height = 180 }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    if(ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (!data.length) return <div ref={ref} style={{ height }} />;

  const pl=14,pr=14,pt=20,pb=38;
  const cw = Math.max(w-pl-pr,1), ch = Math.max(height-pt-pb,1);
  const mx = Math.max(...data.map(d=>d.value),1);
  const n  = data.length;
  const gap = Math.max(4, Math.floor(cw/(n*5)));
  const bw  = Math.max(8, Math.floor((cw - gap*(n-1))/n));

  return (
    <div ref={ref} style={{ width:'100%', height, position:'relative' }}>
      <svg width={w||'100%'} height={height} style={{ display:'block' }}>
        {data.map((d,i) => {
          const x0 = pl + i*(bw+gap);
          const bh = Math.round(d.value/mx*ch);
          const y0 = pt+ch-bh, y1 = pt+ch;
          const lbl = d.label.length>8 ? d.label.slice(0,7)+'…' : d.label;
          return (
            <g key={i}>
              {/* shadow */}
              <rect x={x0+2} y={y0+3} width={bw} height={bh} fill={C.bg3} rx={2} />
              {/* bar */}
              <rect x={x0} y={y0} width={bw} height={bh} fill={d.color} rx={2} />
              {/* top cap */}
              <ellipse cx={x0+bw/2} cy={y0} rx={bw/2} ry={4} fill={d.color} />
              {/* value */}
              <text x={x0+bw/2} y={y0-10} textAnchor="middle" fill={C.text2} fontSize={8} fontWeight={700}>{Math.round(d.value)}</text>
              {/* label */}
              <text x={x0+bw/2} y={height-10} textAnchor="middle" fill={C.text3} fontSize={8}>{lbl}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── LINE CHART ─── */
export function LineChart({ theme: C, series = [], labels = [], height = 180, yMax = 100 }) {
  const ref = useRef(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    if(ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const pl=44,pr=16,pt=20,pb=36;
  const cw = Math.max(w-pl-pr,1), ch = Math.max(height-pt-pb,1);
  const n = labels.length;

  const getX = i => n>1 ? pl+Math.round(i/(n-1)*cw) : pl+cw/2;
  const getY = v => pt+Math.round((1-v/yMax)*ch);

  const toPolyStr = pts => pts.map(([x,y])=>`${x},${y}`).join(' ');

  return (
    <div ref={ref} style={{ width:'100%', height }}>
      <svg width={w||'100%'} height={height}>
        {/* Grid lines */}
        {[0,1,2,3,4].map(i => {
          const y = pt+Math.round(ch*i/4);
          return (
            <g key={i}>
              <line x1={pl} y1={y} x2={w-pr} y2={y} stroke={C.border} strokeDasharray="3,6" strokeWidth={1}/>
              <text x={pl-6} y={y+4} textAnchor="end" fill={C.text3} fontSize={8}>{Math.round(yMax*(1-i/4))}</text>
            </g>
          );
        })}

        {/* X labels */}
        {labels.map((lbl,i) => (
          <text key={i} x={getX(i)} y={height-10} textAnchor="middle" fill={C.text3} fontSize={8}>{lbl}</text>
        ))}

        {/* Series */}
        {series.map((s,si) => {
          if(!s.data?.length) return null;
          const pts = s.data.slice(0,n).map((v,i)=>[getX(i),getY(v)]);
          const poly = [[pl,pt+ch],...pts,[pts.at(-1)?.[0]??pl,pt+ch]];
          return (
            <g key={si}>
              {/* Filled area */}
              <polygon points={toPolyStr(poly)} fill={s.color} opacity={0.15} />
              {/* Line */}
              <polyline points={toPolyStr(pts)} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round"/>
              {/* Dots */}
              {pts.map(([x,y],j) => (
                <circle key={j} cx={x} cy={y} r={4} fill={s.color} stroke={C.card} strokeWidth={2}/>
              ))}
            </g>
          );
        })}

        {/* Legend */}
        {series.map((s,si) => {
          const lx = pl + si * (s.label.length*6+30);
          return (
            <g key={si}>
              <rect x={lx} y={5} width={14} height={7} fill={s.color} rx={2}/>
              <text x={lx+18} y={12} fill={C.text2} fontSize={8}>{s.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── DONUT CHART ─── */
export function DonutChart({ theme: C, data = [], size = 180 }) {
  const total = data.reduce((a,d)=>a+d.value,0) || 1;
  let start = -90;
  const cx = size/2, cy = size/2;
  const R = size/2 - 14, r = R - 32;

  function arc(startDeg, endDeg, outerR) {
    const s = startDeg * Math.PI/180, e = endDeg * Math.PI/180;
    const large = (endDeg-startDeg) > 180 ? 1 : 0;
    const x1=cx+outerR*Math.cos(s), y1=cy+outerR*Math.sin(s);
    const x2=cx+outerR*Math.cos(e), y2=cy+outerR*Math.sin(e);
    return { x1,y1,x2,y2,large };
  }

  return (
    <svg width={size} height={size}>
      {data.map((d,i) => {
        const ext = d.value/total*360;
        const { x1,y1,x2,y2,large } = arc(start, start+ext-0.5, R);
        const { x1:ix1,y1:iy1,x2:ix2,y2:iy2,large:il } = arc(start, start+ext-0.5, r);
        const path = `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2} L${ix2},${iy2} A${r},${r} 0 ${il},0 ${ix1},${iy1} Z`;
        start += ext;
        return <path key={i} d={path} fill={d.color} stroke={C.card} strokeWidth={2}/>;
      })}
      {/* Center hole */}
      <circle cx={cx} cy={cy} r={r-2} fill={C.card}/>
    </svg>
  );
}

/* ─── ATTENTION RING ─── */
export function AttentionRing({ theme: C, value = 0, size = 130, color }) {
  const col = color || C.blue;
  const cx = size/2, cy = size/2, R = size/2-14;
  const strokeW = 14;

  // 270° arc from 135° to 405° (=45°)
  const startDeg = 135, totalDeg = 270;
  const extDeg = value/100 * totalDeg;

  function arcPath(startD, extD, r) {
    const s = startD * Math.PI/180;
    const e = (startD+extD) * Math.PI/180;
    const large = extD > 180 ? 1 : 0;
    const x1=cx+r*Math.cos(s), y1=cy+r*Math.sin(s);
    const x2=cx+r*Math.cos(e), y2=cy+r*Math.sin(e);
    return `M${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2}`;
  }

  return (
    <svg width={size} height={size}>
      {/* Track */}
      <path d={arcPath(startDeg, totalDeg, R)} fill="none" stroke={C.bg3} strokeWidth={strokeW} strokeLinecap="round"/>
      {/* Progress */}
      {extDeg > 0 && (
        <path d={arcPath(startDeg, extDeg, R)} fill="none" stroke={col} strokeWidth={strokeW} strokeLinecap="round"/>
      )}
      {/* Text */}
      <text x={cx} y={cy-4} textAnchor="middle" fill={C.text} fontSize={16} fontWeight={700}>{Math.round(value)}%</text>
      <text x={cx} y={cy+14} textAnchor="middle" fill={C.text2} fontSize={9}>attention</text>
    </svg>
  );
}
