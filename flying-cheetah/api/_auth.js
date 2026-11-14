/**
 * FLYING CHEETAH LABS - SERVERLESS AUTHENTICATION & SECURITY GUARD MODULE
 * CommonJS Zero-Dependency Module (Node.js crypto)
 * Location: api/_auth.js
 */

const crypto = require('crypto');

// Default agency admin email whitelist
const ADMIN_EMAILS = [
    'flyingcheetah.agency@gmail.com',
    'bhagatmukhiya@gmail.com',
    'yashgaikwad@gmail.com'
];

/**
 * Retrieves the JWT signing secret from environment variables.
 * Strictly enforces that JWT_SECRET or SECRET_KEY is set.
 * NO hardcoded fallback string is permitted.
 */
function getJwtSecret() {
    const secret = process.env.JWT_SECRET || process.env.SECRET_KEY;
    if (!secret || typeof secret !== 'string' || secret.trim() === '') {
        throw new Error('FATAL: JWT_SECRET or SECRET_KEY environment variable is not configured.');
    }
    return secret.trim();
}

/**
 * Native Zero-Dependency HS256 JWT Signer
 * @param {object} payload - Token claims (sub, email, role, etc.)
 * @param {number} expiresInSeconds - Token validity duration (default: 7 days)
 * @returns {string} Encoded JWT token
 */
function signJwt(payload, expiresInSeconds = 7 * 24 * 3600) {
    const secret = getJwtSecret();
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
}

/**
 * Native Zero-Dependency HS256 JWT Verifier with Constant-Time Signature Checking
 * @param {string} token - Bearer JWT string
 * @returns {object|null} Decoded payload or null if invalid/expired
 */
function verifyJwt(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, bodyB64, sigB64] = parts;

    let secret;
    try {
        secret = getJwtSecret();
    } catch (_) {
        return null;
    }

    const expectedSig = crypto.createHmac('sha256', secret).update(`${headerB64}.${bodyB64}`).digest('base64url');

    const sigBuf = Buffer.from(sigB64);
    const expBuf = Buffer.from(expectedSig);

    // Constant-time signature verification (prevent HMAC timing attacks)
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
    }

    try {
        const payload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
        // Expiration check
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }
        return payload;
    } catch (_) {
        return null;
    }
}

/**
 * Hashes a password using crypto.scryptSync with a unique 16-byte random salt.
 * Storage format: <32-char-salt-hex>:<128-char-derivedKey-hex>
 * @param {string} password - Plaintext password
 * @returns {string} Salted hash string
 */
