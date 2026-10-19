import React, { useState } from 'react';
import {
  CurrencyDollar, BoxSeam, Trophy, Tags, FileEarmarkExcel, FileEarmarkPdf
} from 'react-bootstrap-icons';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend
} from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showToast } from '../../utils/alerts';
import { useApi } from '../../hooks/useApi';
import { consulta } from '../../services/api';
import { FechaRangoFilter } from '../../components/common/FechaRangoFilter';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const money = (v) => `$ ${Number(v || 0).toLocaleString('es-CO')}`;

// Semáforo (lo calcula el backend): ALERTA al tocar el mínimo, BAJO cerca de tocarlo.
const SEMAFORO = {
  ALERTA: { label: 'ALERTA', color: 'var(--brand-danger)', soft: 'var(--danger-soft-bg)' },
  BAJO: { label: 'BAJO', color: 'var(--amber-action)', soft: 'var(--amber-soft-bg)' },
  OK: { label: 'OK', color: 'var(--brand-success)', soft: 'var(--success-soft-bg)' }
};
const semaforo = (estado) => SEMAFORO[estado] || SEMAFORO.OK;
const porcentaje = (parte, total) => (total > 0 ? Number(((parte / total) * 100).toFixed(2)) : 0);

// Chart.js no lee CSS vars: se resuelven contra el tema activo al renderizar.
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const PALETA = ['#F59E0B', '#3B82F6', '#10B981', '#A855F7', '#1A365D'];

const card = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '12px',
  border: '1px solid var(--border-color)'
};

