/**
 * FLYING CHEETAH LABS - AUTHENTICATION MERCHANT PROFILE MODULE
 * Merchant Store Profile Operations: getMerchantProfile, hasSavedMerchantProfile, saveMerchantProfile
 */

(function (window) {
    'use strict';

    function getApiBase() {
        if (window.FC_API_BASE) return window.FC_API_BASE;
        if (window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            return window.location.port === '8000' ? '' : 'http://localhost:8000';
        }
        return '';
    }

    function getCurrentUser() {
        if (window.FC_AUTH_CORE && typeof window.FC_AUTH_CORE.getUser === 'function') {
            return window.FC_AUTH_CORE.getUser();
        }
        try {
            const raw = localStorage.getItem('fc_session_user');
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function getCurrentProfile() {
        if (window.FC_AUTH_CORE && typeof window.FC_AUTH_CORE.getProfile === 'function') {
            return window.FC_AUTH_CORE.getProfile();
        }
        try {
            const raw = localStorage.getItem('fc_session_profile');
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    function getValidation() {
        return window.FC_AUTH_VALIDATION || {
            sanitizePhone: (p) => (p || '').replace(/\D/g, ''),
            validatePhone: (p) => !!p
        };
    }

    function hasSavedMerchantProfile(explicitUser, explicitProfile) {
        const user = explicitUser !== undefined ? explicitUser : getCurrentUser();
        const profile = explicitProfile !== undefined ? explicitProfile : getCurrentProfile();

        try {
            const saved = JSON.parse(localStorage.getItem('fc_merchant_profile') || 'null');
            if (saved && (saved._saved || saved.business_name || saved.pickup_address || saved.gstin_udyam || saved.merchant_upi_id)) {
                return true;
            }
        } catch (_) {}
        if (profile && (profile.business_name || profile.pickup_address || profile.gstin_udyam || profile.merchant_upi_id)) {
            return true;
        }
        return false;
    }

    function getMerchantProfile(explicitUser, explicitProfile) {
        const user = explicitUser !== undefined ? explicitUser : getCurrentUser();
        const profile = explicitProfile !== undefined ? explicitProfile : getCurrentProfile();

        let saved = null;
        try {
            const raw = localStorage.getItem('fc_merchant_profile');
            if (raw) saved = JSON.parse(raw);
        } catch (_) {}

        if (!saved && !profile) {
            return {
                full_name: '',
                business_name: '',
                category_niche: 'Apparel & Fashion',
                gstin_udyam: '',
                whatsapp_support: '',
                pickup_address: '',
                merchant_upi_id: '',
                delivery_radius_km: 15,
                store_url: ''
            };
        }

        saved = saved || {};
        return {
            full_name: saved.full_name || profile?.full_name || '',
            business_name: saved.business_name || profile?.business_name || '',
            category_niche: saved.category_niche || profile?.category_niche || 'Apparel & Fashion',
            gstin_udyam: saved.gstin_udyam || profile?.gstin_udyam || '',
            whatsapp_support: saved.whatsapp_support || profile?.whatsapp_support || '',
            pickup_address: saved.pickup_address || profile?.pickup_address || '',
            merchant_upi_id: saved.merchant_upi_id || profile?.merchant_upi_id || '',
            delivery_radius_km: parseInt(saved.delivery_radius_km || profile?.delivery_radius_km || 15, 10),
            store_url: saved.store_url || profile?.store_url || ''
        };
    }

    async function saveMerchantProfile(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid profile data provided.');
        }

        if (data.upi_id && !data.merchant_upi_id) {
            data.merchant_upi_id = data.upi_id;
        }

        const validation = getValidation();

        // Validate individual fields when they are explicitly passed
        if (data.business_name !== undefined) {
            if (!data.business_name || data.business_name.trim().length < 2) {
                throw new Error('Please enter a valid Business / Brand Name (minimum 2 characters).');
            }
        }
        if (data.pickup_address !== undefined) {
            if (!data.pickup_address || data.pickup_address.trim().length < 5) {
                throw new Error('Please enter a complete pickup address for Borzo courier dispatch.');
            }
        }
        if (data.whatsapp_support !== undefined && data.whatsapp_support) {
            const cleanWa = validation.sanitizePhone(data.whatsapp_support);
            if (!validation.validatePhone(cleanWa)) {
                throw new Error('Please enter a valid WhatsApp Support Number (e.g. +91 98200 12345).');
            }
        }
        if (data.phone !== undefined && data.phone) {
            const cleanP = validation.sanitizePhone(data.phone);
            if (!validation.validatePhone(cleanP)) {
                throw new Error('Please enter a valid phone number (e.g. +91 98200 12345).');
            }
        }
        if (data.merchant_upi_id && !data.merchant_upi_id.includes('@')) {
            throw new Error('Please enter a valid Merchant UPI ID (e.g. brand@okhdfcbank).');
        }

        let currentProfile = getCurrentProfile();
        let currentUser = getCurrentUser();

        // 1. SYNCHRONOUS LOCAL STORAGE PERSISTENCE (Executes before any await)
        let savedExisting = {};
        try {
            savedExisting = JSON.parse(localStorage.getItem('fc_merchant_profile') || '{}');
        } catch (_) {}
        const toSave = { ...savedExisting, ...(currentProfile || {}), ...data, _saved: true };
        localStorage.setItem('fc_merchant_profile', JSON.stringify(toSave));

        if (currentProfile) {
            currentProfile = { ...currentProfile, ...toSave };
            localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));
            if (window.FC_AUTH_CORE && typeof window.FC_AUTH_CORE.setProfile === 'function') {
                window.FC_AUTH_CORE.setProfile(currentProfile);
            }
        }

        // Safely dispatch events & trigger UI updates
        try {
            window.dispatchEvent(new CustomEvent('fc:merchant-profile-updated', { detail: toSave }));
        } catch (_) {}

        if (window.FC_AUTH && typeof window.FC_AUTH.syncNavbarUI === 'function') {
            try { window.FC_AUTH.syncNavbarUI(); } catch (_) {}
        }
        if (window.FC_AUTH_MODAL && typeof window.FC_AUTH_MODAL.syncSignInActiveCard === 'function') {
            try { window.FC_AUTH_MODAL.syncSignInActiveCard(); } catch (_) {}
        }
        if (window.FC_AUTH_MODAL && typeof window.FC_AUTH_MODAL.populateAuthModalProfileForm === 'function') {
            try { window.FC_AUTH_MODAL.populateAuthModalProfileForm(); } catch (_) {}
        }
        if (window.FC_AUTH && typeof window.FC_AUTH.showAuthToast === 'function') {
            try { window.FC_AUTH.showAuthToast('✅ Merchant profile successfully updated!'); } catch (_) {}
        }

        // 2. Asynchronous Remote Sync (Backend API + Supabase)
        const client = window.FC_BACKEND ? window.FC_BACKEND.getClient() : null;
        try {
            let token = localStorage.getItem('fc_backend_token');
            if (!token && client?.auth?.getSession) {
                try {
                    const { data: sData } = await client.auth.getSession();
                    token = sData?.session?.access_token;
                } catch (_) {}
            }
            if (token) {
                const apiBase = getApiBase();
                const bResp = await fetch(`${apiBase}/api/v1/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
                const bData = await bResp.json().catch(() => ({}));
                if (bResp.ok && bData) {
                    const merged = { ...toSave, ...bData, _saved: true };
                    localStorage.setItem('fc_merchant_profile', JSON.stringify(merged));
                }
            }
        } catch (err) {
            console.warn('[Backend Profile Sync Notice]:', err);
        }

        try {
            if (currentUser && client) {
                const sbPayload = {};
                if (data.full_name !== undefined) sbPayload.full_name = data.full_name;
                if (data.business_name !== undefined) sbPayload.business_name = data.business_name;
                if (data.category_niche !== undefined) sbPayload.category_niche = data.category_niche;
                if (data.gstin_udyam !== undefined) sbPayload.gstin_udyam = data.gstin_udyam;
                if (data.whatsapp_support !== undefined) sbPayload.whatsapp_support = data.whatsapp_support;
                if (data.pickup_address !== undefined) sbPayload.pickup_address = data.pickup_address;
                if (data.merchant_upi_id !== undefined) sbPayload.merchant_upi_id = data.merchant_upi_id;
                if (data.delivery_radius_km !== undefined) sbPayload.delivery_radius_km = parseInt(data.delivery_radius_km, 10);
                if (data.store_url !== undefined) sbPayload.store_url = data.store_url;

                if (Object.keys(sbPayload).length > 0) {
                    await client.from('profiles').update(sbPayload).eq('id', currentUser.id);
                }
            }
        } catch (e) {
            console.warn('[Supabase Profile Update Error]:', e);
        }

        return toSave;
    }

    const profileApi = {
        hasSavedMerchantProfile,
        getMerchantProfile,
        saveMerchantProfile
    };

    window.FC_AUTH_PROFILE = profileApi;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = profileApi;
    }
})(typeof window !== 'undefined' ? window : globalThis);
