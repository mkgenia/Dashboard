import { jsPDF } from 'jspdf';

export const pdfService = {
  generatePropertySheet(property: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Configuración de colores
    const primaryColor = [30, 41, 59]; // Slate 800
    const accentColor = [37, 99, 235]; // Blue 600

    // HEADER - Fondo
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // LOGO Placeholder
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GRUPO HOGARES', 20, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('FICHA COMERCIAL DE INMUEBLE', pageWidth - 20, 25, { align: 'right' });

    // TÍTULO Y PRECIO
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(`${(property.precio || 0).toLocaleString()} €`, 20, 60);

    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text(`${property.calle}, ${property.barrio}`, 20, 70);

    // LÍNEA DIVISORIA
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 80, pageWidth - 20, 80);

    // CARACTERÍSTICAS PRINCIPALES (Pills)
    doc.setFontSize(10);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    
    const items = [
      { label: 'HABITACIONES', value: (property.habitaciones_dobles || 0) + (property.habitaciones_simples || 0) },
      { label: 'BAÑOS', value: property.banos || 0 },
      { label: 'M² CONST.', value: `${property.metros_construidos || 0} m²` },
      { label: 'ASCENSOR', value: property.ascensor ? 'SÍ' : 'NO' }
    ];

    let startX = 20;
    items.forEach(item => {
      doc.setFont('helvetica', 'bold');
      doc.text(item.label, startX, 95);
      doc.setFont('helvetica', 'normal');
      doc.text(String(item.value), startX, 102);
      startX += 45;
    });

    // CERTIFICADO ENERGÉTICO
    doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(pageWidth - 60, 90, 40, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('CERTIFICADO', pageWidth - 40, 97, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(property.consumo_energetico_letra || 'E', pageWidth - 40, 106, { align: 'center' });

    // DESCRIPCIÓN
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFontSize(12);
    doc.text('DESCRIPCIÓN DEL INMUEBLE', 20, 125);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const splitDesc = doc.splitTextToSize(property.titulo || 'Sin descripción disponible.', pageWidth - 40);
    doc.text(splitDesc, 20, 135);

    // FOOTER
    doc.setFillColor(248, 250, 252);
    doc.rect(0, doc.internal.pageSize.getHeight() - 30, pageWidth, 30, 'F');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Ref: ${property.referencia || 'N/A'} | Generado el ${new Date().toLocaleDateString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 15, { align: 'center' });

    // GUARDAR
    doc.save(`Ficha_${property.referencia || 'propiedad'}.pdf`);
  }
};
