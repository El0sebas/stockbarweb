// Datos fiscales del emisor (StockBar) usados para generar la representación
// de factura de venta (ver utils/factura.js). PLACEHOLDER: reemplazar por
// los datos reales del negocio (NIT, razón social, dirección, régimen,
// resolución de numeración) antes de usar en un entorno real.
//
// Ojo: esto NO es facturación electrónica DIAN. Una factura electrónica real
// exige resolución de numeración autorizada, CUFE, firma digital y
// validación en tiempo real contra la API de la DIAN — algo que requiere
// backend propio y registro ante la DIAN, fuera del alcance de este
// frontend (ver CLAUDE.md, regla de no inventar infraestructura no
// documentada). Lo que aquí se genera es un documento de venta con el
// mismo formato/información que exige una factura, para uso interno o como
// "documento equivalente" de un vendedor no obligado a facturar
// electrónicamente.
export const empresaEmisora = {
  razonSocial: 'StockBar S.A.S.',
  nit: '900.000.000-0',
  direccion: 'Cra 00 # 00-00, Bogotá D.C.',
  telefono: '(601) 000 0000',
  regimen: 'Responsable de IVA',
  resolucionDian: 'Documento equivalente de venta — numeración interna (no DIAN)'
};