function hashPasswordScrypt(password) {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a password against a stored hash with timing-safe comparison.
 * Supports dual-mode verification:
 *   1. Modern scrypt format: <salt>:<derivedKeyHex> -> verified with timingSafeEqual, needsRehash: false
 *   2. Legacy SHA-256 format: 64-char hex string -> verified against legacy formula, needsRehash: true
 * @param {string} password - Candidate plaintext password
 * @param {string} storedHash - Stored hash from database or memory
 * @returns {{ verified: boolean, needsRehash: boolean }}
 */
function verifyPassword(password, storedHash) {
    if (!password || typeof password !== 'string' || !storedHash || typeof storedHash !== 'string') {
        return { verified: false, needsRehash: false };
    }

    // 1. Scrypt verification (<salt>:<derivedKeyHex>)
    if (storedHash.includes(':')) {
        const parts = storedHash.split(':');
        if (parts.length !== 2) return { verified: false, needsRehash: false };
        const [salt, keyHex] = parts;
        try {
            const keyBuffer = Buffer.from(keyHex, 'hex');
            const derivedKey = crypto.scryptSync(password, salt, 64);

            if (keyBuffer.length !== derivedKey.length) {
                return { verified: false, needsRehash: false };
            }
            const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
            return { verified: match, needsRehash: false };
        } catch (_) {
            return { verified: false, needsRehash: false };
        }
    }

    // 2. Legacy SHA-256 verification (64-character hexadecimal string)
    if (/^[0-9a-f]{64}$/i.test(storedHash)) {
        try {
            const storedBuf = Buffer.from(storedHash, 'hex');

            // Legacy formula A: password + secret
            let secret = '';
            try { secret = getJwtSecret(); } catch (_) {}

            if (secret) {
                const candidateLegacyA = crypto.createHash('sha256').update(password + secret).digest('hex');
                const bufA = Buffer.from(candidateLegacyA, 'hex');
                if (storedBuf.length === bufA.length && crypto.timingSafeEqual(storedBuf, bufA)) {
                    return { verified: true, needsRehash: true };
                }
            }

            // Legacy formula B: plain SHA-256 of password
            const candidateLegacyB = crypto.createHash('sha256').update(password).digest('hex');
            const bufB = Buffer.from(candidateLegacyB, 'hex');
            if (storedBuf.length === bufB.length && crypto.timingSafeEqual(storedBuf, bufB)) {
                return { verified: true, needsRehash: true };
            }
        } catch (_) {
            return { verified: false, needsRehash: false };
        }
    }

    return { verified: false, needsRehash: false };
}

/**
 * Universal Response Helper for Serverless / Node / Express
 */
function sendJsonError(res, statusCode, data, corsHeaders = {}) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Content-Type': 'application/json',
        ...corsHeaders
    };
    const body = JSON.stringify(data);

    if (res && typeof res.status === 'function' && typeof res.json === 'function') {
        if (typeof res.setHeader === 'function') {
            for (const [key, val] of Object.entries(headers)) {
                res.setHeader(key, val);
            }
        }
        res.status(statusCode);
        res.json(data);
        return null;
    }
    if (res && typeof res.writeHead === 'function') {
        res.writeHead(statusCode, headers);
        res.end(body);
        return null;
    }
    return { statusCode, headers, body };
}

/**
 * Admin Authentication Guard Middleware
 * Validates 'Authorization: Bearer <token>' header.
 * Writes HTTP 401 error response and returns null if unauthenticated.
 * Returns decoded payload and authenticated flag if authorized.
 * 
 * @param {object} req - Incoming HTTP request
 * @param {object} res - Outgoing HTTP response
 * @param {object} [corsHeaders] - Custom CORS headers
 * @returns {object|null} Authenticated user payload or null
 */
function verifyAdmin(req, res, corsHeaders = {}) {
    const authHeader = (req && req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
    if (!authHeader || typeof authHeader !== 'string') {
        sendJsonError(res, 401, {
            error: 'Unauthorized',
            message: 'Missing or malformed Authorization header with Bearer token.'
        }, corsHeaders);
        return null;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1].trim()) {
        sendJsonError(res, 401, {
            error: 'Unauthorized',
            message: 'Missing or malformed Authorization header with Bearer token.'
        }, corsHeaders);
        return null;
    }

    const token = match[1].trim();
    const payload = verifyJwt(token);
    if (!payload) {
        sendJsonError(res, 401, {
            error: 'Unauthorized',
            message: 'Invalid or expired authentication token.'
        }, corsHeaders);
        return null;
    }

    // Role verification
    const email = (payload.email || '').toLowerCase();
    const isAdmin = payload.role === 'admin' || ADMIN_EMAILS.some(e => e.toLowerCase() === email);

    if (!isAdmin) {
        sendJsonError(res, 401, {
            error: 'Unauthorized',
            message: 'Administrative privileges required to access this resource.'
        }, corsHeaders);
        return null;
    }

    return {
        authenticated: true,
        user: payload,
        ...payload
    };
}

module.exports = {
    getJwtSecret,
    signJwt,
    verifyJwt,
    hashPasswordScrypt,
    verifyPassword,
    verifyAdmin,
    requireAdminAuth: verifyAdmin,
    ADMIN_EMAILS
};
