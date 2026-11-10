/**
 * FLYING CHEETAH LABS - SYSTEM HEALTH & UPTIME PROBE (SERVERLESS)
 * Endpoint: /health or /api/health
 */

module.exports = async function handler(req, res) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
        if (res.writeHead) {
            res.writeHead(200, headers);
            res.end();
            return;
        }
        return { statusCode: 200, headers, body: '' };
    }

    const payload = JSON.stringify({
        status: "healthy",
        service: "flying-cheetah-api",
        version: "1.0.0",
        environment: "production",
        cluster: "mumbai-central-1",
        uptime_seconds: process.uptime ? Math.floor(process.uptime()) : 0,
        timestamp: new Date().toISOString()
    });

    if (res.writeHead) {
        res.writeHead(200, headers);
        res.end(payload);
        return;
    }
    return { statusCode: 200, headers, body: payload };
};
