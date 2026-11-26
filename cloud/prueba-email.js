require('dotenv').config();
const correos = require('./correos');

async function probar() {
    const yo = process.env.SES_FROM;
    const evento = {
        name: 'Noche de jazz en vivo',
        date: '20 de diciembre de 2026, 8:00 p.m.',
        location: 'Teatro Nacional, San José'
    };

    await correos.correoVerificacion(yo, 'Kristel', 'token-de-prueba');
    await correos.correoRecuperacion(yo, 'Kristel', 'token-de-prueba');
    await correos.correoInvitacion(yo, 'Kristel', 'token-de-prueba');
    await correos.correoEntradas(yo, 'Kristel', evento, ['EH-1042', 'EH-1043']);
    await correos.correoCancelacion(yo, 'Kristel', evento, 'La cancelaste desde Mis entradas');
    await correos.correoCambioEvento(yo, 'Kristel', evento, 'La hora cambió a las 9:00 p.m.');
    await correos.correoContrasenaCambiada(yo, 'Kristel');
    await correos.correoRecordatorio(yo, 'Kristel', evento);

    console.log('Se enviaron los 8 correos');
}

probar();