/**
 * FLYING CHEETAH LABS - SERVERLESS AUTHENTICATION & IDENTITY ENGINE
 * Enterprise JWT (HS256) + Supabase Cloud + Native TLS Mailer
 * Endpoints: /api/v1/auth/* or /api/auth?action=*
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

const {
    getJwtSecret,
    signJwt,
    verifyJwt,
    hashPasswordScrypt,
    verifyPassword,
    getSupabaseServerConfig,
    ADMIN_EMAILS
} = _resolveHelper('_auth');
const { sendMail, escapeHtml } = _resolveHelper('_mailer');

function safeSignJwt(payload) {
    try {
        return signJwt(payload);
    } catch (err) {
        console.warn('[Auth Notice] JWT_SECRET unset; returning safe sandbox mock token.');
        const b64Payload = Buffer.from(JSON.stringify({ ...payload, sandbox: true, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
        return `fc_sandbox_mock_token.${b64Payload}.sandbox_sig`;
    }
}

const OFFICIAL_ADMIN_EMAIL = process.env.FOUNDER_NOTIFY_EMAIL || 'flyingcheetah.agency@gmail.com';

// In-memory OTP cache for instant password resets (keyed by email)
const ACTIVE_OTPS = global._FC_ACTIVE_OTPS || new Map();
global._FC_ACTIVE_OTPS = ACTIVE_OTPS;

// In-memory mock user store (keyed by email)
const USER_STORE = global._FC_USER_STORE || new Map();
global._FC_USER_STORE = USER_STORE;

// Seed initial admin account only when configured (never use hardcoded fallback in Vercel production)
const initialAdminPwd = process.env.INITIAL_ADMIN_PASSWORD || (process.env.VERCEL_ENV === 'production' ? '' : 'AdminPass2026!');
if (initialAdminPwd && !USER_STORE.has('flyingcheetah.agency@gmail.com')) {
    USER_STORE.set('flyingcheetah.agency@gmail.com', {
        id: 'usr_admin_fc',
        email: 'flyingcheetah.agency@gmail.com',
        full_name: 'Agency Admin',
        role: 'admin',
        trial_active: false,
        password_hash: hashPasswordScrypt(initialAdminPwd),
        phone: '+91 99203 86421',
        created_at: new Date().toISOString()
    });
}

function supabaseTimeoutSignal(ms = 2500) {
    return typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
}

/**
 * Persists an OTP code in both in-memory cache and Supabase `password_reset_otps`
 * so verification survives serverless cold starts. Uses SUPABASE_SERVICE_ROLE_KEY on server.
 */
