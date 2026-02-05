export function generatePresupuestoHTML(data: any) {
  const cliente = data.cliente || 'CONSUMIDOR FINAL';
  const patente = data.patente || data.vehiculo || 'S/D';
  const fecha = data.fecha || new Date().toLocaleDateString();
  const descripcion = data.descripcion || '';
  const costoMano = Number(data.costoMano || 0);
  const costoRepuestos = Number(data.costoRepuestos || 0);
  const subtotal = costoMano + costoRepuestos;
  const logo = data.logo || '';

  const css = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; margin:0; padding:0; background:#fff; }
    .page { width:210mm; min-height:297mm; padding:18mm; }
    table { width:100%; border-collapse:collapse; }
    .hdr-table td { border:1px solid #000; padding:10px; vertical-align:top; }
    .title { font-size:34px; font-weight:900; text-transform:uppercase; letter-spacing:1px }
    .header-top { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:4px solid #000; padding-bottom:6px }
    .logo { width:110px; height:auto; object-fit:contain }
    .section-title { margin-top:18px; margin-bottom:6px; font-weight:900; text-transform:uppercase; }
    .items { margin-top:6px; }
    .item-line { border-bottom:1px solid #000; height:20px; padding:6px 0; text-align:center }
    .totals { margin-top:12px; }
    .totals table { border-collapse:collapse; }
    .totals td { border:1px solid #000; padding:8px; }
    .totals .label { font-weight:700 }
    .total-final { font-size:20px; font-weight:900 }
    .footer { margin-top:30px; font-size:10px; text-align:right }
  `;

  const itemsHtml = descripcion
    .split('\n')
    .map((line: string) => `<div class="item-line">${line || '&nbsp;'}</div>`)
    .join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Presupuesto</title>
        <style>${css}</style>
      </head>
      <body>
        <div class="page">
          <div class="header-top">
            <div style="flex:1">
              <div class="title">PRESUPUESTO DE REPARACIÓN</div>
            </div>
            <div style="text-align:right;min-width:130px">
              ${logo ? `<img src="${logo}" class="logo" />` : ''}
              <div style="font-size:12px;font-weight:700;margin-top:6px">ORDEN DE TRABAJO: 02</div>
            </div>
          </div>

          <table class="hdr-table" style="margin-top:12px;">
            <tr>
              <td style="width:50%"><strong>Concesionario:</strong><br/>MECÁNICA INTEGRAL</td>
              <td style="width:50%"><strong>Nombre del cliente:</strong><br/>${cliente}</td>
            </tr>
            <tr>
              <td><strong>Fecha cotización:</strong> ${fecha}<br/><strong>Presupuesto válido hasta:</strong> ${fecha}</td>
              <td><strong>N.º de matrícula:</strong> ${patente} <br/><strong>Marca:</strong> ${data.marca || ''}</td>
            </tr>
            <tr>
              <td><strong>Tipo de operación:</strong><br/>REPARACIÓN EN TALLER</td>
              <td><strong>ORDEN DE MANTENIMIENTO:</strong></td>
            </tr>
          </table>

          <div class="section-title">TRABAJOS A REALIZAR:</div>
          <div class="items">
            ${itemsHtml || '<div class="item-line">(Sin ítems)</div>'}
          </div>

          <div style="display:flex;justify-content:flex-end;">
            <div style="width:280px;margin-top:12px;">
              <table class="totals">
                <tr><td class="label">COSTO DE TRABAJO:</td><td style="text-align:right">$ ${costoMano.toLocaleString('es-AR')}</td></tr>
                <tr><td class="label">COSTO REPUESTOS:</td><td style="text-align:right">$ ${costoRepuestos.toLocaleString('es-AR')}</td></tr>
                <tr><td class="label total-final">COSTO TOTAL:</td><td style="text-align:right" class="total-final">$ ${subtotal.toLocaleString('es-AR')}</td></tr>
              </table>
            </div>
          </div>

          <div style="margin-top:18px;font-size:11px;">OBSERVACIONES:</div>
          <div style="margin-top:6px;">
            ${Array.from({ length:6 }).map(() => '<div style="border-bottom:1px solid #000;height:18px;margin-bottom:6px"></div>').join('')}
          </div>

          <div class="footer">
            Datos bancarios: CBU: 0200302111000018656558<br/>
            ALIAS: marcote.ban.cor<br/>
            CUIT: 23-39575400-9<br/>
            SANTIAGO RAFAEL MARCOTE
          </div>
        </div>
      </body>
    </html>
  `;

  return html;
}

export default generatePresupuestoHTML;
