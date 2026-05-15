import { useState } from 'react';

export default function DataTable({ theme: C, columns, rows, onRowClick }) {
  const [selectedIdx, setSelectedIdx] = useState(null);

  return (
    <div style={{ overflowX: 'auto', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ background: C.card2 }}>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '10px 12px', textAlign: col.anchor === 'e' ? 'right' : 'left',
                fontSize: 10, fontWeight: 700, color: C.text2,
                width: col.width || 'auto', whiteSpace: 'nowrap',
                borderBottom: `1px solid ${C.border}`,
              }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: '32px', textAlign: 'center', color: C.text3, fontSize: 13 }}>No records found</td></tr>
          ) : rows.map((row, i) => {
            const vals = Array.isArray(row) ? row : columns.map(c => row[c.key]);
            const isSelected = selectedIdx === i;
            return (
              <tr key={i}
                onClick={() => { setSelectedIdx(i); onRowClick?.(row, i); }}
                style={{
                  background: isSelected ? C.blue_dim : i % 2 === 0 ? C.bg3 : C.card,
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = C.hover; }}
                onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = i % 2 === 0 ? C.bg3 : C.card; }}
              >
                {vals.map((val, j) => (
                  <td key={j} style={{
                    padding: '10px 12px', color: isSelected ? C.blue2 : C.text,
                    borderBottom: `1px solid ${C.border}`, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0,
                    textAlign: columns[j]?.anchor === 'e' ? 'right' : 'left',
                  }}>{val}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