async function storeOtpRecord(cleanEmail, otp, expiresAt) {
    ACTIVE_OTPS.set(cleanEmail, { otp, expiresAt });
    const { url, serverKey } = getSupabaseServerConfig();
    try {
        await fetch(`${url}/rest/v1/rpc/fc_store_password_otp`, {
            method: 'POST',
            signal: supabaseTimeoutSignal(2500),
            headers: {
                'apikey': serverKey,
                'Authorization': `Bearer ${serverKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_email: cleanEmail,
                p_otp: String(otp).trim()
            })
        });
    } catch (_) {}
}

/**
 * Verifies a 6-digit OTP against memory cache or Supabase `password_reset_otps`
 * and marks it consumed on match.
 */
async function verifyAndConsumeOtp(cleanEmail, otp) {
    const cleanOtp = String(otp || '').trim();
    if (!cleanOtp) return false;
    const { url, serverKey } = getSupabaseServerConfig();

    const cached = ACTIVE_OTPS.get(cleanEmail);
    if (cached && cached.otp === cleanOtp && Date.now() <= cached.expiresAt) {
        ACTIVE_OTPS.delete(cleanEmail);
        try {
            await fetch(`${url}/rest/v1/password_reset_otps?email=eq.${encodeURIComponent(cleanEmail)}&otp_code=eq.${encodeURIComponent(cleanOtp)}`, {
                method: 'PATCH',
                signal: supabaseTimeoutSignal(2500),
                headers: {
                    'apikey': serverKey,
                    'Authorization': `Bearer ${serverKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ used: true })
            });
        } catch (_) {}
        return true;
    }

    try {
        const resp = await fetch(
            `${url}/rest/v1/password_reset_otps?email=eq.${encodeURIComponent(cleanEmail)}&otp_code=eq.${encodeURIComponent(cleanOtp)}&used=eq.false&order=created_at.desc&limit=1`,
            {
                signal: supabaseTimeoutSignal(2500),
                headers: {
                    'apikey': serverKey,
                    'Authorization': `Bearer ${serverKey}`
                }
            }
        );
        if (resp.ok) {
            const rows = await resp.json();
            if (Array.isArray(rows) && rows.length > 0) {
                const row = rows[0];
                if (row.expires_at && new Date(row.expires_at).getTime() >= Date.now()) {
                    await fetch(`${url}/rest/v1/password_reset_otps?email=eq.${encodeURIComponent(cleanEmail)}&otp_code=eq.${encodeURIComponent(cleanOtp)}`, {
                        method: 'PATCH',
                        signal: supabaseTimeoutSignal(2500),
                        headers: {
                            'apikey': serverKey,
                            'Authorization': `Bearer ${serverKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ used: true })
                    }).catch(() => {});
                    return true;
                }
            }
        }
    } catch (_) {}

    return false;
}

/**
 * Retrieves an existing password hash from memory store or Supabase `profiles`.
 */
async function fetchStoredPasswordHash(cleanEmail) {
    const user = USER_STORE.get(cleanEmail);
    if (user && user.password_hash) return user.password_hash;
    const { url, serverKey } = getSupabaseServerConfig();

    try {
        const resp = await fetch(
            `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}&select=password_hash&limit=1`,
            {
                signal: supabaseTimeoutSignal(2500),
                headers: {
                    'apikey': serverKey,
                    'Authorization': `Bearer ${serverKey}`
                }
            }
        );
        if (resp.ok) {
            const rows = await resp.json();
            if (Array.isArray(rows) && rows[0]?.password_hash) {
                return rows[0].password_hash;
            }
        }
    } catch (_) {}

    return null;
}

/**
 * Awaits persistence of an updated scrypt password hash to Supabase `profiles`.
 */
async function persistPasswordHashToSupabase(cleanEmail, upgradedHash, bearerToken) {
    const { url, serverKey } = getSupabaseServerConfig();
    const authToken = bearerToken || serverKey;
    try {
        await fetch(`${url}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}`, {
            method: 'PATCH',
            signal: supabaseTimeoutSignal(2500),
            headers: {
                'apikey': serverKey,
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password_hash: upgradedHash, updated_at: new Date().toISOString() })
        });
    } catch (_) {}
}

/**
 * Calls Supabase `fc_verify_and_update_password` RPC (service_role gated) to verify OTP
 * or current password and update `auth.users.encrypted_password` across serverless invocations.
 */
async function callSupabasePasswordRpc(cleanEmail, otp, newPassword, currentPassword) {
    const { url, serverKey } = getSupabaseServerConfig();
    try {
        const resp = await fetch(`${url}/rest/v1/rpc/fc_verify_and_update_password`, {
            method: 'POST',
            signal: supabaseTimeoutSignal(3000),
            headers: {
                'apikey': serverKey,
                'Authorization': `Bearer ${serverKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_email: cleanEmail,
                p_otp: otp ? String(otp).trim() : '',
                p_new_password: String(newPassword),
                p_current_password: currentPassword ? String(currentPassword) : null
            })
        });
        if (!resp.ok) return { reachable: false };
        const data = await resp.json();
        return { reachable: true, ...data };
    } catch (_) {
        return { reachable: false };
    }
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
            const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);
            const rawPassword = password || 'TrialPass2026!';
            const userObj = {
                id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                email: cleanEmail,
                full_name: String(name).trim(),
                phone: phone ? String(phone).trim() : '',
                store_url: store_url ? String(store_url).trim() : '',
                role: isAdmin ? 'admin' : 'client',
                trial_active: !isAdmin,
                password_hash: hashPasswordScrypt(rawPassword),
                created_at: new Date().toISOString()
            };

            // Sync with Supabase Auth (which triggers handle_new_user -> public.profiles)
            const { url: sbUrl, anonKey: sbAnonKey, serverKey: sbServerKey } = getSupabaseServerConfig();
            let sbAccessToken = null;
            try {
                const sbSignupResp = await fetch(`${sbUrl}/auth/v1/signup`, {
                    method: 'POST',
                    signal: supabaseTimeoutSignal(3000),
                    headers: {
                        'apikey': sbAnonKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        email: cleanEmail,
                        password: rawPassword,
                        data: {
                            full_name: userObj.full_name,
                            phone: userObj.phone,
                            store_url: userObj.store_url,
                            trial_active: userObj.trial_active
                        }
                    })
                });
                if (sbSignupResp.ok) {
                    const sbData = await sbSignupResp.json();
                    if (sbData.user?.id) userObj.id = sbData.user.id;
                    sbAccessToken = sbData.access_token || sbData.session?.access_token || null;
                }
            } catch (_) {}

            USER_STORE.set(cleanEmail, userObj);

            // Patch extra metadata fields on public.profiles when authenticated session or service role is available
            const profileAuthBearer = sbAccessToken || sbServerKey;
            if (profileAuthBearer && userObj.id) {
                try {
                    await fetch(`${sbUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userObj.id)}`, {
                        method: 'PATCH',
                        signal: supabaseTimeoutSignal(2500),
                        headers: {
                            'apikey': sbServerKey,
                            'Authorization': `Bearer ${profileAuthBearer}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            full_name: userObj.full_name,
                            phone: userObj.phone,
                            password_hash: userObj.password_hash,
                            metadata: {
                                store_url: userObj.store_url,
                                trial_active: userObj.trial_active
                            },
                            updated_at: new Date().toISOString()
                        })
                    });
                } catch (_) {}
            }

            const token = safeSignJwt({
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
            const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === cleanEmail);

            let user = USER_STORE.get(cleanEmail);
            let verifiedLocally = false;

            if (user && user.password_hash) {
                // Verify password against stored hash with auto-migration
                const { verified, needsRehash } = verifyPassword(password, user.password_hash);
                if (verified) {
                    verifiedLocally = true;
                    if (needsRehash) {
                        const upgradedHash = hashPasswordScrypt(password);
                        user.password_hash = upgradedHash;
                        USER_STORE.set(cleanEmail, user);
                    }
                } else if (user.id !== 'usr_admin_fc') {
                    return sendJson(401, { error: 'Invalid email or password.' });
                }
            }

            if (!verifiedLocally) {
                const { url: sbUrl, anonKey: sbAnonKey, serverKey: sbServerKey } = getSupabaseServerConfig();
                // Check Supabase Auth for valid credentials
                let authenticatedViaSupabase = false;
                try {
                    const sbAuthResp = await fetch(`${sbUrl}/auth/v1/token?grant_type=password`, {
                        method: 'POST',
                        headers: {
                            'apikey': sbAnonKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email: cleanEmail, password: password }),
                        signal: supabaseTimeoutSignal(2500)
                    });
                    if (sbAuthResp.ok) {
                        const sbData = await sbAuthResp.json();
                        authenticatedViaSupabase = true;
                        user = {
                            id: sbData.user?.id || `usr_${Date.now()}`,
                            email: cleanEmail,
                            full_name: sbData.user?.user_metadata?.full_name || cleanEmail.split('@')[0],
                            role: isAdmin ? 'admin' : 'client',
                            trial_active: sbData.user?.user_metadata?.trial_active !== undefined ? sbData.user.user_metadata.trial_active : !isAdmin,
                            password_hash: hashPasswordScrypt(password),
                            phone: sbData.user?.user_metadata?.phone || sbData.user?.phone || '',
                            store_url: sbData.user?.user_metadata?.store_url || '',
                            created_at: sbData.user?.created_at || new Date().toISOString()
                        };
                        USER_STORE.set(cleanEmail, user);
                    }
                } catch (_) {}

                // Check Supabase profiles table if needed (uses service role key on server)
                if (!authenticatedViaSupabase) {
                    let profileMatched = false;
                    try {
                        const profResp = await fetch(`${sbUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}&select=*&limit=1`, {
                            headers: {
                                'apikey': sbServerKey,
                                'Authorization': `Bearer ${sbServerKey}`
                            },
                            signal: supabaseTimeoutSignal(2500)
                        });
                        if (profResp.ok) {
                            const profs = await profResp.json();
                            if (profs && profs.length > 0) {
                                const prof = profs[0];
                                if (prof.password_hash) {
                                    const { verified } = verifyPassword(password, prof.password_hash);
                                    if (!verified) {
                                        return sendJson(401, { error: 'Invalid email or password.' });
                                    }
                                    profileMatched = true;
                                    user = {
                                        id: prof.id || `usr_${Date.now()}`,
                                        email: cleanEmail,
                                        full_name: prof.full_name || cleanEmail.split('@')[0],
                                        role: prof.role || (isAdmin ? 'admin' : 'client'),
                                        trial_active: prof.metadata?.trial_active !== undefined ? prof.metadata.trial_active : !isAdmin,
                                        password_hash: hashPasswordScrypt(password),
                                        phone: prof.phone || '',
                                        store_url: prof.metadata?.store_url || '',
                                        created_at: prof.created_at || new Date().toISOString()
                                    };
                                    USER_STORE.set(cleanEmail, user);
                                }
                            }
                        }
                    } catch (_) {}

                    if (!profileMatched) {
                        return sendJson(401, { error: 'Invalid email or password.' });
                    }
                }
            }

            const token = safeSignJwt({
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
            const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
            const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
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

            await storeOtpRecord(cleanEmail, otp, expiresAt);

            // Send email via secure mailer
            let emailSent = false;
            try {
                const mailRes = await sendMail({
                    to: cleanEmail,
                    subject: `Flying Cheetah Verification Code: ${otp}`,
                    fromName: 'Flying Cheetah Security',
                    text: `Your Flying Cheetah Password Reset code is: ${otp}. Valid for 10 minutes.`,
                    html: `
                    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
                        <h2 style="color: #ff6838; margin-top: 0;">Flying Cheetah Security</h2>
                        <p style="color: #334155;">Use this one-time code to reset your password:</p>
                        <div style="background: #fff7ed; border: 2px dashed #fdba74; padding: 16px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #ea580c; border-radius: 12px; margin: 16px 0;">${escapeHtml(otp)}</div>
                        <p style="font-size: 12px; color: #64748b;">Valid for 10 minutes. If you did not request this, please ignore.</p>
                    </div>`
                });
                if (mailRes && mailRes.success) {
                    emailSent = true;
                }
            } catch (smtpErr) {
                console.error('[Auth SMTP Warning]:', smtpErr.message);
            }

            return sendJson(200, {
                success: true,
                dispatched: emailSent,
                message: emailSent
                    ? 'Password reset OTP dispatched to registered email.'
                    : 'OTP generated. Note: Email delivery service is not configured on this server.',
                email: cleanEmail
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
            const rpcResult = await callSupabasePasswordRpc(cleanEmail, otp, new_password, null);
            let verified = Boolean(rpcResult.reachable && rpcResult.success);

            if (verified) {
                ACTIVE_OTPS.delete(cleanEmail);
            } else if (!rpcResult.reachable || ACTIVE_OTPS.has(cleanEmail)) {
                verified = await verifyAndConsumeOtp(cleanEmail, otp);
            }

            if (!verified) {
                return sendJson(400, { error: rpcResult.error || 'Invalid or expired OTP code.' });
            }

            const upgradedHash = hashPasswordScrypt(new_password);
            const user = USER_STORE.get(cleanEmail);
            if (user) {
                user.password_hash = upgradedHash;
                USER_STORE.set(cleanEmail, user);
            }

            await persistPasswordHashToSupabase(cleanEmail, upgradedHash);

            return sendJson(200, {
                success: true,
                message: 'Password successfully reset. You can now sign in with your new password.'
            });
        }

        // -------------------------------------------------------------
        // 6. REQUEST CHANGE PASSWORD OTP
        // -------------------------------------------------------------
        if (action === 'request-change-password-otp' && req.method === 'POST') {
            const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
            const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
            const payload = verifyJwt(token);

            const email = (payload && payload.email) || body.email;
            if (!email) return sendJson(401, { error: 'Authentication required.' });

            const cleanEmail = String(email).trim().toLowerCase();
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = Date.now() + 10 * 60 * 1000;
            await storeOtpRecord(cleanEmail, otp, expiresAt);

            let emailSent = false;
            try {
                const mailRes = await sendMail({
                    to: cleanEmail,
                    subject: `Flying Cheetah Security: Password Change Code ${otp}`,
                    fromName: 'Flying Cheetah Security',
                    text: `Your password change verification code is: ${otp}.`,
                    html: `<p>Your password change verification code is: <b>${escapeHtml(otp)}</b> (Valid 10 mins).</p>`
                });
                if (mailRes && mailRes.success) {
                    emailSent = true;
                }
            } catch (_) {}

            return sendJson(200, {
                success: true,
                dispatched: emailSent,
                message: emailSent ? 'OTP sent to registered email address.' : 'OTP generated. Note: Email service is not configured on this server.'
            });
        }

        // -------------------------------------------------------------
        // 7. CHANGE PASSWORD
        // -------------------------------------------------------------
        if (action === 'change-password' && req.method === 'POST') {
            const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
            const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
            const payload = verifyJwt(token);

            const { email, otp, new_password, current_password } = body;
            const cleanEmail = String(email || (payload && payload.email) || '').trim().toLowerCase();
            if (!cleanEmail || !new_password) {
                return sendJson(400, { error: 'Email and new password are required.' });
            }

            if (otp) {
                const rpcResult = await callSupabasePasswordRpc(cleanEmail, otp, new_password, null);
                let otpValid = Boolean(rpcResult.reachable && rpcResult.success);
                if (otpValid) {
                    ACTIVE_OTPS.delete(cleanEmail);
                } else if (!rpcResult.reachable || ACTIVE_OTPS.has(cleanEmail)) {
                    otpValid = await verifyAndConsumeOtp(cleanEmail, otp);
                }
                if (!otpValid) {
                    return sendJson(400, { error: rpcResult.error || 'Invalid or expired OTP.' });
                }
            } else {
                const jwtMatchesUser = Boolean(payload && payload.email && String(payload.email).trim().toLowerCase() === cleanEmail);
                if (!jwtMatchesUser) {
                    return sendJson(401, { error: 'Authentication required to change password.' });
                }
                if (!current_password) {
                    return sendJson(400, { error: 'Current password or OTP verification is required.' });
                }

                const rpcResult = await callSupabasePasswordRpc(cleanEmail, '', new_password, current_password);
                let verified = Boolean(rpcResult.reachable && rpcResult.success);

                if (!verified) {
                    const storedHash = await fetchStoredPasswordHash(cleanEmail);
                    if (storedHash && verifyPassword(String(current_password), storedHash).verified) {
                        verified = true;
                    }
                }

                if (!verified) {
                    return sendJson(401, { error: rpcResult.error || 'Current password is incorrect.' });
                }
            }

            const upgradedHash = hashPasswordScrypt(new_password);
            const user = USER_STORE.get(cleanEmail);
            if (user) {
                user.password_hash = upgradedHash;
                USER_STORE.set(cleanEmail, user);
            }

            await persistPasswordHashToSupabase(cleanEmail, upgradedHash);

            return sendJson(200, { success: true, message: 'Password updated successfully.' });
        }

        // -------------------------------------------------------------
        // 8. PROFILE UPDATE
        // -------------------------------------------------------------
        if (action === 'profile' && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
            const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
            const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null;
            const payload = verifyJwt(token);

            const { email, full_name, phone, store_url, gstin, upi_id } = body;
            const cleanEmail = String(email || (payload && payload.email) || '').trim().toLowerCase();
            if (!cleanEmail) {
                return sendJson(400, { error: 'Email or valid authentication token is required.' });
            }

            const jwtAuthorized = Boolean(
                payload && payload.email &&
                (String(payload.email).trim().toLowerCase() === cleanEmail || payload.role === 'admin')
            );
            if (!jwtAuthorized) {
                return sendJson(401, { error: 'Authentication required to update profile.' });
            }

            let user = USER_STORE.get(cleanEmail) || { email: cleanEmail };

            if (full_name) user.full_name = full_name;
            if (phone) user.phone = phone;
            if (store_url) user.store_url = store_url;
            if (gstin) user.gstin = gstin;
            if (upi_id) user.upi_id = upi_id;

            USER_STORE.set(cleanEmail, user);

            // Persist to Supabase profiles table using canonical schema columns & server key
            const { url: sbProfileUrl, serverKey: sbProfileKey } = getSupabaseServerConfig();
            try {
                await fetch(`${sbProfileUrl}/rest/v1/profiles?email=eq.${encodeURIComponent(cleanEmail)}`, {
                    method: 'PATCH',
                    signal: supabaseTimeoutSignal(2500),
                    headers: {
                        'apikey': sbProfileKey,
                        'Authorization': `Bearer ${sbProfileKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        full_name: user.full_name,
                        phone: user.phone,
                        gstin_udyam: user.gstin,
                        merchant_upi_id: user.upi_id,
                        metadata: { store_url: user.store_url || '', trial_active: user.trial_active !== false },
                        updated_at: new Date().toISOString()
                    })
                });
            } catch (_) {}

            const { password_hash: _omit, ...safeUser } = user;
            return sendJson(200, { success: true, user: safeUser });
        }

        // -------------------------------------------------------------
        // 9. GOOGLE CALLBACK
        // -------------------------------------------------------------
        if (action === 'google-callback' && req.method === 'POST') {
            return sendJson(403, {
                error: 'Unverified Google OAuth callback is rejected. Please sign in with email and password or use verified Google OAuth.'
            });
        }

        return sendJson(404, { error: `Endpoint not found: action '${action}' on /api/auth` });

    } catch (err) {
        console.error('[Auth Error]:', err);
        return sendJson(500, { error: err.message || 'Internal Server Error' });
    }
};
