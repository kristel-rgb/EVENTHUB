const { createUploadIntent } = require('./storage');

async function probar() {
    // 1. Pedir el permiso para subir (como lo haría el backend)
    const contenido = Buffer.from('archivo de prueba');
    const { uploadUrl, fileUrl } = await createUploadIntent('image/png', contenido.length);
    console.log('Link para subir:', uploadUrl);

    // 2. Subir el archivo con ese link (como lo haría el frontend)
    const respuesta = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: contenido
    });

    console.log('Status de S3:', respuesta.status);
    console.log('Archivo guardado en:', fileUrl);
}

probar();