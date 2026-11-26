require('dotenv').config();
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

// Conexión con SES (las claves las lee del .env)
const ses = new SESv2Client({ region: process.env.AWS_REGION });

// Manda un correo
async function sendEmail(to, subject, html) {
    const command = new SendEmailCommand({
        FromEmailAddress: process.env.SES_FROM,
        Destination: {
            ToAddresses: [to]
        },
        Content: {
            Simple: {
                Subject: { Data: subject, Charset: 'UTF-8' },
                Body: {
                    Html: { Data: html, Charset: 'UTF-8' }
                }
            }
        }
    });

    await ses.send(command);
}

module.exports = { sendEmail };