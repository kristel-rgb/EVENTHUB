const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});

// Arma la respuesta que entiende API Gateway
function respuesta(statusCode, datos) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    };
}

// Un valor del CSV: si tiene punto y coma, comillas o salto de línea, va entre comillas
function valorCsv(valor) {
    const texto = String(valor ?? '');
    if (texto.includes(';') || texto.includes('"') || texto.includes('\n')) {
        return '"' + texto.replace(/"/g, '""') + '"';
    }
    return texto;
}

// Crea el CSV (con BOM para que Excel muestre bien las tildes)
function crearCsv(columns, rows) {
    const lineas = [columns, ...rows].map(fila => fila.map(valorCsv).join(';'));
    return Buffer.from('\uFEFF' + lineas.join('\r\n'), 'utf8');
}

// Crea el PDF con una tabla sencilla
function crearPdf(title, columns, rows) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
        const partes = [];
        doc.on('data', parte => partes.push(parte));
        doc.on('end', () => resolve(Buffer.concat(partes)));

        // Título y fecha
        doc.font('Helvetica-Bold').fontSize(16).text(title);
        const ahora = new Date().toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
        doc.font('Helvetica').fontSize(9).text(`Generado: ${ahora}`);
        doc.moveDown();

        // Ancho de cada columna
        const ancho = (doc.page.width - 60) / columns.length;
        let y = doc.y;

        function dibujarFila(fila, negrita) {
            doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
            fila.forEach((valor, i) => {
                // La letra del PDF no tiene el símbolo ₡, por eso se cambia por CRC
                const texto = String(valor ?? '').replace(/₡/g, 'CRC ');
                doc.text(texto, 30 + i * ancho, y, { width: ancho - 4, height: 12, ellipsis: true });
            });
            y += 16;
            if (y > doc.page.height - 40) {
                doc.addPage();
                y = 30;
            }
        }

        dibujarFila(columns, true);
        rows.forEach(fila => dibujarFila(fila, false));
        doc.end();
    });
}

// Nombre del archivo a partir del título: "Reservaciones de Festival" -> "reservaciones-de-festival"
function nombreArchivo(title) {
    return title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quita tildes
        .replace(/[^a-z0-9]+/g, '-')                         // espacios y símbolos -> guion
        .replace(/^-|-$/g, '');                              // sin guiones al inicio ni al final
}

exports.handler = async (event) => {
    // Si viene por API Gateway, los datos están en event.body (como texto)
    let datos;
    try {
        datos = event.body ? JSON.parse(event.body) : event;
    } catch (error) {
        return respuesta(400, { error: 'VALIDATION_ERROR', message: 'El cuerpo no es un JSON válido' });
    }

    const { format, title, columns, rows } = datos;

    // Validaciones
    if (!['csv', 'pdf'].includes(format) || !title || !Array.isArray(columns) || !Array.isArray(rows)) {
        return respuesta(400, { error: 'VALIDATION_ERROR', message: 'Faltan format, title, columns o rows' });
    }

    // 1. Generar el archivo
    const archivo = format === 'csv'
        ? crearCsv(columns, rows)
        : await crearPdf(title, columns, rows);

    const fileName = `${nombreArchivo(title)}.${format}`;
    const s3Key = `reports/${Date.now()}-${fileName}`;

    // 2. Guardarlo en S3
    await s3.send(new PutObjectCommand({
        Bucket: process.env.BUCKET,
        Key: s3Key,
        Body: archivo,
        ContentType: format === 'csv' ? 'text/csv; charset=utf-8' : 'application/pdf'
    }));

    // Solo se registra la ruta, nunca los datos de los clientes
    console.log('Reporte guardado:', s3Key);

    // 3. Devolver dónde quedó
    return respuesta(200, { s3Key, fileName });
};