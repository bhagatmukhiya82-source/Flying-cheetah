/**
 * FLYING CHEETAH LABS - SERVERLESS AUTHENTICATION & IDENTITY ENGINE
 * Enterprise JWT (HS256) + Supabase Cloud + Gmail SMTP Fallback
 * Endpoints: /api/v1/auth/* or /api/auth?action=*
 */

const crypto = require('crypto');
const tls = require('tls');

const JWT_SECRET = process.env.SECRET_KEY || 'flying_cheetah_super_secure_jwt_secret_key_2026_mumbai_d2c_ai';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txqtkpxdyoatzdgkcsry.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cXRrcHhkeW9hdHpkZ2tjc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mzk5NDksImV4cCI6MjEwODQxNTk0OX0.TuGGpGZKHOhvkcpv02W_R-2wwuXykBTdL1iXa9G1qFE';

const SMTP_USER = process.env.SMTP_USER || 'bhagatmukhiya82@gmail.com';
const SMTP_PASS = process.env.SMTP_PASSWORD || 'sryzptfthzfeeeco';
const OFFICIAL_ADMIN_EMAIL = process.env.FOUNDER_NOTIFY_EMAIL || 'flyingcheetah.agency@gmail.com';

const ADMIN_EMAILS = [
    'flyingcheetah.agency@gmail.com',
    'bhagatmukhiya@gmail.com',
    'yashgaikwad@gmail.com'
];

// In-memory OTP cache for instant password resets (keyed by email)
const ACTIVE_OTPS = global._FC_ACTIVE_OTPS || new Map();
global._FC_ACTIVE_OTPS = ACTIVE_OTPS;

// In-memory mock user store (keyed by email)
const USER_STORE = global._FC_USER_STORE || new Map();
global._FC_USER_STORE = USER_STORE;

// Seed initial admin accounts if store is fresh
if (!USER_STORE.has('flyingcheetah.agency@gmail.com')) {
    USER_STORE.set('flyingcheetah.agency@gmail.com', {
        id: 'usr_admin_fc',
        email: 'flyingcheetah.agency@gmail.com',
        full_name: 'Agency Admin',
        role: 'admin',
        trial_active: false,
        password_hash: hashPassword('AdminPass2026!'),
        phone: '+91 99203 86421',
        created_at: new Date().toISOString()
    });
}

// Native Zero-Dependency JWT HS256 Helpers
function signJwt(payload, expiresInSeconds = 7 * 24 * 3600) {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
}

function verifyJwt(token) {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expectedSig) return null;
    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

function sendSmtpEmail({ to, subject, html, text }) {
    return new Promise((resolve, reject) => {
        if (!SMTP_USER || !SMTP_PASS || !to) {
            return reject(new Error('Missing SMTP config or recipient'));
        }

        const socket = tls.connect(465, 'smtp.gmail.com', { rejectUnauthorized: false });
        let step = 0;
        let buffer = '';

        const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error('SMTP Connection Timeout'));
        }, 12000);

        const boundary = '----=_Part_FC_AUTH_' + Date.now();
        const message = [
            `From: "Flying Cheetah Security" <${SMTP_USER}>`,
            `To: <${to}>`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            ``,
            text || subject,
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
            `RCPT TO:<${to}>`,
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
                    return reject(new Error(`SMTP Error ${code}: ${line}`));
                }
                if (step < commands.length) {
                    const cmd = commands[step++];
                    socket.write(cmd + '\r\n');
                } else {
                    clearTimeout(timeout);
                    socket.end();
                    resolve(true);
                }
            }
        });

        socket.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

