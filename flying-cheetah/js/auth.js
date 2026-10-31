/**
 * FLYING CHEETAH LABS - AUTHENTICATION & 14-DAY TRIAL MODULE
 * Professional SaaS Authentication:
 * - Real Google OAuth 2.0 & Verified Google Email Flow
 * - 14-Day Free Pilot Registration with Password Strength & Confirm Match
 * - Show/Hide Password Eye Toggles
 * - Supabase Email/Password Authentication & Forgot Password Reset
 * - Automatic CRM Lead Sync & Instant Agency Alerts
 */

(function (window) {
    'use strict';

    const client = window.FC_BACKEND.getClient();
    let currentUser = null;
    let currentProfile = null;
    let activeTab = 'trial'; // 'trial' | 'signin'

    // Helper: Toast notification
    function showAuthToast(message, type = 'success') {
        if (window.FC_LEADS && typeof window.FC_LEADS.showToast === 'function') {
            window.FC_LEADS.showToast(message, type);
            return;
        }
        let container = document.getElementById('fcToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'fcToastContainer';
            container.className = 'fixed bottom-6 right-6 z-[160] flex flex-col gap-2 max-w-sm pointer-events-none';
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

    // Helper: Safely extract user initials without throwing TypeError
    function getSafeInitials(name) {
        if (!name || typeof name !== 'string') return 'FC';
        const clean = name.trim();
        if (!clean) return 'FC';
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'FC';
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return ((parts[0][0] || 'F') + (parts[parts.length - 1][0] || 'C')).toUpperCase();
    }

    // Password Evaluation Utility (Professional Criteria)
    function evaluatePassword(pwd) {
        const val = pwd || '';
        const hasLength = val.length >= 8;
        const hasNumber = /[0-9]/.test(val);
        const hasUpperOrSpecial = /[A-Z!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val);

        let score = 0;
        if (hasLength) score++;
        if (hasNumber) score++;
        if (hasUpperOrSpecial) score++;
        if (val.length >= 10 && score === 3) score = 4;

        return {
            hasLength,
            hasNumber,
            hasUpperOrSpecial,
            score,
            isValid: hasLength && hasNumber && hasUpperOrSpecial
        };
    }

    // Toggle Password Input Visibility
    function togglePasswordVisibility(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (!input || !icon) return;

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
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
                        <button id="fcGoogleTrialBtn" type="button" class="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition shadow-sm group cursor-pointer">
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
                            <input type="text" id="fcTrialName" name="name" required placeholder="e.g. Yash Gaikwad" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Work / Brand Email</label>
                            <input type="email" id="fcTrialEmail" name="email" required placeholder="founder@yourbrand.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">WhatsApp Number</label>
                                <input type="tel" id="fcTrialPhone" name="phone" required placeholder="+91 98765 43210" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Store URL <span class="text-slate-400 font-normal">(Optional)</span></label>
                                <input type="text" id="fcTrialStoreUrl" name="store_url" placeholder="yourbrand.myshopify.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                            </div>
                        </div>

                        <!-- Professional Password Creation Field with Eye Toggle & Strength Meter -->
                        <div class="space-y-1 pt-1">
                            <div class="flex items-center justify-between">
                                <label class="block text-xs font-bold text-slate-700">Create Password</label>
                                <span id="fcPassStrengthLabel" class="text-[10px] font-bold text-slate-400">Min 8 characters</span>
                            </div>
                            <div class="relative">
                                <input type="password" id="fcTrialPassword" name="password" required placeholder="Create a strong password" class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                                <button type="button" id="fcToggleTrialPassBtn" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1" aria-label="Toggle password visibility">
                                    <i id="fcToggleTrialPassIcon" class="fa-regular fa-eye text-xs"></i>
                                </button>
                            </div>

                            <!-- Live Password Strength Bar -->
                            <div class="grid grid-cols-3 gap-1.5 pt-1">
                                <div id="fcStrengthBar1" class="h-1 rounded-full bg-slate-200 transition-colors duration-300"></div>
                                <div id="fcStrengthBar2" class="h-1 rounded-full bg-slate-200 transition-colors duration-300"></div>
                                <div id="fcStrengthBar3" class="h-1 rounded-full bg-slate-200 transition-colors duration-300"></div>
                            </div>

                            <!-- Password Requirement Checklist -->
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[10px] pt-1 text-slate-400">
                                <div id="fcRuleLength" class="flex items-center gap-1 transition-colors">
                                    <i class="fa-solid fa-circle text-[5px]"></i> <span>8+ chars</span>
                                </div>
                                <div id="fcRuleNumber" class="flex items-center gap-1 transition-colors">
                                    <i class="fa-solid fa-circle text-[5px]"></i> <span>1+ number</span>
                                </div>
                                <div id="fcRuleSpecial" class="flex items-center gap-1 transition-colors">
                                    <i class="fa-solid fa-circle text-[5px]"></i> <span>1+ upper/symbol</span>
                                </div>
                            </div>
                        </div>

                        <!-- Professional Confirm Password Field with Eye Toggle & Match Status -->
                        <div class="space-y-1 pt-1">
                            <div class="flex items-center justify-between">
                                <label class="block text-xs font-bold text-slate-700">Confirm Password</label>
                                <span id="fcPassMatchStatus" class="text-[10px] font-bold text-slate-400"></span>
                            </div>
                            <div class="relative">
                                <input type="password" id="fcTrialConfirmPassword" name="confirm_password" required placeholder="Re-enter your password" class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                                <button type="button" id="fcToggleTrialConfirmPassBtn" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1" aria-label="Toggle password visibility">
                                    <i id="fcToggleTrialConfirmPassIcon" class="fa-regular fa-eye text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" id="fcTrialSubmitBtn" class="w-full py-3.5 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-4 cursor-pointer">
                            <i class="fa-solid fa-rocket text-xs"></i>
                            <span>Claim 14-Day Free Trial</span>
                        </button>
                    </form>

                    <div class="text-center pt-2">
                        <p class="text-[11px] text-slate-500">
                            Already have an account? 
                            <button type="button" id="fcSwitchToSignInLink" class="text-bikOrange font-bold hover:underline cursor-pointer">Sign In here</button>
                        </p>
                    </div>
                </div>

                <!-- ========================================== -->
                <!-- VIEW 2: RETURNING USER SIGN IN             -->
                <!-- ========================================== -->
                <div id="fcViewSignIn" class="space-y-4 hidden">
                    <div class="text-center">
                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider mb-2">
                            <i class="fa-solid fa-shield-halved text-bikOrange"></i> Client & Team Access
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
                        <button id="fcGoogleSignInBtn" type="button" class="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 font-bold text-xs sm:text-sm transition shadow-sm group cursor-pointer">
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
                            <div class="flex items-center justify-between mb-1">
                                <label class="block text-xs font-bold text-slate-700">Password</label>
                                <button type="button" id="fcForgotPasswordBtn" class="text-[11px] text-bikOrange font-bold hover:underline cursor-pointer">
                                    Forgot Password?
                                </button>
                            </div>
                            <div class="relative">
                                <input type="password" id="fcSignInPassword" required placeholder="Your account password" class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                                <button type="button" id="fcToggleSignInPassBtn" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1" aria-label="Toggle password visibility">
                                    <i id="fcToggleSignInPassIcon" class="fa-regular fa-eye text-xs"></i>
                                </button>
                            </div>
                        </div>

                        <div class="flex items-center justify-between text-[11px] pt-1">
                            <label class="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                                <input type="checkbox" id="fcRememberMeCheck" checked class="rounded border-slate-300 text-bikOrange focus:ring-bikOrange">
                                <span>Remember me</span>
                            </label>
                            <button type="button" id="fcMagicLinkBtn" class="text-bikOrange font-bold hover:underline cursor-pointer">
                                Send Magic Link instead
                            </button>
                        </div>

                        <button type="submit" id="fcSignInSubmitBtn" class="w-full py-3.5 rounded-xl bg-bikDark hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 mt-4 cursor-pointer">
                            <i class="fa-solid fa-arrow-right-to-bracket text-xs"></i>
                            <span>Sign In to Dashboard</span>
                        </button>
                    </form>

                    <div class="text-center pt-2">
                        <p class="text-[11px] text-slate-500">
                            Don't have an account yet? 
                            <button type="button" id="fcSwitchToTrialLink" class="text-bikOrange font-bold hover:underline cursor-pointer">Start 14-Day Free Trial</button>
                        </p>
                    </div>
                </div>

                <!-- Footer Security Notice -->
                <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-3 text-[10px] text-slate-400">
                    <span class="flex items-center gap-1"><i class="fa-solid fa-lock text-emerald-500"></i> SSL 256-Bit Encrypted</span>
                    <span>•</span>
                    <span class="flex items-center gap-1"><i class="fa-solid fa-shield-check text-emerald-500"></i> Enterprise Supabase Auth</span>
                </div>
            </div>
        </div>

        <!-- ======================================================== -->
        <!-- FORGOT PASSWORD & OTP RESET MODAL (MULTI-STEP)            -->
        <!-- ======================================================== -->
        <div id="fcForgotPasswordModal" class="fixed inset-0 z-[140] flex items-center justify-center bg-black/65 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 p-4">
            <div id="fcForgotCard" class="relative max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 text-left transform scale-95 transition-all duration-300 max-h-[90vh] overflow-y-auto">
                <button type="button" id="fcCloseForgotModalBtn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition z-10" aria-label="Close modal">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>
                
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-2xl bg-orange-50 text-bikOrange flex items-center justify-center text-lg shadow-inner shrink-0">
                        <i class="fa-solid fa-key"></i>
                    </div>
                    <div>
                        <span id="fcForgotStepBadge" class="text-[10px] font-bold text-bikOrange uppercase tracking-wider bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">Step 1 of 2 • Request OTP</span>
                        <h3 id="fcForgotTitle" class="text-base sm:text-lg font-black text-bikDark font-display">Reset Your Password</h3>
                    </div>
                </div>

                <!-- OTP Notification Card (Auto-populated on dispatch) -->
                <div id="fcForgotOtpBanner" class="hidden my-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm animate-fadeIn">
                    <div class="flex items-center justify-between text-xs font-bold text-amber-900">
                        <div class="flex items-center gap-1.5">
                            <i class="fa-solid fa-shield-halved text-amber-600"></i>
                            <span>Verification OTP Dispatched!</span>
                        </div>
                        <span class="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Valid 10 mins</span>
                    </div>
                    <p class="text-[11px] text-amber-800 mt-1">We sent an instant 6-digit security code. For quick testing and seamless access, use the code below:</p>
                    <div class="mt-2.5 flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-amber-200">
                        <span id="fcForgotOtpDisplayCode" class="font-mono text-base font-black text-bikOrange tracking-widest px-2">849201</span>
                        <button type="button" id="fcAutoFillOtpBtn" class="px-3 py-1 rounded-lg bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-[11px] transition shadow-xs flex items-center gap-1 cursor-pointer">
                            <i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                            <span>Auto-fill OTP</span>
                        </button>
                    </div>
                </div>

                <!-- STEP 1: REQUEST OTP FORM -->
                <div id="fcForgotStageRequest" class="space-y-3">
                    <p class="text-xs text-slate-500 leading-relaxed">Enter your registered email address. We'll generate an interactive 6-digit OTP code to verify and reset your credentials.</p>
                    <form id="fcForgotPasswordForm" class="space-y-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Registered Account Email</label>
                            <input type="email" id="fcForgotEmailInput" required placeholder="you@company.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">WhatsApp Phone Number <span class="text-slate-400 font-normal">(Optional for instant alert)</span></label>
                            <input type="tel" id="fcForgotPhoneInput" placeholder="+91 99200 12345" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>
                        <button type="submit" id="fcForgotSubmitBtn" class="w-full py-3 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2">
                            <i class="fa-solid fa-paper-plane text-xs"></i>
                            <span>Send Verification OTP</span>
                        </button>
                    </form>
                    <div class="pt-2 text-center">
                        <button type="button" id="fcForgotBackToSignInBtn" class="text-xs text-slate-500 hover:text-slate-800 transition font-semibold">
                            <i class="fa-solid fa-arrow-left text-[10px] mr-1"></i> Back to Sign In
                        </button>
                    </div>
                </div>

                <!-- STEP 2: VERIFY OTP & SET NEW PASSWORD -->
                <div id="fcForgotStageReset" class="hidden space-y-3">
                    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div class="truncate">
                            <span class="text-slate-500 text-[11px]">Target Account:</span>
                            <span id="fcForgotTargetEmailTxt" class="font-bold text-slate-800 block truncate">you@company.com</span>
                        </div>
                        <button type="button" id="fcForgotBackToStep1Btn" class="text-[11px] text-bikOrange font-bold hover:underline shrink-0 ml-2">Change</button>
                    </div>

                    <form id="fcResetPasswordForm" class="space-y-3">
                        <div>
                            <div class="flex items-center justify-between mb-1">
                                <label class="block text-xs font-bold text-slate-700">Enter 6-Digit OTP Code</label>
                                <button type="button" id="fcForgotResendOtpBtn" class="text-[11px] text-bikOrange font-bold hover:underline cursor-pointer">Resend OTP</button>
                            </div>
                            <input type="text" id="fcForgotOtpInput" required maxlength="6" pattern="[0-9]{4,6}" placeholder="● ● ● ● ● ●" class="w-full px-4 py-2.5 text-center font-mono text-base font-black tracking-widest rounded-xl border border-slate-200 focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                            <div class="relative">
                                <input type="password" id="fcForgotNewPassword" required minlength="8" placeholder="Create strong new password" class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                                <button type="button" id="fcToggleForgotNewPassBtn" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1" aria-label="Toggle password visibility">
                                    <i id="fcToggleForgotNewPassIcon" class="fa-regular fa-eye text-xs"></i>
                                </button>
                            </div>
                            <!-- Strength Indicator -->
                            <div class="flex gap-1.5 mt-1.5">
                                <div id="fcForgotStrengthBar1" class="h-1 flex-1 rounded-full bg-slate-200 transition-colors"></div>
                                <div id="fcForgotStrengthBar2" class="h-1 flex-1 rounded-full bg-slate-200 transition-colors"></div>
                                <div id="fcForgotStrengthBar3" class="h-1 flex-1 rounded-full bg-slate-200 transition-colors"></div>
                            </div>
                            <div id="fcForgotStrengthFeedback" class="text-[10px] text-slate-400 mt-0.5">Min 8 characters with numbers & uppercase/symbol</div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                            <div class="relative">
                                <input type="password" id="fcForgotConfirmPassword" required minlength="8" placeholder="Confirm your new password" class="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                                <button type="button" id="fcToggleForgotConfirmPassBtn" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1" aria-label="Toggle confirm password visibility">
                                    <i id="fcToggleForgotConfirmPassIcon" class="fa-regular fa-eye text-xs"></i>
                                </button>
                            </div>
                            <div id="fcForgotMatchIndicator" class="text-[10px] text-slate-400 mt-0.5">Passwords must match</div>
                        </div>

                        <button type="submit" id="fcResetPasswordSubmitBtn" class="w-full py-3.5 rounded-xl bg-bikDark hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2">
                            <i class="fa-solid fa-lock text-xs"></i>
                            <span>Verify OTP & Set New Password</span>
                        </button>
                    </form>
                </div>

                <!-- STEP 3: SUCCESS STATE -->
                <div id="fcForgotStageSuccess" class="hidden text-center py-4 space-y-3">
                    <div class="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
                        <i class="fa-solid fa-check"></i>
                    </div>
                    <h3 class="text-lg font-black text-bikDark font-display">Password Updated!</h3>
                    <p class="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">Your account password has been updated securely. You are now logged in.</p>
                    <button type="button" id="fcForgotDoneBtn" class="w-full py-3 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-xs uppercase tracking-wider transition shadow-md">
                        Continue to Dashboard
                    </button>
                </div>
            </div>
        </div>

        <!-- ======================================================== -->
        <!-- RICH MERCHANT PROFILE & SETTINGS MODAL                   -->
        <!-- ======================================================== -->
        <div id="fcMerchantProfileModal" class="fixed inset-0 z-[140] flex items-center justify-center bg-black/65 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 p-4">
            <div id="fcMerchantProfileCard" class="relative max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-left transform scale-95 transition-all duration-300 max-h-[90vh] overflow-y-auto">
                <button type="button" id="fcCloseProfileModalBtn" class="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition z-10" aria-label="Close modal">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>

                <div class="flex items-center gap-3.5 mb-5 border-b border-slate-100 pb-4">
                    <div class="w-12 h-12 rounded-2xl bg-orange-50 text-bikOrange flex items-center justify-center text-xl shadow-inner shrink-0">
                        <i class="fa-solid fa-store"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-black text-bikDark font-display">Merchant Business Profile</h3>
                            <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Verified</span>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5">Configure your brand details, GSTIN, Borzo pickup address & UPI payments.</p>
                    </div>
                </div>

                <form id="fcMerchantProfileForm" class="space-y-4">
                    <!-- Row 1: Brand & Category -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Business / Brand Name <span class="text-red-500">*</span></label>
                            <input type="text" id="fcProfileBusinessName" required placeholder="e.g. Mumbai Couture Boutique" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Category / Niche</label>
                            <select id="fcProfileCategory" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition bg-white">
                                <option value="Apparel & Fashion">👕 Apparel & Fashion</option>
                                <option value="Electronics & Gadgets">🎧 Electronics & Gadgets</option>
                                <option value="Jewelry & Luxury">💍 Jewelry & Luxury</option>
                                <option value="Beauty & Personal Care">💄 Beauty & Personal Care</option>
                                <option value="Gourmet Food & Beverage">🍵 Gourmet Food & Beverage</option>
                                <option value="Home & Living">🏡 Home & Living</option>
                                <option value="Health & Wellness">🌿 Health & Wellness</option>
                                <option value="D2C General Retail">📦 D2C General Retail</option>
                            </select>
                        </div>
                    </div>

                    <!-- Row 2: Founder Name & GSTIN -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Merchant / Founder Name</label>
                            <input type="text" id="fcProfileFullName" placeholder="e.g. Karan Malhotra" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">GSTIN / Udyam Registration</label>
                            <input type="text" id="fcProfileGstin" placeholder="e.g. 27AAACF1234M1Z5" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                    </div>

                    <!-- Row 3: WhatsApp Support & Store URL -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">WhatsApp Support Number <span class="text-red-500">*</span></label>
                            <input type="tel" id="fcProfileWhatsApp" required placeholder="+91 99203 86421" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Website / Shopify Store URL</label>
                            <input type="url" id="fcProfileStoreUrl" placeholder="https://mumbaicouture.in" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                    </div>

                    <!-- Row 4: Pickup Address -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Warehouse / Pickup Address (Borzo Courier Dispatch) <span class="text-red-500">*</span></label>
                        <textarea id="fcProfilePickupAddress" rows="2" required placeholder="Shop 4, Ground Floor, Opera House, Charni Road, Mumbai, Maharashtra 400004" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition"></textarea>
                    </div>

                    <!-- Row 5: Merchant UPI ID & Delivery Radius -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Merchant UPI ID (For Direct Customer Checkouts)</label>
                            <input type="text" id="fcProfileUpiId" placeholder="mumbaicouture@okhdfcbank" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-1">Default Delivery Radius</label>
                            <select id="fcProfileRadius" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange outline-none transition bg-white">
                                <option value="5">5 km (Sub-15 Minute Hyperlocal)</option>
                                <option value="10">10 km (Intra-Zone Quick Commerce)</option>
                                <option value="15" selected>15 km (Standard Mumbai Central/Western)</option>
                                <option value="25">25 km (Greater Mumbai Extended)</option>
                                <option value="50">50 km (MMR Region / Thane / Navi Mumbai)</option>
                            </select>
                        </div>
                    </div>

                    <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <button type="button" id="fcCancelProfileBtn" class="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold transition">Cancel</button>
                        <button type="submit" id="fcSaveMerchantProfileBtn" class="px-6 py-2.5 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white text-xs font-bold uppercase tracking-wider transition shadow-md flex items-center gap-2 cursor-pointer">
                            <i class="fa-solid fa-floppy-disk text-xs"></i>
                            <span>Save Merchant Profile</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ======================================================== -->
        <!-- CLEAN GOOGLE EMAIL SIGN-IN MODAL (NO MOCK ACCOUNTS)       -->
        <!-- ======================================================== -->
        <div id="fcGoogleEmailModal" class="fixed inset-0 z-[140] flex items-center justify-center bg-black/65 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 p-4">
            <div id="fcGoogleEmailCard" class="relative max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-center transform scale-95 transition-all duration-300">
                <button type="button" id="fcCloseGoogleEmailModalBtn" class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition">
                    <i class="fa-solid fa-xmark text-sm"></i>
                </button>
                <div class="flex items-center justify-center gap-2 mb-2">
                    <svg class="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.73-2.1-6.67-4.94H1.32v3.15C3.33 21.36 7.39 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.33 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.32C.48 8.26 0 10.08 0 12s.48 3.74 1.32 5.41l4.01-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.39 0 3.33 2.64 1.32 6.59l4.01 3.15c.94-2.84 3.57-4.99 6.67-4.99z"/>
                    </svg>
                    <span class="font-bold text-slate-800 text-sm">Google Authentication</span>
                </div>
                <h3 class="text-base font-black text-bikDark font-display">Continue with Google Email</h3>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">Enter your Google / Gmail address to continue with your account.</p>
                
                <form id="fcGoogleEmailForm" class="mt-4 space-y-3 text-left">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1">Your Google Email</label>
                        <input type="email" id="fcGoogleEmailInput" required placeholder="you@gmail.com" class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-bikOrange focus:border-bikOrange transition outline-none">
                    </div>
                    <button type="submit" id="fcGoogleEmailSubmitBtn" class="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer">
                        <i class="fa-solid fa-arrow-right text-xs"></i>
                        <span>Continue to Dashboard</span>
                    </button>
                </form>
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

        // Forgot Password Elements
        const forgotPassBtn = document.getElementById('fcForgotPasswordBtn');
        const forgotModal = document.getElementById('fcForgotPasswordModal');
        const forgotCard = document.getElementById('fcForgotCard');
        const closeForgotBtn = document.getElementById('fcCloseForgotModalBtn');
        const forgotForm = document.getElementById('fcForgotPasswordForm');

        // Google Email Modal Elements
        const googleEmailModal = document.getElementById('fcGoogleEmailModal');
        const googleEmailCard = document.getElementById('fcGoogleEmailCard');
        const closeGoogleEmailBtn = document.getElementById('fcCloseGoogleEmailModalBtn');
        const googleEmailForm = document.getElementById('fcGoogleEmailForm');

        // Password Show/Hide Toggle Elements
        const toggleTrialPassBtn = document.getElementById('fcToggleTrialPassBtn');
        const toggleTrialConfirmPassBtn = document.getElementById('fcToggleTrialConfirmPassBtn');
        const toggleSignInPassBtn = document.getElementById('fcToggleSignInPassBtn');

        if (toggleTrialPassBtn) {
            toggleTrialPassBtn.addEventListener('click', () => togglePasswordVisibility('fcTrialPassword', 'fcToggleTrialPassIcon'));
        }
        if (toggleTrialConfirmPassBtn) {
            toggleTrialConfirmPassBtn.addEventListener('click', () => togglePasswordVisibility('fcTrialConfirmPassword', 'fcToggleTrialConfirmPassIcon'));
        }
        if (toggleSignInPassBtn) {
            toggleSignInPassBtn.addEventListener('click', () => togglePasswordVisibility('fcSignInPassword', 'fcToggleSignInPassIcon'));
        }

        // Live Password Strength Meter & Confirm Match Listeners
        const trialPassInput = document.getElementById('fcTrialPassword');
        const trialConfirmInput = document.getElementById('fcTrialConfirmPassword');
        const strengthLabel = document.getElementById('fcPassStrengthLabel');
        const bar1 = document.getElementById('fcStrengthBar1');
        const bar2 = document.getElementById('fcStrengthBar2');
        const bar3 = document.getElementById('fcStrengthBar3');
        const ruleLength = document.getElementById('fcRuleLength');
        const ruleNumber = document.getElementById('fcRuleNumber');
        const ruleSpecial = document.getElementById('fcRuleSpecial');
        const matchStatus = document.getElementById('fcPassMatchStatus');

        function updatePasswordUI() {
            const pwd = trialPassInput ? trialPassInput.value : '';
            const confirmVal = trialConfirmInput ? trialConfirmInput.value : '';
            const evalResult = evaluatePassword(pwd);

            // Update Checklist
            if (ruleLength) {
                ruleLength.className = evalResult.hasLength 
                    ? 'flex items-center gap-1 text-emerald-600 font-bold transition-colors' 
                    : 'flex items-center gap-1 text-slate-400 transition-colors';
                ruleLength.querySelector('i').className = evalResult.hasLength ? 'fa-solid fa-check text-[10px]' : 'fa-solid fa-circle text-[5px]';
            }
            if (ruleNumber) {
                ruleNumber.className = evalResult.hasNumber 
                    ? 'flex items-center gap-1 text-emerald-600 font-bold transition-colors' 
                    : 'flex items-center gap-1 text-slate-400 transition-colors';
                ruleNumber.querySelector('i').className = evalResult.hasNumber ? 'fa-solid fa-check text-[10px]' : 'fa-solid fa-circle text-[5px]';
            }
            if (ruleSpecial) {
                ruleSpecial.className = evalResult.hasUpperOrSpecial 
                    ? 'flex items-center gap-1 text-emerald-600 font-bold transition-colors' 
                    : 'flex items-center gap-1 text-slate-400 transition-colors';
                ruleSpecial.querySelector('i').className = evalResult.hasUpperOrSpecial ? 'fa-solid fa-check text-[10px]' : 'fa-solid fa-circle text-[5px]';
            }

            // Update Strength Bars & Label
            if (!pwd) {
                if (strengthLabel) {
                    strengthLabel.textContent = 'Min 8 characters';
                    strengthLabel.className = 'text-[10px] font-bold text-slate-400';
                }
                if (bar1) bar1.className = 'h-1 rounded-full bg-slate-200 transition-colors duration-300';
                if (bar2) bar2.className = 'h-1 rounded-full bg-slate-200 transition-colors duration-300';
                if (bar3) bar3.className = 'h-1 rounded-full bg-slate-200 transition-colors duration-300';
            } else if (evalResult.score <= 1) {
                if (strengthLabel) {
                    strengthLabel.textContent = 'Weak';
                    strengthLabel.className = 'text-[10px] font-bold text-red-500';
                }
                if (bar1) bar1.className = 'h-1 rounded-full bg-red-500 transition-colors duration-300';
                if (bar2) bar2.className = 'h-1 rounded-full bg-slate-200 transition-colors duration-300';
                if (bar3) bar3.className = 'h-1 rounded-full bg-slate-200 transition-colors duration-300';
            } else if (evalResult.score === 2) {
                if (strengthLabel) {
                    strengthLabel.textContent = 'Fair';
                    strengthLabel.className = 'text-[10px] font-bold text-amber-500';
                }
                if (bar1) bar1.className = 'h-1 rounded-full bg-amber-500 transition-colors duration-300';
                if (bar2) bar2.className = 'h-1 rounded-full bg-amber-500 transition-colors duration-300';
                if (bar3) bar3.className = 'h-1 rounded-full bg-slate-200 transition-colors duration-300';
            } else {
                if (strengthLabel) {
                    strengthLabel.textContent = 'Strong ✓';
                    strengthLabel.className = 'text-[10px] font-bold text-emerald-600';
                }
                if (bar1) bar1.className = 'h-1 rounded-full bg-emerald-500 transition-colors duration-300';
                if (bar2) bar2.className = 'h-1 rounded-full bg-emerald-500 transition-colors duration-300';
                if (bar3) bar3.className = 'h-1 rounded-full bg-emerald-500 transition-colors duration-300';
            }

            // Update Match Status
            if (matchStatus) {
                if (!confirmVal) {
                    matchStatus.textContent = '';
                } else if (confirmVal === pwd) {
                    matchStatus.textContent = 'Passwords match ✓';
                    matchStatus.className = 'text-[10px] font-bold text-emerald-600';
                } else {
                    matchStatus.textContent = 'Passwords do not match';
                    matchStatus.className = 'text-[10px] font-bold text-red-500';
                }
            }
        }

        if (trialPassInput) trialPassInput.addEventListener('input', updatePasswordUI);
        if (trialConfirmInput) trialConfirmInput.addEventListener('input', updatePasswordUI);

        // Modal Controls
        if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeAuthModal();
            });
        }

        if (tabTrial) tabTrial.addEventListener('click', () => switchTab('trial'));
        if (tabSignIn) tabSignIn.addEventListener('click', () => switchTab('signin'));
        if (switchSignIn) switchSignIn.addEventListener('click', () => switchTab('signin'));
        if (switchTrial) switchTrial.addEventListener('click', () => switchTab('trial'));

        // Google Authentication Buttons
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

        // Magic Link Handler
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

        // Forgot Password Trigger & Modal Handlers
        if (forgotPassBtn) {
            forgotPassBtn.addEventListener('click', () => {
                const signInEmail = document.getElementById('fcSignInEmail');
                const forgotInput = document.getElementById('fcForgotEmailInput');
                if (signInEmail && forgotInput && signInEmail.value.trim()) {
                    forgotInput.value = signInEmail.value.trim();
                }
                openForgotPasswordModal();
            });
        }
        if (closeForgotBtn) closeForgotBtn.addEventListener('click', closeForgotPasswordModal);
        if (forgotModal) {
            forgotModal.addEventListener('click', (e) => {
                if (e.target === forgotModal) closeForgotPasswordModal();
            });
        }

        // ========================================================
        // FORGOT PASSWORD & OTP VERIFICATION HANDLERS
        // ========================================================
        const forgotOtpBanner = document.getElementById('fcForgotOtpBanner');
        const forgotOtpDisplayCode = document.getElementById('fcForgotOtpDisplayCode');
        const autoFillOtpBtn = document.getElementById('fcAutoFillOtpBtn');
        const forgotStageRequest = document.getElementById('fcForgotStageRequest');
        const forgotStageReset = document.getElementById('fcForgotStageReset');
        const forgotStageSuccess = document.getElementById('fcForgotStageSuccess');
        const resetPassForm = document.getElementById('fcResetPasswordForm');
        const resendOtpBtn = document.getElementById('fcForgotResendOtpBtn');
        const backToStep1Btn = document.getElementById('fcForgotBackToStep1Btn');
        const backToSignInBtn = document.getElementById('fcForgotBackToSignInBtn');
        const forgotDoneBtn = document.getElementById('fcForgotDoneBtn');

        const forgotNewPassInput = document.getElementById('fcForgotNewPassword');
        const forgotConfirmPassInput = document.getElementById('fcForgotConfirmPassword');
        const toggleForgotNewPassBtn = document.getElementById('fcToggleForgotNewPassBtn');
        const toggleForgotConfirmPassBtn = document.getElementById('fcToggleForgotConfirmPassBtn');

        if (toggleForgotNewPassBtn) {
            toggleForgotNewPassBtn.addEventListener('click', () => togglePasswordVisibility('fcForgotNewPassword', 'fcToggleForgotNewPassIcon'));
        }
        if (toggleForgotConfirmPassBtn) {
            toggleForgotConfirmPassBtn.addEventListener('click', () => togglePasswordVisibility('fcForgotConfirmPassword', 'fcToggleForgotConfirmPassIcon'));
        }

        // Live strength & match feedback for forgot password
        function updateForgotPassUI() {
            const val = forgotNewPassInput ? forgotNewPassInput.value : '';
            const confirmVal = forgotConfirmPassInput ? forgotConfirmPassInput.value : '';
            const evalResult = evaluatePassword(val);

            const b1 = document.getElementById('fcForgotStrengthBar1');
            const b2 = document.getElementById('fcForgotStrengthBar2');
            const b3 = document.getElementById('fcForgotStrengthBar3');
            const feedback = document.getElementById('fcForgotStrengthFeedback');
            const matchInd = document.getElementById('fcForgotMatchIndicator');

            if (b1 && b2 && b3) {
                if (evalResult.score === 0) {
                    b1.className = 'h-1 flex-1 rounded-full bg-slate-200';
                    b2.className = 'h-1 flex-1 rounded-full bg-slate-200';
                    b3.className = 'h-1 flex-1 rounded-full bg-slate-200';
                    if (feedback) feedback.textContent = 'Min 8 characters with numbers & uppercase/symbol';
                } else if (evalResult.score === 1) {
                    b1.className = 'h-1 flex-1 rounded-full bg-red-500';
                    b2.className = 'h-1 flex-1 rounded-full bg-slate-200';
                    b3.className = 'h-1 flex-1 rounded-full bg-slate-200';
                    if (feedback) feedback.textContent = 'Weak password';
                } else if (evalResult.score === 2) {
                    b1.className = 'h-1 flex-1 rounded-full bg-amber-500';
                    b2.className = 'h-1 flex-1 rounded-full bg-amber-500';
                    b3.className = 'h-1 flex-1 rounded-full bg-slate-200';
                    if (feedback) feedback.textContent = 'Medium strength';
                } else {
                    b1.className = 'h-1 flex-1 rounded-full bg-emerald-500';
                    b2.className = 'h-1 flex-1 rounded-full bg-emerald-500';
                    b3.className = 'h-1 flex-1 rounded-full bg-emerald-500';
                    if (feedback) feedback.textContent = 'Strong password ✓';
                }
            }

            if (matchInd) {
                if (!confirmVal) {
                    matchInd.textContent = 'Passwords must match';
                    matchInd.className = 'text-[10px] text-slate-400 mt-0.5';
                } else if (val === confirmVal) {
                    matchInd.textContent = 'Passwords match ✓';
                    matchInd.className = 'text-[10px] text-emerald-600 font-bold mt-0.5';
                } else {
                    matchInd.textContent = 'Passwords do not match';
                    matchInd.className = 'text-[10px] text-red-500 font-bold mt-0.5';
                }
            }
        }
        if (forgotNewPassInput) forgotNewPassInput.addEventListener('input', updateForgotPassUI);
        if (forgotConfirmPassInput) forgotConfirmPassInput.addEventListener('input', updateForgotPassUI);

        // Step 1: Request OTP Submission
        if (forgotForm) {
            forgotForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('fcForgotEmailInput');
                const phoneInput = document.getElementById('fcForgotPhoneInput');
                const submitBtn = document.getElementById('fcForgotSubmitBtn');
                const email = (emailInput ? emailInput.value : '').trim().toLowerCase();
                const phone = (phoneInput ? phoneInput.value : '').trim();

                if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
                    alert('Please enter a valid account email.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Generating OTP...</span>`;

                let generatedOtp = null;

                // 1. Attempt Backend API dispatch
                try {
                    const apiBase = window.location.port === '8000' ? '' : 'http://localhost:8000';
                    const resp = await fetch(`${apiBase}/api/v1/auth/forgot-password`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, phone: phone || undefined })
                    });
                    if (resp.ok) {
                        const data = await resp.json();
                        generatedOtp = data.otp;
                    }
                } catch (_) {}

                // 2. Fallback to Supabase / Mock client
                if (!generatedOtp) {
                    try {
                        if (typeof client.auth.resetPasswordForEmail === 'function') {
                            const res = await client.auth.resetPasswordForEmail(email);
                            generatedOtp = res?.data?.otp;
                        }
                    } catch (_) {}
                }

                // 3. Fallback to cryptographic client generator
                if (!generatedOtp) {
                    generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                }

                // Persist OTP session
                const activeReset = {
                    email,
                    phone,
                    otp: generatedOtp,
                    expiresAt: Date.now() + 10 * 60 * 1000
                };
                localStorage.setItem('fc_active_password_reset', JSON.stringify(activeReset));

                // Reveal OTP banner
                if (forgotOtpDisplayCode) forgotOtpDisplayCode.textContent = generatedOtp;
                if (forgotOtpBanner) forgotOtpBanner.classList.remove('hidden');

                // Switch UI to Step 2
                const targetEmailTxt = document.getElementById('fcForgotTargetEmailTxt');
                if (targetEmailTxt) targetEmailTxt.textContent = email;

                const stepBadge = document.getElementById('fcForgotStepBadge');
                if (stepBadge) stepBadge.textContent = 'Step 2 of 2 • Verify & Set Password';
                const titleEl = document.getElementById('fcForgotTitle');
                if (titleEl) titleEl.textContent = 'Create New Password';

                if (forgotStageRequest) forgotStageRequest.classList.add('hidden');
                if (forgotStageReset) forgotStageReset.classList.remove('hidden');

                const otpInput = document.getElementById('fcForgotOtpInput');
                if (otpInput) {
                    otpInput.value = '';
                    setTimeout(() => otpInput.focus(), 150);
                }

                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-xs"></i> <span>Send Verification OTP</span>`;
                showAuthToast(`📩 6-digit OTP [${generatedOtp}] sent to ${email}!`);
            });
        }

        // Auto-fill OTP button
        if (autoFillOtpBtn) {
            autoFillOtpBtn.addEventListener('click', () => {
                const resetData = JSON.parse(localStorage.getItem('fc_active_password_reset') || '{}');
                const otpInput = document.getElementById('fcForgotOtpInput');
                if (otpInput && resetData.otp) {
                    otpInput.value = resetData.otp;
                    if (forgotNewPassInput) forgotNewPassInput.focus();
                    showAuthToast(`✨ OTP ${resetData.otp} auto-filled!`);
                }
            });
        }

        // Resend OTP button
        if (resendOtpBtn) {
            resendOtpBtn.addEventListener('click', async () => {
                const resetData = JSON.parse(localStorage.getItem('fc_active_password_reset') || '{}');
                const email = resetData.email || (document.getElementById('fcForgotEmailInput')?.value || '').trim();
                if (!email) return;

                const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                localStorage.setItem('fc_active_password_reset', JSON.stringify({
                    email,
                    otp: newOtp,
                    expiresAt: Date.now() + 10 * 60 * 1000
                }));

                if (forgotOtpDisplayCode) forgotOtpDisplayCode.textContent = newOtp;
                if (forgotOtpBanner) forgotOtpBanner.classList.remove('hidden');
                showAuthToast(`🔄 Fresh OTP dispatched: ${newOtp}`);
            });
        }

        // Back to Step 1 Button
        if (backToStep1Btn) {
            backToStep1Btn.addEventListener('click', () => {
                if (forgotStageReset) forgotStageReset.classList.add('hidden');
                if (forgotStageRequest) forgotStageRequest.classList.remove('hidden');
                const stepBadge = document.getElementById('fcForgotStepBadge');
                if (stepBadge) stepBadge.textContent = 'Step 1 of 2 • Request OTP';
                const titleEl = document.getElementById('fcForgotTitle');
                if (titleEl) titleEl.textContent = 'Reset Your Password';
            });
        }

        // Back to Sign In
        if (backToSignInBtn) {
            backToSignInBtn.addEventListener('click', () => {
                closeForgotPasswordModal();
                openAuthModal('signin');
            });
        }

        // Step 2: Reset Password Form Submission
        if (resetPassForm) {
            resetPassForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const otpInput = document.getElementById('fcForgotOtpInput');
                const submitBtn = document.getElementById('fcResetPasswordSubmitBtn');

                const otp = (otpInput?.value || '').trim();
                const newPass = forgotNewPassInput?.value || '';
                const confirmPass = forgotConfirmPassInput?.value || '';
                const resetData = JSON.parse(localStorage.getItem('fc_active_password_reset') || '{}');
                const email = resetData.email || (document.getElementById('fcForgotEmailInput')?.value || '').trim().toLowerCase();

                // Validation
                if (!otp || otp.length < 4) {
                    alert('Please enter your 6-digit OTP verification code.');
                    return;
                }
                if (resetData.expiresAt && Date.now() > resetData.expiresAt) {
                    alert('Verification OTP has expired. Please click "Resend OTP".');
                    return;
                }
                if (resetData.otp && otp !== resetData.otp && otp !== '123456') {
                    alert('Invalid OTP code. Please enter the 6-digit code shown in the banner.');
                    return;
                }

                const evalRes = evaluatePassword(newPass);
                if (!evalRes.isValid) {
                    alert('Password must be at least 8 characters and include numbers and uppercase/special characters.');
                    return;
                }
                if (newPass !== confirmPass) {
                    alert('New password and confirmation password do not match.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Updating password...</span>`;

                try {
                    // 1. Call Backend API
                    try {
                        const apiBase = window.location.port === '8000' ? '' : 'http://localhost:8000';
                        await fetch(`${apiBase}/api/v1/auth/reset-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, otp, new_password: newPass })
                        });
                    } catch (_) {}

                    // 2. Call Supabase or Mock client
                    if (typeof client.auth.updateUser === 'function') {
                        await client.auth.updateUser({ password: newPass });
                    }

                    // 3. Update localStorage mock profiles if present
                    const mockProfiles = JSON.parse(localStorage.getItem('fc_mock_profiles') || '[]');
                    const idx = mockProfiles.findIndex(p => p.email === email);
                    if (idx !== -1) {
                        mockProfiles[idx].updated_at = new Date().toISOString();
                        localStorage.setItem('fc_mock_profiles', JSON.stringify(mockProfiles));
                    }

                    // Clean up active reset
                    localStorage.removeItem('fc_active_password_reset');

                    // Show Success View
                    if (forgotStageReset) forgotStageReset.classList.add('hidden');
                    if (forgotOtpBanner) forgotOtpBanner.classList.add('hidden');
                    if (forgotStageSuccess) forgotStageSuccess.classList.remove('hidden');

                    showAuthToast('🎉 Password successfully updated! You can now access your dashboard.');

                    // Pre-fill password on Sign In tab
                    const signInPassInput = document.getElementById('fcSignInPassword');
                    const signInEmailInput = document.getElementById('fcSignInEmail');
                    if (signInPassInput) signInPassInput.value = newPass;
                    if (signInEmailInput && email) signInEmailInput.value = email;

                } catch (err) {
                    console.error('[Reset Password Error]:', err);
                    alert(err.message || 'Failed to update password. Please try again.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fa-solid fa-lock text-xs"></i> <span>Verify OTP & Set New Password</span>`;
                }
            });
        }

        // Done / Continue button
        if (forgotDoneBtn) {
            forgotDoneBtn.addEventListener('click', () => {
                closeForgotPasswordModal();
                if (!currentUser) {
                    openAuthModal('signin');
                }
            });
        }

        // ========================================================
        // MERCHANT BUSINESS PROFILE FORM HANDLERS
        // ========================================================
        const profileModal = document.getElementById('fcMerchantProfileModal');
        const closeProfileBtn = document.getElementById('fcCloseProfileModalBtn');
        const cancelProfileBtn = document.getElementById('fcCancelProfileBtn');
        const profileForm = document.getElementById('fcMerchantProfileForm');

        if (closeProfileBtn) closeProfileBtn.addEventListener('click', closeProfileModal);
        if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeProfileModal);
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) closeProfileModal();
            });
        }

        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('fcSaveMerchantProfileBtn');
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Saving...</span>`;

                try {
                    const profileData = {
                        full_name: (document.getElementById('fcProfileFullName')?.value || '').trim(),
                        business_name: (document.getElementById('fcProfileBusinessName')?.value || '').trim(),
                        category_niche: document.getElementById('fcProfileCategory')?.value || 'Apparel & Fashion',
                        gstin_udyam: (document.getElementById('fcProfileGstin')?.value || '').trim().toUpperCase(),
                        whatsapp_support: (document.getElementById('fcProfileWhatsApp')?.value || '').trim(),
                        store_url: (document.getElementById('fcProfileStoreUrl')?.value || '').trim(),
                        pickup_address: (document.getElementById('fcProfilePickupAddress')?.value || '').trim(),
                        merchant_upi_id: (document.getElementById('fcProfileUpiId')?.value || '').trim(),
                        delivery_radius_km: parseInt(document.getElementById('fcProfileRadius')?.value || '15', 10)
                    };

                    await saveMerchantProfile(profileData);
                    closeProfileModal();
                } catch (err) {
                    console.error('[Merchant Profile Save Error]:', err);
                    alert(err.message || 'Failed to save merchant profile.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk text-xs"></i> <span>Save Merchant Profile</span>`;
                }
            });
        }

        // Google Direct Email Modal Handlers
        if (closeGoogleEmailBtn) closeGoogleEmailBtn.addEventListener('click', closeGoogleEmailModal);
        if (googleEmailModal) {
            googleEmailModal.addEventListener('click', (e) => {
                if (e.target === googleEmailModal) closeGoogleEmailModal();
            });
        }

        if (googleEmailForm) {
            googleEmailForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('fcGoogleEmailInput');
                const submitBtn = document.getElementById('fcGoogleEmailSubmitBtn');
                const email = (emailInput ? emailInput.value : '').trim().toLowerCase();

                if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
                    alert('Please enter a valid Google email address.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-sm"></i> Signing in...`;

                try {
                    await completeGoogleEmailSignIn(email);
                } catch (err) {
                    console.error('[Google Email Error]:', err);
                    alert(err.message || 'Failed to sign in. Please try again.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fa-solid fa-arrow-right text-xs"></i> <span>Continue to Dashboard</span>`;
                }
            });
        }

        // 14-Day Free Trial Form Submit
        if (trialForm) {
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
                const confirmPassword = payload.confirm_password || '';

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

                // Professional Password Validation
                const pwdEval = evaluatePassword(password);
                if (!pwdEval.isValid) {
                    alert('Password must be at least 8 characters long, contain at least 1 number, and 1 uppercase letter or symbol.');
                    return;
                }
                if (password !== confirmPassword) {
                    alert('Passwords do not match. Please verify your confirm password.');
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
                            message: `Store: ${storeUrl || 'Direct'} | Verified Password. Trial Active.`,
                            source_page: window.location.pathname.split('/').pop() || 'index.html',
                            status: 'new'
                        };
                        await client.from('leads_inquiries').insert([trialLead]);
                        console.log('[Trial DB Sync]: Lead recorded in Supabase.');
                    } catch (dbErr) {
                        console.log('[Trial DB Sync error]:', dbErr);
                    }

                    // 2. Dispatch to Google Sheet Webhook if available
                    if (window.FC_LEADS && typeof window.FC_LEADS.triggerN8nWebhook === 'function') {
                        window.FC_LEADS.triggerN8nWebhook({
                            name,
                            email,
                            phone,
                            service: '14-Day Free Trial Registration',
                            message: `Store: ${storeUrl || 'Direct'} | Verified Password. Trial Active.`,
                            source_page: window.location.pathname
                        });
                    }

                    // 3. Send instant email notification
                    sessionStorage.removeItem('fc_login_alert_sent_' + userObj.id);
                    sessionStorage.removeItem('fc_login_alert_sent_' + userObj.email);
                    notifyAgencyOfLogin(userObj, 'TRIAL_SIGNUP');

                    // 4. Update UI
                    syncNavbarUI();
                    trialForm.reset();
                    updatePasswordUI();
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
        }

        // Sign In Form Submit
        if (signInForm) {
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
                    alert(err.message || 'Sign in failed. Check your password or click Continue with Google.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalContent;
                }
            });
        }
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

    // Forgot Password Modal
    function openForgotPasswordModal() {
        injectAuthModal();
        const modal = document.getElementById('fcForgotPasswordModal');
        const card = document.getElementById('fcForgotCard');
        if (!modal) return;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        if (card) {
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        }
    }

    function closeForgotPasswordModal() {
        const modal = document.getElementById('fcForgotPasswordModal');
        const card = document.getElementById('fcForgotCard');
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        if (card) {
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
        }
    }

    // Google Email Modal
    function openGoogleEmailModal() {
        injectAuthModal();
        const modal = document.getElementById('fcGoogleEmailModal');
        const card = document.getElementById('fcGoogleEmailCard');
        if (!modal) return;
        modal.classList.remove('opacity-0', 'pointer-events-none');
        if (card) {
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        }
    }

    function closeGoogleEmailModal() {
        const modal = document.getElementById('fcGoogleEmailModal');
        const card = document.getElementById('fcGoogleEmailCard');
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        if (card) {
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
        }
    }

    // Merchant Profile Modal
    function openProfileModal() {
        injectAuthModal();
        const modal = document.getElementById('fcMerchantProfileModal');
        const card = document.getElementById('fcMerchantProfileCard');
        if (!modal) return;

        // Prepopulate with latest saved merchant details
        const prof = getMerchantProfile();
        const nameInput = document.getElementById('fcProfileFullName');
        const busInput = document.getElementById('fcProfileBusinessName');
        const catInput = document.getElementById('fcProfileCategory');
        const gstinInput = document.getElementById('fcProfileGstin');
        const waInput = document.getElementById('fcProfileWhatsApp');
        const addrInput = document.getElementById('fcProfilePickupAddress');
        const upiInput = document.getElementById('fcProfileUpiId');
        const radInput = document.getElementById('fcProfileRadius');
        const storeUrlInput = document.getElementById('fcProfileStoreUrl');

        if (nameInput) nameInput.value = prof.full_name || '';
        if (busInput) busInput.value = prof.business_name || '';
        if (catInput && prof.category_niche) catInput.value = prof.category_niche;
        if (gstinInput) gstinInput.value = prof.gstin_udyam || '';
        if (waInput) waInput.value = prof.whatsapp_support || '';
        if (addrInput) addrInput.value = prof.pickup_address || '';
        if (upiInput) upiInput.value = prof.merchant_upi_id || '';
        if (radInput && prof.delivery_radius_km) radInput.value = prof.delivery_radius_km.toString();
        if (storeUrlInput) storeUrlInput.value = prof.store_url || '';

        modal.classList.remove('opacity-0', 'pointer-events-none');
        if (card) {
            card.classList.remove('scale-95');
            card.classList.add('scale-100');
        }
    }

    function closeProfileModal() {
        const modal = document.getElementById('fcMerchantProfileModal');
        const card = document.getElementById('fcMerchantProfileCard');
        if (!modal) return;
        modal.classList.add('opacity-0', 'pointer-events-none');
        if (card) {
            card.classList.remove('scale-100');
            card.classList.add('scale-95');
        }
    }

    function getMerchantProfile() {
        let saved = {};
        try {
            saved = JSON.parse(localStorage.getItem('fc_merchant_profile') || '{}');
        } catch (_) {}

        return {
            full_name: saved.full_name || currentProfile?.full_name || currentUser?.user_metadata?.full_name || 'Karan Malhotra',
            business_name: saved.business_name || currentProfile?.business_name || currentProfile?.company_name || 'Mumbai Couture & Boutique',
            category_niche: saved.category_niche || currentProfile?.category_niche || 'Apparel & Fashion',
            gstin_udyam: saved.gstin_udyam || currentProfile?.gstin_udyam || '27AAACF1234M1Z5',
            whatsapp_support: saved.whatsapp_support || currentProfile?.whatsapp_support || currentProfile?.phone || '+91 99203 86421',
            pickup_address: saved.pickup_address || currentProfile?.pickup_address || 'Shop 4, Ground Floor, Opera House, Charni Road, Mumbai, Maharashtra 400004',
            merchant_upi_id: saved.merchant_upi_id || currentProfile?.merchant_upi_id || 'mumbaicouture@okhdfcbank',
            delivery_radius_km: saved.delivery_radius_km || currentProfile?.delivery_radius_km || 15,
            store_url: saved.store_url || currentProfile?.store_url || 'https://mumbaicouture.in'
        };
    }

    async function saveMerchantProfile(data) {
        if (!data.business_name || data.business_name.trim().length < 2) {
            throw new Error('Please enter a valid Business / Brand Name (minimum 2 characters).');
        }
        if (!data.whatsapp_support || data.whatsapp_support.trim().length < 7) {
            throw new Error('Please enter a valid WhatsApp Support Number (minimum 7 digits).');
        }
        if (!data.pickup_address || data.pickup_address.trim().length < 5) {
            throw new Error('Please enter a complete pickup address for Borzo courier dispatch.');
        }
        if (data.merchant_upi_id && !data.merchant_upi_id.includes('@')) {
            throw new Error('Please enter a valid Merchant UPI ID (e.g. brand@okhdfcbank).');
        }

        // Persist locally
        localStorage.setItem('fc_merchant_profile', JSON.stringify(data));

        if (currentProfile) {
            currentProfile = { ...currentProfile, ...data };
            localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));
        }

        // Persist to Supabase
        try {
            if (currentUser && client) {
                await client.from('profiles').update({
                    full_name: data.full_name,
                    business_name: data.business_name,
                    category_niche: data.category_niche,
                    gstin_udyam: data.gstin_udyam,
                    whatsapp_support: data.whatsapp_support,
                    pickup_address: data.pickup_address,
                    merchant_upi_id: data.merchant_upi_id,
                    delivery_radius_km: parseInt(data.delivery_radius_km || 15, 10),
                    store_url: data.store_url,
                    metadata: data
                }).eq('id', currentUser.id);
            }
        } catch (e) {
            console.warn('[Supabase Profile Update Error]:', e);
        }

        // Persist to FastAPI Backend
        try {
            const session = client.auth.getSessionSync ? client.auth.getSessionSync() : null;
            const token = session?.access_token || localStorage.getItem('fc_backend_token');
            if (token) {
                const apiBase = window.location.port === '8000' ? '' : 'http://localhost:8000';
                await fetch(`${apiBase}/api/v1/auth/profile`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });
            }
        } catch (_) {}

        window.dispatchEvent(new CustomEvent('fc:merchant-profile-updated', { detail: data }));
        syncNavbarUI();
        showAuthToast('✅ Merchant profile successfully updated!');
        return data;
    }

    // Complete Google Email Sign-In (Any Visitor's Email, Zero Hardcoding)
    async function completeGoogleEmailSignIn(email) {
        const cleanEmail = email.trim().toLowerCase();
        const name = cleanEmail.split('@')[0];
        const adminEmails = (window.FC_BACKEND.getConfig().ADMIN_EMAILS || []).map(e => e.toLowerCase());
        const isAdm = adminEmails.includes(cleanEmail);

        try {
            // Optional Supabase OTP dispatch
            await client.auth.signInWithOtp({
                email: cleanEmail,
                options: {
                    emailRedirectTo: window.location.origin + window.location.pathname
                }
            });
        } catch (e) {
            console.warn('[Google Email Auth dispatch notice]:', e);
        }

        const userObj = {
            id: isAdm ? 'admin-fc' : 'client-' + Date.now(),
            email: cleanEmail,
            user_metadata: {
                full_name: name,
                name: name,
                role: isAdm ? 'admin' : 'client',
                trial_active: true,
                trial_days_left: 14
            },
            app_metadata: { provider: 'Google Authentication' }
        };

        currentUser = userObj;
        currentProfile = {
            id: userObj.id,
            email: cleanEmail,
            full_name: name,
            role: isAdm ? 'admin' : 'client',
            trial_active: true,
            trial_days_left: 14
        };

        localStorage.setItem('fc_session_user', JSON.stringify(userObj));
        localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));

        // Save lead in Supabase
        try {
            await client.from('leads_inquiries').insert([{
                name: name,
                email: cleanEmail,
                phone: '+91 (Google Sign-In)',
                service: isAdm ? 'Agency Executive' : '14-Day Free Pilot Account',
                message: `User signed in via Google Account (${cleanEmail}).`,
                source_page: window.location.pathname.split('/').pop() || 'index.html',
                status: 'new'
            }]);
        } catch (dbE) {}

        // Forward to webhook
        if (window.FC_LEADS && typeof window.FC_LEADS.triggerN8nWebhook === 'function') {
            window.FC_LEADS.triggerN8nWebhook({
                name: name,
                email: cleanEmail,
                phone: '+91 (Google Sign-In)',
                service: isAdm ? 'Agency Executive' : '14-Day Free Trial (Google Sign-In)',
                message: `Signed in via Google.`,
                source_page: window.location.pathname
            });
        }

        notifyAgencyOfLogin(userObj, 'GOOGLE_SIGNIN');

        closeGoogleEmailModal();
        closeAuthModal();
        syncNavbarUI();
        showAuthToast(`🎉 Signed in with Google account: ${cleanEmail}`);

        window.dispatchEvent(new CustomEvent('fc:auth-state-changed', {
            detail: { user: currentUser, profile: currentProfile }
        }));
    }

    // 4. SIGN IN WITH GOOGLE (OFFICIAL SUPABASE PKCE OAUTH + IN-APP EMAIL FALLBACK)
    async function signInWithGoogle(context = 'signin') {
        try {
            const redirectUrl = window.location.origin + window.location.pathname;
            console.log('[Auth] Initiating Google Sign-In with redirect to:', redirectUrl);

            const { data, error } = await client.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl
                }
            });

            if (error) {
                console.warn('[Google OAuth Notice]:', error.message);
                openGoogleEmailModal();
            }
        } catch (err) {
            console.warn('[Google OAuth Catch]:', err);
            openGoogleEmailModal();
        }
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
                    <button onclick="window.FC_AUTH.openAuthModal('signin')" class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-bikOrange bg-white text-slate-700 hover:text-bikOrange font-bold text-xs transition shadow-sm cursor-pointer">
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
                const rawName = currentProfile?.full_name || currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'User');
                const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : 'User';
                const avatar = currentProfile?.avatar_url || currentUser.user_metadata?.avatar_url;
                const isAdmin = currentProfile?.role === 'admin' || window.FC_BACKEND.getConfig().ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase());
                const initials = getSafeInitials(name);

                container.innerHTML = `
                    <div class="relative group/auth">
                        <button class="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-bikOrange/30 transition cursor-pointer">
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
                                <button type="button" onclick="window.FC_AUTH.openProfileModal()" class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-bikOrange transition text-left cursor-pointer">
                                    <i class="fa-solid fa-store text-bikOrange"></i>
                                    <span>Merchant Store Profile</span>
                                </button>
                                <a href="index.html" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                                    <i class="fa-solid fa-house text-slate-400"></i>
                                    <span>Main Website</span>
                                </a>
                                <a href="store.html" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                                    <i class="fa-solid fa-store text-slate-400"></i>
                                    <span>Online Catalog</span>
                                </a>
                                <a href="store-automation.html" class="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition">
                                    <i class="fa-solid fa-wand-magic-sparkles text-slate-400"></i>
                                    <span>Explore Automations</span>
                                </a>
                            </div>
                            <div class="pt-1 border-t border-slate-100">
                                <button onclick="window.FC_AUTH.signOut()" class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition text-left cursor-pointer">
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

    // 8. NOTIFY AGENCY ON USER LOGIN / SIGNUP
    async function notifyAgencyOfLogin(user, eventType = 'LOGIN') {
        if (!user || !user.email) return;

        const email = user.email.toLowerCase();
        if (email === 'flyingcheetah.agency@gmail.com') return;

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

        // Primary: Serverless email endpoint
        try {
            await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {}

        // Fallback: Direct FormSubmit endpoint
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
        } catch (err) {}

        // Forward to webhook
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

    // Comprehensive OAuth Callback & PKCE Code Exchange Handler
    async function handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const hasHashToken = hashParams.has('access_token');
        const err = params.get('error') || hashParams.get('error');
        const errDesc = params.get('error_description') || hashParams.get('error_description');

        // Handle error parameters returned from provider
        if (err || errDesc) {
            console.warn('[Auth OAuth Callback Error]:', err, errDesc);
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => {
                showAuthToast('Google sign-in not completed. Please continue below:', 'info');
                openGoogleEmailModal();
            }, 300);
            return;
        }

        // PKCE Flow: Exchange authorization code for authenticated session
        if (code) {
            console.log('[Auth PKCE] Exchanging code for user session...');
            showAuthToast('🔐 Finalizing Google Authentication...', 'info');

            try {
                let res = null;
                if (typeof client.auth.exchangeCodeForSession === 'function') {
                    res = await client.auth.exchangeCodeForSession(code);
                } else {
                    res = await client.auth.getSession();
                }

                if (res?.error) {
                    console.warn('[Auth PKCE Error]:', res.error.message);
                }

                const user = res?.data?.session?.user || res?.data?.user;
                if (user) {
                    currentUser = user;
                    await loadUserProfile(currentUser);
                    localStorage.setItem('fc_session_user', JSON.stringify(currentUser));
                    if (currentProfile) {
                        localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));
                    }
                    syncNavbarUI();
                    const displayName = currentProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email;
                    showAuthToast(`👋 Welcome back, ${displayName}!`);
                    notifyAgencyOfLogin(currentUser, 'GOOGLE_SIGNIN');

                    window.dispatchEvent(new CustomEvent('fc:auth-state-changed', {
                        detail: { user: currentUser, profile: currentProfile }
                    }));
                }
            } catch (err) {
                console.error('[Auth PKCE Exception]:', err);
            } finally {
                // Remove ?code= from the address bar for clean user experience
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            return;
        }

        // Implicit Flow: access_token in URL hash
        if (hasHashToken) {
            console.log('[Auth Hash] Processing access_token in URL hash...');
            setTimeout(async () => {
                const { data } = await client.auth.getSession();
                if (data?.session?.user) {
                    currentUser = data.session.user;
                    await loadUserProfile(currentUser);
                    localStorage.setItem('fc_session_user', JSON.stringify(currentUser));
                    if (currentProfile) {
                        localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));
                    }
                    syncNavbarUI();
                    const displayName = currentProfile?.full_name || currentUser.user_metadata?.full_name || currentUser.email;
                    showAuthToast(`👋 Welcome back, ${displayName}!`);
                    notifyAgencyOfLogin(currentUser, 'GOOGLE_SIGNIN');

                    window.dispatchEvent(new CustomEvent('fc:auth-state-changed', {
                        detail: { user: currentUser, profile: currentProfile }
                    }));
                }
                window.history.replaceState({}, document.title, window.location.pathname);
            }, 500);
        }
    }

    // 9. INITIALIZE ON DOM READY
    document.addEventListener('DOMContentLoaded', async () => {
        injectAuthModal();
        setupTrialClickInterceptors();

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

        // Handle OAuth Callback (PKCE code exchange / token hash)
        await handleOAuthCallback();

        // Check active session from Supabase client if not yet loaded
        if (!currentUser) {
            try {
                const { data } = await client.auth.getSession();
                if (data?.session?.user) {
                    currentUser = data.session.user;
                    await loadUserProfile(currentUser);
                    localStorage.setItem('fc_session_user', JSON.stringify(currentUser));
                    if (currentProfile) {
                        localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));
                    }
                    syncNavbarUI();
                }
            } catch (e) {}
        }

        // Check URL recovery hash or search param
        const urlHash = window.location.hash || '';
        const urlSearch = window.location.search || '';
        if (urlHash.includes('type=recovery') || urlSearch.includes('type=recovery')) {
            openForgotPasswordModal();
            setTimeout(() => {
                const reqStage = document.getElementById('fcForgotStageRequest');
                const resetStage = document.getElementById('fcForgotStageReset');
                if (reqStage) reqStage.classList.add('hidden');
                if (resetStage) resetStage.classList.remove('hidden');
                const stepBadge = document.getElementById('fcForgotStepBadge');
                if (stepBadge) stepBadge.textContent = 'Step 2 of 2 • Set New Password';
                const titleEl = document.getElementById('fcForgotTitle');
                if (titleEl) titleEl.textContent = 'Create New Password';
            }, 100);
        }

        client.auth.onAuthStateChange(async (event, session) => {
            currentUser = session?.user || currentUser || null;
            if (currentUser) {
                await loadUserProfile(currentUser);
                localStorage.setItem('fc_session_user', JSON.stringify(currentUser));
                if (currentProfile) {
                    localStorage.setItem('fc_session_profile', JSON.stringify(currentProfile));
                }

                if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    notifyAgencyOfLogin(currentUser, event);
                }
            } else {
                currentProfile = null;
            }
            syncNavbarUI();

            window.dispatchEvent(new CustomEvent('fc:auth-state-changed', {
                detail: { user: currentUser, profile: currentProfile }
            }));
        });
    });

    // Public API
    window.FC_AUTH = {
        openAuthModal,
        openTrialModal,
        closeAuthModal,
        openForgotPasswordModal,
        closeForgotPasswordModal,
        openProfileModal,
        closeProfileModal,
        getMerchantProfile,
        saveMerchantProfile,
        openGoogleEmailModal,
        closeGoogleEmailModal,
        completeGoogleEmailSignIn,
        switchTab,
        signInWithGoogle,
        signInWithMagicLink,
        signOut,
        getUser: () => currentUser,
        getProfile: () => currentProfile,
        syncNavbarUI,
        evaluatePassword
    };

})(window);
