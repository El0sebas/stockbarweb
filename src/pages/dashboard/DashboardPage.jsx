import React, { useState } from 'react';
import {
  CurrencyDollar, BoxSeam, BagCheck, ExclamationTriangle,
  Calendar3, ArrowUpShort, ArrowDownShort, FileEarmarkExcel, FileEarmarkPdf
} from 'react-bootstrap-icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { usePersistentState } from '../../hooks/usePersistentState';
import { defaultProductos } from '../../data/defaultProductos';
import { defaultVentas } from '../../data/defaultVentas';
import { defaultCompras } from '../../data/defaultCompras';
import { BarList } from '../../components/common/BarList';
import { showToast } from '../../utils/alerts';

const money = (v) => `$ ${Number(v || 0).toLocaleString('es-CO')}`;

// Las ventas guardan fecha+hora ("2026-09-07 10:30") y las compras solo
// fecha ("2026-09-01"); ambas se normalizan a Date real para poder filtrar
// y comparar periodos.
const parseFechaVenta = (fecha) => new Date(String(fecha).replace(' ', 'T'));
const parseFechaCompra = (fecha) => new Date(`${fecha}T00:00:00`);

// Suma `getValor` de los items cuya fecha cae en [inicio, fin], y calcula la
// variación porcentual contra el periodo inmediatamente anterior de igual
// duración (o contra el mes anterior si no hay un rango de filtro activo).
const calcularVariacion = (items, getFecha, getValor, fechaInicio, fechaFin, rangoValido) => {
  let inicioActual, finActual, inicioAnterior, finAnterior;

  if (fechaInicio && fechaFin && rangoValido) {
    inicioActual = new Date(`${fechaInicio}T00:00:00`);
    finActual = new Date(`${fechaFin}T23:59:59`);
    const duracionMs = finActual - inicioActual;
    finAnterior = new Date(inicioActual.getTime() - 1000);
    inicioAnterior = new Date(finAnterior.getTime() - duracionMs);
  } else {
    const hoy = new Date();
    inicioActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    finActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    inicioAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    finAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59);
  }

  const sumaEnRango = (ini, fin) =>
    items.filter((it) => { const d = getFecha(it); return d >= ini && d <= fin; })
      .reduce((acc, it) => acc + getValor(it), 0);

  const actual = sumaEnRango(inicioActual, finActual);
  const anterior = sumaEnRango(inicioAnterior, finAnterior);

  // Sin datos del periodo anterior no hay base de comparación válida
  // (ver CU-REP-06, excepción "primer mes de operación").
  if (anterior === 0) return { actual, variacion: null };

  return { actual, variacion: ((actual - anterior) / anterior) * 100 };
};

const VariacionBadge = ({ variacion }) => {
  if (variacion === null) {
    return <span className="small" style={{ color: 'var(--text-muted)' }}>Sin datos del periodo anterior</span>;
  }
  const subio = variacion >= 0;
  const Icon = subio ? ArrowUpShort : ArrowDownShort;
  const color = subio ? 'var(--brand-success)' : 'var(--brand-danger)';
  return (
    <span className="d-inline-flex align-items-center fw-bold small" style={{ color }}>
      <Icon size={18} />
      {Math.abs(variacion).toFixed(1)}% vs. periodo anterior
    </span>
  );
};

