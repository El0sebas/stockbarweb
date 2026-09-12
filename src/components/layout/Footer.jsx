import React from 'react';

export const Footer = () => {
  return (
    <footer
      className="px-4 py-3 border-top mt-auto d-flex flex-column flex-md-row justify-content-between align-items-center gap-2"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        transition: 'background-color 0.2s ease, border-color 0.2s ease'
      }}
    >
      {/* Información de Marca y Copyright */}
      <div>
        <span className="fw-semibold" style={{ color: 'var(--text-main)' }}>
          Stock<span style={{ color: 'var(--amber-action)' }}>Bar</span>
        </span>{' '}
        &copy; {new Date().getFullYear()} — Sistema POS & Gestión de Inventarios
      </div>

      {/* Versión y Ficha */}
      <div className="d-flex align-items-center gap-3">
        <span
          className="badge rounded-pill fw-medium px-2 py-1"
          style={{ backgroundColor: 'var(--neutral-soft-bg)', color: 'var(--text-muted)' }}
        >
          v1.0.0
        </span>
        <span className="small">ADSO Ficha 3256538</span>
      </div>
    </footer>
  );
};