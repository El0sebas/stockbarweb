import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcularTotalesVenta } from './impuestos';
import { empresaEmisora } from '../data/defaultEmpresa';

const money = (n) => `$ ${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

// Genera y descarga la representación de la factura de venta (ver
// data/defaultEmpresa.js para el disclaimer de qué es y qué no es este
// documento). El desglose de IVA por tarifa es obligatorio en una factura
// colombiana cuando el carrito mezcla productos con distinta tarifa (aquí,
// Licores al 5% junto a Cerveza/Cigarrillos/Snacks al 19%).
export const generarFacturaPDF = (venta, clientes = []) => {
  const doc = new jsPDF();
  const clienteInfo = venta.id_cliente
    ? clientes.find((c) => c.id_cliente === venta.id_cliente)
    : null;

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
  doc.text(`No. ${venta.idVenta}`, 196, 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(empresaEmisora.resolucionDian, 196, 29, { align: 'right', maxWidth: 90 });

  doc.setDrawColor(200);
  doc.line(14, 44, 196, 44);

  // Datos de la venta
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date(venta.fecha_hora_venta).toLocaleString('es-CO')}`, 14, 51);
  doc.text(`Vendedor: ${venta.usuario || 'N/A'}`, 14, 56);
  doc.text(`Cliente: ${venta.cliente}`, 120, 51);
  doc.text(
    `Documento: ${clienteInfo ? `${clienteInfo.tipo_documento} ${clienteInfo.numero_documento}` : 'Consumidor final'}`,
    120,
    56
  );

  // Detalle de productos. "Precio unit." ya trae el IVA incluido (como se
  // exhibe en el mostrador); "Precio unit. sin IVA" es ese mismo valor
  // desglosado línea por línea, para que quede explícito cuánto de cada
  // unidad es base gravable.
  autoTable(doc, {
    startY: 63,
    head: [['Cant.', 'Descripción', 'Precio unit. sin IVA', 'IVA', 'Precio unit.', 'Subtotal']],
    body: (venta.productos || []).map((p) => {
      const tasa = Number(p.porcentajeIva || 0);
      const precioSinIva = Number(p.precio) / (1 + tasa / 100);
      return [
        p.cantidad,
        p.nombre,
        money(precioSinIva),
        `${tasa}%`,
        money(p.precio),
        money(p.precio * p.cantidad)
      ];
    }),
    headStyles: { fillColor: [26, 54, 93] },
    styles: { fontSize: 8 }
  });

  // Desglose de IVA por tarifa (obligatorio cuando hay más de una tarifa)
  const tarifas = [...new Set((venta.productos || []).map((p) => Number(p.porcentajeIva || 0)))].sort(
    (a, b) => a - b
  );
  const desgloseIva = tarifas.map((tasa) => {
    const t = calcularTotalesVenta((venta.productos || []).filter((p) => Number(p.porcentajeIva || 0) === tasa));
    return [`${tasa}%`, money(t.baseGravable), money(t.iva)];
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 6,
    head: [['Tarifa IVA', 'Base gravable', 'IVA']],
    body: desgloseIva,
    headStyles: { fillColor: [245, 158, 11] },
    styles: { fontSize: 8 },
    margin: { left: 14 },
    tableWidth: 110
  });

  let y = doc.lastAutoTable.finalY + 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`TOTAL A PAGAR: ${money(venta.total)}`, 196, y, { align: 'right' });

  // Forma de pago
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Forma de pago:', 14, y);
  (venta.pagos || []).forEach((p) => {
    y += 5;
    doc.text(
      `- ${p.metodoPago}${p.referencia_transaccion ? ` (${p.referencia_transaccion})` : ''}: ${money(p.monto)}`,
      18,
      y
    );
  });
  if (!venta.pagos || venta.pagos.length === 0) {
    y += 5;
    doc.text('- Sin pagos registrados', 18, y);
  }

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

  doc.save(`factura-${venta.idVenta}.pdf`);
};
