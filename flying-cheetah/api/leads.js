/**
 * FLYING CHEETAH LABS - SERVERLESS LEADS MANAGEMENT & CRM INGESTION
 * Endpoints: /api/v1/leads or /api/leads
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

const { verifyAdmin, getSupabaseServerConfig } = _resolveHelper('_auth');
const { sendMail, escapeHtml } = _resolveHelper('_mailer');

const OFFICIAL_ADMIN_EMAIL = process.env.FOUNDER_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || 'flyingcheetah.agency@gmail.com';

async function sendSmtpLeadAlert(lead) {
    const recipient = OFFICIAL_ADMIN_EMAIL || process.env.SMTP_USER;
    if (!recipient) {
        console.warn('[Leads] No notification recipient configured; skipping lead email.');
        return { success: false, error: 'Recipient not configured' };
    }

    const safeName = escapeHtml(lead.name);
    const safePhone = escapeHtml(lead.phone);
    const safeEmail = escapeHtml(lead.email);
    const safeService = escapeHtml(lead.service || lead.service_interested || 'Operations Audit');
    const safeMessage = escapeHtml(lead.message || 'No additional notes');
    const safeSourcePage = escapeHtml(lead.source_page || 'Website');

    const cleanPhone = String(lead.phone || '').replace(/[^0-9]/g, '');
    const waText = encodeURIComponent(`Hi ${lead.name || ''}, Flying Cheetah following up on your ${lead.service || 'store automation'} inquiry.`);
    const waLink = `https://wa.me/${cleanPhone}?text=${waText}`;

    const html = `
    <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: #121624; padding: 20px 24px; color: #ffffff;">
            <span style="color: #ff6838; font-weight: 800; font-size: 11px; text-transform: uppercase;">⚡ New Lead Inbound Alert</span>
            <h2 style="margin: 6px 0 0; font-size: 20px;">${safeName}</h2>
        </div>
        <div style="padding: 24px;">
            <p><b>Phone:</b> <a href="tel:${safePhone}">${safePhone}</a></p>
            <p><b>Email:</b> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
            <p><b>Service Interested:</b> <span style="color: #ea580c; font-weight: bold;">${safeService}</span></p>
            <p><b>Message / Notes:</b> ${safeMessage}</p>
            <p><b>Source Page:</b> ${safeSourcePage}</p>
            <div style="margin-top: 20px;">
                <a href="${escapeHtml(waLink)}" style="display: inline-block; background: #25d366; color: #fff; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: bold;">💬 Open WhatsApp Chat</a>
            </div>
        </div>
    </div>`;

    return sendMail({
        to: recipient,
        subject: `🚨 New Lead from Flying Cheetah: ${String(lead.name || '').replace(/[\r\n]+/g, ' ')}`,
        fromName: 'Flying Cheetah Engine',
        text: `New Lead: ${lead.name} (${lead.phone}, ${lead.email}) - Service: ${lead.service || 'Audit'} - Message: ${lead.message || 'None'}`,
        html
    });
}

module.exports = async function handler(req, res) {
    const sbCfg = getSupabaseServerConfig();
    const supabaseUrl = sbCfg.url;
    const supabaseKey = sbCfg.serverKey;
    const hasServiceRole = sbCfg.hasServiceRole;
    const internalSecret = sbCfg.internalSecret;

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
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
        // 1. CREATE LEAD (POST) - Public Lead Ingestion
        if (req.method === 'POST') {
            let body = req.body || {};
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) { body = {}; }
            }

            // Honeypot anti-spam check
            if (body.honeypot || body.website_url) {
                return sendJson(201, {
                    id: 'bot-filtered',
                    name: body.name,
                    email: body.email,
                    status: 'closed'
                });
            }

            const { name, email, phone, service, service_interested, message, source_page } = body;
            const cleanName = name ? String(name).trim() : '';
            const cleanEmail = email ? String(email).trim().toLowerCase() : '';
            const cleanPhone = phone ? String(phone).trim() : '';

            if (!cleanName || !cleanEmail || !cleanPhone) {
                return sendJson(400, { error: 'Name, email, and phone are required.' });
            }

            const chosenService = service || service_interested || 'General Consultation';
            const leadRecord = {
                name: cleanName,
                email: cleanEmail,
                phone: cleanPhone,
                service: chosenService,
                message: message ? String(message).trim() : '',
                source_page: source_page || 'website',
                status: 'new'
            };

            if (!supabaseUrl || !supabaseKey) {
                return sendJson(500, { error: 'Database service configuration missing.' });
            }

            let savedLead = null;
            let sbErrorMsg = null;
            try {
                const sbResp = await fetch(`${supabaseUrl}/rest/v1/leads_inquiries`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': hasServiceRole ? 'return=representation' : 'return=representation'
                    },
                    body: JSON.stringify(leadRecord)
                });
                if (sbResp.ok) {
                    const data = await sbResp.json().catch(() => null);
                    if (Array.isArray(data) && data.length > 0) savedLead = data[0];
                    else sbErrorMsg = 'Empty response from database';
                } else if ((sbResp.status === 401 || sbResp.status === 403) && !hasServiceRole) {
                    // Under strict RLS (anon INSERT allowed, anon SELECT blocked), PostgREST rejects
                    // return=representation; retry with return=minimal so genuine public leads persist.
                    const minResp = await fetch(`${supabaseUrl}/rest/v1/leads_inquiries`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify(leadRecord)
                    });
                    if (minResp.ok) {
                        savedLead = { ...leadRecord, persisted: true };
                    } else {
                        sbErrorMsg = `Supabase insert failed with status ${minResp.status}`;
                    }
                } else {
                    sbErrorMsg = `Supabase insert failed with status ${sbResp.status}`;
                }
            } catch (sbErr) {
                sbErrorMsg = sbErr.message;
            }

            // Database failure returns HTTP 502/500 instead of synthetic object
            if (!savedLead) {
                return sendJson(502, {
                    error: 'Database persistence error: ' + (sbErrorMsg || 'Failed to record lead inquiry.')
                });
            }

            // Dispatch email alert asynchronously after successful DB persistence
            sendSmtpLeadAlert(savedLead).catch(() => {});

            return sendJson(201, savedLead);
        }

        // 2. LIST LEADS (GET) - Protected Admin Endpoint
        if (req.method === 'GET') {
            const admin = verifyAdmin(req, res, headers);
            if (!admin) return;

            if (!supabaseUrl || !supabaseKey) {
                return sendJson(500, { error: 'Database service configuration missing.' });
            }

            if (!hasServiceRole && internalSecret) {
                let rpcResp;
                try {
                    rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/fc_admin_list_leads`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ p_server_secret: internalSecret, p_limit: 50 })
                    });
                } catch (err) {
                    return sendJson(502, { error: 'Database query connection failed: ' + err.message });
                }
                if (!rpcResp.ok) {
                    return sendJson(502, { error: `Database query failed with status ${rpcResp.status}` });
                }
                const rpcData = await rpcResp.json();
                const items = Array.isArray(rpcData?.items) ? rpcData.items : [];
                return sendJson(200, { total: items.length, page: 1, size: 50, items });
            }

            let sbResp;
            try {
                sbResp = await fetch(`${supabaseUrl}/rest/v1/leads_inquiries?select=*&order=created_at.desc&limit=50`, {
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
            return sendJson(200, { total: items.length, page: 1, size: 50, items });
        }

        // 3. UPDATE LEAD (PATCH) - Protected Admin Endpoint
        if (req.method === 'PATCH') {
            const admin = verifyAdmin(req, res, headers);
            if (!admin) return;

            let body = req.body || {};
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) { body = {}; }
            }

            const leadId = req.query?.id || body.id;
            if (!leadId) return sendJson(400, { error: 'Lead id is required.' });

            if (!supabaseUrl || !supabaseKey) {
                return sendJson(500, { error: 'Database service configuration missing.' });
            }

            if (!hasServiceRole && internalSecret) {
                let rpcResp;
                try {
                    rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/fc_admin_update_lead`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ p_server_secret: internalSecret, p_lead_id: String(leadId), p_status: body.status || 'contacted' })
                    });
                } catch (err) {
                    return sendJson(502, { error: 'Database update connection failed: ' + err.message });
                }
                if (!rpcResp.ok) {
                    return sendJson(502, { error: `Database update failed with status ${rpcResp.status}` });
                }
                const rpcData = await rpcResp.json();
                if (rpcData?.not_found || !rpcData?.item) {
                    return sendJson(404, { error: `Lead not found with id: ${leadId}` });
                }
                return sendJson(200, rpcData.item);
            }

            let sbResp;
            try {
                sbResp = await fetch(`${supabaseUrl}/rest/v1/leads_inquiries?id=eq.${encodeURIComponent(leadId)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({ status: body.status || 'contacted' })
                });
            } catch (err) {
                return sendJson(502, { error: 'Database update connection failed: ' + err.message });
            }

            if (!sbResp.ok) {
                return sendJson(502, { error: `Database update failed with status ${sbResp.status}` });
            }

            const data = await sbResp.json();
            if (!Array.isArray(data) || data.length === 0) {
                return sendJson(404, { error: `Lead not found with id: ${leadId}` });
            }

            return sendJson(200, data[0]);
        }

        // 4. DELETE LEAD (DELETE) - Protected Admin Endpoint
        if (req.method === 'DELETE') {
            const admin = verifyAdmin(req, res, headers);
            if (!admin) return;

            let body = req.body || {};
            if (typeof body === 'string') {
                try { body = JSON.parse(body); } catch (_) { body = {}; }
            }

            const leadId = req.query?.id || body.id;
            if (!leadId) return sendJson(400, { error: 'Lead id is required.' });

            if (!supabaseUrl || !supabaseKey) {
                return sendJson(500, { error: 'Database service configuration missing.' });
            }

            if (!hasServiceRole && internalSecret) {
                let rpcResp;
                try {
                    rpcResp = await fetch(`${supabaseUrl}/rest/v1/rpc/fc_admin_update_lead`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ p_server_secret: internalSecret, p_lead_id: String(leadId), p_status: 'archived' })
                    });
                } catch (err) {
                    return sendJson(502, { error: 'Database delete connection failed: ' + err.message });
                }
                if (!rpcResp.ok) {
                    return sendJson(502, { error: `Database delete failed with status ${rpcResp.status}` });
                }
                return sendJson(200, { deleted: true, id: leadId });
            }

            let sbResp;
            try {
                sbResp = await fetch(`${supabaseUrl}/rest/v1/leads_inquiries?id=eq.${encodeURIComponent(leadId)}`, {
                    method: 'DELETE',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'return=representation'
                    }
                });
            } catch (err) {
                return sendJson(502, { error: 'Database delete connection failed: ' + err.message });
            }

            if (!sbResp.ok) {
                return sendJson(502, { error: `Database delete failed with status ${sbResp.status}` });
            }

            return sendJson(200, { deleted: true, id: leadId });
        }

        return sendJson(405, { error: 'Method Not Allowed' });

    } catch (err) {
        console.error('[Leads API Error]:', err);
        return sendJson(500, { error: err.message || 'Internal Server Error' });
    }
};
