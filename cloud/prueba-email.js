require('dotenv').config();
const { sendEmail } = require('./email');

async function probar() {
    await sendEmail(
        process.env.SES_FROM,
        'Prueba de EventHub',
        '<h1>¡Hola!</h1><p>Este correo lo mandó EventHub con Amazon SES.</p>'
    );
    console.log('Correo enviado');
}

probar();