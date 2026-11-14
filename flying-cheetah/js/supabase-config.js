/**
 * FLYING CHEETAH LABS - SUPABASE CONFIGURATION (BACKWARD COMPATIBILITY STUB)
 * Official Agency Email: flyingcheetah.agency@gmail.com
 *
 * DEPRECATION NOTICE:
 * This file has been consolidated into js/supabase-client.js.
 * It is retained strictly as a backward-compatible redirect stub for legacy scripts.
 * All new code and page imports should reference js/supabase-client.js directly.
 */

(function (window) {
    'use strict';

    // 1. If canonical client is already initialized, ensure alias and exit
    if (window.FC_BACKEND && window.FC_BACKEND.getClient) {
        if (!window.FC_SUPABASE) {
            window.FC_SUPABASE = window.FC_BACKEND;
        }
        return;
    }

    console.warn('[Deprecation Notice] js/supabase-config.js is deprecated. Please migrate to js/supabase-client.js.');

    // 2. Dynamically load the canonical client script if not already present
    if (typeof document !== 'undefined') {
        const isClientLoaded = !!document.querySelector('script[src*="supabase-client.js"]');
        if (!isClientLoaded) {
            if (document.readyState === 'loading' && typeof document.write === 'function') {
                // Synchronous document write ensures client is ready before subsequent inline/external scripts run
                document.write('<script src="js/supabase-client.js"><\/script>');
            } else {
                const script = document.createElement('script');
                script.src = 'js/supabase-client.js';
                script.async = false;
                (document.head || document.body || document.documentElement).appendChild(script);
            }
        }
    }
})(typeof window !== 'undefined' ? window : this);
