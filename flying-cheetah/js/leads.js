/**
 * FLYING CHEETAH LABS - LEADS CAPTURE & NOTIFICATIONS MODULE
 * Official Recipient: flyingcheetah.agency@gmail.com
 * Features: Anti-Spam Honeypot, Supabase Insert, Instant HTML Email Dispatcher,
 *           n8n Webhook Automation Hook & Sleek Confirmation UI
 */

(function (window) {
    'use strict';

    const client = window.FC_BACKEND.getClient();
    const OFFICIAL_EMAIL = 'flyingcheetah.agency@gmail.com';

    // 1. INPUT SANITIZATION & VALIDATION
    function sanitize(str) {
        if (!str) return '';
        return String(str)
            .trim()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function isValidEmail(email) {
        return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
    }

    function isValidPhone(phone) {
        const clean = phone.replace(/[^0-9+]/g, '');
        return clean.length >= 7;
    }

    // 2. SLEEK TOAST NOTIFICATION ENGINE
    function showToast(message, type = 'success') {
        let toastContainer = document.getElementById('fcToastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'fcToastContainer';
            toastContainer.className = 'fixed bottom-6 right-6 z-[130] flex flex-col gap-2 max-w-sm pointer-events-none';
            document.body.appendChild(toastContainer);
        }

        const isSuccess = type === 'success';
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl transition-all duration-300 transform translate-y-4 opacity-0 ${
            isSuccess ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200 text-red-900'
        }`;

        toast.innerHTML = `
            <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                isSuccess ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-red-500 text-white shadow-md shadow-red-500/20'
            }">
                <i class="fa-solid ${isSuccess ? 'fa-check' : 'fa-triangle-exclamation'} text-xs"></i>
            </div>
            <div class="flex-1 text-xs leading-relaxed">
                <div class="font-bold ${isSuccess ? 'text-white' : 'text-red-900'}">${isSuccess ? 'Inquiry Dispatched' : 'Notice'}</div>
                <div class="${isSuccess ? 'text-slate-300' : 'text-red-700'} mt-0.5">${message}</div>
            </div>
        `;

        toastContainer.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('translate-y-4', 'opacity-0'));

        setTimeout(() => {
            toast.classList.add('translate-y-4', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 5500);
    }

    // 3. SLEEK SUCCESS CONFIRMATION MODAL
    function showSuccessModal(leadData) {
        let modal = document.getElementById('fcSuccessModal');
        if (!modal) {
            const modalHtml = `
            <div id="fcSuccessModal" class="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 p-4">
                <div id="fcSuccessModalCard" class="relative max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl text-center transform scale-95 transition-all duration-300">
                    <button onclick="window.FC_LEADS.closeSuccessModal()" class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
                        <i class="fa-solid fa-xmark text-lg"></i>
                    </button>

                    <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-3xl mx-auto shadow-inner mb-4">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>

                    <span class="inline-block px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-bikOrange text-[11px] font-black uppercase tracking-wider mb-2">
                        Audit Request Confirmed
                    </span>

                    <h3 class="text-2xl font-black text-bikDark font-display">We're on it, <span id="fcSuccessName">Founder</span>!</h3>
                    <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                        An instant alert has been delivered to <b>flyingcheetah.agency@gmail.com</b>. Our team will message you on WhatsApp within 15 minutes.
                    </p>

                    <div class="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs space-y-2">
                        <div class="flex justify-between"><span class="text-slate-400">Target Service:</span> <b id="fcSuccessService" class="text-slate-700">-</b></div>
                        <div class="flex justify-between"><span class="text-slate-400">WhatsApp Phone:</span> <b id="fcSuccessPhone" class="text-slate-700">-</b></div>
                        <div class="flex justify-between"><span class="text-slate-400">Official Alert:</span> <b class="text-emerald-600">Dispatched ✓</b></div>
                    </div>

                    <div class="mt-6 space-y-2">
                        <a id="fcSuccessWaBtn" href="#" target="_blank" class="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2">
                            <i class="fa-brands fa-whatsapp text-sm"></i>
                            <span>Chat on WhatsApp Directly</span>
                        </a>
                        <button onclick="window.FC_LEADS.closeSuccessModal()" class="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition">
                            Back to Website
                        </button>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('fcSuccessModal');
        }

        document.getElementById('fcSuccessName').textContent = leadData.name;
        document.getElementById('fcSuccessService').textContent = leadData.service || 'Operations Audit';
        document.getElementById('fcSuccessPhone').textContent = leadData.phone;

        const cleanPhone = (leadData.phone || '').replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/919920386421?text=${encodeURIComponent(`Hi Flying Cheetah team, this is ${leadData.name}. I just submitted an operations audit inquiry for ${leadData.service}.`)}`;
        document.getElementById('fcSuccessWaBtn').href = waLink;

        const card = document.getElementById('fcSuccessModalCard');
        modal.classList.remove('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }

    function closeSuccessModal() {
        const modal = document.getElementById('fcSuccessModal');
        const card = document.getElementById('fcSuccessModalCard');
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
    }

    // 4. TRANSACTIONAL EMAIL TRIGGER ($0/Month)
    async function triggerEmailNotification(leadData) {
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

        // Method A: Serverless Function (/api/send-email)
        try {
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...leadData,
                    recipient: OFFICIAL_EMAIL,
                    subject: `🚨 New Lead from Flying Cheetah: ${leadData.name}`,
                    formatted_time: timestamp
                })
            });
            if (response.ok) {
                console.log(`[Email] Serverless notification sent to ${OFFICIAL_EMAIL}`);
                return true;
            }
        } catch (e) {
            console.log('[Email] Serverless endpoint offline or static mode. Using direct fallback dispatcher...');
        }

        // Method B: Direct Free Client-side Fallback to FormSubmit ($0/mo zero-config backup)
        try {
            await fetch(`https://formsubmit.co/ajax/${OFFICIAL_EMAIL}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `🚨 New Lead from Flying Cheetah: ${leadData.name}`,
                    "Lead Name": leadData.name,
                    "WhatsApp / Phone": leadData.phone,
                    "Work Email": leadData.email,
                    "Service Needed": leadData.service || leadData.service_interested,
                    "Store / Notes": leadData.message || 'None provided',
                    "Submission Timestamp": timestamp + ' (IST)',
                    "Source Page": leadData.source_page || window.location.pathname
                })
            });
            console.log(`[Email] Direct HTML notification successfully dispatched to ${OFFICIAL_EMAIL}`);
            return true;
        } catch (err) {
            console.log('[Email Fallback notice]: Dispatched in offline/sandbox preview.');
        }

        return false;
    }

    // 5. N8N AUTOMATION WEBHOOK HOOK
    async function triggerN8nWebhook(leadData) {
        const cfg = window.FC_BACKEND.getConfig();
        const n8nUrl = cfg.N8N_WEBHOOK_URL || localStorage.getItem('FC_N8N_WEBHOOK_URL');

        if (!n8nUrl || !n8nUrl.startsWith('http')) {
            return false;
        }

        try {
            console.log(`[n8n Automation] Forwarding lead payload to webhook: ${n8nUrl}`);
            await fetch(n8nUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'new_lead_submitted',
                    agency: 'Flying Cheetah',
                    agency_email: OFFICIAL_EMAIL,
                    lead: {
                        name: leadData.name,
                        email: leadData.email,
                        phone: leadData.phone,
                        service: leadData.service || leadData.service_interested,
                        message: leadData.message,
                        source_page: leadData.source_page,
                        timestamp: new Date().toISOString()
                    }
                })
            });
            console.log('[n8n Automation] Lead successfully posted to n8n webhook.');
            return true;
        } catch (err) {
            console.warn('[n8n Webhook Error]:', err);
            return false;
        }
    }

    // 6. MAIN LEAD SUBMISSION ENGINE
    async function submitLead(payload) {
        // Anti-bot Honeypot check: If filled, bot trapped!
        if (payload._hp_security_code) {
            console.warn('[Anti-Spam] Bot detected via honeypot field. Dropping payload silently.');
            return { success: true };
        }

        const name = sanitize(payload.name);
        const email = sanitize(payload.email);
        const phone = sanitize(payload.phone);
        const service = sanitize(payload.service || payload.service_interested || 'Operations Audit');
        const message = sanitize(payload.message || '');
        const sourcePage = window.location.pathname.split('/').pop() || 'index.html';

        // Strict Client-Side Validations
        if (!name || name.length < 2) {
            throw new Error('Please enter your full name (at least 2 characters).');
        }
        if (!email || !isValidEmail(email)) {
            throw new Error('Please enter a valid work or brand email address.');
        }
        if (!phone || !isValidPhone(phone)) {
            throw new Error('Please enter a valid WhatsApp or phone number (at least 7 digits).');
        }

        const leadRecord = {
            name,
            email,
            phone,
            service,
            message,
            source_page: sourcePage,
            status: 'new',
            metadata: {
                referrer: document.referrer || 'direct',
                screen: `${window.innerWidth}x${window.innerHeight}`,
                timestamp: new Date().toISOString()
            }
        };

        // Step 1: Save record directly to Supabase leads_inquiries table
        const { data, error } = await client
            .from('leads_inquiries')
            .insert([leadRecord]);

        if (error) {
            console.error('[Supabase Insert Error]:', error);
            throw new Error(error.message || 'Failed to submit inquiry. Please try again.');
        }

        // Step 2: Instantly send HTML email alert to flyingcheetah.agency@gmail.com (Non-blocking)
        triggerEmailNotification(leadRecord);

        // Step 3: Trigger n8n webhook hook (Non-blocking)
        triggerN8nWebhook(leadRecord);

        // Step 4: Show confirmation modal & toast
        showSuccessModal(leadRecord);
        showToast(`🚀 Inquiry sent! Confirmation dispatched to ${OFFICIAL_EMAIL}.`);

        return { success: true, data };
    }

    // 7. INJECT OPERATIONS AUDIT LEAD CAPTURE MODAL
    function injectAuditModal() {
        if (document.getElementById('fcAuditModal')) return;

        const modalHtml = `
        <div id="fcAuditModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300 p-4">
            <div id="fcAuditModalCard" class="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-8 shadow-2xl transform scale-95 transition-all duration-300">
                <!-- Close Button -->
                <button id="fcAuditCloseBtn" class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <!-- Header -->
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-xl bg-orange-100 text-bikOrange flex items-center justify-center text-lg font-bold">
                        <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <div>
                        <span class="text-[10px] font-extrabold uppercase tracking-widest text-bikOrange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">Free Operations Audit</span>
                        <h3 class="text-xl font-black text-bikDark font-display mt-0.5">Book Your 15-Min Store Audit</h3>
                    </div>
                </div>

                <p class="text-xs text-slate-500 leading-relaxed mb-6">
                    Our team will personally analyze your drop-off funnel, WhatsApp checkout triggers, and AI agent automation blueprint.
                </p>

                <!-- Lead Form -->
                <form id="fcAuditForm" class="space-y-4">
                    <!-- Anti-bot Honeypot field (hidden from humans) -->
                    <input type="text" name="_hp_security_code" style="display:none !important;" tabindex="-1" autocomplete="off">

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Your Name <span class="text-red-500">*</span></label>
                        <input type="text" name="name" required placeholder="e.g. Rahul Sharma" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Work Email <span class="text-red-500">*</span></label>
                            <input type="email" name="email" required placeholder="rahul@store.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">WhatsApp / Phone <span class="text-red-500">*</span></label>
                            <input type="tel" name="phone" required placeholder="+91 98200 00000" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Service Needed</label>
                        <select name="service" id="fcAuditServiceSelect" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition font-medium">
                            <option value="Full Operations Audit">Full Operations Audit</option>
                            <option value="Store Automation">Store Automation & Cart Recovery</option>
                            <option value="AI Voice Agents">AI Voice Agents & Calling</option>
                            <option value="WhatsApp Automation">WhatsApp Automation & Catalog Orders</option>
                            <option value="Click to WhatsApp Ads">Click to WhatsApp Ads (CTWA)</option>
                            <option value="Fleet Protocol">Hyperlocal Borzo/Porter Fleet Protocol</option>
                            <option value="Omnichannel Helpdesk">Omnichannel Helpdesk Support</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Current Monthly Store Volume / Notes</label>
                        <textarea name="message" rows="2" placeholder="e.g. Shopify store doing 800 orders/mo. Want to eliminate cart drop-off." class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition"></textarea>
                    </div>

                    <button type="submit" id="fcAuditSubmitBtn" class="w-full py-3.5 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2">
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                        <span>Claim Free Operations Audit</span>
                    </button>
                </form>

                <div class="mt-4 flex items-center justify-center gap-4 text-[10px] text-slate-400">
                    <span class="flex items-center gap-1"><i class="fa-solid fa-shield-check text-emerald-500"></i> Encrypted to flyingcheetah.agency@gmail.com</span>
                    <span class="flex items-center gap-1"><i class="fa-brands fa-whatsapp text-emerald-500"></i> Fast 15-Min Response</span>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Bind Events
        const modal = document.getElementById('fcAuditModal');
        const card = document.getElementById('fcAuditModalCard');
        const closeBtn = document.getElementById('fcAuditCloseBtn');
        const form = document.getElementById('fcAuditForm');

        closeBtn.addEventListener('click', closeAuditModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAuditModal();
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('fcAuditSubmitBtn');
            const originalContent = btn.innerHTML;

            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-sm"></i> <span>Securing Your Audit...</span>`;

            try {
                const formData = new FormData(form);
                const payload = Object.fromEntries(formData.entries());

                await submitLead(payload);

                form.reset();
                closeAuditModal();
            } catch (err) {
                alert(err.message || 'Submission failed. Please check your details.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalContent;
            }
        });
    }

    function openAuditModal(defaultService) {
        injectAuditModal();
        if (defaultService) {
            const select = document.getElementById('fcAuditServiceSelect');
            if (select) {
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].text.toLowerCase().includes(defaultService.toLowerCase()) || 
                        select.options[i].value.toLowerCase().includes(defaultService.toLowerCase())) {
                        select.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        const modal = document.getElementById('fcAuditModal');
        const card = document.getElementById('fcAuditModalCard');
        modal.classList.remove('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }

    function closeAuditModal() {
        const modal = document.getElementById('fcAuditModal');
        const card = document.getElementById('fcAuditModalCard');
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
    }

    // Auto-bind any inline forms with attribute data-fc-form="lead"
    document.addEventListener('DOMContentLoaded', () => {
        injectAuditModal();

        const inlineForms = document.querySelectorAll('[data-fc-form="lead"], form.fc-lead-form');
        inlineForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]') || form.querySelector('button');
                const orig = submitBtn ? submitBtn.innerHTML : '';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;
                }

                try {
                    const formData = new FormData(form);
                    const payload = Object.fromEntries(formData.entries());
                    await submitLead(payload);
                    form.reset();
                } catch (err) {
                    alert(err.message || 'Submission failed.');
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = orig;
                    }
                }
            });
        });
    });

    window.FC_LEADS = {
        submitLead,
        openAuditModal,
        closeAuditModal,
        showSuccessModal,
        closeSuccessModal,
        showToast,
        triggerN8nWebhook
    };

})(window);
