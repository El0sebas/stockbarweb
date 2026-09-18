import React from 'react';
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

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// TODO: Reemplazar con llamada a API cuando se conecte al backend
const MOCK = {
  kpis: {
    ventasTotales: { total: 547400, subtotal: 460000, iva: 87400, cantidad: 4 },
    stock: { unidades: 568, enAlerta: 0 },
    masVendido: { producto: 'Cerveza Aguila', unidades: 40, ingresos: 180000 },
    categoriaLider: { categoria: 'Bebidas alcohólicas', porcentaje: 39.13, ingresos: 180000 }
  },
  metodosPago: [
    { nombre: 'Tarjeta', total: 190000, porcentaje: 41.30 },
    { nombre: 'Transferencia', total: 135000, porcentaje: 29.35 },
    { nombre: 'Nequi', total: 90000, porcentaje: 19.57 },
    { nombre: 'Efectivo', total: 45000, porcentaje: 9.78 }
  ],
  topProductos: [
    { nombre: 'Cerveza Aguila', unidades: 40 },
    { nombre: 'Coca Cola', unidades: 20 },
    { nombre: 'Cigarrillos Marlboro', unidades: 10 },
    { nombre: 'Ron Medellín', unidades: 2 }
  ],
  categorias: [
    { nombre: 'Bebidas alcohólicas', total: 180000, porcentaje: 39.13 },
    { nombre: 'Licores', total: 130000, porcentaje: 28.26 },
    { nombre: 'Cigarrillos', total: 90000, porcentaje: 19.57 },
    { nombre: 'Bebidas no alcohólicas', total: 60000, porcentaje: 13.04 }
  ],
  stockPorProducto: [
    { codigo: 'SNK-001', nombre: 'Papas Margarita', stockMinimo: 10, stockActual: 200 },
    { codigo: 'BEB-001', nombre: 'Coca Cola', stockMinimo: 10, stockActual: 170 },
    { codigo: 'CER-001', nombre: 'Cerveza Aguila', stockMinimo: 20, stockActual: 110 },
    { codigo: 'LIC-001', nombre: 'Ron Medellín', stockMinimo: 5, stockActual: 58 },
    { codigo: 'CIG-001', nombre: 'Cigarrillos Marlboro', stockMinimo: 10, stockActual: 30 }
  ]
};

const money = (v) => `$ ${Number(v || 0).toLocaleString('es-CO')}`;

// Semáforo: ALERTA cuando ya tocó el mínimo, BAJO cuando está cerca de tocarlo.
const semaforo = (actual, minimo) => {
  if (actual <= minimo) return { label: 'ALERTA', color: 'var(--brand-danger)', soft: 'var(--danger-soft-bg)' };
  if (actual <= minimo * 2) return { label: 'BAJO', color: 'var(--amber-action)', soft: 'var(--amber-soft-bg)' };
  return { label: 'OK', color: 'var(--brand-success)', soft: 'var(--success-soft-bg)' };
};

// Chart.js no lee CSS vars: se resuelven contra el tema activo al renderizar.
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const PALETA = ['#F59E0B', '#3B82F6', '#10B981', '#A855F7', '#1A365D'];

const card = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '12px',
  border: '1px solid var(--border-color)'
};