// CU_11_01: todos los indicadores salen de GET /dashboard (vistas SQL:
// vw_totales_venta, vw_detalle_venta, vw_stock_producto). Aquí solo se
// grafican y se exportan (CU_11_02).
export const DashboardPage = () => {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const { data: d } = useApi(`/dashboard${consulta({ desde, hasta })}`);

  const tick = cssVar('--text-muted');

  if (!d) {
    return <div className="text-center py-5" style={{ color: 'var(--text-muted)' }}>Cargando dashboard...</div>;
  }

  const ventasTotales = {
    total: Number(d.ventas.total),
    subtotal: Number(d.ventas.base_gravable),
    iva: Number(d.ventas.iva),
    cantidad: d.ventas.ventas_completadas
  };
  const stock = { unidades: Number(d.stock.unidades), enAlerta: d.stock.productos_en_alerta };
  const stockPorProducto = d.stock_por_producto.map((s) => ({
    codigo: s.id_producto, nombre: s.nombre, stockMinimo: Number(s.stock_minimo), stockActual: Number(s.stock_actual), estado: s.semaforo
  }));
  const topProductosLista = d.top_productos.map((p) => ({ nombre: p.producto, unidades: Number(p.unidades), ingresos: Number(p.total) }));
  const masVendido = topProductosLista[0] || { nombre: 'Sin ventas todavía', unidades: 0, ingresos: 0 };
  const categoriasLista = d.ventas_por_categoria.map((c) => ({ nombre: c.categoria, total: Number(c.total), porcentaje: porcentaje(Number(c.total), ventasTotales.total) }));
  const categoriaLider = categoriasLista[0] || { nombre: 'Sin ventas todavía', total: 0, porcentaje: 0 };
  const metodosPagoLista = d.ventas_por_metodo_pago.map((m) => ({ nombre: m.metodo_pago, total: Number(m.total), porcentaje: porcentaje(Number(m.total), ventasTotales.total) }));

  const kpis = [
    {
      title: 'Ventas Totales', icon: CurrencyDollar, color: 'var(--brand-success)', soft: 'var(--success-soft-bg)',
      valor: money(ventasTotales.total),
      sub: `Subtotal: ${money(ventasTotales.subtotal)} | IVA: ${money(ventasTotales.iva)}`,
      extra: `${ventasTotales.cantidad} ventas completadas`
    },
    {
      title: 'Stock Actual', icon: BoxSeam, color: 'var(--brand-blue)', soft: 'var(--blue-soft-bg)',
      valor: `${stock.unidades} un.`,
      sub: `${stock.enAlerta} productos en alerta`,
      extra: null,
      semaforo: stock.enAlerta === 0 ? 'var(--brand-success)' : 'var(--brand-danger)'
    },
    {
      title: 'Más Vendido', icon: Trophy, color: 'var(--amber-action)', soft: 'var(--amber-soft-bg)',
      valor: masVendido.nombre,
      sub: `${masVendido.unidades} unidades vendidas`,
      extra: money(masVendido.ingresos)
    },
    {
      title: 'Categoría Líder', icon: Tags, color: 'var(--brand-purple)', soft: 'var(--purple-soft-bg)',
      valor: categoriaLider.nombre,
      sub: `${categoriaLider.porcentaje}% de las ventas`,
      extra: money(categoriaLider.total)
    }
  ];

  const leyenda = { position: 'bottom', labels: { color: tick, boxWidth: 12, padding: 12, font: { size: 11 } } };

  const dataMetodos = {
    labels: metodosPagoLista.map((m) => `${m.nombre} (${m.porcentaje}%)`),
    datasets: [{ data: metodosPagoLista.map((m) => m.total), backgroundColor: PALETA, borderWidth: 0 }]
  };

  const dataCategorias = {
    labels: categoriasLista.map((c) => `${c.nombre} (${c.porcentaje}%)`),
    datasets: [{ data: categoriasLista.map((c) => c.total), backgroundColor: PALETA, borderWidth: 0 }]
  };

  const dataTop = {
    labels: topProductosLista.map((p) => p.nombre),
    datasets: [{ data: topProductosLista.map((p) => p.unidades), backgroundColor: '#F59E0B', borderRadius: 4 }]
  };

  const opcionesDona = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: leyenda,
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${money(ctx.parsed)}` } }
    }
  };

  const opcionesTop = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x} unidades` } }
    },
    scales: {
      x: { ticks: { color: tick }, grid: { color: cssVar('--border-color') } },
      y: { ticks: { color: tick }, grid: { display: false } }
    }
  };

  // El reporte dice qué periodo cubre (si no, un filtro por fechas no se nota en el archivo).
  const periodo = desde || hasta ? `Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'}` : 'Periodo: todo el historial';

  const exportarExcel = () => {
    const filas = [
      ['Reporte Dashboard StockBar'],
      [periodo],
      [],
      ['KPI', 'Valor', 'Detalle'],
      ['Ventas Totales', ventasTotales.total, `Subtotal ${ventasTotales.subtotal} / IVA ${ventasTotales.iva}`],
      ['Stock Actual', stock.unidades, `${stock.enAlerta} en alerta`],
      ['Más Vendido', masVendido.nombre, `${masVendido.unidades} uds`],
      ['Categoría Líder', categoriaLider.nombre, `${categoriaLider.porcentaje}%`],
      [],
      ['Método de pago', 'Total', '%'],
      ...metodosPagoLista.map((m) => [m.nombre, m.total, m.porcentaje]),
      [],
      ['Categoría', 'Total', '%'],
      ...categoriasLista.map((c) => [c.nombre, c.total, c.porcentaje]),
      [],
      ['Código', 'Producto', 'Stock mínimo', 'Stock actual', 'Estado'],
      ...stockPorProducto.map((p) => [p.codigo, p.nombre, p.stockMinimo, p.stockActual, semaforo(p.estado).label])
    ];
    // Un texto que empieza por = + - @ Excel lo ejecuta como fórmula: se
    // antepone ' (los números se dejan tal cual).
    const celda = (v) => {
      const texto = String(v ?? '');
      const seguro = typeof v !== 'number' && /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
      return `"${seguro.replace(/"/g, '""')}"`;
    };
    const csv = filas.map((f) => f.map(celda).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-stockbar-${new Date().toLocaleDateString('sv-SE')}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // revocar en el acto cancela la descarga en algunos navegadores
    showToast('success', 'Dashboard exportado a Excel (CSV)');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Dashboard StockBar', 14, 18);
    doc.setFontSize(9);
    doc.text(periodo, 14, 24);
    autoTable(doc, {
      startY: 29,
      head: [['KPI', 'Valor', 'Detalle']],
      body: [
        ['Ventas Totales', money(ventasTotales.total), `Subtotal ${money(ventasTotales.subtotal)} / IVA ${money(ventasTotales.iva)}`],
        ['Stock Actual', `${stock.unidades} un.`, `${stock.enAlerta} en alerta`],
        ['Más Vendido', masVendido.nombre, `${masVendido.unidades} uds`],
        ['Categoría Líder', categoriaLider.nombre, `${categoriaLider.porcentaje}%`]
      ],
      headStyles: { fillColor: [26, 54, 93] }
    });
    autoTable(doc, {
      head: [['Código', 'Producto', 'Stock mínimo', 'Stock actual', 'Estado']],
      body: stockPorProducto.map((p) => [p.codigo, p.nombre, p.stockMinimo, p.stockActual, semaforo(p.estado).label]),
      headStyles: { fillColor: [26, 54, 93] }
    });
    doc.save(`dashboard-stockbar-${new Date().toLocaleDateString('sv-SE')}.pdf`);
    showToast('success', 'Dashboard exportado a PDF');
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h4 className="fw-bold m-0" style={{ color: 'var(--text-main)' }}>Dashboard</h4>
          <p className="small m-0" style={{ color: 'var(--text-muted)' }}>Resumen operativo de ventas e inventario</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <FechaRangoFilter desde={desde} hasta={hasta} onDesdeChange={setDesde} onHastaChange={setHasta} />
          <button
            className="btn btn-sm fw-semibold d-flex align-items-center gap-2"
            onClick={exportarExcel}
            style={{ backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)', border: 'none' }}
          >
            <FileEarmarkExcel size={16} /> Excel
          </button>
          <button
            className="btn btn-sm fw-semibold d-flex align-items-center gap-2"
            onClick={exportarPDF}
            style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', border: 'none' }}
          >
            <FileEarmarkPdf size={16} /> PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="row g-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.title} className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3 h-100" style={card}>
                <div className="d-flex align-items-start justify-content-between gap-2">
                  <div style={{ minWidth: 0 }}>
                    <span className="small d-flex align-items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      {kpi.title}
                      {kpi.semaforo && (
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: kpi.semaforo, display: 'inline-block' }} />
                      )}
                    </span>
                    <h4 className="fw-bold m-0 mt-1" style={{ color: 'var(--text-main)' }}>{kpi.valor}</h4>
                    <span className="small d-block mt-1" style={{ color: 'var(--text-muted)' }}>{kpi.sub}</span>
                    {kpi.extra && <span className="small fw-semibold d-block mt-1" style={{ color: kpi.color }}>{kpi.extra}</span>}
                  </div>
                  <div className="p-3 rounded-circle flex-shrink-0" style={{ backgroundColor: kpi.soft, color: kpi.color }}>
                    <Icon size={22} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráficas 2x2 */}
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100" style={card}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Ventas por Método de Pago</h6>
            <div style={{ height: 260 }}>
              {metodosPagoLista.length === 0 ? (
                <div className="small text-center py-5" style={{ color: 'var(--text-muted)' }}>Sin ventas completadas todavía.</div>
              ) : (
                <Doughnut data={dataMetodos} options={opcionesDona} />
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100" style={card}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Top Productos Más Vendidos</h6>
            <div style={{ height: 260 }}>
              {topProductosLista.length === 0 ? (
                <div className="small text-center py-5" style={{ color: 'var(--text-muted)' }}>Sin ventas completadas todavía.</div>
              ) : (
                <Bar data={dataTop} options={opcionesTop} />
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100" style={card}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Ventas por Categoría</h6>
            <div style={{ height: 260 }}>
              {categoriasLista.length === 0 ? (
                <div className="small text-center py-5" style={{ color: 'var(--text-muted)' }}>Sin ventas completadas todavía.</div>
              ) : (
                <Doughnut data={dataCategorias} options={opcionesDona} />
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100" style={card}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Stock Actual por Producto</h6>
            <div className="table-responsive">
              <table className="table table-sm align-middle m-0" style={{ color: 'var(--text-main)' }}>
                <thead>
                  <tr style={{ borderColor: 'var(--border-color)' }}>
                    <th className="small text-uppercase" style={{ color: 'var(--text-muted)' }}>Código</th>
                    <th className="small text-uppercase" style={{ color: 'var(--text-muted)' }}>Producto</th>
                    <th className="small text-uppercase text-center" style={{ color: 'var(--text-muted)' }}>Mín.</th>
                    <th className="small text-uppercase text-center" style={{ color: 'var(--text-muted)' }}>Actual</th>
                    <th className="small text-uppercase text-center" style={{ color: 'var(--text-muted)' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockPorProducto.map((p) => {
                    const s = semaforo(p.estado);
                    return (
                      <tr key={p.codigo} style={{ borderColor: 'var(--border-color)' }}>
                        <td className="fw-bold small" style={{ color: 'var(--amber-action)' }}>{p.codigo}</td>
                        <td className="small">{p.nombre}</td>
                        <td className="text-center small" style={{ color: 'var(--text-muted)' }}>{p.stockMinimo}</td>
                        <td className="text-center fw-semibold">{p.stockActual}</td>
                        <td className="text-center">
                          <span className="badge px-2 py-1" style={{ backgroundColor: s.soft, color: s.color }}>{s.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