module.exports = async function handler(req, res) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
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

    // Determine requested action
    const url = req.url || '';
    const queryAction = req.query?.action;
    let action = queryAction || '';

    if (!action) {
        if (url.includes('register-trial')) action = 'register-trial';
        else if (url.includes('login')) action = 'login';
        else if (url.includes('me')) action = 'me';
        else if (url.includes('forgot-password')) action = 'forgot-password';
        else if (url.includes('reset-password')) action = 'reset-password';
        else if (url.includes('request-change-password-otp')) action = 'request-change-password-otp';
        else if (url.includes('change-password')) action = 'change-password';
        else if (url.includes('profile')) action = 'profile';
        else if (url.includes('google-callback')) action = 'google-callback';
    }

    let body = req.body || {};
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
    }

    try {
        // -------------------------------------------------------------
        // 1. REGISTER TRIAL
        // -------------------------------------------------------------
        if (action === 'register-trial' && req.method === 'POST') {
            const { name, email, phone, password, honeypot, store_url } = body;
            if (honeypot) {
                // Silent success for bot traps
                return sendJson(201, {
                    access_token: 'mock_bot_token',
                    token_type: 'bearer',
                    expires_in_minutes: 10080,
                    user: { email, full_name: name, role: 'client', trial_active: true }
                });
            }

            if (!email || !name) {
                return sendJson(400, { error: 'Name and email are required.' });
            }

            const cleanEmail = String(email).trim().toLowerCase();
            const isAdmin = ADMIN_EMAILS.includes(cleanEmail);
            const userObj = {
                id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                email: cleanEmail,
                full_name: String(name).trim(),
                phone: phone ? String(phone).trim() : '',
                store_url: store_url ? String(store_url).trim() : '',
                role: isAdmin ? 'admin' : 'client',
                trial_active: !isAdmin,
                password_hash: hashPassword(password || 'TrialPass2026!'),
                created_at: new Date().toISOString()
            };

            USER_STORE.set(cleanEmail, userObj);

            // Sync with Supabase profiles table if available
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify({
                        id: userObj.id,
                        email: cleanEmail,
                        full_name: userObj.full_name,
                        phone: userObj.phone,
                        store_url: userObj.store_url,
                        role: userObj.role,
                        trial_active: userObj.trial_active,
                        created_at: userObj.created_at
                    })
                });
            } catch (_) {}

            const token = signJwt({
                sub: userObj.id,
                email: cleanEmail,
                role: userObj.role,
                full_name: userObj.full_name
            });

            return sendJson(201, {
                access_token: token,
                token_type: 'bearer',
                expires_in_minutes: 10080,
                user: {
                    id: userObj.id,
                    email: userObj.email,
                    full_name: userObj.full_name,
                    role: userObj.role,
                    trial_active: userObj.trial_active,
                    phone: userObj.phone,
                    store_url: userObj.store_url
                }
            });
        }

        // -------------------------------------------------------------
        // 2. USER LOGIN
        // -------------------------------------------------------------
        if (action === 'login' && req.method === 'POST') {
            const { email, password } = body;
            if (!email || !password) {
                return sendJson(400, { error: 'Email and password are required.' });
            }

            const cleanEmail = String(email).trim().toLowerCase();
            const isAdmin = ADMIN_EMAILS.includes(cleanEmail);
            const passwordHashed = hashPassword(password);

            let user = USER_STORE.get(cleanEmail);

            if (user) {
                // Verify password against stored hash
                if (user.password_hash && user.password_hash !== passwordHashed) {
                    return sendJson(401, { error: 'Invalid email or password.' });
                }
            } else {
                // Check Supabase Auth for valid credentials
                let authenticatedViaSupabase = false;
                try {
                    const sbAuthResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email: cleanEmail, password: password })
                    });
                    if (sbAuthResp.ok) {
                        const sbData = await sbAuthResp.json();
                        authenticatedViaSupabase = true;
                        user = {
                            id: sbData.user?.id || `usr_${Date.now()}`,
                            email: cleanEmail,
                            full_name: sbData.user?.user_metadata?.full_name || cleanEmail.split('@')[0],
                            role: isAdmin ? 'admin' : 'client',
                            trial_active: !isAdmin,
                            password_hash: passwordHashed,
                            phone: sbData.user?.phone || '',
                            store_url: '',
                            created_at: sbData.user?.created_at || new Date().toISOString()
                        };
                        USER_STORE.set(cleanEmail, user);
                    }
                } catch (_) {}

                // Check Supabase profiles table
                if (!authenticatedViaSupabase) {
                    try {
                        const profResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}&select=*&limit=1`, {
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                            }
                        });
                        if (profResp.ok) {
                            const profs = await profResp.json();
                            if (profs && profs.length > 0) {
                                const prof = profs[0];
                                if (prof.password_hash && prof.password_hash !== passwordHashed) {
                                    return sendJson(401, { error: 'Invalid email or password.' });
                                }
                                user = {
                                    id: prof.id || `usr_${Date.now()}`,
                                    email: cleanEmail,
                                    full_name: prof.full_name || cleanEmail.split('@')[0],
                                    role: prof.role || (isAdmin ? 'admin' : 'client'),
                                    trial_active: prof.trial_active !== undefined ? prof.trial_active : !isAdmin,
                                    password_hash: passwordHashed,
                                    phone: prof.phone || '',
                                    store_url: prof.store_url || '',
                                    created_at: prof.created_at || new Date().toISOString()
                                };
                                USER_STORE.set(cleanEmail, user);
                            }
                        }
                    } catch (_) {}
                }

                // Fallback for default admin account
                if (!user && isAdmin) {
                    if (password === 'AdminPass2026!' || passwordHashed === hashPassword('AdminPass2026!')) {
                        user = {
                            id: 'usr_admin_fc',
                            email: cleanEmail,
                            full_name: 'Agency Admin',
                            role: 'admin',
                            trial_active: false,
                            password_hash: hashPassword('AdminPass2026!'),
                            phone: '+91 99203 86421',
                            store_url: '',
                            created_at: new Date().toISOString()
                        };
                        USER_STORE.set(cleanEmail, user);
                    } else {
                        return sendJson(401, { error: 'Invalid email or password.' });
                    }
                }

                // If user not found anywhere and credentials invalid
                if (!user) {
                    return sendJson(401, { error: 'Invalid email or password.' });
                }
            }

            const token = signJwt({
                sub: user.id,
                email: user.email,
                role: user.role,
                full_name: user.full_name
            });

            return sendJson(200, {
                access_token: token,
                token_type: 'bearer',
                expires_in_minutes: 10080,
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    trial_active: user.trial_active,
                    phone: user.phone || '',
                    store_url: user.store_url || ''
                }
            });
        }

        // -------------------------------------------------------------
        // 3. ME (ACTIVE USER PROFILE)
        // -------------------------------------------------------------
        if (action === 'me' || (action === '' && req.method === 'GET')) {
            const authHeader = req.headers.authorization || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
            const payload = verifyJwt(token);

            if (!payload) {
                return sendJson(401, { error: 'Invalid or expired authentication token.' });
            }

            const user = USER_STORE.get(payload.email) || {
                id: payload.sub,
                email: payload.email,
                full_name: payload.full_name || payload.email.split('@')[0],
                role: payload.role || 'client',
                trial_active: payload.role !== 'admin'
            };

            return sendJson(200, {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                trial_active: user.trial_active,
                phone: user.phone || '',
                store_url: user.store_url || ''
            });
        }

        // -------------------------------------------------------------
        // 4. FORGOT PASSWORD (REQUEST OTP)
        // -------------------------------------------------------------
        if (action === 'forgot-password' && req.method === 'POST') {
            const { email } = body;
            if (!email) return sendJson(400, { error: 'Email address is required.' });

            const cleanEmail = String(email).trim().toLowerCase();
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

            ACTIVE_OTPS.set(cleanEmail, { otp, expiresAt });

            // Send real email via SMTP
            try {
                await sendSmtpEmail({
                    to: cleanEmail,
                    subject: `Flying Cheetah Verification Code: ${otp}`,
                    text: `Your Flying Cheetah Password Reset code is: ${otp}. Valid for 10 minutes.`,
                    html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                        <h2 style="color: #ff6838; margin-top: 0;">Flying Cheetah Security</h2>
                        <p style="color: #334155;">Use this one-time code to reset your password:</p>
                        <div style="background: #fff7ed; border: 2px dashed #fdba74; padding: 16px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #ea580c; border-radius: 12px; margin: 16px 0;">${otp}</div>
                        <p style="font-size: 12px; color: #64748b;">Valid for 10 minutes. If you did not request this, please ignore.</p>
                    </div>`
                });
            } catch (smtpErr) {
                console.error('[Auth SMTP Warning]:', smtpErr.message);
            }

            return sendJson(200, {
                success: true,
                message: 'Password reset OTP dispatched to registered email.',
                email: cleanEmail,
                otp: process.env.NODE_ENV === 'development' ? otp : undefined
            });
        }

        // -------------------------------------------------------------
        // 5. RESET PASSWORD (VERIFY OTP & UPDATE)
        // -------------------------------------------------------------
        if (action === 'reset-password' && req.method === 'POST') {
            const { email, otp, new_password } = body;
            if (!email || !otp || !new_password) {
                return sendJson(400, { error: 'Email, OTP, and new password are required.' });
            }

            const cleanEmail = String(email).trim().toLowerCase();
            const cached = ACTIVE_OTPS.get(cleanEmail);

            if (!cached || cached.otp !== String(otp).trim() || Date.now() > cached.expiresAt) {
                return sendJson(400, { error: 'Invalid or expired OTP code.' });
            }

            // OTP is valid - update password
            ACTIVE_OTPS.delete(cleanEmail);

            let user = USER_STORE.get(cleanEmail);
            if (user) {
                user.password_hash = hashPassword(new_password);
                USER_STORE.set(cleanEmail, user);
            }

            return sendJson(200, {
                success: true,
                message: 'Password successfully reset. You can now sign in with your new password.'
            });
        }

        // -------------------------------------------------------------
        // 6. REQUEST CHANGE PASSWORD OTP
        // -------------------------------------------------------------
        if (action === 'request-change-password-otp' && req.method === 'POST') {
            const authHeader = req.headers.authorization || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
            const payload = verifyJwt(token);

            const email = (payload && payload.email) || body.email;
            if (!email) return sendJson(401, { error: 'Authentication required.' });

            const cleanEmail = String(email).trim().toLowerCase();
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            ACTIVE_OTPS.set(cleanEmail, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

            try {
                await sendSmtpEmail({
                    to: cleanEmail,
                    subject: `Flying Cheetah Security: Password Change Code ${otp}`,
                    text: `Your password change verification code is: ${otp}.`,
                    html: `<p>Your password change verification code is: <b>${otp}</b> (Valid 10 mins).</p>`
                });
            } catch (_) {}

            return sendJson(200, { success: true, message: 'OTP sent', otp });
        }

        // -------------------------------------------------------------
        // 7. CHANGE PASSWORD
        // -------------------------------------------------------------
        if (action === 'change-password' && req.method === 'POST') {
            const { email, otp, new_password } = body;
            const cleanEmail = String(email || '').trim().toLowerCase();
            const cached = ACTIVE_OTPS.get(cleanEmail);

            if (otp && cached) {
                if (cached.otp !== String(otp).trim() || Date.now() > cached.expiresAt) {
                    return sendJson(400, { error: 'Invalid or expired OTP.' });
                }
                ACTIVE_OTPS.delete(cleanEmail);
            }

            let user = USER_STORE.get(cleanEmail);
            if (user) {
                user.password_hash = hashPassword(new_password);
                USER_STORE.set(cleanEmail, user);
            }

            return sendJson(200, { success: true, message: 'Password updated successfully.' });
        }

        // -------------------------------------------------------------
        // 8. PROFILE UPDATE
        // -------------------------------------------------------------
        if (action === 'profile' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
            const authHeader = req.headers.authorization || '';
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
            const payload = verifyJwt(token);

            const { email, full_name, phone, store_url, gstin, upi_id } = body;
            const cleanEmail = String(email || (payload && payload.email) || '').trim().toLowerCase();
            if (!cleanEmail) {
                return sendJson(400, { error: 'Email or valid authentication token is required.' });
            }

            let user = USER_STORE.get(cleanEmail) || { email: cleanEmail };

            if (full_name) user.full_name = full_name;
            if (phone) user.phone = phone;
            if (store_url) user.store_url = store_url;
            if (gstin) user.gstin = gstin;
            if (upi_id) user.upi_id = upi_id;

            USER_STORE.set(cleanEmail, user);

            // Persist to Supabase profiles table
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        full_name: user.full_name,
                        phone: user.phone,
                        store_url: user.store_url,
                        gstin: user.gstin,
                        upi_id: user.upi_id
                    })
                });
            } catch (_) {}

            return sendJson(200, { success: true, user });
        }

        // -------------------------------------------------------------
        // 9. GOOGLE CALLBACK
        // -------------------------------------------------------------
        if (action === 'google-callback' && req.method === 'POST') {
            const { email, name } = body;
            const cleanEmail = String(email || 'google_user@flyingcheetah.agency').trim().toLowerCase();
            const isAdmin = ADMIN_EMAILS.includes(cleanEmail);

            const user = {
                id: `usr_g_${Date.now()}`,
                email: cleanEmail,
                full_name: name || cleanEmail.split('@')[0],
                role: isAdmin ? 'admin' : 'client',
                trial_active: !isAdmin
            };

            const token = signJwt({ sub: user.id, email: user.email, role: user.role, full_name: user.full_name });
            return sendJson(200, { access_token: token, token_type: 'bearer', user });
        }

        return sendJson(404, { error: `Endpoint not found: action '${action}' on /api/auth` });

    } catch (err) {
        console.error('[Auth Error]:', err);
        return sendJson(500, { error: err.message || 'Internal Server Error' });
    }
};