export const DashboardPage = () => {
  // Mismas claves de localStorage que Productos, Ventas y Compras: el
  // dashboard no inventa números, calcula todo sobre los datos reales de
  // esos módulos (web y, a futuro, cualquier otro canal que use el mismo backend).
  const [productos] = usePersistentState('stockbar_productos', defaultProductos);
  const [ventas] = usePersistentState('stockbar_ventas', defaultVentas);
  const [compras] = usePersistentState('stockbar_compras', defaultCompras);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const rangoValido = !fechaInicio || !fechaFin || fechaInicio <= fechaFin;

  const dentroDeRango = (fecha) => {
    if (!rangoValido) return true; // rango inválido: no se filtra nada
    if (fechaInicio && fecha < new Date(`${fechaInicio}T00:00:00`)) return false;
    if (fechaFin && fecha > new Date(`${fechaFin}T23:59:59`)) return false;
    return true;
  };

  const ventasFiltradas = ventas.filter((v) => dentroDeRango(parseFechaVenta(v.fecha)));
  const comprasFiltradas = compras.filter((c) => dentroDeRango(parseFechaCompra(c.fecha)));

  const ingresos = ventasFiltradas.filter((v) => v.estado === 'Completado').reduce((acc, v) => acc + Number(v.total || 0), 0);
  const productosActivos = productos.filter((p) => p.estado === 'Activo').length;
  const comprasPendientes = comprasFiltradas.filter((c) => c.estado === 'Pendiente').length;
  const productosBajoStock = productos.filter((p) => Number(p.stockActual) <= Number(p.stockMinimo));

  const variacionIngresos = calcularVariacion(
    ventas.filter((v) => v.estado === 'Completado'), parseFechaVenta, (v) => Number(v.total || 0),
    fechaInicio, fechaFin, rangoValido
  );
  const variacionEgresos = calcularVariacion(
    compras, parseFechaCompra, (c) => Number(c.total || 0),
    fechaInicio, fechaFin, rangoValido
  );

  const kpis = [
    { title: 'Ingresos por Ventas', val: money(ingresos), icon: CurrencyDollar, color: 'var(--brand-success)', soft: 'var(--success-soft-bg)' },
    { title: 'Productos Activos', val: productosActivos, icon: BoxSeam, color: 'var(--brand-blue)', soft: 'var(--blue-soft-bg)' },
    { title: 'Compras Pendientes', val: comprasPendientes, icon: BagCheck, color: 'var(--amber-action)', soft: 'var(--amber-soft-bg)' },
    { title: 'Alertas de Stock', val: productosBajoStock.length, icon: ExclamationTriangle, color: 'var(--brand-danger)', soft: 'var(--danger-soft-bg)' }
  ];

  const ventasPorEstado = [
    { label: 'Completado', value: ventasFiltradas.filter((v) => v.estado === 'Completado').length, color: 'var(--brand-success)' },
    { label: 'Pendiente', value: ventasFiltradas.filter((v) => v.estado === 'Pendiente').length, color: 'var(--amber-action)' }
  ];

  const comprasPorEstado = [
    { label: 'Recibida', value: comprasFiltradas.filter((c) => c.estado === 'Recibida').length, color: 'var(--brand-success)' },
    { label: 'Pendiente', value: comprasFiltradas.filter((c) => c.estado === 'Pendiente').length, color: 'var(--amber-action)' }
  ];

  const stockPorProducto = [...productos]
    .sort((a, b) => Number(b.stockActual) - Number(a.stockActual))
    .slice(0, 6)
    .map((p) => ({
      label: p.nombre,
      value: Number(p.stockActual),
      color: Number(p.stockActual) <= Number(p.stockMinimo) ? 'var(--brand-danger)' : 'var(--brand-blue)'
    }));

  const sinDatosParaExportar = ventasFiltradas.length === 0 && comprasFiltradas.length === 0;
  const periodoTexto = `${fechaInicio || 'Inicio'} a ${fechaFin || 'Hoy'}`;

  const exportarExcel = () => {
    const filas = [
      ['Reporte StockBar', periodoTexto],
      [],
      ['KPI', 'Valor'],
      ['Ingresos por Ventas', ingresos],
      ['Productos Activos', productosActivos],
      ['Compras Pendientes', comprasPendientes],
      ['Alertas de Stock', productosBajoStock.length],
      [],
      ['VENTAS', 'Cliente', 'Fecha', 'Total', 'Estado'],
      ...ventasFiltradas.map((v) => [v.idVenta, v.cliente, v.fecha, v.total, v.estado]),
      [],
      ['COMPRAS', 'Proveedor', 'Fecha', 'Total', 'Estado'],
      ...comprasFiltradas.map((c) => [c.factura, c.proveedor, c.fecha, c.total, c.estado])
    ];
    const csv = filas
      .map((fila) => fila.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-stockbar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Reporte exportado a Excel (CSV)');
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte StockBar', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${periodoTexto}`, 14, 25);

    autoTable(doc, {
      startY: 32,
      head: [['KPI', 'Valor']],
      body: [
        ['Ingresos por Ventas', money(ingresos)],
        ['Productos Activos', String(productosActivos)],
        ['Compras Pendientes', String(comprasPendientes)],
        ['Alertas de Stock', String(productosBajoStock.length)]
      ],
      headStyles: { fillColor: [26, 54, 93] }
    });

    autoTable(doc, {
      head: [['Venta', 'Cliente', 'Fecha', 'Total', 'Estado']],
      body: ventasFiltradas.map((v) => [v.idVenta, v.cliente, v.fecha, money(v.total), v.estado]),
      headStyles: { fillColor: [26, 54, 93] }
    });

    autoTable(doc, {
      head: [['Compra', 'Proveedor', 'Fecha', 'Total', 'Estado']],
      body: comprasFiltradas.map((c) => [c.factura, c.proveedor, c.fecha, money(c.total), c.estado]),
      headStyles: { fillColor: [26, 54, 93] }
    });

    doc.save(`reporte-stockbar-${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('success', 'Reporte exportado a PDF');
  };

  return (
    <div className="d-flex flex-column gap-4">
      {/* Filtro de reportes por rango de fechas + exportación */}
      <div className="card border-0 shadow-sm p-3" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div className="d-flex flex-wrap align-items-end gap-3">
          <div className="d-flex align-items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Calendar3 size={16} />
            <span className="small fw-semibold">Filtrar por fecha</span>
          </div>
          <div>
            <label className="form-label small mb-1" style={{ color: 'var(--text-muted)' }}>Desde</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
          <div>
            <label className="form-label small mb-1" style={{ color: 'var(--text-muted)' }}>Hasta</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
          {(fechaInicio || fechaFin) && (
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => { setFechaInicio(''); setFechaFin(''); }}
            >
              Limpiar
            </button>
          )}

          <div className="flex-grow-1" />

          <button
            type="button"
            className="btn btn-sm fw-semibold d-flex align-items-center gap-2"
            disabled={sinDatosParaExportar}
            onClick={exportarExcel}
            style={{ backgroundColor: 'var(--success-soft-bg)', color: 'var(--brand-success)', border: 'none' }}
          >
            <FileEarmarkExcel size={16} /> Exportar Excel
          </button>
          <button
            type="button"
            className="btn btn-sm fw-semibold d-flex align-items-center gap-2"
            disabled={sinDatosParaExportar}
            onClick={exportarPDF}
            style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)', border: 'none' }}
          >
            <FileEarmarkPdf size={16} /> Exportar PDF
          </button>
        </div>
        {!rangoValido && (
          <p className="small fw-semibold m-0 mt-2" style={{ color: 'var(--brand-danger)' }}>
            Rango inválido: la fecha "Desde" no puede ser posterior a "Hasta". Mostrando todos los datos.
          </p>
        )}
      </div>

      <div className="row g-3">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="col-12 col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm p-3" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="small d-block" style={{ color: 'var(--text-muted)' }}>{kpi.title}</span>
                    <h3 className="fw-bold m-0 mt-1" style={{ color: 'var(--text-main)' }}>{kpi.val}</h3>
                  </div>
                  <div className="p-3 rounded-circle" style={{ backgroundColor: kpi.soft, color: kpi.color }}>
                    <Icon size={24} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Variación en ingresos/egresos vs. periodo anterior */}
      <div className="row g-3">
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm p-3" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span className="small d-block mb-1" style={{ color: 'var(--text-muted)' }}>Variación de Ingresos (Ventas)</span>
            <div className="d-flex align-items-baseline gap-2">
              <h4 className="fw-bold m-0">{money(variacionIngresos.actual)}</h4>
              <VariacionBadge variacion={variacionIngresos.variacion} />
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm p-3" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <span className="small d-block mb-1" style={{ color: 'var(--text-muted)' }}>Variación de Egresos (Compras)</span>
            <div className="d-flex align-items-baseline gap-2">
              <h4 className="fw-bold m-0">{money(variacionEgresos.actual)}</h4>
              <VariacionBadge variacion={variacionEgresos.variacion} />
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm p-4 h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Ventas por estado</h6>
            <BarList data={ventasPorEstado} />
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm p-4 h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Compras por estado</h6>
            <BarList data={comprasPorEstado} />
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm p-4 h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h6 className="fw-bold mb-3" style={{ color: 'var(--text-main)' }}>Stock por producto</h6>
            <BarList data={stockPorProducto} valueFormatter={(v) => `${v} un.`} />
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm p-4" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h6 className="fw-bold mb-3 d-flex align-items-center gap-2" style={{ color: 'var(--text-main)' }}>
          <ExclamationTriangle size={16} color="var(--brand-danger)" />
          Alertas de bajo stock
        </h6>
        {productosBajoStock.length === 0 ? (
          <p className="small m-0" style={{ color: 'var(--text-muted)' }}>Ningún producto está por debajo de su stock mínimo.</p>
        ) : (
          <div className="d-flex flex-column gap-2">
            {productosBajoStock.map((p) => (
              <div key={p.codigo} className="d-flex justify-content-between align-items-center py-2 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <span className="fw-semibold small" style={{ color: 'var(--text-main)' }}>{p.nombre}</span>
                  <span className="small ms-2" style={{ color: 'var(--text-muted)' }}>({p.categoria})</span>
                </div>
                <span className="badge px-2 py-1" style={{ backgroundColor: 'var(--danger-soft-bg)', color: 'var(--brand-danger)' }}>
                  {p.stockActual} / mín. {p.stockMinimo}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
