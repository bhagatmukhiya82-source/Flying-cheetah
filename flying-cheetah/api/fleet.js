/**
 * FLYING CHEETAH LABS - HYPERLOCAL FLEET & BORZO/PORTER LOGISTICS GATEWAY
 * 18-Minute Mumbai On-Demand Dispatch & Live GPS Tracking
 * Supports Live Borzo Business API v1.8 when BORZO_AUTH_TOKEN is configured,
 * with transparent sandbox simulation fallback.
 * Endpoints: /api/v1/fleet/* or /api/fleet
 */

const path = require('path');

function _resolveAuth() {
    const candidates = ['./_auth', '../../api/_auth', '../api/_auth', './api/_auth'];
    if (typeof __dirname !== 'undefined') candidates.push(path.join(__dirname, '_auth'));
    for (const c of candidates) {
        try { return require(c); } catch (_) {}
    }
    return require('./_auth');
}

const { getSupabaseServerConfig } = _resolveAuth();

const MUMBAI_RIDERS = [
    { name: 'Ramesh Shinde', phone: '+91 98200 11998', vehicle: 'Honda Activa (MH-02-CD-4421)', lat: 19.0600, lng: 72.8360 },
    { name: 'Amit Sawant', phone: '+91 98191 44521', vehicle: 'TVS Jupiter (MH-01-BK-8820)', lat: 19.0760, lng: 72.8777 },
    { name: 'Sachin Jadhav', phone: '+91 99203 11842', vehicle: 'Bajaj Pulsar (MH-03-AX-1209)', lat: 19.0178, lng: 72.8478 },
    { name: 'Vijay Patil', phone: '+91 98334 55901', vehicle: 'Hero Splendor (MH-04-ER-9912)', lat: 19.1136, lng: 72.8697 }
];

