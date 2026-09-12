import React from 'react';

// Gráfica de barras horizontal simple y accesible: un solo color por defecto
// (magnitud), etiqueta directa con nombre + valor, y tooltip nativo al pasar
// el mouse. Cada fila puede traer su propio color para representar estado
// (ej. Pendiente/Completado) en vez de una paleta categórica arbitraria.
export const BarList = ({ data, valueFormatter = (v) => v, color = 'var(--amber-action)', emptyLabel = 'Sin datos aún' }) => {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <div className="small py-3 text-center" style={{ color: 'var(--text-muted)' }}>{emptyLabel}</div>;
  }

  return (
    <div className="d-flex flex-column gap-3">
      {data.map((d) => (
        <div key={d.label} title={`${d.label}: ${valueFormatter(d.value)}`}>
          <div className="d-flex justify-content-between small mb-1">
            <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{d.label}</span>
            <span style={{ color: 'var(--text-muted)' }}>{valueFormatter(d.value)}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.max(4, (d.value / max) * 100)}%`,
                borderRadius: 4,
                backgroundColor: d.color || color,
                transition: 'width 0.4s ease'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
