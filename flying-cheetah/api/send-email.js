/**
 * FLYING CHEETAH LABS - SERVERLESS TRANSACTIONAL EMAIL FUNCTION
 * Official Business Recipient: flyingcheetah.agency@gmail.com
 * Handles: Lead Submissions, 14-Day Trial Registrations & User Login Alerts ($0/mo via Resend API).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const OFFICIAL_AGENCY_EMAIL = process.env.FOUNDER_NOTIFY_EMAIL || 'flyingcheetah.agency@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Flying Cheetah <onboarding@resend.dev>';

module.exports = async function handler(req, res) {
    // 1. CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        if (res.writeHead) {
            res.writeHead(200, headers);
            res.end();
            return;
        }
        return { statusCode: 200, headers, body: '' };
    }

    if (req.method !== 'POST') {
        const errorBody = JSON.stringify({ error: 'Method Not Allowed' });
        if (res.writeHead) {
            res.writeHead(405, headers);
            res.end(errorBody);
            return;
        }
        return { statusCode: 405, headers, body: errorBody };
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }

        const type = body.type || 'lead_submission';
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        let emailSubject = '';
        let emailHtml = '';

        if (type === 'login_alert') {
            // USER LOGIN / REGISTRATION NOTIFICATION
            const { name, email, auth_method, role, trial_active, source_page } = body || {};
            const userName = name || email?.split('@')[0] || 'User';

            emailSubject = body.subject || `🔐 User Login Alert: ${userName} (${email})`;
            emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 30px 15px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);">
                    <div style="background: linear-gradient(135deg, #121624 0%, #1e2640 100%); padding: 28px 32px; border-bottom: 3px solid #ff6838;">
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; color: #ff6838;">
                            🔐 Authentication Event
                        </div>
                        <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 8px 0 0; line-height: 1.2;">
                            User Login / Access Alert
                        </h1>
                    </div>

                    <div style="padding: 32px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 140px;">User Name:</td>
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${userName}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email Address:</td>
                                <td style="padding: 10px 0; color: #ff6838; font-weight: 600;">${email}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Login Method:</td>
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">${auth_method || 'Google OAuth 2.0'}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Account Status:</td>
                                <td style="padding: 10px 0; color: #16a34a; font-weight: bold;">
                                    ${trial_active ? '✨ 14-Day Free Trial Active' : (role === 'admin' ? '🛡️ Administrator' : 'Client Account')}
                                </td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Login Time:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${timestamp} (IST)</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Access Route:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${source_page || 'Website Navigation'}</td>
                            </tr>
                        </table>

                        <div style="margin-top: 30px; text-align: center;">
                            <a href="https://flyingcheetah.com/admin.html" style="display: inline-block; background-color: #121624; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">
                                Open Flying Cheetah Admin Dashboard →
                            </a>
                        </div>
                    </div>

                    <div style="background-color: #f8fafc; padding: 14px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                        Security Alert dispatched directly to <b>${OFFICIAL_AGENCY_EMAIL}</b>.
                    </div>
                </div>
            </body>
            </html>`;
        } else {
            // LEAD FORM SUBMISSION NOTIFICATION
            const { name, email, phone, service, service_interested, message, source_page } = body || {};
            const chosenService = service || service_interested || 'Operations Audit';

            if (!name || !email || !phone) {
                const errResp = JSON.stringify({ error: 'Missing required lead parameters (name, email, phone).' });
                if (res.writeHead) {
                    res.writeHead(400, headers);
                    res.end(errResp);
                    return;
                }
                return { statusCode: 400, headers, body: errResp };
            }

            const cleanPhone = String(phone).replace(/[^0-9]/g, '');
            const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${name}, this is Flying Cheetah following up on your ${chosenService} inquiry.`)}`;

            emailSubject = `🚨 New Lead from Flying Cheetah: ${name}`;
            emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 30px 15px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06);">
                    <div style="background: linear-gradient(135deg, #121624 0%, #1e2640 100%); padding: 28px 32px; border-bottom: 3px solid #ff6838;">
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; color: #ff6838;">
                            ⚡ New Lead Inbound Alert
                        </div>
                        <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 8px 0 0; line-height: 1.2;">
                            🚨 New Lead from Flying Cheetah: ${name}
                        </h1>
                    </div>

                    <div style="padding: 32px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 140px;">Lead Name:</td>
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${name}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">WhatsApp / Phone:</td>
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">
                                    <a href="tel:${phone}" style="color: #0f172a; text-decoration: none;">${phone}</a>
                                </td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Work Email:</td>
                                <td style="padding: 10px 0; color: #2563eb;">
                                    <a href="mailto:${email}" style="color: #ff6838; text-decoration: none; font-weight: 600;">${email}</a>
                                </td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Service Needed:</td>
                                <td style="padding: 10px 0; color: #ea580c; font-weight: 800;">${chosenService}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Store / Notes:</td>
                                <td style="padding: 10px 0; color: #334155; line-height: 1.5;">${message || 'No additional notes provided.'}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Submission Time:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${timestamp} (IST)</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Source Page:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${source_page || 'Website'}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${waLink}" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none; box-shadow: 0 10px 20px -5px rgba(37,211,102,0.4);">
                                💬 Chat with ${name} on WhatsApp Now
                            </a>
                        </div>
                    </div>

                    <div style="background-color: #f8fafc; padding: 14px 32px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
                        Delivered automatically to <b>${OFFICIAL_AGENCY_EMAIL}</b> by Flying Cheetah Engine.
                    </div>
                </div>
            </body>
            </html>`;
        }

        // Dispatch via Resend API (if API Key provided)
        let dispatched = false;
        if (RESEND_API_KEY) {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: FROM_EMAIL,
                        to: [OFFICIAL_AGENCY_EMAIL],
                        subject: emailSubject,
                        html: emailHtml
                    })
                });
                dispatched = response.ok;
            } catch (err) {
                console.error('[Resend Error]:', err);
            }
        }

        const successBody = JSON.stringify({ 
            success: true, 
            dispatched, 
            recipient: OFFICIAL_AGENCY_EMAIL,
            type 
        });

        if (res.writeHead) {
            res.writeHead(200, headers);
            res.end(successBody);
            return;
        }
        return { statusCode: 200, headers, body: successBody };

    } catch (error) {
        console.error('[Email Handler Error]:', error);
        const errResp = JSON.stringify({ error: error.message || 'Internal Server Error' });
        if (res.writeHead) {
            res.writeHead(500, headers);
            res.end(errResp);
            return;
        }
        return { statusCode: 500, headers, body: errResp };
    }
};
