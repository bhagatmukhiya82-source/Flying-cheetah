/**
 * FLYING CHEETAH LABS - OMNICHANNEL CONVERSION & UX WIDGETS
 * Official Number: +91 99203 86421 | Official Email: flyingcheetah.agency@gmail.com
 * Features:
 *   1. Dynamic Favicon & Mobile App Stylesheet Injection (All 24 Pages)
 *   2. Native Mobile Bottom Navigation Bar (Thumb-Ergonomic, < 768px)
 *   3. Responsive Mobile Drawer Navigation (< 1024px)
 *   4. Legal & Regulatory Footer Compliance Ingestion
 *   5. Interactive 3D Hero Revenue Chart (Desktop / Laptop)
 */

(function (window, document) {
    'use strict';

    // 1. INJECT FAVICON & MOBILE-APP STYLESHEET ACROSS ALL PAGES
    function injectFaviconAndStyles() {
        if (!document.querySelector("link[rel*='icon']")) {
            const link = document.createElement('link');
            link.type = 'image/png';
            link.rel = 'shortcut icon';
            link.href = 'images/flying_cheetah_logo_one_tail.png';
            document.head.appendChild(link);
        }

        if (!document.getElementById('fcMobileAppStyles')) {
            const cssLink = document.createElement('link');
            cssLink.id = 'fcMobileAppStyles';
            cssLink.rel = 'stylesheet';
            cssLink.href = 'css/mobile-app.css';
            document.head.appendChild(cssLink);
        }
    }

    // 2. INJECT NATIVE MOBILE BOTTOM NAVIGATION BAR (< 768px)
    function injectMobileBottomNav() {
        if (document.getElementById('fcMobileBottomNav')) return;

        const path = (window.location.pathname || '').toLowerCase();
        const isHome = path.endsWith('index.html') || path.endsWith('/') || path.endsWith('home.html') || path === '';
        const isStore = path.includes('store');
        const isDemo = path.includes('demo');

        const nav = document.createElement('nav');
        nav.id = 'fcMobileBottomNav';
        nav.setAttribute('aria-label', 'Mobile Bottom Navigation');
        nav.className = 'fixed bottom-0 left-0 right-0 z-[145] block md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 select-none';
        nav.style.paddingBottom = 'max(env(safe-area-inset-bottom, 0px), 8px)';

        const waText = encodeURIComponent("Hi Flying Cheetah team, I'm exploring your website on mobile and would like to learn more about your AI commerce agents.");
        const waUrl = `https://wa.me/919920386421?text=${waText}`;

        nav.innerHTML = `
            <div class="grid grid-cols-5 items-center h-14 text-center px-1">
                <!-- Tab 1: Home -->
                <a href="index.html" class="flex flex-col items-center justify-center py-1 transition group touch-target-44 ${isHome ? 'fc-nav-active text-bikOrange font-bold' : 'text-slate-500 hover:text-slate-800'}">
                    <i class="fa-solid fa-house text-base transition-transform group-active:scale-90"></i>
                    <span class="text-[10px] tracking-tight mt-0.5 font-medium">Home</span>
                </a>

                <!-- Tab 2: Store -->
                <a href="store.html" class="flex flex-col items-center justify-center py-1 transition group touch-target-44 ${isStore ? 'fc-nav-active text-bikOrange font-bold' : 'text-slate-500 hover:text-slate-800'}">
                    <i class="fa-solid fa-bag-shopping text-base transition-transform group-active:scale-90"></i>
                    <span class="text-[10px] tracking-tight mt-0.5 font-medium">Store</span>
                </a>

                <!-- Tab 3: Center Elevated Demo Action -->
                <a href="demo.html" class="flex flex-col items-center justify-center py-1 relative group touch-target-44">
                    <div class="w-11 h-11 -mt-5 rounded-full bg-gradient-to-tr from-bikOrange to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/35 border-2 border-white transition-transform group-active:scale-90">
                        <i class="fa-solid fa-bolt text-base animate-pulse"></i>
                    </div>
                    <span class="text-[10px] font-bold tracking-tight mt-0.5 ${isDemo ? 'text-bikOrange' : 'text-slate-600'}">Demo</span>
                </a>

                <!-- Tab 4: Direct WhatsApp Chat -->
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="flex flex-col items-center justify-center py-1 text-emerald-600 hover:text-emerald-700 transition group touch-target-44">
                    <div class="relative">
                        <i class="fa-brands fa-whatsapp text-xl transition-transform group-active:scale-90"></i>
                        <span class="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    </div>
                    <span class="text-[10px] tracking-tight mt-0.5 font-medium">Chat</span>
                </a>

                <!-- Tab 5: Mobile Drawer Menu -->
                <button type="button" onclick="window.FC_WIDGETS.toggleMobileDrawer()" aria-label="Open Navigation Menu" class="flex flex-col items-center justify-center py-1 text-slate-500 hover:text-slate-800 transition group touch-target-44 cursor-pointer">
                    <i class="fa-solid fa-bars text-base transition-transform group-active:scale-90"></i>
                    <span class="text-[10px] tracking-tight mt-0.5 font-medium">Menu</span>
                </button>
            </div>
        `;

        document.body.appendChild(nav);
    }

    // 3. INJECT MOBILE HAMBURGER & SLIDE-OUT DRAWER
    function injectMobileNavigation() {
        const header = document.querySelector('header');
        if (!header) return;

        // A. Add Hamburger Toggle Button to Header Actions if missing
        const headerContainer = header.querySelector('.max-w-7xl') || header.firstElementChild;
        if (headerContainer && !document.getElementById('fcMobileMenuBtn')) {
            const actionsDiv = headerContainer.lastElementChild;
            if (actionsDiv) {
                actionsDiv.classList.add('flex', 'items-center', 'gap-2');

                const burgerBtn = document.createElement('button');
                burgerBtn.id = 'fcMobileMenuBtn';
                burgerBtn.type = 'button';
                burgerBtn.setAttribute('aria-label', 'Toggle Mobile Menu');
                burgerBtn.className = 'lg:hidden p-2 rounded-xl border border-slate-200 hover:border-bikOrange bg-white text-slate-700 hover:text-bikOrange transition flex items-center justify-center shrink-0 w-10 h-10 shadow-xs cursor-pointer touch-target-44';
                burgerBtn.innerHTML = '<i class="fa-solid fa-bars text-sm"></i>';
                burgerBtn.onclick = function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMobileDrawer();
                };
                actionsDiv.appendChild(burgerBtn);
            }
        }

        // B. Add Drawer Overlay & Menu
        if (document.getElementById('fcMobileDrawerOverlay')) return;

        const drawerHtml = `
        <div id="fcMobileDrawerOverlay" class="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300 lg:hidden">
            <div id="fcMobileDrawer" class="fixed top-0 right-0 w-[300px] sm:w-[350px] max-w-[85vw] h-full bg-white shadow-2xl flex flex-col justify-between transform translate-x-full transition-transform duration-300 ease-out overflow-y-auto">
                <!-- Top Brand & Close -->
                <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
                    <a href="index.html" class="flex items-center gap-2.5">
                        <img src="images/flying_cheetah_logo_one_tail.png" alt="Flying Cheetah Logo" class="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs">
                        <div class="flex flex-col text-left">
                            <span class="font-black text-xs tracking-tight font-display text-bikDark leading-none">FLYING CHEETAH</span>
                            <span class="text-[8px] text-bikOrange font-bold tracking-widest uppercase mt-0.5">AI COMMERCE</span>
                        </div>
                    </a>
                    <button type="button" onclick="window.FC_WIDGETS.toggleMobileDrawer()" aria-label="Close Menu" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition cursor-pointer touch-target-44">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- Navigation Links List -->
                <div class="p-4 space-y-4 flex-1 text-sm overflow-y-auto">
                    <!-- Core Portals -->
                    <div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1.5">Core Portals</div>
                        <div class="space-y-1">
                            <a href="index.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-house text-bikOrange w-4 text-center"></i>
                                <span>Main Site</span>
                            </a>
                            <a href="home.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-compass text-bikOrange w-4 text-center"></i>
                                <span>Executive Hub</span>
                            </a>
                            <a href="store.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-bag-shopping text-emerald-600 w-4 text-center"></i>
                                <span>Store &amp; Modules</span>
                            </a>
                            <a href="demo.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-bikOrange bg-orange-50/60 hover:bg-orange-100/80 font-bold transition">
                                <i class="fa-solid fa-bolt text-bikOrange w-4 text-center animate-pulse"></i>
                                <span>Interactive Demo Portal</span>
                            </a>
                            <a href="web-development.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-code text-orange-600 w-4 text-center"></i>
                                <span>Web Development</span>
                            </a>
                            <a href="delivery.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 font-bold transition">
                                <i class="fa-solid fa-motorcycle text-emerald-600 w-4 text-center"></i>
                                <span>Fleet Protocol (Borzo &amp; Porter)</span>
                            </a>
                            <a href="about.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-circle-info text-slate-400 w-4 text-center"></i>
                                <span>About Founders</span>
                            </a>
                        </div>
                    </div>

                    <!-- AI Commerce Modules -->
                    <div class="pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1.5">AI Commerce Modules</div>
                        <div class="space-y-1 text-xs">
                            <a href="store-automation.html" class="flex items-center justify-between px-3 py-2 rounded-xl text-slate-600 hover:text-bikOrange hover:bg-orange-50 transition">
                                <span>Store Automation &amp; Cart Recovery</span>
                                <span class="text-[9px] bg-orange-100 text-bikOrange font-bold px-1.5 py-0.5 rounded">Core</span>
                            </a>
                            <a href="ai-voice-agents.html" class="flex items-center justify-between px-3 py-2 rounded-xl text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition">
                                <span>AI Voice Calling Agents</span>
                                <span class="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">New</span>
                            </a>
                            <a href="instagram-automation.html" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-pink-600 hover:bg-pink-50 transition">Instagram DMs &amp; CTWA</a>
                            <a href="whatsapp-automation.html" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition">WhatsApp Auto-Checkouts</a>
                            <a href="whatsapp-calling.html" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition">WhatsApp VoIP Calling</a>
                            <a href="whatsapp-marketing.html" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition">WhatsApp Broadcasts</a>
                            <a href="customer-data-platform.html" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition">Customer Data (CDP 360)</a>
                            <a href="customer-support.html" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition">Omnichannel Helpdesk</a>
                            <a href="solutions.html" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-bikOrange hover:bg-orange-50 transition">All 8 Automated Solutions</a>
                        </div>
                    </div>
                </div>

                <!-- Drawer Bottom Actions -->
                <div class="p-4 border-t border-slate-100 bg-slate-50 space-y-2 sticky bottom-0 z-10">
                    <a href="demo.html" onclick="window.FC_WIDGETS.toggleMobileDrawer();" class="w-full py-3 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-orange-500/20 text-center flex items-center justify-center gap-2">
                        <span>Book 1-on-1 Free Live Demo</span>
                        <span>➔</span>
                    </a>
                    <a href="https://wa.me/919920386421?text=Hi%20Flying%20Cheetah%20team%2C%20I%20am%20interested%20in%20a%20pilot%20for%20my%20store." target="_blank" rel="noopener noreferrer" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-sm text-center flex items-center justify-center gap-2">
                        <i class="fa-brands fa-whatsapp text-sm"></i>
                        <span>Chat With Founders</span>
                    </a>
                    <div class="flex items-center justify-center gap-3 text-[11px] text-slate-400 pt-1">
                        <a href="privacy-policy.html" class="hover:underline">Privacy</a>
                        <span>•</span>
                        <a href="terms-of-service.html" class="hover:underline">Terms</a>
                        <span>•</span>
                        <a href="refund-policy.html" class="hover:underline">Refunds</a>
                    </div>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', drawerHtml);

        // Close on backdrop tap
        const overlay = document.getElementById('fcMobileDrawerOverlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    toggleMobileDrawer();
                }
            });
        }
    }

    function toggleMobileDrawer() {
        const overlay = document.getElementById('fcMobileDrawerOverlay');
        const drawer = document.getElementById('fcMobileDrawer');
        if (!overlay || !drawer) return;

        const isOpen = !overlay.classList.contains('pointer-events-none');
        if (isOpen) {
            overlay.classList.add('opacity-0', 'pointer-events-none');
            drawer.classList.add('translate-x-full');
            document.body.style.overflow = '';
        } else {
            overlay.classList.remove('opacity-0', 'pointer-events-none');
            drawer.classList.remove('translate-x-full');
            document.body.style.overflow = 'hidden';
        }
    }

    // 4. ENSURE COMPLIANCE LINKS IN ALL FOOTERS
    function ensureComplianceFooterLinks() {
        const footers = document.querySelectorAll('footer');
        footers.forEach(footer => {
            if (!footer.innerHTML.includes('privacy-policy.html')) {
                const navRow = footer.querySelector('.flex-wrap, .space-x-4, .gap-4');
                if (navRow) {
                    const legalSpan = document.createElement('span');
                    legalSpan.className = 'flex items-center gap-3 border-l border-slate-300 pl-3 ml-2 text-slate-400 text-[11px]';
                    legalSpan.innerHTML = `
                        <a href="privacy-policy.html" class="hover:text-bikOrange transition">Privacy Policy</a>
                        <span>•</span>
                        <a href="terms-of-service.html" class="hover:text-bikOrange transition">Terms</a>
                        <span>•</span>
                        <a href="refund-policy.html" class="hover:text-bikOrange transition">Refunds</a>
                    `;
                    navRow.appendChild(legalSpan);
                }
            }
        });
    }

    // 5. INTERACTIVE HERO REVENUE GRAPH & 3D TILT (DESKTOP)
    function initHeroInteractiveGraph() {
        const card = document.getElementById('fcHeroCard');
        const container = document.getElementById('heroInteractiveContainer');
        const chartArea = document.getElementById('fcChartArea');
        const crosshair = document.getElementById('fcCrosshair');
        const dot = document.getElementById('fcActiveDot');
        const dotGlow = document.getElementById('fcActiveDotGlow');
        const tooltip = document.getElementById('fcChartTooltip');
        const tooltipDate = document.getElementById('fcTooltipDate');
        const tooltipRevenue = document.getElementById('fcTooltipRevenue');

        if (!card || !chartArea) return;

        // 30-Day Simulated Realistic Growth Telemetry
        const telemetryData = [];
        for (let day = 1; day <= 30; day++) {
            const base = 4600 + (day / 30) * 3100;
            const variance = Math.sin(day * 0.85) * 380 + (day % 7 === 0 || day % 7 === 6 ? 550 : -150);
            const rev = Math.round(base + variance);
            const orders = Math.max(3, Math.min(7, Math.round(rev / 1350)));
            const recovered = Math.round(rev * 0.16);
            telemetryData.push({ day, rev, orders, recovered });
        }

        // 3D Perspective Tilt on Card Hover
        if (container) {
            container.addEventListener('mousemove', (e) => {
                if (window.innerWidth < 768) return; // Skip on mobile
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                const rotateX = -(y / (rect.height / 2)) * 6; // Max 6 deg
                const rotateY = (x / (rect.width / 2)) * 6;   // Max 6 deg
                card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
                card.style.boxShadow = `0 25px 50px -12px rgba(16, 185, 129, 0.18), 0 20px 25px -5px rgba(0, 0, 0, 0.08)`;
            });

            container.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                card.style.boxShadow = '';
            });
        }

        // Interactive Crosshair & Tooltip on Chart Area
        chartArea.addEventListener('mousemove', (e) => {
            const rect = chartArea.getBoundingClientRect();
            const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            const pct = mouseX / rect.width;
            const index = Math.min(29, Math.max(0, Math.floor(pct * 30)));
            const item = telemetryData[index];

            const svgX = 50 + (index / 29) * 430;
            const norm = index / 29;
            const svgY = 140 - Math.pow(norm, 0.85) * 105;

            if (crosshair) {
                crosshair.setAttribute('x1', svgX);
                crosshair.setAttribute('x2', svgX);
                crosshair.setAttribute('opacity', '0.7');
            }
            if (dot) {
                dot.setAttribute('cx', svgX);
                dot.setAttribute('cy', svgY);
            }
            if (dotGlow) {
                dotGlow.setAttribute('cx', svgX);
                dotGlow.setAttribute('cy', svgY);
            }

            if (tooltip && tooltipDate && tooltipRevenue) {
                tooltipDate.textContent = `Dec ${item.day}, 2026 • Day ${item.day}`;
                const surge = ((item.rev - 4600) / 4600 * 100).toFixed(1);
                tooltipRevenue.innerHTML = `₹${item.rev.toLocaleString('en-IN')} <span class="text-[10px] text-emerald-300 font-bold">(+${surge}%)</span>`;
                const subEl = document.getElementById('fcTooltipSub');
                if (subEl) {
                    subEl.innerHTML = `<span><i class="fa-solid fa-box text-orange-400 text-[9px]"></i> ${item.orders} Orders</span><span>•</span><span class="text-blue-300 font-bold">₹${item.recovered.toLocaleString('en-IN')} Recovered</span>`;
                }

                const tipX = mouseX > rect.width * 0.55 ? mouseX - 180 : mouseX + 15;
                tooltip.style.left = `${Math.max(10, tipX)}px`;
                tooltip.style.top = `15px`;
                tooltip.style.opacity = '1';
            }
        });

        chartArea.addEventListener('mouseleave', () => {
            if (crosshair) crosshair.setAttribute('opacity', '0.3');
        });
    }

    // 6. GLOBAL BRANDED TOAST NOTIFICATION SYSTEM (Replaces native browser alert())
    function createToastContainer() {
        let container = document.getElementById('fcUniversalToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'fcUniversalToastContainer';
            container.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-[90%] sm:w-auto pointer-events-none transition-all';
            document.body.appendChild(container);
        }
        return container;
    }

    function showUniversalToast(message, type = 'info', title = null) {
        if (!document.body) return;
        const container = createToastContainer();
        const toast = document.createElement('div');
        
        const typeStyles = {
            success: 'border-emerald-500/50 bg-slate-900/95 text-emerald-300 shadow-emerald-950/40',
            error: 'border-rose-500/50 bg-slate-900/95 text-rose-300 shadow-rose-950/40',
            warning: 'border-amber-500/50 bg-slate-900/95 text-amber-300 shadow-amber-950/40',
            info: 'border-purple-500/50 bg-slate-900/95 text-purple-300 shadow-purple-950/40'
        }[type] || 'border-slate-700 bg-slate-900/95 text-slate-200';

        const icon = {
            success: 'fa-circle-check text-emerald-400',
            error: 'fa-circle-exclamation text-rose-400',
            warning: 'fa-triangle-exclamation text-amber-400',
            info: 'fa-bolt text-purple-400'
        }[type] || 'fa-bell text-amber-400';

        const headerTitle = title || (type === 'error' ? 'Notice' : 'Flying Cheetah');

        toast.className = `p-3.5 px-4 rounded-2xl border ${typeStyles} shadow-2xl pointer-events-auto backdrop-blur-xl flex items-start gap-3 transition-all duration-300 transform -translate-y-2 opacity-0 select-none`;
        toast.innerHTML = `
            <div class="mt-0.5 text-sm shrink-0">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div class="flex-1 text-xs">
                <div class="font-bold text-[11px] uppercase tracking-wider text-white mb-0.5">${headerTitle}</div>
                <div class="text-slate-200 leading-snug">${message}</div>
            </div>
            <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white text-xs p-1 cursor-pointer">
                <i class="fa-solid fa-xmark"></i>
            </button>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('-translate-y-2', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('-translate-y-2', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Intercept native browser alert across all pages to prevent ugly OS popups
    if (typeof window !== 'undefined') {
        window.fcToast = showUniversalToast;
        window.alert = function (msg) {
            showUniversalToast(msg, 'info', 'Flying Cheetah');
        };
    }

    // INITIALIZATION
    function initWidgets() {
        injectFaviconAndStyles();
        injectMobileNavigation();
        injectMobileBottomNav();
        ensureComplianceFooterLinks();
        initHeroInteractiveGraph();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidgets);
    } else {
        initWidgets();
    }

    window.FC_WIDGETS = {
        toggleMobileDrawer,
        injectMobileBottomNav,
        initWidgets
    };

})(window, document);
