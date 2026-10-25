/**
 * FLYING CHEETAH LABS - SUPABASE CONFIGURATION & CLIENT INITIALIZATION
 * Official Agency Email: flyingcheetah.agency@gmail.com
 * $0/Month Architecture with Automatic Mock Storage Fallback for local development
 */

(function (window) {
    'use strict';

    const cleanStorage = (key) => {
        const val = localStorage.getItem(key);
        return (!val || val.includes('xyzcompany') || val.includes('placeholder')) ? null : val;
    };

    // 1. CONFIGURATION
    const DEFAULT_CONFIG = {
        SUPABASE_URL: window.FC_SUPABASE_URL || cleanStorage('FC_SUPABASE_URL') || 'https://txqtkpxdyoatzdgkcsry.supabase.co',
        SUPABASE_ANON_KEY: window.FC_SUPABASE_ANON_KEY || cleanStorage('FC_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4cXRrcHhkeW9hdHpkZ2tjc3J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Mzk5NDksImV4cCI6MjEwODQxNTk0OX0.TuGGpGZKHOhvkcpv02W_R-2wwuXykBTdL1iXa9G1qFE',
        OFFICIAL_EMAIL: 'flyingcheetah.agency@gmail.com',
        ADMIN_EMAILS: ['flyingcheetah.agency@gmail.com', 'bhagatmukhiya@gmail.com', 'yashgaikwad@gmail.com'],
        N8N_WEBHOOK_URL: window.FC_N8N_WEBHOOK_URL || cleanStorage('FC_N8N_WEBHOOK_URL') || 'https://script.google.com/macros/s/AKfycbwJ6cvX2sJ2wPMORyZCTWv3HRicUWe3B2_CS-Z5IZVQu-sBrqbl69c8XyMNt1eL4Bln/exec'
    };

    const isPlaceholder = (key) => !key || key.includes('xyzcompany') || key.includes('placeholder');

    let clientInstance = null;
    let isMockMode = false;

    // 2. MOCK DATABASE & AUTH IMPLEMENTATION (FOR OFFLINE / LOCAL PREVIEW)
    class MockSupabaseClient {
        constructor() {
            this.storageKeyLeads = 'fc_mock_leads';
            this.storageKeyProfiles = 'fc_mock_profiles';
            this.storageKeySession = 'fc_mock_session';
            this.listeners = [];

            // Seed initial sample leads if empty
            if (!localStorage.getItem(this.storageKeyLeads)) {
                const sampleLeads = [
                    {
                        id: 'lead-101',
                        name: 'Aarav Mehta',
                        email: 'aarav@mumbaicouture.in',
                        phone: '+91 98201 23456',
                        service: 'Store Automation',
                        service_interested: 'Store Automation',
                        message: 'Need instant WhatsApp abandoned cart recovery for our Shopify boutique in Bandra.',
                        source_page: 'store-automation.html',
                        status: 'new',
                        created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
                        submitted_at: new Date(Date.now() - 1000 * 60 * 25).toISOString()
                    },
                    {
                        id: 'lead-102',
                        name: 'Rohan Sharma',
                        email: 'rohan@spiceheritage.com',
                        phone: '+91 98111 87654',
                        service: 'AI Voice Agents',
                        service_interested: 'AI Voice Agents',
                        message: 'Looking to replace manual call center team for automated COD order verification calls.',
                        source_page: 'ai-voice-agents.html',
                        status: 'contacted',
                        created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
                        submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString()
                    },
                    {
                        id: 'lead-103',
                        name: 'Pooja Verma',
                        email: 'pooja@urbanglow.co',
                        phone: '+91 99300 55443',
                        service: 'Click to WhatsApp Ads',
                        service_interested: 'Click to WhatsApp Ads',
                        message: 'Scaling Meta Ads budget to ₹15L/mo. Want CTWA funnel with sub-15s response time.',
                        source_page: 'ctwa-automation.html',
                        status: 'closed',
                        created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
                        submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString()
                    }
                ];
                localStorage.setItem(this.storageKeyLeads, JSON.stringify(sampleLeads));
            }

            // Seed profiles table if empty
            if (!localStorage.getItem(this.storageKeyProfiles)) {
                const sampleProfiles = [
                    {
                        id: 'user-admin-001',
                        full_name: 'Flying Cheetah Admin',
                        email: 'flyingcheetah.agency@gmail.com',
                        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                        role: 'admin',
                        created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString()
                    },
                    {
                        id: 'user-client-002',
                        full_name: 'Vikram Singhania',
                        email: 'vikram@singhaniastore.in',
                        avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Vikram',
                        role: 'client',
                        created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString()
                    }
                ];
                localStorage.setItem(this.storageKeyProfiles, JSON.stringify(sampleProfiles));
            }

            this.auth = {
                getUser: async () => {
                    const session = this.getSessionSync();
                    return { data: { user: session ? session.user : null }, error: null };
                },
                getSession: async () => {
                    const session = this.getSessionSync();
                    return { data: { session }, error: null };
                },
                signInWithOAuth: async ({ provider, email, name } = {}) => {
                    const chosenEmail = email || DEFAULT_CONFIG.OFFICIAL_EMAIL;
                    const isAdm = DEFAULT_CONFIG.ADMIN_EMAILS.includes(chosenEmail.toLowerCase());
                    const chosenName = name || (isAdm ? 'Flying Cheetah Admin' : chosenEmail.split('@')[0]);

                    console.log(`[Supabase Mock] Simulating ${provider} OAuth for ${chosenEmail}...`);
                    const mockUser = {
                        id: isAdm ? 'user-admin-001' : 'user-' + Date.now(),
                        email: chosenEmail,
                        user_metadata: {
                            full_name: chosenName,
                            avatar_url: isAdm 
                                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                                : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chosenName)}`,
                            role: isAdm ? 'admin' : 'client',
                            trial_active: !isAdm,
                            trial_days_left: 14
                        },
                        app_metadata: {
                            provider: 'Google OAuth 2.0'
                        }
                    };
                    const session = {
                        user: mockUser,
                        access_token: 'mock-jwt-token',
                        expires_at: Date.now() + 3600000
                    };
                    localStorage.setItem(this.storageKeySession, JSON.stringify(session));
                    this.notifyAuthListeners('SIGNED_IN', session);
                    return { data: { provider, url: null, user: mockUser, session }, error: null };
                },
                signInWithOtp: async ({ email }) => {
                    const isAdm = DEFAULT_CONFIG.ADMIN_EMAILS.includes(email.toLowerCase());
                    const mockUser = {
                        id: 'user-' + Date.now(),
                        email,
                        user_metadata: {
                            full_name: email.split('@')[0],
                            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
                            role: isAdm ? 'admin' : 'client'
                        }
                    };
                    const session = { user: mockUser, access_token: 'mock-jwt', expires_at: Date.now() + 3600000 };
                    localStorage.setItem(this.storageKeySession, JSON.stringify(session));
                    this.notifyAuthListeners('SIGNED_IN', session);
                    return { data: { user: mockUser, session }, error: null };
                },
                signUp: async ({ email, password, options = {} }) => {
                    console.log(`[Supabase Mock] Registering new user: ${email}`);
                    const isAdm = DEFAULT_CONFIG.ADMIN_EMAILS.includes(email.toLowerCase());
                    const name = options.data?.full_name || email.split('@')[0];
                    const mockUser = {
                        id: 'user-' + Date.now(),
                        email,
                        user_metadata: {
                            full_name: name,
                            avatar_url: options.data?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
                            phone: options.data?.phone || '',
                            store_url: options.data?.store_url || '',
                            role: isAdm ? 'admin' : 'client',
                            trial_active: true,
                            trial_days_left: 14,
                            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                        }
                    };
                    const session = { user: mockUser, access_token: 'mock-jwt-' + Date.now(), expires_at: Date.now() + 3600000 };
                    localStorage.setItem(this.storageKeySession, JSON.stringify(session));
                    
                    // Sync into profiles
                    const profiles = JSON.parse(localStorage.getItem(this.storageKeyProfiles) || '[]');
                    profiles.unshift({
                        id: mockUser.id,
                        full_name: name,
                        email: email,
                        avatar_url: mockUser.user_metadata.avatar_url,
                        role: isAdm ? 'admin' : 'client',
                        created_at: new Date().toISOString()
                    });
                    localStorage.setItem(this.storageKeyProfiles, JSON.stringify(profiles));

                    this.notifyAuthListeners('SIGNED_IN', session);
                    return { data: { user: mockUser, session }, error: null };
                },
                signInWithPassword: async ({ email, password }) => {
                    const isAdm = DEFAULT_CONFIG.ADMIN_EMAILS.includes(email.toLowerCase());
                    const mockUser = {
                        id: 'user-' + Date.now(),
                        email,
                        user_metadata: {
                            full_name: email.split('@')[0],
                            avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}`,
                            role: isAdm ? 'admin' : 'client'
                        }
                    };
                    const session = { user: mockUser, access_token: 'mock-jwt-' + Date.now(), expires_at: Date.now() + 3600000 };
                    localStorage.setItem(this.storageKeySession, JSON.stringify(session));
                    this.notifyAuthListeners('SIGNED_IN', session);
                    return { data: { user: mockUser, session }, error: null };
                },
                signOut: async () => {
                    localStorage.removeItem(this.storageKeySession);
                    this.notifyAuthListeners('SIGNED_OUT', null);
                    return { error: null };
                },
                onAuthStateChange: (callback) => {
                    this.listeners.push(callback);
                    const session = this.getSessionSync();
                    callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);
                    return {
                        data: {
                            subscription: {
                                unsubscribe: () => {
                                    this.listeners = this.listeners.filter(cb => cb !== callback);
                                }
                            }
                        }
                    };
                }
            };
        }

        getSessionSync() {
            try {
                const s = localStorage.getItem(this.storageKeySession);
                return s ? JSON.parse(s) : null;
            } catch (e) {
                return null;
            }
        }

        notifyAuthListeners(event, session) {
            this.listeners.forEach(cb => {
                try { cb(event, session); } catch (err) { console.error(err); }
            });
        }

        from(tableName) {
            const self = this;
            return {
                insert: async (records) => {
                    const rows = Array.isArray(records) ? records : [records];
                    if (tableName === 'leads_inquiries') {
                        const existing = JSON.parse(localStorage.getItem(self.storageKeyLeads) || '[]');
                        const created = rows.map(r => ({
                            id: 'lead-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                            status: r.status || 'new',
                            service: r.service || r.service_interested || 'Operations Audit',
                            service_interested: r.service || r.service_interested || 'Operations Audit',
                            created_at: new Date().toISOString(),
                            submitted_at: new Date().toISOString(),
                            ...r
                        }));
                        localStorage.setItem(self.storageKeyLeads, JSON.stringify([...created, ...existing]));
                        return { data: created, error: null };
                    }
                    if (tableName === 'calculator_estimates') {
                        const existing = JSON.parse(localStorage.getItem('fc_mock_estimates') || '[]');
                        const created = rows.map(r => ({
                            id: 'est-' + Date.now(),
                            created_at: new Date().toISOString(),
                            ...r
                        }));
                        localStorage.setItem('fc_mock_estimates', JSON.stringify([...created, ...existing]));
                        return { data: created, error: null };
                    }
                    return { data: rows, error: null };
                },
                select: (columns = '*') => {
                    let items = [];
                    if (tableName === 'leads_inquiries') {
                        items = JSON.parse(localStorage.getItem(self.storageKeyLeads) || '[]');
                    } else if (tableName === 'profiles') {
                        items = JSON.parse(localStorage.getItem(self.storageKeyProfiles) || '[]');
                        const session = self.getSessionSync();
                        if (session && session.user && !items.find(p => p.id === session.user.id)) {
                            const isAdm = DEFAULT_CONFIG.ADMIN_EMAILS.includes(session.user.email.toLowerCase());
                            items.unshift({
                                id: session.user.id,
                                full_name: session.user.user_metadata?.full_name || 'Flying Cheetah Admin',
                                email: session.user.email,
                                avatar_url: session.user.user_metadata?.avatar_url || '',
                                role: isAdm ? 'admin' : 'client',
                                created_at: new Date().toISOString()
                            });
                        }
                    } else if (tableName === 'calculator_estimates') {
                        items = JSON.parse(localStorage.getItem('fc_mock_estimates') || '[]');
                    }

                    const queryObj = {
                        _items: [...items],
                        order: function (col, { ascending = true } = {}) {
                            this._items.sort((a, b) => {
                                if (a[col] < b[col]) return ascending ? -1 : 1;
                                if (a[col] > b[col]) return ascending ? 1 : -1;
                                return 0;
                            });
                            return this;
                        },
                        eq: function (col, val) {
                            this._items = this._items.filter(item => item[col] === val);
                            return this;
                        },
                        then: function (resolve) {
                            resolve({ data: this._items, error: null });
                        }
                    };
                    return queryObj;
                },
                update: (updates) => {
                    return {
                        eq: async (col, val) => {
                            if (tableName === 'leads_inquiries') {
                                const leads = JSON.parse(localStorage.getItem(self.storageKeyLeads) || '[]');
                                let updatedRow = null;
                                const updated = leads.map(l => {
                                    if (l[col] === val) {
                                        updatedRow = { ...l, ...updates, updated_at: new Date().toISOString() };
                                        return updatedRow;
                                    }
                                    return l;
                                });
                                localStorage.setItem(self.storageKeyLeads, JSON.stringify(updated));
                                return { data: [updatedRow], error: null };
                            }
                            return { data: [], error: null };
                        }
                    };
                },
                delete: () => {
                    return {
                        eq: async (col, val) => {
                            if (tableName === 'leads_inquiries') {
                                const leads = JSON.parse(localStorage.getItem(self.storageKeyLeads) || '[]');
                                const filtered = leads.filter(l => l[col] !== val);
                                localStorage.setItem(self.storageKeyLeads, JSON.stringify(filtered));
                                return { data: filtered, error: null };
                            }
                            return { data: [], error: null };
                        }
                    };
                }
            };
        }
    }

    // 3. INITIALIZE CLIENT
    function initSupabase() {
        const url = DEFAULT_CONFIG.SUPABASE_URL;
        const key = DEFAULT_CONFIG.SUPABASE_ANON_KEY;

        // If credentials are placeholders or supabase library isn't loaded, use Mock Client
        if (isPlaceholder(url) || isPlaceholder(key) || typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            console.info('[Supabase] Initializing Flying Cheetah Local Engine (Mock mode). Connected for $0/mo preview.');
            clientInstance = new MockSupabaseClient();
            isMockMode = true;
        } else {
            console.info('[Supabase] Initializing Live Supabase PostgreSQL Client SDK...');
            try {
                clientInstance = window.supabase.createClient(url, key, {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                });
                isMockMode = false;
            } catch (err) {
                console.error('[Supabase Init Error] Falling back to Mock Engine:', err);
                clientInstance = new MockSupabaseClient();
                isMockMode = true;
            }
        }
        return clientInstance;
    }

    const client = initSupabase();

    // 4. EXPOSE BACKEND CLIENT TO WINDOW
    window.FC_BACKEND = {
        getClient: () => clientInstance || client,
        getConfig: () => ({ ...DEFAULT_CONFIG }),
        setConfig: (url, anonKey, n8nWebhook) => {
            if (url) localStorage.setItem('FC_SUPABASE_URL', url);
            if (anonKey) localStorage.setItem('FC_SUPABASE_ANON_KEY', anonKey);
            if (n8nWebhook !== undefined) localStorage.setItem('FC_N8N_WEBHOOK_URL', n8nWebhook);
            window.location.reload();
        },
        isMockMode: () => isMockMode
    };

    // Global alias
    window.FC_SUPABASE = window.FC_BACKEND;

})(window);
