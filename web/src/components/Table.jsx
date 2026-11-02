import React from 'react';

export function Table({ columns, data, emptyMessage = 'No records found.' }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
        <thead style={{ backgroundColor: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>{emptyMessage}</td></tr>
          ) : (
            data.map((row) => (
              <tr key={row.id ?? row.code ?? row.bed_number} style={{ borderBottom: '1px solid var(--color-border)' }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
