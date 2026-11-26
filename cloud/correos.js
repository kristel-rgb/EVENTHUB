require('dotenv').config();
const { sendEmail } = require('./email');

const FRONTEND = process.env.FRONTEND_URL;

// Diseño común de todos los correos
function plantilla(titulo, contenido) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #4f46e5;">EventHub</h2>
            <h3>${titulo}</h3>
            ${contenido}
            <p style="color: #888; font-size: 12px;">Este correo lo envió EventHub automáticamente.</p>
        </div>
    `;
}

// 1. Verificar correo (enlace válido 24 h)
function correoVerificacion(to, nombre, token) {
    const link = `${FRONTEND}/verificar-correo?token=${token}`;
    const html = plantilla('Confirmá tu correo', `
        <p>Hola ${nombre}, gracias por registrarte.</p>
        <p><a href="${link}">Confirmar mi correo</a></p>
        <p>El enlace vence en 24 horas.</p>
    `);
    return sendEmail(to, 'Confirmá tu correo', html);
}

// 2. Recuperar contraseña (enlace válido 30 min)
function correoRecuperacion(to, nombre, token) {
    const link = `${FRONTEND}/restablecer-contrasena?token=${token}`;
    const html = plantilla('Restablecé tu contraseña', `
        <p>Hola ${nombre}, pediste cambiar tu contraseña.</p>
        <p><a href="${link}">Crear una contraseña nueva</a></p>
        <p>El enlace vence en 30 minutos. Si no lo pediste, ignorá este correo.</p>
    `);
    return sendEmail(to, 'Restablecé tu contraseña', html);
}

// 3. Invitación de una cuenta creada por el Super Admin (enlace válido 48 h)
function correoInvitacion(to, nombre, token) {
    const link = `${FRONTEND}/restablecer-contrasena?token=${token}&invitacion=1`;
    const html = plantilla('Te invitaron a EventHub', `
        <p>Hola ${nombre}, se creó una cuenta para vos en EventHub.</p>
        <p><a href="${link}">Elegir mi contraseña</a></p>
        <p>El enlace vence en 48 horas.</p>
    `);
    return sendEmail(to, 'Invitación a EventHub', html);
}

// 4. Entradas de una reservación confirmada
function correoEntradas(to, nombre, evento, codigos) {
    const lista = codigos.map(codigo => `<li>${codigo}</li>`).join('');
    const html = plantilla('Tus entradas', `
        <p>Hola ${nombre}, tu reservación está confirmada.</p>
        <p><b>${evento.name}</b><br>${evento.date}<br>${evento.location}</p>
        <p>Códigos de tus entradas:</p>
        <ul>${lista}</ul>
        <p><a href="${FRONTEND}/mis-entradas">Ver mis entradas con el código QR</a></p>
    `);
    return sendEmail(to, `Tus entradas para ${evento.name}`, html);
}

// 5. Reservación cancelada
function correoCancelacion(to, nombre, evento, motivo) {
    const html = plantilla('Reservación cancelada', `
        <p>Hola ${nombre}, tu reservación para <b>${evento.name}</b> fue cancelada.</p>
        <p>Motivo: ${motivo}</p>
    `);
    return sendEmail(to, 'Tu reservación fue cancelada', html);
}

// 6. Cambió el evento o se canceló
function correoCambioEvento(to, nombre, evento, cambio) {
    const html = plantilla('Hay cambios en tu evento', `
        <p>Hola ${nombre}, hubo un cambio en <b>${evento.name}</b>.</p>
        <p>${cambio}</p>
    `);
    return sendEmail(to, `Cambio en ${evento.name}`, html);
}

// 7. Aviso de que la contraseña cambió
function correoContrasenaCambiada(to, nombre) {
    const html = plantilla('Tu contraseña cambió', `
        <p>Hola ${nombre}, la contraseña de tu cuenta se cambió.</p>
        <p>Si no fuiste vos, comunicate con el soporte de EventHub.</p>
    `);
    return sendEmail(to, 'Tu contraseña cambió', html);
}

// 8. Recordatorio de un evento próximo
function correoRecordatorio(to, nombre, evento) {
    const html = plantilla('Tu evento se acerca', `
        <p>Hola ${nombre}, te recordamos que pronto es <b>${evento.name}</b>.</p>
        <p>${evento.date}<br>${evento.location}</p>
        <p><a href="${FRONTEND}/mis-entradas">Ver mis entradas</a></p>
    `);
    return sendEmail(to, `Recordatorio: ${evento.name}`, html);
}

module.exports = {
    correoVerificacion,
    correoRecuperacion,
    correoInvitacion,
    correoEntradas,
    correoCancelacion,
    correoCambioEvento,
    correoContrasenaCambiada,
    correoRecordatorio
};