export const DashboardPage = () => {
  const { ventasTotales, stock, masVendido, categoriaLider } = MOCK.kpis;
  const tick = cssVar('--text-muted');

  const kpis = [
    {
      title: 'Ventas Totales', icon: CurrencyDollar, color: 'var(--brand-success)', soft: 'var(--success-soft-bg)',
      valor: money(ventasTotales.total),
      sub: `Subtotal: ${money(ventasTotales.subtotal)} | IVA: ${money(ventasTotales.iva)}`,
      extra: `${ventasTotales.cantidad} ventas registradas`
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
      valor: masVendido.producto,
      sub: `${masVendido.unidades} unidades vendidas`,
      extra: `${money(masVendido.ingresos)} en ingresos`
    },
    {
      title: 'Categoría Líder', icon: Tags, color: 'var(--brand-purple)', soft: 'var(--purple-soft-bg)',
      valor: categoriaLider.categoria,
      sub: `${categoriaLider.porcentaje}% de las ventas`,
      extra: money(categoriaLider.ingresos)
    }
  ];

  const leyenda = { position: 'bottom', labels: { color: tick, boxWidth: 12, padding: 12, font: { size: 11 } } };

  const dataMetodos = {
    labels: MOCK.metodosPago.map((m) => `${m.nombre} (${m.porcentaje}%)`),
    datasets: [{ data: MOCK.metodosPago.map((m) => m.total), backgroundColor: PALETA, borderWidth: 0 }]
  };

  const dataCategorias = {
    labels: MOCK.categorias.map((c) => `${c.nombre} (${c.porcentaje}%)`),
    datasets: [{ data: MOCK.categorias.map((c) => c.total), backgroundColor: PALETA, borderWidth: 0 }]
  };

  const dataTop = {
    labels: MOCK.topProductos.map((p) => p.nombre),
    datasets: [{ data: MOCK.topProductos.map((p) => p.unidades), backgroundColor: '#F59E0B', borderRadius: 4 }]
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

  const exportarExcel = () => {
    const filas = [
      ['Reporte Dashboard StockBar'],
      [],
      ['KPI', 'Valor', 'Detalle'],
      ['Ventas Totales', ventasTotales.total, `Subtotal ${ventasTotales.subtotal} / IVA ${ventasTotales.iva}`],
      ['Stock Actual', stock.unidades, `${stock.enAlerta} en alerta`],
      ['Más Vendido', masVendido.producto, `${masVendido.unidades} uds`],
      ['Categoría Líder', categoriaLider.categoria, `${categoriaLider.porcentaje}%`],
      [],
      ['Método de pago', 'Total', '%'],
      ...MOCK.metodosPago.map((m) => [m.nombre, m.total, m.porcentaje]),
      [],
      ['Categoría', 'Total', '%'],
      ...MOCK.categorias.map((c) => [c.nombre, c.total, c.porcentaje]),
      [],
      ['Código', 'Producto', 'Stock mínimo', 'Stock actual', 'Estado'],
      ...MOCK.stockPorProducto.map((p) => [p.codigo, p.nombre, p.stockMinimo, p.stockActual, semaforo(p.stockActual, p.stockMinimo).label])
    ];
    const csv = filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-stockbar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Dashboard exportado a Excel (CSV)');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Dashboard StockBar', 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [['KPI', 'Valor', 'Detalle']],
      body: [
        ['Ventas Totales', money(ventasTotales.total), `Subtotal ${money(ventasTotales.subtotal)} / IVA ${money(ventasTotales.iva)}`],
        ['Stock Actual', `${stock.unidades} un.`, `${stock.enAlerta} en alerta`],
        ['Más Vendido', masVendido.producto, `${masVendido.unidades} uds`],
        ['Categoría Líder', categoriaLider.categoria, `${categoriaLider.porcentaje}%`]
      ],
      headStyles: { fillColor: [26, 54, 93] }
    });
    autoTable(doc, {
      head: [['Código', 'Producto', 'Stock mínimo', 'Stock actual', 'Estado']],
      body: MOCK.stockPorProducto.map((p) => [p.codigo, p.nombre, p.stockMinimo, p.stockActual, semaforo(p.stockActual, p.stockMinimo).label]),
      headStyles: { fillColor: [26, 54, 93] }
    });
    doc.save(`dashboard-stockbar-${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('success', 'Dashboard exportado a PDF');
  };

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h4 className="fw-bold m-0" style={{ color: 'var(--text-main)' }}>Dashboard</h4>
          <p className="small m-0" style={{ color: 'var(--text-muted)' }}>Resumen operativo de ventas e inventario</p>
        </div>
        <div className="d-flex gap-2">
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
            <div style={{ height: 260 }}><Doughnut data={dataMetodos} options={opcionesDona} /></div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100" style={card}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Top 5 Productos Más Vendidos</h6>
            <div style={{ height: 260 }}><Bar data={dataTop} options={opcionesTop} /></div>
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card border-0 shadow-sm p-4 h-100" style={card}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Ventas por Categoría</h6>
            <div style={{ height: 260 }}><Doughnut data={dataCategorias} options={opcionesDona} /></div>
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
                  {MOCK.stockPorProducto.map((p) => {
                    const s = semaforo(p.stockActual, p.stockMinimo);
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
