require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Conexión con S3 (las claves las lee del .env)
const s3 = new S3Client({ region: process.env.AWS_REGION });

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

async function createUploadIntent(contentType, size) {
    // Validaciones
    if (!size) {
        throw new Error('EMPTY_FILE');
    }
    if (!TIPOS_PERMITIDOS.includes(contentType)) {
        throw new Error('INVALID_FILE_TYPE');
    }
    if (size > TAMANO_MAXIMO) {
        throw new Error('FILE_TOO_LARGE');
    }

    // Nombre del archivo en S3: carpeta events + la hora actual
    const extension = contentType.split('/')[1];
    const key = `events/${Date.now()}.${extension}`;

    // Lo que se va a permitir subir
    const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: contentType
    });

    // Link temporal para subir (dura 5 minutos = 300 segundos)
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    // Dirección donde va a quedar la imagen
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl };
}

module.exports = { createUploadIntent };