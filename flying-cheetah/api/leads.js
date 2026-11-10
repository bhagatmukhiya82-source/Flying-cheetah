/**
 * FLYING CHEETAH LABS - SERVERLESS LEADS MANAGEMENT & CRM INGESTION
 * Endpoints: /api/v1/leads or /api/leads
 */

const tls = require('tls');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txqtkpxdyoatzdgkcsry.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cXRrcHhkeW9hdHpkZ2tjc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mzk5NDksImV4cCI6MjEwODQxNTk0OX0.TuGGpGZKHOhvkcpv02W_R-2wwuXykBTdL1iXa9G1qFE';

const SMTP_USER = process.env.SMTP_USER || 'bhagatmukhiya82@gmail.com';
const SMTP_PASS = process.env.SMTP_PASSWORD || 'sryzptfthzfeeeco';
const OFFICIAL_ADMIN_EMAIL = process.env.FOUNDER_NOTIFY_EMAIL || 'flyingcheetah.agency@gmail.com';

function sendSmtpLeadAlert(lead) {
    return new Promise((resolve, reject) => {
        if (!SMTP_USER || !SMTP_PASS) return resolve(false);

        const socket = tls.connect(465, 'smtp.gmail.com', { rejectUnauthorized: false });
        let step = 0;
        let buffer = '';

        const timeout = setTimeout(() => {
            socket.destroy();
            resolve(false);
        }, 10000);

        const boundary = '----=_Part_FC_LEAD_' + Date.now();
        const subject = `🚨 New Lead from Flying Cheetah: ${lead.name}`;
        const cleanPhone = String(lead.phone || '').replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${lead.name}, Flying Cheetah following up on your ${lead.service || 'store automation'} inquiry.`)}`;

        const html = `
        <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: #121624; padding: 20px 24px; color: #ffffff;">
                <span style="color: #ff6838; font-weight: 800; font-size: 11px; text-transform: uppercase;">⚡ New Lead Inbound Alert</span>
                <h2 style="margin: 6px 0 0; font-size: 20px;">${lead.name}</h2>
            </div>
            <div style="padding: 24px;">
                <p><b>Phone:</b> <a href="tel:${lead.phone}">${lead.phone}</a></p>
                <p><b>Email:</b> <a href="mailto:${lead.email}">${lead.email}</a></p>
                <p><b>Service Interested:</b> <span style="color: #ea580c; font-weight: bold;">${lead.service || lead.service_interested || 'Operations Audit'}</span></p>
                <p><b>Message / Notes:</b> ${lead.message || 'No additional notes'}</p>
                <p><b>Source Page:</b> ${lead.source_page || 'Website'}</p>
                <div style="margin-top: 20px;">
                    <a href="${waLink}" style="display: inline-block; background: #25d366; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold;">💬 Open WhatsApp Chat</a>
                </div>
            </div>
        </div>`;

        const message = [
            `From: "Flying Cheetah Engine" <${SMTP_USER}>`,
            `To: <${OFFICIAL_ADMIN_EMAIL}>`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            ``,
            `New Lead: ${lead.name} (${lead.phone}, ${lead.email})`,
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            ``,
            html,
            ``,
            `--${boundary}--`,
            `.`
        ].join('\r\n');

        const commands = [
            `EHLO flyingcheetah.agency`,
            `AUTH LOGIN`,
            Buffer.from(SMTP_USER).toString('base64'),
            Buffer.from(SMTP_PASS).toString('base64'),
            `MAIL FROM:<${SMTP_USER}>`,
            `RCPT TO:<${OFFICIAL_ADMIN_EMAIL}>`,
            `DATA`,
            message,
            `QUIT`
        ];

        socket.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\r\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (line.length >= 4 && line[3] === '-') continue;
                const code = parseInt(line.slice(0, 3), 10);
                if (code >= 400) {
                    clearTimeout(timeout);
                    socket.destroy();
                    return resolve(false);
                }
                if (step < commands.length) {
                    socket.write(commands[step++] + '\r\n');
                } else {
                    clearTimeout(timeout);
                    socket.end();
                    resolve(true);
                }
            }
        });

        socket.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
        });
    });
}

module.exports = async function handler(req, res) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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
        // 1. CREATE LEAD (POST)
        if (req.method === 'POST') {
            let body = req.body || {};
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) { body = {}; }
            }

            // Honeypot anti-spam check
            if (body.honeypot) {
                return sendJson(201, {
                    id: 'bot-filtered',
                    name: body.name,
                    email: body.email,
                    status: 'closed'
                });
            }

            const { name, email, phone, service, service_interested, message, source_page } = body;
            if (!name || !email || !phone) {
                return sendJson(400, { error: 'Name, email, and phone are required.' });
            }

            const chosenService = service || service_interested || 'General Consultation';
            const leadRecord = {
                name: String(name).trim(),
                email: String(email).trim().toLowerCase(),
                phone: String(phone).trim(),
                service: chosenService,
                service_interested: chosenService,
                message: message ? String(message).trim() : '',
                source_page: source_page || 'website',
                status: 'new'
            };

            // Ingest to Supabase leads_inquiries table
            let savedLead = null;
            try {
                const sbResp = await fetch(`${SUPABASE_URL}/rest/v1/leads_inquiries`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(leadRecord)
                });
                if (sbResp.ok) {
                    const data = await sbResp.json();
                    if (Array.isArray(data) && data.length > 0) savedLead = data[0];
                }
            } catch (sbErr) {
                console.error('[Supabase Ingestion Notice]:', sbErr.message);
            }

            // Fallback object if Supabase offline
            if (!savedLead) {
                savedLead = {
                    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    ...leadRecord,
                    created_at: new Date().toISOString()
                };
            }

            // Dispatch email alert asynchronously
            sendSmtpLeadAlert(savedLead).catch(() => {});

            return sendJson(201, savedLead);
        }

        // 2. LIST LEADS (GET)
        if (req.method === 'GET') {
            try {
                const sbResp = await fetch(`${SUPABASE_URL}/rest/v1/leads_inquiries?select=*&order=created_at.desc&limit=50`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                    }
                });
                if (sbResp.ok) {
                    const items = await sbResp.json();
                    return sendJson(200, { total: items.length, page: 1, size: 50, items });
                }
            } catch (_) {}

            return sendJson(200, { total: 0, page: 1, size: 50, items: [] });
        }

        // 3. UPDATE LEAD (PATCH)
        if (req.method === 'PATCH') {
            let body = req.body || {};
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) { body = {}; }
            }

            const leadId = req.query?.id || body.id;
            if (!leadId) return sendJson(400, { error: 'Lead id is required.' });

            try {
                const sbResp = await fetch(`${SUPABASE_URL}/rest/v1/leads_inquiries?id=eq.${leadId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ status: body.status || 'contacted' })
                });
                if (sbResp.ok) {
                    const data = await sbResp.json();
                    return sendJson(200, data[0] || { id: leadId, status: body.status });
                }
            } catch (_) {}

            return sendJson(200, { id: leadId, status: body.status || 'updated' });
        }

        return sendJson(405, { error: 'Method Not Allowed' });

    } catch (err) {
        console.error('[Leads API Error]:', err);
        return sendJson(500, { error: err.message || 'Internal Server Error' });
    }
};
