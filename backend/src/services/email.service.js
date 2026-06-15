const transporter = require('../config/mailer');
require('dotenv').config();

async function sendPasswordResetEmail(toEmail, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        from: `"Lexora" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Restablecer contraseña',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2>Restablecer contraseña</h2>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                <p>Hacé clic en el siguiente botón para crear una nueva contraseña. El link es válido por <strong>1 hora</strong>.</p>
                <a href="${resetUrl}"
                   style="display: inline-block; padding: 12px 24px; background-color: #4F46E5;
                          color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                    Restablecer contraseña
                </a>
                <p style="color: #6B7280; font-size: 14px;">
                    Si no solicitaste este cambio, podés ignorar este mail. Tu contraseña no será modificada.
                </p>
                <p style="color: #6B7280; font-size: 12px;">
                    O copiá este link en tu navegador:<br/>
                    <a href="${resetUrl}">${resetUrl}</a>
                </p>
            </div>
        `
    });
}

module.exports = { sendPasswordResetEmail };