module.exports = async function handler(req, res) {
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
        let body = req.body || {};
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (_) { body = {}; }
        }

        const { url: sbUrl, serverKey: sbKey, hasServiceRole, internalSecret } = getSupabaseServerConfig();
        const borzoToken = (process.env.BORZO_AUTH_TOKEN || '').trim();
        const borzoEnv = (process.env.BORZO_ENV || 'test').trim();
        const hasLiveBorzo = Boolean(borzoToken && !borzoToken.startsWith('MOCK'));
        const borzoBaseUrl = borzoEnv === 'production'
            ? 'https://robot-in.borzodelivery.com/api/business/1.8'
            : 'https://robotapitest-in.borzodelivery.com/api/business/1.8';

        const url = req.url || '';
        const orderRefFromUrl = (url.match(/track\/([A-Za-z0-9_-]+)/) || [])[1];
        const rawOrderRef = req.query?.order_ref || orderRefFromUrl || body.order_ref || `FC-MUM-${Date.now().toString().slice(-6)}`;
        const orderRef = String(rawOrderRef).trim();

        // 1. DISPATCH / CREATE COURIER ORDER (POST)
        if (req.method === 'POST') {
            const courier = (body.courier || 'borzo').toLowerCase();
            const pickupAddr = body.pickup_address || body.pickup?.address || 'Opera House, Mumbai 400004';
            const dropoffAddr = body.delivery_address || body.dropoff?.address || 'Worli Sea Face, Mumbai 400018';
            const pickupPhone = body.pickup_phone || body.pickup?.phone || '9820011223';
            const dropoffPhone = body.delivery_phone || body.dropoff?.phone || '9820011998';

            let environment = 'sandbox_simulation';
            let rider = MUMBAI_RIDERS[Math.floor(Math.random() * MUMBAI_RIDERS.length)];
            let trackingNum = `${courier.toUpperCase()}-MUM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            let trackingUrl = `https://borzodelivery.com/in/tracking/${trackingNum}`;
            let courierOrderId = `${courier}_ord_${Date.now()}`;
            const distanceKm = 3.5 + +(Math.random() * 4.5).toFixed(1);
            let deliveryFee = 45 + Math.round(distanceKm * 9);
            let etaMins = Math.round(12 + distanceKm * 1.5);
            const otp = Math.floor(1000 + Math.random() * 9000);

            // Attempt live Borzo Business API v1.8 when BORZO_AUTH_TOKEN is configured
            if (hasLiveBorzo && courier === 'borzo') {
                try {
                    const liveResp = await fetch(`${borzoBaseUrl}/create-order`, {
                        method: 'POST',
                        headers: {
                            'X-DV-Auth-Token': borzoToken,
                            'Content-Type': 'application/json; charset=utf-8'
                        },
                        body: JSON.stringify({
                            type: 'standard',
                            matter: body.matter || 'Retail Package',
                            total_weight_kg: Number(body.weight) || 1.0,
                            points: [
                                { address: pickupAddr, contact_person: { phone: pickupPhone, name: body.pickup?.name || 'Store Dispatch' } },
                                { address: dropoffAddr, contact_person: { phone: dropoffPhone, name: body.dropoff?.name || 'Customer' } }
                            ]
                        })
                    });
                    const liveData = await liveResp.json().catch(() => null);
                    if (liveResp.ok && liveData && liveData.is_successful && liveData.order) {
                        environment = borzoEnv === 'production' ? 'borzo_live_production' : 'borzo_live_test';
                        courierOrderId = String(liveData.order.order_id);
                        trackingNum = liveData.order.order_name || courierOrderId;
                        trackingUrl = liveData.order.points?.[1]?.tracking_url || trackingUrl;
                        deliveryFee = Number(liveData.order.payment_amount || deliveryFee);
                    }
                } catch (borzoErr) {
                    console.warn('[Fleet API Live Borzo Fallback]:', borzoErr.message);
                }
            }

            const fleetPayload = {
                order_ref: orderRef,
                courier: courier,
                courier_order_id: courierOrderId,
                tracking_number: trackingNum,
                tracking_url: trackingUrl,
                pickup_address: { address: pickupAddr },
                delivery_address: { address: dropoffAddr },
                rider_name: rider.name,
                rider_phone: rider.phone,
                eta_minutes: etaMins,
                status: 'courier_assigned',
                delivery_fee_inr: deliveryFee
            };

            // Persist to Supabase fleet_orders table
            if (sbUrl && sbKey) {
                try {
                    await fetch(`${sbUrl}/rest/v1/fleet_orders`, {
                        method: 'POST',
                        headers: {
                            'apikey': sbKey,
                            'Authorization': `Bearer ${sbKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': hasServiceRole ? 'return=representation' : 'return=minimal'
                        },
                        body: JSON.stringify(fleetPayload)
                    });
                } catch (sbErr) {
                    console.warn('[Fleet API Supabase notice]:', sbErr.message);
                }
            }

            return sendJson(201, {
                is_successful: true,
                environment,
                ...fleetPayload,
                pickup_address: pickupAddr,
                delivery_address: dropoffAddr,
                rider_lat: rider.lat,
                rider_lng: rider.lng,
                delivery_otp: otp,
                rider: rider,
                message: environment === 'sandbox_simulation'
                    ? 'Sandbox simulation: Rider assigned (add BORZO_AUTH_TOKEN for live dispatch).'
                    : 'Live Borzo order created. Rider assignment in progress.'
            });
        }

        // 2. TRACK ORDER (GET)
        if (req.method === 'GET') {
            let orderData = null;

            if (sbUrl && sbKey) {
                try {
                    if (internalSecret && !hasServiceRole) {
                        const rpcResp = await fetch(`${sbUrl}/rest/v1/rpc/fc_track_fleet_order`, {
                            method: 'POST',
                            headers: {
                                'apikey': sbKey,
                                'Authorization': `Bearer ${sbKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ p_server_secret: internalSecret, p_order_ref: orderRef })
                        });
                        if (rpcResp.ok) {
                            const rpcData = await rpcResp.json();
                            if (rpcData && rpcData.found && rpcData.order) orderData = rpcData.order;
                        }
                    } else {
                        const sbResp = await fetch(`${sbUrl}/rest/v1/fleet_orders?order_ref=eq.${encodeURIComponent(orderRef)}&limit=1`, {
                            headers: {
                                'apikey': sbKey,
                                'Authorization': `Bearer ${sbKey}`
                            }
                        });
                        if (sbResp.ok) {
                            const data = await sbResp.json();
                            if (data && data.length > 0) orderData = data[0];
                        }
                    }
                } catch (_) {}
            }

            // Simulation Fallback for Hyperlocal Map Demo
            if (!orderData) {
                const rider = MUMBAI_RIDERS[0];
                orderData = {
                    environment: 'sandbox_simulation',
                    order_ref: orderRef,
                    courier: 'borzo',
                    tracking_number: `BORZO-MUM-${orderRef.slice(-6)}`,
                    status: 'out_for_delivery',
                    rider_name: rider.name,
                    rider_phone: rider.phone,
                    rider_lat: rider.lat + (Math.random() - 0.5) * 0.005,
                    rider_lng: rider.lng + (Math.random() - 0.5) * 0.005,
                    eta_minutes: 14,
                    delivery_fee_inr: 78.0
                };
            }

            return sendJson(200, orderData);
        }

        return sendJson(405, { error: 'Method Not Allowed' });

    } catch (err) {
        console.error('[Fleet API Error]:', err);
        return sendJson(500, { error: err.message || 'Internal Server Error' });
    }
};
