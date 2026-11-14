/**
 * FLYING CHEETAH LABS - SERVERLESS TRANSACTIONAL EMAIL FUNCTION
 * Official Business Recipient: flyingcheetah.agency@gmail.com
 * Handles:
 *  - Client OTP Security Verification Emails (Password Reset & Password Change)
 *  - Lead Submissions
 *  - User Login Alerts
 */

const path = require('path');

function _resolveHelper(mod) {
    const candidates = [
        './' + mod,
        '../../api/' + mod,
        '../api/' + mod,
        './api/' + mod
    ];
    if (typeof __dirname !== 'undefined') {
        candidates.push(path.join(__dirname, mod));
    }
    if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
        candidates.push(path.join(process.cwd(), 'flying-cheetah', 'api', mod));
        candidates.push(path.join(process.cwd(), 'api', mod));
    }
    for (const c of candidates) {
        try { return require(c); } catch (_) {}
    }
    return require('./' + mod);
}

const { sendMail, escapeHtml } = _resolveHelper('_mailer');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const OFFICIAL_AGENCY_EMAIL = process.env.FOUNDER_NOTIFY_EMAIL || 'flyingcheetah.agency@gmail.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Flying Cheetah <onboarding@resend.dev>';

// Supabase Cloud Configuration for Server-Verified Password Reset & Update
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txqtkpxdyoatzdgkcsry.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cXRrcHhkeW9hdHpkZ2tjc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mzk5NDksImV4cCI6MjEwODQxNTk0OX0.TuGGpGZKHOhvkcpv02W_R-2wwuXykBTdL1iXa9G1qFE';

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
        const methodErr = JSON.stringify({ error: 'Method Not Allowed' });
        if (res.writeHead) {
            res.writeHead(405, headers);
            res.end(methodErr);
            return;
        }
        return { statusCode: 405, headers, body: methodErr };
    }

    try {
        let body = req.body || {};
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (_) { body = {}; }
        }

        // Honeypot anti-spam check
        if (body.honeypot) {
            const spamBody = JSON.stringify({ success: true, message: 'Filtered' });
            if (res.writeHead) {
                res.writeHead(200, headers);
                res.end(spamBody);
                return;
            }
            return { statusCode: 200, headers, body: spamBody };
        }

        const { type = 'lead_submission' } = body;
        let recipientEmail = OFFICIAL_AGENCY_EMAIL;
        let emailSubject = '';
        let emailHtml = '';
        let emailText = '';

        const now = new Date();
        const timestamp = now.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        if (type === 'otp_verification') {
            // CLIENT PASSWORD RESET / UPDATE OTP VERIFICATION
            const { email, otp_code, action } = body;
            if (!email || !otp_code) {
                const errResp = JSON.stringify({ error: 'Missing recipient email or otp_code.' });
                if (res.writeHead) {
                    res.writeHead(400, headers);
                    res.end(errResp);
                    return;
                }
                return { statusCode: 400, headers, body: errResp };
            }

            recipientEmail = String(email).trim().toLowerCase();
            const actionLabel = action ? String(action).trim() : 'Password Reset';
            const safeAction = escapeHtml(actionLabel);
            const safeOtp = escapeHtml(otp_code);

            // Ingest OTP to Supabase for secure server-side verification fallback
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/rpc/fc_store_password_otp`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        p_email: recipientEmail,
                        p_otp: String(otp_code).trim()
                    })
                });
            } catch (sbOtpErr) {
                console.error('[Supabase OTP Store Notice]:', sbOtpErr.message);
            }

            emailSubject = `Flying Cheetah Verification Code: ${String(otp_code).replace(/[\r\n]+/g, '')}`;
            emailText = `Your Flying Cheetah ${safeAction} verification code is: ${otp_code}. Valid for 10 minutes. Do not share this code with anyone.`;
            emailHtml = `
            <!DOCTYPE html>
            <html>
            <body style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; padding: 32px 16px; margin: 0;">
                <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
                    <div style="background: #121624; padding: 24px 32px; text-align: center;">
                        <div style="color: #ff6838; font-weight: 800; font-size: 18px; letter-spacing: 0.5px;">FLYING CHEETAH</div>
                        <div style="color: #94a3b8; font-size: 12px; margin-top: 4px;">Security Verification</div>
                    </div>
                    <div style="padding: 32px;">
                        <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 800;">${safeAction} Verification</h2>
                        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                            Use the one-time security code below to complete your ${safeAction.toLowerCase()}. This code is valid for <strong>10 minutes</strong>.
                        </p>
                        <div style="background: #fff7ed; border: 2px dashed #fdba74; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
                            <div style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #ea580c;">${safeOtp}</div>
                        </div>
                        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                            If you did not request this verification code, you can safely ignore this email. Your account remains secure.
                        </p>
                    </div>
                    <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; color: #64748b; font-size: 11px;">
                        &copy; 2026 Flying Cheetah Revenue Engine &bull; Automated Security Dispatch
                    </div>
                </div>
            </body>
            </html>`;
        } else if (type === 'login_alert') {
            // USER LOGIN / REGISTRATION NOTIFICATION
            const { name, email, auth_method, role, trial_active, source_page } = body || {};
            const userName = name || email?.split('@')[0] || 'User';
            const safeUserName = escapeHtml(userName);
            const safeEmail = escapeHtml(email);
            const safeAuthMethod = escapeHtml(auth_method || 'Google OAuth 2.0');
            const safeSourcePage = escapeHtml(source_page || 'Website Navigation');

            emailSubject = String(body.subject || `🔐 User Login Alert: ${userName} (${email})`).replace(/[\r\n]+/g, ' ');
            emailText = `User Login Alert: ${userName} (${email}) via ${auth_method || 'Auth'} at ${timestamp}`;
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
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${safeUserName}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Email Address:</td>
                                <td style="padding: 10px 0; color: #ff6838; font-weight: 600;">${safeEmail}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Login Method:</td>
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">${safeAuthMethod}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Account Status:</td>
                                <td style="padding: 10px 0; color: #16a34a; font-weight: bold;">
                                    ${trial_active ? '✨ Live Sandbox Active' : (role === 'admin' ? '🛡️ Administrator' : 'Client Account')}
                                </td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Login Time:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${timestamp} (IST)</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Access Route:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${safeSourcePage}</td>
                            </tr>
                        </table>

                        <div style="margin-top: 30px; text-align: center;">
                            <a href="https://flying-cheetah.vercel.app/admin.html" style="display: inline-block; background-color: #121624; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none;">
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

            const safeName = escapeHtml(name);
            const safeEmail = escapeHtml(email);
            const safePhone = escapeHtml(phone);
            const safeService = escapeHtml(chosenService);
            const safeMessage = escapeHtml(message || 'No additional notes provided.');
            const safeSourcePage = escapeHtml(source_page || 'Website');

            const cleanPhone = String(phone).replace(/[^0-9]/g, '');
            const waText = encodeURIComponent(`Hi ${name || ''}, this is Flying Cheetah following up on your ${chosenService} inquiry.`);
            const waLink = `https://wa.me/${cleanPhone}?text=${waText}`;

            emailSubject = `🚨 New Lead from Flying Cheetah: ${String(name).replace(/[\r\n]+/g, ' ')}`;
            emailText = `New Lead from Flying Cheetah: ${name} (${email}, ${phone}) - Service: ${chosenService}`;
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
                            🚨 New Lead from Flying Cheetah: ${safeName}
                        </h1>
                    </div>

                    <div style="padding: 32px;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                            <tr>
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600; width: 140px;">Lead Name:</td>
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold; font-size: 15px;">${safeName}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">WhatsApp / Phone:</td>
                                <td style="padding: 10px 0; color: #0f172a; font-weight: bold;">
                                    <a href="tel:${safePhone}" style="color: #0f172a; text-decoration: none;">${safePhone}</a>
                                </td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Work Email:</td>
                                <td style="padding: 10px 0; color: #2563eb;">
                                    <a href="mailto:${safeEmail}" style="color: #ff6838; text-decoration: none; font-weight: 600;">${safeEmail}</a>
                                </td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Service Needed:</td>
                                <td style="padding: 10px 0; color: #ea580c; font-weight: 800;">${safeService}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Store / Notes:</td>
                                <td style="padding: 10px 0; color: #334155; line-height: 1.5;">${safeMessage}</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Submission Time:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${timestamp} (IST)</td>
                            </tr>
                            <tr style="border-top: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Source Page:</td>
                                <td style="padding: 10px 0; color: #64748b; font-size: 12px;">${safeSourcePage}</td>
                            </tr>
                        </table>
                        
                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${escapeHtml(waLink)}" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 14px; text-decoration: none; box-shadow: 0 10px 20px -5px rgba(37,211,102,0.4);">
                                💬 Chat with ${safeName} on WhatsApp Now
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

        let dispatched = false;

        // 1. Primary Dispatch via Native TLS SMTPS Transport
        const smtpResult = await sendMail({
            to: recipientEmail,
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
            fromName: type === 'otp_verification' ? 'Flying Cheetah Security' : 'Flying Cheetah Engine'
        });
        dispatched = smtpResult.success;

        // 2. Fallback Dispatch via Resend API (if configured and not yet dispatched)
        if (!dispatched && RESEND_API_KEY) {
            try {
                const response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: FROM_EMAIL,
                        to: [recipientEmail],
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
            recipient: recipientEmail,
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
