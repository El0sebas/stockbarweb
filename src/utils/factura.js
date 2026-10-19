import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { empresaEmisora } from '../data/defaultEmpresa';
import { api } from '../services/api';
import { showToast } from './alerts';

const money = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

// Genera y descarga la representación de la factura de venta (ver
// data/defaultEmpresa.js para el disclaimer de qué es y qué no es este
// documento). `venta` es el detalle de GET /ventas/:id: líneas, totales
// (vw_totales_venta) y desglose de IVA por tarifa ya calculados por el
// backend; aquí solo se maqueta el documento.
export const generarFacturaPDF = (venta) => {
  const doc = new jsPDF();

  // Encabezado — emisor
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(empresaEmisora.razonSocial, 14, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`NIT: ${empresaEmisora.nit}`, 14, 24);
  doc.text(empresaEmisora.direccion, 14, 29);
  doc.text(`Tel: ${empresaEmisora.telefono}`, 14, 34);
  doc.text(empresaEmisora.regimen, 14, 39);

  // Encabezado — factura
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FACTURA DE VENTA', 196, 18, { align: 'right' });
  doc.setFontSize(11);
  doc.text(`No. ${venta.id_venta}`, 196, 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(empresaEmisora.resolucionDian, 196, 29, { align: 'right', maxWidth: 90 });

  doc.setDrawColor(200);
  doc.line(14, 44, 196, 44);

  // Datos de la venta
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date(venta.fecha_hora_venta).toLocaleString('es-CO')}`, 14, 51);
  doc.text(`Vendedor: ${venta.usuario || 'N/A'}`, 14, 56);
  doc.text(`Cliente: ${venta.cliente || 'Consumidor final'}`, 120, 51);
  doc.text(
    `Documento: ${venta.cliente_numero_documento ? `${venta.cliente_tipo_documento} ${venta.cliente_numero_documento}` : 'Consumidor final'}`,
    120,
    56
  );

  // Detalle de productos. "Precio unit." ya trae el IVA incluido (como se
  // exhibe en el mostrador); "Precio unit. sin IVA" es ese mismo valor
  // desglosado, para que quede explícito cuánto de cada unidad es base gravable.
  autoTable(doc, {
    startY: 63,
    head: [['Cant.', 'Descripción', 'Precio unit. sin IVA', 'IVA', 'Precio unit.', 'Subtotal']],
    body: (venta.detalles || []).map((p) => [
      p.cantidad,
      p.producto,
      money(p.precio_sin_iva),
      `${Number(p.porcentaje_impuesto_aplicado)}%`,
      money(p.precio_unitario_venta),
      money(p.subtotal)
    ]),
    headStyles: { fillColor: [26, 54, 93] },
    styles: { fontSize: 8 }
  });

  // Desglose de IVA por tarifa (obligatorio cuando hay más de una tarifa)
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Tarifa IVA', 'Base gravable', 'IVA']],
    body: (venta.desglose_iva || []).map((t) => [`${Number(t.tarifa)}%`, money(t.base_gravable), money(t.iva)]),
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 8 },
    margin: { left: 14 },
    tableWidth: 110
  });

  let y = doc.lastAutoTable.finalY + 9;
  // Total, forma de pago y pie ocupan ~35 mm: con muchas líneas no caben.
  if (y > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`TOTAL A PAGAR: ${money(venta.total_venta)}`, 196, y, { align: 'right' });

  // Forma de pago (una sola por venta, HU_58)
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Forma de pago: ${venta.metodo_pago}`, 14, y);

  // Pie legal
  y += 12;
  doc.setFontSize(7);
  doc.setTextColor(130);
  doc.text(
    'Este documento es una representación de la venta generada por el sistema StockBar y no constituye factura electrónica DIAN.',
    14,
    y,
    { maxWidth: 182 }
  );
  doc.text(
    'Para efectos tributarios formales, valide la numeración autorizada ante la DIAN.',
    14,
    y + 4,
    { maxWidth: 182 }
  );

  doc.save(`factura-${venta.id_venta}.pdf`);
};

// Pide el detalle completo al backend y genera la factura (CU_06_04).
export const descargarFactura = async (idVenta) => {
  try {
    generarFacturaPDF(await api.get(`/ventas/${idVenta}`));
  } catch (e) {
    showToast('error', e.message || 'No fue posible generar la factura, intente nuevamente.');
  }
};
