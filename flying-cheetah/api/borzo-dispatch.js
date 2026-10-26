/**
 * FLYING CHEETAH LABS - BORZO HYPERLOCAL DISPATCH GATEWAY (SERVERLESS)
 * Integrates with Borzo Business API v1.8 (Mumbai & Pan-India 2-Wheeler Fleet).
 * Supports both Live API calls and Zero-Config Sandbox Simulation.
 */

const BORZO_AUTH_TOKEN = process.env.BORZO_AUTH_TOKEN || '';
const BORZO_ENV = process.env.BORZO_ENV || 'test'; // 'test' or 'production'

const BASE_URL = BORZO_ENV === 'production'
    ? 'https://robot-in.borzodelivery.com/api/business/1.8'
    : 'https://robotapitest-in.borzodelivery.com/api/business/1.8';

module.exports = async function handler(req, res) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(200, headers);
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        res.writeHead(405, headers);
        res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        return;
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) { body = {}; }
        }

        const action = body.action || 'calculate'; // 'calculate', 'create', or 'track'
        const isMockMode = !BORZO_AUTH_TOKEN || BORZO_AUTH_TOKEN.startsWith('MOCK');

        // MOCK / SANDBOX FALLBACK (Realistic Mumbai Hyperlocal Simulation)
        if (isMockMode) {
            const orderRef = body.order_ref || `FC-MUM-${Math.floor(1000 + Math.random() * 9000)}`;
            const trackingNum = `BORZO-MUM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

            if (action === 'calculate') {
                const distanceKm = 4.2 + +(Math.random() * 3).toFixed(1);
                const estimatedFee = 45 + Math.round(distanceKm * 9);
                const etaMins = Math.round(12 + distanceKm * 2);

                res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    is_successful: true,
                    environment: 'sandbox_simulation',
                    distance_km: distanceKm,
                    delivery_fee_inr: estimatedFee,
                    eta_minutes: etaMins,
                    vehicle: '2-Wheeler Bike',
                    currency: 'INR'
                }));
                return;
            }

            if (action === 'create') {
                const riders = [
                    { name: 'Ramesh Shinde', phone: '+91 98200 11998', vehicle: 'Honda Activa (MH-02-CD-4421)', lat: 19.0600, lng: 72.8360 },
                    { name: 'Amit Sawant', phone: '+91 98191 44521', vehicle: 'TVS Jupiter (MH-01-BK-8820)', lat: 19.0760, lng: 72.8777 },
                    { name: 'Sachin Jadhav', phone: '+91 99203 11842', vehicle: 'Bajaj Pulsar (MH-03-AX-1209)', lat: 19.0178, lng: 72.8478 }
                ];
                const rider = riders[Math.floor(Math.random() * riders.length)];
                const otp = Math.floor(1000 + Math.random() * 9000);

                res.writeHead(201, { ...headers, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    is_successful: true,
                    environment: 'sandbox_simulation',
                    order_ref: orderRef,
                    order_id: `borzo_ord_${Date.now()}`,
                    tracking_number: trackingNum,
                    tracking_url: `https://borzodelivery.com/in/tracking/${trackingNum}`,
                    delivery_fee_inr: 78.00,
                    eta_minutes: 16,
                    status: 'courier_assigned',
                    delivery_otp: otp,
                    rider: rider,
                    pickup: body.pickup || { address: 'Opera House, Mumbai 400004' },
                    dropoff: body.dropoff || { address: 'Worli Sea Face, Mumbai 400018' },
                    whatsapp_alert_sent: true,
                    message: 'Rider assigned. On way to store counter.'
                }));
                return;
            }
        }

        // PRODUCTION BORZO API CALL
        const endpoint = action === 'create' ? '/create-order' : '/calculate-order';
        const payload = {
            type: 'standard',
            matter: body.matter || 'Retail Package',
            total_weight_kg: Number(body.weight) || 1.0,
            points: [
                {
                    address: body.pickup?.address || 'Opera House, Girgaon, Mumbai 400004',
                    contact_person: {
                        phone: body.pickup?.phone || '9820011223',
                        name: body.pickup?.name || 'Store Dispatch'
                    },
                    note: body.pickup?.note || 'Counter pickup'
                },
                {
                    address: body.dropoff?.address,
                    contact_person: {
                        phone: body.dropoff?.phone,
                        name: body.dropoff?.name || 'Customer'
                    },
                    note: body.dropoff?.note || 'Call on arrival'
                }
            ]
        };

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'X-DV-Auth-Token': BORZO_AUTH_TOKEN,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        res.writeHead(response.status, { ...headers, 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));

    } catch (err) {
        res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ is_successful: false, error: err.message }));
    }
};
