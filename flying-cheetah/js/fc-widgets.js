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

    // 1. INJECT FAVICON, THEME-COLOR, SKIP LINK & MOBILE-APP STYLESHEET ACROSS ALL PAGES
    function injectFaviconAndStyles() {
        if (!document.querySelector("meta[name='theme-color']")) {
            const meta = document.createElement('meta');
            meta.name = 'theme-color';
            meta.content = '#FFFFFF';
            document.head.appendChild(meta);
        }

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

        if (document.body && document.getElementById('main-content') && !document.querySelector('.fc-skip-link')) {
            const skip = document.createElement('a');
            skip.href = '#main-content';
            skip.className = 'fc-skip-link';
            skip.textContent = 'Skip to main content';
            document.body.insertBefore(skip, document.body.firstChild);
        }

        // Respect prefers-reduced-motion for decorative autoplay showcase videos
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            document.querySelectorAll('video[autoplay]').forEach((v) => {
                v.removeAttribute('autoplay');
                try { v.pause(); } catch (_) {}
            });
        }
    }

    // 2. INJECT NATIVE MOBILE BOTTOM NAVIGATION BAR (< 768px)
    function injectMobileBottomNav() {
        if (document.getElementById('fcMobileBottomNav')) return;

        const path = (window.location.pathname || '').toLowerCase();
        const isHome = path.endsWith('index.html') || path.endsWith('/') || path.endsWith('home.html') || path === '';
        const isAutomations = path.includes('solutions') || path.includes('automation') || path.includes('voice') || path.includes('delivery');
        const isDemo = path.includes('demo');

        const nav = document.createElement('nav');
        nav.id = 'fcMobileBottomNav';
        nav.setAttribute('aria-label', 'Mobile Bottom Navigation');
        nav.className = 'fixed bottom-0 left-0 right-0 z-[145] block md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-all duration-300 select-none';
        nav.style.paddingBottom = 'max(env(safe-area-inset-bottom, 0px), 8px)';

        const waText = encodeURIComponent("Hi Flying Cheetah team, I'm exploring your website on mobile and would like to learn more about your AI automation, marketing, and web development services.");
        const waUrl = `https://wa.me/919920386421?text=${waText}`;

        nav.innerHTML = `
            <div class="grid grid-cols-5 items-center h-14 text-center px-1">
                <!-- Tab 1: Home -->
                <a href="index.html" class="flex flex-col items-center justify-center py-1 transition group touch-target-44 ${isHome ? 'fc-nav-active text-orange-700 font-bold' : 'text-slate-700 hover:text-slate-800'}">
                    <i class="fa-solid fa-house text-base transition-transform group-active:scale-90"></i>
                    <span class="text-[10px] tracking-tight mt-0.5 font-medium">Home</span>
                </a>

                <!-- Tab 2: Automations (Replaces old retail store tab) -->
                <a href="solutions.html" class="flex flex-col items-center justify-center py-1 transition group touch-target-44 ${isAutomations ? 'fc-nav-active text-orange-700 font-bold' : 'text-slate-700 hover:text-slate-800'}">
                    <i class="fa-solid fa-bolt text-base transition-transform group-active:scale-90"></i>
                    <span class="text-[10px] tracking-tight mt-0.5 font-medium">Automations</span>
                </a>

                <!-- Tab 3: Center Elevated Demo Action -->
                <a href="demo.html" class="flex flex-col items-center justify-center py-1 relative group touch-target-44">
                    <div class="w-11 h-11 -mt-5 rounded-full bg-gradient-to-tr from-bikOrange to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/35 border-2 border-white transition-transform group-active:scale-90">
                        <i class="fa-solid fa-play text-sm ml-0.5 animate-pulse"></i>
                    </div>
                    <span class="text-[10px] font-bold tracking-tight mt-0.5 ${isDemo ? 'fc-nav-active text-orange-700' : 'text-slate-700'}">Demo</span>
                </a>

                <!-- Tab 4: Direct WhatsApp Chat -->
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="fc-nav-wa flex flex-col items-center justify-center py-1 text-emerald-700 hover:text-emerald-800 transition group touch-target-44">
                    <div class="relative">
                        <i class="fa-brands fa-whatsapp text-xl transition-transform group-active:scale-90"></i>
                        <span class="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    </div>
                    <span class="text-[10px] tracking-tight mt-0.5 font-medium">Chat</span>
                </a>

                <!-- Tab 5: Mobile Drawer Menu -->
                <button type="button" onclick="window.FC_WIDGETS.toggleMobileDrawer()" aria-label="Open Navigation Menu" class="flex flex-col items-center justify-center py-1 text-slate-700 hover:text-slate-800 transition group touch-target-44 cursor-pointer">
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
        if (headerContainer) {
            const existingBurger = document.getElementById('fcMobileMenuBtn');
            if (existingBurger) {
                if (!existingBurger.getAttribute('type')) {
                    existingBurger.setAttribute('type', 'button');
                }
                if (!existingBurger.onclick) {
                    existingBurger.onclick = function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMobileDrawer();
                    };
                }
            } else {
                const actionsDiv = headerContainer.lastElementChild;
                if (actionsDiv) {
                    actionsDiv.classList.add('flex', 'items-center', 'gap-2');

                    const burgerBtn = document.createElement('button');
                    burgerBtn.id = 'fcMobileMenuBtn';
                    burgerBtn.type = 'button';
                    burgerBtn.setAttribute('aria-label', 'Toggle Mobile Menu');
                    burgerBtn.setAttribute('aria-expanded', 'false');
                    burgerBtn.setAttribute('aria-controls', 'fcMobileDrawer');
                    burgerBtn.className = 'lg:hidden p-2 rounded-xl border border-slate-200 hover:border-bikOrange bg-white text-slate-700 hover:text-bikOrange transition flex items-center justify-center shrink-0 w-10 h-10 shadow-sm cursor-pointer touch-target-44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bikOrange focus-visible:ring-offset-2';
                    burgerBtn.innerHTML = '<i class="fa-solid fa-bars text-sm" aria-hidden="true"></i>';
                    burgerBtn.onclick = function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMobileDrawer();
                    };
                    actionsDiv.appendChild(burgerBtn);
                }
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
                        <img src="images/flying_cheetah_logo_one_tail.png" alt="Flying Cheetah Logo" width="32" height="32" decoding="async" class="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-sm">
                        <div class="flex flex-col text-left">
                            <span class="font-black text-xs tracking-tight font-display text-bikDark leading-none">FLYING CHEETAH</span>
                            <span class="text-[8px] text-orange-700 font-bold tracking-widest uppercase mt-0.5">AI COMMERCE</span>
                        </div>
                    </a>
                    <button type="button" onclick="window.FC_WIDGETS.toggleMobileDrawer()" aria-label="Close Menu" class="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 transition cursor-pointer touch-target-44">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- Navigation Links List -->
                <div class="p-4 space-y-4 flex-1 text-sm overflow-y-auto">
                    <!-- Core Quick Links -->
                    <div>
                        <div class="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 mb-1.5">Quick Links</div>
                        <div class="space-y-1">
                            <a href="index.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-house text-orange-700 w-4 text-center"></i>
                                <span>Main Site</span>
                            </a>
                            <a href="store.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 font-bold transition">
                                <i class="fa-solid fa-cart-shopping text-emerald-700 w-4 text-center"></i>
                                <span>Live Storefront Demo</span>
                            </a>
                            <a href="demo.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-orange-700 bg-orange-50/60 hover:bg-orange-100/80 font-bold transition">
                                <i class="fa-solid fa-play text-orange-700 w-4 text-center animate-pulse"></i>
                                <span>Live Interactive Sandbox</span>
                            </a>
                            <a href="about.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-circle-info text-slate-600 w-4 text-center"></i>
                                <span>About Us &amp; Founders</span>
                            </a>
                        </div>
                    </div>

                    <!-- 1. AI AUTOMATION SYSTEMS -->
                    <div class="pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-bold text-orange-700 uppercase tracking-widest px-2 mb-1.5 flex items-center gap-1.5">
                            <i class="fa-solid fa-bolt text-[10px]"></i> AI Automation Systems
                        </div>
                        <div class="space-y-1 text-xs">
                            <a href="store-automation.html" class="flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 transition font-medium">
                                <span>Shopify &amp; Storefront Automation</span>
                                <span class="text-[9px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.5 rounded">Auto-Upsell</span>
                            </a>
                            <a href="ai-voice-agents.html" class="flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:text-purple-600 hover:bg-purple-50 transition">
                                <span>AI Voice Calling Agents (COD/RTO)</span>
                                <span class="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">Sub-180ms</span>
                            </a>
                            <a href="whatsapp-automation.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 transition font-medium">WhatsApp Conversational Commerce</a>
                            <a href="instagram-automation.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-pink-600 hover:bg-pink-50 transition font-medium">Instagram DM &amp; Reel Auto-Sell</a>
                            <a href="delivery.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-orange-600 hover:bg-orange-50 transition font-medium">Hyperlocal Fleet Protocol (Borzo &amp; Porter)</a>
                            <a href="customer-support.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition font-medium">24/7 AI Omnichannel Helpdesk</a>
                            <a href="solutions.html" class="block px-3 py-2 rounded-xl text-orange-700 font-bold hover:bg-orange-50 transition">View All Automation Solutions ↗</a>
                        </div>
                    </div>

                    <!-- 2. PERFORMANCE MARKETING & GROWTH -->
                    <div class="pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-bold text-emerald-700 uppercase tracking-widest px-2 mb-1.5 flex items-center gap-1.5">
                            <i class="fa-solid fa-bullhorn text-[10px]"></i> Performance Marketing
                        </div>
                        <div class="space-y-1 text-xs">
                            <a href="ctwa-automation.html" class="flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 transition">
                                <span>Click-to-WhatsApp (CTWA) Meta Ads</span>
                                <span class="text-[9px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">+28% ROAS</span>
                            </a>
                            <a href="whatsapp-marketing.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 transition font-medium">WhatsApp Broadcast Campaigns</a>
                            <a href="sms-marketing.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition font-medium">DLT-Compliant SMS Marketing</a>
                            <a href="rcs-messaging.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-purple-600 hover:bg-purple-50 transition font-medium">RCS Rich Interactive Messaging</a>
                            <a href="customer-data-platform.html" class="block px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 transition font-medium">Customer Data Platform (CDP 360)</a>
                        </div>
                    </div>

                    <!-- 3. WEB & APP ENGINEERING -->
                    <div class="pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-bold text-blue-600 uppercase tracking-widest px-2 mb-1.5 flex items-center gap-1.5">
                            <i class="fa-solid fa-code text-[10px]"></i> Web &amp; App Development
                        </div>
                        <div class="space-y-1 text-xs">
                            <a href="web-development.html" class="flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition font-bold">
                                <span>High-Speed Storefronts &amp; Web Apps</span>
                                <span class="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">&lt; 100ms</span>
                            </a>
                            <a href="web-development.html#tech-stack" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition">Headless Shopify &amp; Next.js Architecture</a>
                            <a href="web-development.html#pricing" class="block px-3 py-2 rounded-xl text-slate-600 hover:text-slate-900 transition">Web Engineering Packages &amp; SEO</a>
                        </div>
                    </div>
                </div>

                <!-- Drawer Bottom Actions -->
                <div class="p-4 border-t border-slate-100 bg-slate-50 space-y-2 sticky bottom-0 z-10">
                    <a href="demo.html" onclick="window.FC_WIDGETS.toggleMobileDrawer();" class="w-full py-3 rounded-xl bg-orange-700 text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-orange-500/20 text-center flex items-center justify-center gap-2">
                        <span>Book 1-on-1 Free Live Demo</span>
                        <span>➔</span>
                    </a>
                    <a href="https://wa.me/919920386421?text=Hi%20Flying%20Cheetah%20team%2C%20I%20am%20interested%20in%20a%20pilot%20for%20my%20store." target="_blank" rel="noopener noreferrer" class="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs uppercase tracking-wider transition shadow-sm text-center flex items-center justify-center gap-2">
                        <i class="fa-brands fa-whatsapp text-sm"></i>
                        <span>Chat With Founders</span>
                    </a>
                    <div class="flex items-center justify-center gap-3 text-[11px] text-slate-600 pt-1">
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

        const burgerBtn = document.getElementById('fcMobileMenuBtn');
        const isOpen = !overlay.classList.contains('pointer-events-none');
        if (isOpen) {
            overlay.classList.add('opacity-0', 'pointer-events-none');
            drawer.classList.add('translate-x-full');
            document.body.style.overflow = '';
            if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'false');
        } else {
            overlay.classList.remove('opacity-0', 'pointer-events-none');
            drawer.classList.remove('translate-x-full');
            document.body.style.overflow = 'hidden';
            if (burgerBtn) burgerBtn.setAttribute('aria-expanded', 'true');
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
                    legalSpan.className = 'flex items-center gap-3 border-l border-slate-300 pl-3 ml-2 text-slate-600 text-[11px]';
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
                tooltipDate.textContent = `Nov ${item.day}, 2026 • Day ${item.day}`;
                const surge = ((item.rev - 4600) / 4600 * 100).toFixed(1);
                tooltipRevenue.innerHTML = `₹${item.rev.toLocaleString('en-IN')} <span class="text-[10px] text-emerald-700 font-bold">(+${surge}%)</span>`;
                const subEl = document.getElementById('fcTooltipSub');
                if (subEl) {
                    subEl.innerHTML = `<span><i class="fa-solid fa-box text-orange-400 text-[9px]"></i> ${item.orders} Orders</span><span>•</span><span class="text-blue-700 font-bold">₹${item.recovered.toLocaleString('en-IN')} Recovered</span>`;
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
            container.setAttribute('role', 'status');
            container.setAttribute('aria-live', 'polite');
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
            success: 'border-emerald-200 bg-white text-slate-900 shadow-emerald-900/10',
            error: 'border-rose-200 bg-white text-slate-900 shadow-rose-900/10',
            warning: 'border-amber-200 bg-white text-slate-900 shadow-amber-900/10',
            info: 'border-purple-200 bg-white text-slate-900 shadow-purple-900/10'
        }[type] || 'border-slate-200 bg-white text-slate-900 shadow-slate-900/10';

        const icon = {
            success: 'fa-circle-check text-emerald-700',
            error: 'fa-circle-exclamation text-rose-700',
            warning: 'fa-triangle-exclamation text-amber-700',
            info: 'fa-bolt text-purple-700'
        }[type] || 'fa-bell text-amber-700';

        const headerTitle = title || (type === 'error' ? 'Notice' : 'Flying Cheetah');

        toast.className = `p-3.5 px-4 rounded-2xl border ${typeStyles} shadow-xl pointer-events-auto backdrop-blur-xl flex items-start gap-3 transition-all duration-300 transform -translate-y-2 opacity-0 select-none`;
        toast.innerHTML = `
            <div class="mt-0.5 text-sm shrink-0">
                <i class="fa-solid ${icon}" aria-hidden="true"></i>
            </div>
            <div class="flex-1 text-xs">
                <div class="font-bold text-[11px] uppercase tracking-wider text-slate-900 mb-0.5">${headerTitle}</div>
                <div class="text-slate-700 leading-snug">${message}</div>
            </div>
            <button type="button" aria-label="Dismiss notification" onclick="this.parentElement.remove()" class="text-slate-600 hover:text-slate-900 text-xs p-1 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bikOrange">
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
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

    // 7. STUDIO SCROLL PROGRESS BEAM (COMPOSITOR-SAFE SCALEX)
    function initScrollProgressBar() {
        if (!document.body || document.getElementById('fcScrollProgress')) return;
        const bar = document.createElement('div');
        bar.id = 'fcScrollProgress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);

        let ticking = false;
        const updateBar = () => {
            const docEl = document.documentElement;
            const maxScroll = Math.max(1, docEl.scrollHeight - docEl.clientHeight);
            const pct = Math.max(0, Math.min(1, (window.scrollY || docEl.scrollTop || 0) / maxScroll));
            bar.style.setProperty('--fc-scroll', pct.toFixed(4));
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(updateBar);
            }
        }, { passive: true });
        updateBar();
    }

    // 8. UNIVERSAL STUDIO SCROLL CHOREOGRAPHY & LIVE KPI COUNTERS
    function initStudioMotionAndCounters() {
        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion || typeof IntersectionObserver === 'undefined') return;

        // Animate hero SVG curve path on load
        const heroCurve = document.getElementById('fcChartLinePath');
        if (heroCurve) {
            heroCurve.classList.add('fc-svg-draw');
        }

        // Collect below-fold interactive cards, showcase frames & major section headers
        const candidates = document.querySelectorAll(
            'main section .card-anim, main section .fc-card-interactive, main section .fc-showcase-frame, main section > div > .text-center, [data-fc-reveal]'
        );
        const vh = window.innerHeight || 800;
        const toObserve = [];

        candidates.forEach((el) => {
            if (el.closest('header') || el.closest('#fcHeroCard')) return;
            const rect = el.getBoundingClientRect();
            // Keep initial viewport above-the-fold elements 100% immediate for zero LCP delay
            if (rect.top < vh * 0.92) {
                el.classList.add('is-visible');
                return;
            }
            const parent = el.parentElement;
            let siblingIdx = 0;
            if (parent) {
                const kids = Array.from(parent.children);
                siblingIdx = Math.max(0, kids.indexOf(el)) % 4;
            }
            el.style.setProperty('--fc-delay', `${siblingIdx * 65}ms`);
            el.classList.add('fc-reveal');
            toObserve.push(el);
        });

        if (toObserve.length > 0) {
            document.documentElement.classList.add('fc-motion-ready');
            const revealObserver = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        obs.unobserve(entry.target);
                    }
                });
            }, { rootMargin: '0px 0px -5% 0px', threshold: 0.06 });

            toObserve.forEach((el) => revealObserver.observe(el));

            // Fail-safe: ensure any offscreen element becomes visible if user jumps via anchor
            window.addEventListener('hashchange', () => {
                document.querySelectorAll('.fc-reveal:not(.is-visible)').forEach((el) => {
                    const r = el.getBoundingClientRect();
                    if (r.top < (window.innerHeight || 800) * 1.1) el.classList.add('is-visible');
                });
            });
        }

        // Animated Tabular-Nums KPI Counters (below-the-fold only so above-the-fold hero KPIs are instant)
        const counterTargets = new Set(document.querySelectorAll('[data-fc-count]'));
        document.querySelectorAll('main .font-display, main .font-black').forEach((el) => {
            if (el.children.length > 0 || el.id === 'calcRoiOut' || el.id === 'calcHrsOut') return;
            if (el.getBoundingClientRect().top < vh * 0.95) return;
            const raw = (el.textContent || '').trim();
            if (raw.length >= 2 && raw.length <= 12 && /^[+\-~₹$]?(\d+(?:\.\d+)?)\s*(x|%|hrs|m|ms|\+|k|L)?$/i.test(raw)) {
                counterTargets.add(el);
            }
        });

        if (counterTargets.size > 0) {
            const countObserver = new IntersectionObserver((entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    obs.unobserve(el);
                    if (el.dataset.fcCounted === '1') return;
                    el.dataset.fcCounted = '1';

                    const finalStr = (el.dataset.fcCount || el.textContent || '').trim();
                    const m = finalStr.match(/^([+\-~₹$\s]*)(\d+(?:\.\d+)?)(\s*(?:x|%|hrs|m|ms|\+|k|L)?)$/i);
                    if (!m) return;
                    const prefix = m[1] || '';
                    const targetVal = parseFloat(m[2]);
                    const suffix = m[3] || '';
                    if (!isFinite(targetVal) || targetVal <= 0) return;

                    const decimals = (m[2].split('.')[1] || '').length;
                    const startVal = targetVal * 0.55;
                    const duration = 550;
                    const startTs = performance.now();
                    el.style.fontVariantNumeric = 'tabular-nums';

                    const tick = (now) => {
                        const p = Math.min(1, (now - startTs) / duration);
                        const eased = 1 - Math.pow(1 - p, 3);
                        if (p >= 1) {
                            el.textContent = finalStr;
                        } else {
                            const cur = (startVal + (targetVal - startVal) * eased).toFixed(decimals);
                            el.textContent = `${prefix}${cur}${suffix}`;
                            requestAnimationFrame(tick);
                        }
                    };
                    requestAnimationFrame(tick);
                });
            }, { threshold: 0.25 });

            counterTargets.forEach((el) => countObserver.observe(el));
        }
    }

    // 9. DESKTOP CARD SPOTLIGHT & ACCESSIBLE DROPDOWN / ESCAPE CONTROLLER
    function initCardSpotlightAndKeyboardA11y() {
        if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            document.querySelectorAll('.card-anim, .fc-card-interactive').forEach((card) => {
                card.classList.add('fc-spotlight-ready');
                card.addEventListener('pointermove', (e) => {
                    const rect = card.getBoundingClientRect();
                    card.style.setProperty('--fc-mx', `${(e.clientX - rect.left).toFixed(1)}px`);
                    card.style.setProperty('--fc-my', `${(e.clientY - rect.top).toFixed(1)}px`);
                }, { passive: true });
            });
        }

        // Ensure all mega-menu triggers reflect aria-expanded accurately
        document.querySelectorAll('.fc-dropdown-wrapper').forEach((wrapper) => {
            const trigger = wrapper.querySelector('.fc-dropdown-trigger');
            const panel = wrapper.querySelector('.fc-dropdown-panel');
            if (!trigger || !panel) return;

            const syncAria = () => {
                const open = !panel.classList.contains('invisible') && !panel.classList.contains('pointer-events-none');
                trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
            };
            wrapper.addEventListener('mouseenter', () => setTimeout(syncAria, 10));
            wrapper.addEventListener('mouseleave', () => setTimeout(syncAria, 240));
            trigger.addEventListener('click', () => setTimeout(syncAria, 10));
        });

        // Universal Escape key handler for menus, drawers, and modals
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            // 1. Close desktop mega-menu dropdowns
            document.querySelectorAll('.fc-dropdown-wrapper').forEach((wrapper) => {
                const panel = wrapper.querySelector('.fc-dropdown-panel');
                const trigger = wrapper.querySelector('.fc-dropdown-trigger');
                if (panel && !panel.classList.contains('invisible')) {
                    panel.classList.add('opacity-0', 'invisible', 'pointer-events-none', 'translate-y-2');
                    panel.classList.remove('opacity-100', 'visible', 'pointer-events-auto', 'translate-y-0');
                    if (trigger) trigger.setAttribute('aria-expanded', 'false');
                }
            });

            // 2. Close mobile navigation drawer if open
            const drawerOverlay = document.getElementById('fcMobileDrawerOverlay');
            if (drawerOverlay && !drawerOverlay.classList.contains('pointer-events-none')) {
                toggleMobileDrawer();
            }

            // 3. Close audit modal or auth modal if open
            const auditModal = document.getElementById('fcAuditModal');
            if (auditModal && !auditModal.classList.contains('pointer-events-none') && window.FC_LEADS && typeof window.FC_LEADS.closeAuditModal === 'function') {
                window.FC_LEADS.closeAuditModal();
            }
            const authModal = document.getElementById('fcAuthModal');
            if (authModal && !authModal.classList.contains('pointer-events-none')) {
                const closeBtn = document.getElementById('fcAuthCloseBtn');
                if (closeBtn) closeBtn.click();
            }
        });
    }

    // INITIALIZATION
    function initWidgets() {
        injectFaviconAndStyles();
        injectMobileNavigation();
        injectMobileBottomNav();
        ensureComplianceFooterLinks();
        initHeroInteractiveGraph();
        initScrollProgressBar();
        initStudioMotionAndCounters();
        initCardSpotlightAndKeyboardA11y();
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
