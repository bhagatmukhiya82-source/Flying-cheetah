/**
 * FLYING CHEETAH LABS - SERVERLESS DEMO BOOKINGS & DISPATCH ENGINE
 * Endpoints: /api/v1/demos or /api/demos
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

const { verifyAdmin } = _resolveHelper('_auth');
const { sendMail, escapeHtml } = _resolveHelper('_mailer');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txqtkpxdyoatzdgkcsry.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cXRrcHhkeW9hdHpkZ2tjc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mzk5NDksImV4cCI6MjEwODQxNTk0OX0.TuGGpGZKHOhvkcpv02W_R-2wwuXykBTdL1iXa9G1qFE';
const OFFICIAL_ADMIN_EMAIL = process.env.FOUNDER_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || 'flyingcheetah.agency@gmail.com';

async function sendSmtpDemoAlert(demo) {
    const recipient = OFFICIAL_ADMIN_EMAIL || process.env.SMTP_USER;
    if (!recipient) {
        console.warn('[Demos] No notification recipient configured; skipping demo email.');
        return { success: false, error: 'Recipient not configured' };
    }

    const safeName = escapeHtml(demo.name);
    const safeCompany = escapeHtml(demo.company || 'Founder / D2C Store');
    const safePhone = escapeHtml(demo.phone);
    const safeEmail = escapeHtml(demo.email);
    const rawModules = Array.isArray(demo.modules) ? demo.modules.join(', ') : (demo.modules || 'All Suites');
    const safeModules = escapeHtml(rawModules);
    const safeNotes = escapeHtml(demo.notes || 'None');

    const cleanPhone = String(demo.phone || '').replace(/[^0-9]/g, '');
    const waText = encodeURIComponent(`Hi ${demo.name || ''}, confirming your Flying Cheetah live architecture demo.`);
    const waLink = `https://wa.me/${cleanPhone}?text=${waText}`;

    const html = `
    <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #121624; padding: 20px 24px; color: #ffffff;">
            <span style="color: #ff6838; font-weight: 800; font-size: 11px; text-transform: uppercase;">📅 Live Demo Confirmed</span>
            <h2 style="margin: 6px 0 0; font-size: 20px;">${safeName} &bull; ${safeCompany}</h2>
        </div>
        <div style="padding: 24px;">
            <p><b>Phone:</b> <a href="tel:${safePhone}">${safePhone}</a></p>
            <p><b>Work Email:</b> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            <p><b>Company / Store:</b> ${safeCompany}</p>
            <p><b>Modules:</b> <span style="color: #ea580c; font-weight: bold;">${safeModules}</span></p>
            <p><b>Notes:</b> ${safeNotes}</p>
            <div style="margin-top: 20px;">
                <a href="${escapeHtml(waLink)}" style="display: inline-block; background: #25d366; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold;">💬 Connect on WhatsApp</a>
            </div>
        </div>
    </div>`;

    return sendMail({
        to: recipient,
        subject: `📅 New 1-on-1 Demo Booked: ${String(demo.name || '').replace(/[\r\n]+/g, ' ')} (${String(demo.company || 'D2C Store').replace(/[\r\n]+/g, ' ')})`,
        fromName: 'Flying Cheetah Engine',
        text: `New Demo Booking: ${demo.name} (${demo.phone}, ${demo.email}) - Company: ${demo.company || 'None'} - Modules: ${rawModules}`,
        html
    });
}

module.exports = async function handler(req, res) {
    const supabaseUrl = process.env.SUPABASE_URL || SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    const sendJson = (status, data) => {
        const body = JSON.stringify(data);
        if (res.writeHead) {
            res.writeHead(status, headers);
            res.end(body);
            return;
        }
        return { statusCode: status, headers, body };
    };

    if (req.method === 'OPTIONS') {
        if (res.writeHead) {
            res.writeHead(200, headers);
            res.end();
            return;
        }
        return { statusCode: 200, headers, body: '' };
    }

    try {
        // 1. CREATE DEMO BOOKING (POST) - Public Booking
        if (req.method === 'POST') {
            let body = req.body || {};
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) { body = {}; }
            }

            if (body.honeypot) {
                return sendJson(201, {
                    id: 'hp-bot',
                    name: body.name,
                    status: 'confirmed'
                });
            }

            const { name, email, phone, company, modules, scheduled_time, notes } = body;
            if (!name || !email || !phone) {
                return sendJson(400, { error: 'Name, email, and phone are required.' });
            }

            const record = {
                name: String(name).trim(),
                email: String(email).trim().toLowerCase(),
                phone: String(phone).trim(),
                company: company ? String(company).trim() : '',
                modules: Array.isArray(modules) ? modules : [modules || 'All Automation Suites'],
                scheduled_time: scheduled_time || new Date().toISOString(),
                status: 'confirmed',
                notes: notes ? String(notes).trim() : ''
            };

            if (!supabaseUrl || !supabaseKey) {
                return sendJson(500, { error: 'Database service configuration missing.' });
            }

            let savedDemo = null;
            let sbErrorMsg = null;
            try {
                const sbResp = await fetch(`${supabaseUrl}/rest/v1/demo_bookings`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(record)
                });
                if (sbResp.ok) {
                    const data = await sbResp.json();
                    if (Array.isArray(data) && data.length > 0) savedDemo = data[0];
                    else sbErrorMsg = 'Empty response from database';
                } else {
                    sbErrorMsg = `Supabase insert failed with status ${sbResp.status}`;
                }
            } catch (err) {
                sbErrorMsg = err.message;
            }

            // Return 502/500 if database operation fails
            if (!savedDemo) {
                return sendJson(502, {
                    error: 'Database persistence error: ' + (sbErrorMsg || 'Failed to record demo booking.')
                });
            }

            sendSmtpDemoAlert(savedDemo).catch(() => {});

            return sendJson(201, savedDemo);
        }

        // 2. LIST DEMOS (GET) - Protected Admin Endpoint
        if (req.method === 'GET') {
            const admin = verifyAdmin(req, res, headers);
            if (!admin) return;

            if (!supabaseUrl || !supabaseKey) {
                return sendJson(500, { error: 'Database service configuration missing.' });
            }

            let sbResp;
            try {
                sbResp = await fetch(`${supabaseUrl}/rest/v1/demo_bookings?select=*&order=created_at.desc&limit=50`, {
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    }
                });
            } catch (err) {
                return sendJson(502, { error: 'Database query connection failed: ' + err.message });
            }

            if (!sbResp.ok) {
                return sendJson(502, { error: `Database query failed with status ${sbResp.status}` });
            }

            const items = await sbResp.json();
            return sendJson(200, { total: items.length, items });
        }

        return sendJson(405, { error: 'Method Not Allowed' });

    } catch (err) {
        console.error('[Demos API Error]:', err);
        return sendJson(500, { error: err.message || 'Internal Server Error' });
    }
};
