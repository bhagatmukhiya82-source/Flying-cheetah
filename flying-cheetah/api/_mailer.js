/**
 * FLYING CHEETAH LABS - SECURE TRANSACTIONAL MAILER & ESCAPING UTILITY
 * CommonJS Zero-Dependency Module (Node.js tls + crypto)
 * Strict TLS Certificate Verification (rejectUnauthorized: true)
 * Location: api/_mailer.js
 */

const tls = require('tls');
const crypto = require('crypto');

/**
 * Escapes HTML control characters to prevent HTML/XSS injection in emails
 * @param {any} str - Input value to escape
 * @returns {string} Sanitized string safe for HTML interpolation
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Strips carriage returns and newlines to prevent SMTP header injection
 * @param {any} str - Header string (e.g. Subject)
 * @returns {string} Single-line sanitized header
 */
function sanitizeHeader(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[\r\n]+/g, ' ').trim();
}

/**
 * Dispatches an email via secure TLS SMTPS
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plaintext body fallback
 * @param {string} [options.fromName] - Sender display name
 * @param {string} [options.fromEmail] - Sender email override (must match authenticated account)
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
function sendMail({ to, subject, html, text, fromName = 'Flying Cheetah', fromEmail }) {
    return new Promise((resolve) => {
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
        const host = process.env.SMTP_HOST || 'smtp.gmail.com';
        const port = parseInt(process.env.SMTP_PORT || '465', 10);

        // Fail gracefully if SMTP is not configured in environment
        if (!user || !pass) {
            console.warn('[Mailer] SMTP credentials not configured (SMTP_USER or SMTP_PASS missing). Email dispatch skipped.');
            return resolve({
                success: false,
                error: 'SMTP credentials not configured in environment'
            });
        }

        if (!to || typeof to !== 'string' || !to.includes('@')) {
            console.warn('[Mailer] Invalid or missing recipient address:', to);
            return resolve({
                success: false,
                error: 'Invalid recipient email address'
            });
        }

        const sender = fromEmail || user;
        const safeSubject = sanitizeHeader(subject || 'Notification from Flying Cheetah');
        const safeFromName = sanitizeHeader(fromName);
        const cleanTo = sanitizeHeader(to);

        const messageId = `<fc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}@${host}>`;
        const boundary = `----=_Part_FC_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const rawMessage = [
            `From: "${safeFromName}" <${sender}>`,
            `To: <${cleanTo}>`,
            `Subject: ${safeSubject}`,
            `Message-ID: ${messageId}`,
            `Date: ${new Date().toUTCString()}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            text || safeSubject,
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            `Content-Transfer-Encoding: 8bit`,
            ``,
            html || `<p>${escapeHtml(text || safeSubject)}</p>`,
            ``,
            `--${boundary}--`,
            `.`
        ].join('\r\n');

        const commands = [
            `EHLO flyingcheetah.agency`,
            `AUTH LOGIN`,
            Buffer.from(user).toString('base64'),
            Buffer.from(pass).toString('base64'),
            `MAIL FROM:<${user}>`,
            `RCPT TO:<${cleanTo}>`,
            `DATA`,
            rawMessage,
            `QUIT`
        ];

        let step = 0;
        let buffer = '';
        let socket;

        // Strict TLS socket connection with certificate verification
        try {
            socket = tls.connect({
                host: host,
                port: port,
                rejectUnauthorized: true,
                servername: host
            });
        } catch (connErr) {
            console.error('[Mailer] Socket connection error:', connErr.message);
            return resolve({ success: false, error: connErr.message });
        }

        const timeout = setTimeout(() => {
            if (socket && !socket.destroyed) {
                socket.destroy();
            }
            console.error('[Mailer] SMTP connection timed out after 12000ms');
            resolve({ success: false, error: 'SMTP connection timeout' });
        }, 12000);

        socket.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\r\n');
            buffer = lines.pop(); // Retain incomplete line

            for (const line of lines) {
                if (line.length >= 4 && line[3] === '-') continue; // Multi-line continuation
                const code = parseInt(line.slice(0, 3), 10);

                if (code >= 400) {
                    clearTimeout(timeout);
                    if (!socket.destroyed) socket.destroy();
                    console.error(`[Mailer] SMTP Error ${code}: ${line}`);
                    return resolve({ success: false, error: `SMTP Error ${code}: ${line}` });
                }

                if (step < commands.length) {
                    const nextCmd = commands[step++];
                    socket.write(nextCmd + '\r\n');
                } else {
                    clearTimeout(timeout);
                    if (!socket.destroyed) socket.end();
                    return resolve({ success: true, messageId });
                }
            }
        });

        socket.on('error', (err) => {
            clearTimeout(timeout);
            console.error('[Mailer] TLS Socket Error:', err.message);
            resolve({ success: false, error: err.message });
        });

        socket.on('end', () => {
            clearTimeout(timeout);
        });
    });
}

/**
 * Backward-compatible helper returning Promise<boolean>
 */
async function sendSmtpEmail(options) {
    const result = await sendMail(options);
    return result.success;
}

module.exports = {
    escapeHtml,
    sanitizeHeader,
    sendMail,
    sendSmtpEmail
};
