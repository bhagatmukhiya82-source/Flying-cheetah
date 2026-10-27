/**
 * FLYING CHEETAH LABS - OMNICHANNEL CONVERSION & UX WIDGETS
 * Official Number: +91 99203 86421 | Official Email: flyingcheetah.agency@gmail.com
 * Features:
 *   1. Dynamic Favicon Injection (All 20+ Pages)
 *   2. Responsive Mobile Drawer Navigation (< 1024px)
 *   3. Floating WhatsApp Instant Conversion Widget
 *   4. Legal & Regulatory Footer Compliance Ingestion
 */

(function (window, document) {
    'use strict';

    // 1. INJECT FAVICON ACROSS ALL PAGES
    function injectFavicon() {
        if (!document.querySelector("link[rel*='icon']")) {
            const link = document.createElement('link');
            link.type = 'image/jpeg';
            link.rel = 'shortcut icon';
            link.href = 'images/flying_cheetah_hd_logo_heraldic.jpg';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
    }

    // 2. INJECT FLOATING WHATSAPP CHAT WIDGET & SMART PROACTIVE SUGGESTION POPUP
    function injectWhatsAppWidget() {
        if (document.getElementById('fcFloatingWhatsAppWrapper')) return;

        const path = (window.location.pathname || '').toLowerCase();
        let contextualGreeting = '👋 Welcome to Flying Cheetah! Ready to boost your store revenue with AI commerce agents, WhatsApp checkouts, and automated fleet dispatch?';
        let contextualTag = 'General Inquiry';

        if (path.includes('store-automation') || path.includes('cart')) {
            contextualGreeting = '⚡ **Recover Abandoned Carts!** We help retail stores recover up to 34.8% of abandoned checkouts autonomously via WhatsApp. Want a 15-minute live teardown?';
            contextualTag = 'Store Automation';
        } else if (path.includes('delivery') || path.includes('fleet')) {
            contextualGreeting = '🛵 **Hyperlocal Fleet Dispatch!** Automate 15-min order dispatch with Borzo & Porter APIs with zero dispatch payroll. How can we help your operations?';
            contextualTag = 'Fleet Protocol';
        } else if (path.includes('demo')) {
            contextualGreeting = '🎯 **Live 1-on-1 Store Audit!** Connect directly with technical founders Bhagat Mukhiya & Yash Gaikwad. We will audit your store live.';
            contextualTag = 'Demo Booking';
        } else if (path.includes('web-development')) {
            contextualGreeting = '💻 **High-Conversion Web Architecture!** Fast, bespoke retail stores built for extreme speed and sub-second checkout conversion.';
            contextualTag = 'Web Development';
        }

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Container
        const widgetContainer = document.createElement('div');
        widgetContainer.id = 'fcFloatingWhatsAppWrapper';
        widgetContainer.className = 'fixed bottom-6 right-6 z-[140] flex flex-col items-end pointer-events-none select-none';

        widgetContainer.innerHTML = `
            <!-- CONVERSATIONAL WHATSAPP POPUP CARD -->
            <div id="fcWhatsAppPopup" class="pointer-events-auto mb-3 w-[340px] max-w-[calc(100vw-2.5rem)] bg-[#ECE5DD] rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden transform opacity-0 translate-y-4 scale-95 pointer-events-none transition-all duration-300 ease-out font-sans">
                <!-- Popup Header -->
                <div class="bg-[#075E54] text-white p-3.5 flex items-center justify-between shadow-md">
                    <div class="flex items-center gap-2.5">
                        <div class="relative">
                            <img src="images/flying_cheetah_hd_logo_heraldic.jpg" alt="Flying Cheetah Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-xs">
                            <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075E54] rounded-full"></span>
                        </div>
                        <div class="text-left leading-tight">
                            <div class="flex items-center gap-1.5">
                                <h4 class="font-bold text-xs text-white font-display">Flying Cheetah Labs</h4>
                                <span class="text-[9px] bg-emerald-600/90 text-white px-1.5 py-0.5 rounded-full font-semibold">Verified</span>
                            </div>
                            <p class="text-[10px] text-emerald-100 font-medium">Bhagat &amp; Yash • Replies in &lt; 15s</p>
                        </div>
                    </div>
                    <button type="button" id="fcWaCloseBtn" aria-label="Close Chat Popup" class="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white flex items-center justify-center transition cursor-pointer">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                <!-- Chat Body with WhatsApp Pattern Style -->
                <div class="p-3.5 space-y-3 max-h-[380px] overflow-y-auto" style="background-image: radial-gradient(#d4cbbe 1px, transparent 1px); background-size: 16px 16px;">
                    <!-- Message Bubble from Flying Cheetah -->
                    <div class="bg-white rounded-2xl rounded-tl-sm p-3 shadow-sm border border-slate-200/60 text-slate-800 text-xs leading-relaxed space-y-2 relative">
                        <div class="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-100">
                            <span class="font-bold text-emerald-700 uppercase tracking-wider text-[9px]"><i class="fa-brands fa-whatsapp text-emerald-600"></i> AI Assistant</span>
                            <span>${timeStr}</span>
                        </div>
                        <p class="text-slate-700 text-xs">${contextualGreeting}</p>
                        <p class="text-[11px] text-slate-500 font-medium">Where would you like to explore first?</p>
                    </div>

                    <!-- Interactive Suggestion Chips / Quick Actions -->
                    <div class="space-y-1.5 pt-1">
                        <div class="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Suggested Destinations:</div>
                        
                        <a href="https://wa.me/919920386421?text=Hi%20Flying%20Cheetah%20Labs%2C%20I%20am%20interested%20in%20the%2014-Day%20Free%20Pilot%20for%20${encodeURIComponent(contextualTag)}." 
                           target="_blank" rel="noopener noreferrer"
                           class="flex items-center justify-between px-3 py-2 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs font-bold transition shadow-xs group">
                            <span class="flex items-center gap-2">
                                <i class="fa-solid fa-rocket text-emerald-600 group-hover:scale-110 transition"></i>
                                <span>Claim 14-Day Free Pilot</span>
                            </span>
                            <i class="fa-brands fa-whatsapp text-emerald-600 text-sm"></i>
                        </a>

                        <a href="demo.html" 
                           class="flex items-center justify-between px-3 py-2 bg-white hover:bg-orange-50 border border-slate-200/80 hover:border-bikOrange rounded-xl text-slate-700 hover:text-bikOrange text-xs font-bold transition shadow-xs group">
                            <span class="flex items-center gap-2">
                                <i class="fa-solid fa-calendar-check text-bikOrange group-hover:scale-110 transition"></i>
                                <span>Book Live 1-on-1 Demo</span>
                            </span>
                            <span class="text-[10px] bg-orange-100 text-bikOrange px-1.5 py-0.5 rounded font-mono font-bold">15 Min</span>
                        </a>

                        <a href="store-automation.html" 
                           class="flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 hover:text-slate-900 text-xs font-semibold transition shadow-xs">
                            <span class="flex items-center gap-2">
                                <i class="fa-solid fa-shop text-amber-500"></i>
                                <span>Store &amp; Cart Automation</span>
                            </span>
                            <i class="fa-solid fa-arrow-right text-[10px] text-slate-400"></i>
                        </a>

                        <a href="delivery.html" 
                           class="flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl text-slate-700 hover:text-slate-900 text-xs font-semibold transition shadow-xs">
                            <span class="flex items-center gap-2">
                                <i class="fa-solid fa-motorcycle text-emerald-600"></i>
                                <span>Fleet Protocol (Borzo/Porter)</span>
                            </span>
                            <i class="fa-solid fa-arrow-right text-[10px] text-slate-400"></i>
                        </a>
                    </div>

                    <!-- Quick WhatsApp Direct Message Composer -->
                    <form id="fcWaQuickForm" class="pt-1 flex items-center gap-1.5">
                        <input type="text" id="fcWaQuickInput" placeholder="Type a message or question..." 
                               class="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-inner">
                        <button type="submit" aria-label="Send via WhatsApp" class="w-9 h-9 shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl flex items-center justify-center shadow-md transition transform active:scale-95 cursor-pointer">
                            <i class="fa-solid fa-paper-plane text-xs"></i>
                        </button>
                    </form>
                </div>
            </div>

            <!-- FLOATING TOGGLE BUTTON -->
            <div id="fcFloatingWhatsApp" class="pointer-events-auto flex items-center group">
                <button type="button"
                   id="fcWaToggleBtn"
                   aria-label="Open WhatsApp Support and Automation Menu"
                   class="relative flex items-center gap-3 px-4 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:scale-105 cursor-pointer">
                    <!-- Pulse indicator -->
                    <span class="absolute -top-1 -right-1 flex h-4 w-4">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                    </span>
                    <i class="fa-brands fa-whatsapp text-2xl"></i>
                    <div class="hidden sm:flex flex-col text-left pr-1">
                        <span class="text-[10px] uppercase font-bold tracking-wider opacity-90 leading-tight">Instant Support</span>
                        <span class="text-xs font-black tracking-tight leading-tight">Chat on WhatsApp</span>
                    </div>
                </button>
            </div>
        `;

        document.body.appendChild(widgetContainer);

        const popup = document.getElementById('fcWhatsAppPopup');
        const toggleBtn = document.getElementById('fcWaToggleBtn');
        const closeBtn = document.getElementById('fcWaCloseBtn');
        const quickForm = document.getElementById('fcWaQuickForm');
        const quickInput = document.getElementById('fcWaQuickInput');

        let isOpen = false;

        function openPopup() {
            if (isOpen || !popup) return;
            popup.classList.remove('opacity-0', 'translate-y-4', 'scale-95', 'pointer-events-none');
            popup.classList.add('opacity-100', 'translate-y-0', 'scale-100');
            isOpen = true;
        }

        function closePopup(manual = false) {
            if (!isOpen || !popup) return;
            popup.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
            popup.classList.add('opacity-0', 'translate-y-4', 'scale-95', 'pointer-events-none');
            isOpen = false;
            if (manual) {
                try {
                    sessionStorage.setItem('fc_wa_popup_dismissed', '1');
                } catch (e) {}
            }
        }

        function togglePopup() {
            if (isOpen) {
                closePopup(false);
            } else {
                openPopup();
            }
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePopup();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                closePopup(true);
            });
        }

        if (quickForm && quickInput) {
            quickForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const msg = quickInput.value.trim() || `Hi Flying Cheetah, I\'m visiting the website and would like to learn more about ${contextualTag}.`;
                const waUrl = `https://wa.me/919920386421?text=${encodeURIComponent(msg)}`;
                window.open(waUrl, '_blank', 'noopener,noreferrer');
                quickInput.value = '';
                closePopup(false);
            });
        }

        // Automatic 5-second gentle trigger if not previously dismissed in this session
        try {
            const dismissed = sessionStorage.getItem('fc_wa_popup_dismissed');
            if (!dismissed) {
                setTimeout(() => {
                    openPopup();
                }, 5000);
            }
        } catch (e) {
            setTimeout(openPopup, 5000);
        }
    }

    // 3. INJECT MOBILE HAMBURGER & SLIDE-OUT DRAWER
    function injectMobileNavigation() {
        const header = document.querySelector('header');
        if (!header) return;

        // A. Add Hamburger Toggle Button to Header Actions
        const headerContainer = header.querySelector('.max-w-7xl') || header.firstElementChild;
        if (headerContainer && !document.getElementById('fcMobileMenuBtn')) {
            // Find the right-side actions container (last element child of header container)
            const actionsDiv = headerContainer.lastElementChild;
            if (actionsDiv) {
                // Ensure actions container uses gap and doesn't wrap awkwardly
                actionsDiv.classList.add('flex', 'items-center', 'gap-2');

                const burgerBtn = document.createElement('button');
                burgerBtn.id = 'fcMobileMenuBtn';
                burgerBtn.type = 'button';
                burgerBtn.setAttribute('aria-label', 'Toggle Mobile Menu');
                burgerBtn.className = 'lg:hidden p-2 rounded-xl border border-slate-200 hover:border-bikOrange bg-white text-slate-700 hover:text-bikOrange transition flex items-center justify-center shrink-0 w-9 h-9 shadow-sm';
                burgerBtn.innerHTML = '<i class="fa-solid fa-bars text-sm"></i>';
                burgerBtn.onclick = function(e) {
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
            <div id="fcMobileDrawer" class="fixed top-0 right-0 w-[300px] sm:w-[340px] h-full bg-white shadow-2xl flex flex-col justify-between transform translate-x-full transition-transform duration-300 ease-out overflow-y-auto">
                <!-- Top Brand & Close -->
                <div class="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                    <a href="index.html" class="flex items-center gap-2.5">
                        <img src="images/flying_cheetah_hd_logo_heraldic.jpg" alt="Flying Cheetah Logo" class="w-8 h-8 rounded-full object-cover border border-slate-200">
                        <span class="font-black text-sm tracking-tight font-display text-bikDark">FLYING CHEETAH</span>
                    </a>
                    <button onclick="window.FC_WIDGETS.toggleMobileDrawer()" class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition">
                        <i class="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                <!-- Navigation Links List -->
                <div class="p-5 space-y-4 flex-1 text-sm">
                    <!-- Core Portals -->
                    <div>
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Core Portals</div>
                        <div class="space-y-1">
                            <a href="index.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-house text-bikOrange w-4"></i>
                                <span>Main Site</span>
                            </a>
                            <a href="home.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-compass text-bikOrange w-4"></i>
                                <span>Executive Hub</span>
                            </a>
                            <a href="web-development.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-code text-orange-600 w-4"></i>
                                <span>Web Development</span>
                            </a>
                            <a href="delivery.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-600 hover:bg-emerald-50 font-bold transition">
                                <i class="fa-solid fa-motorcycle text-emerald-600 w-4"></i>
                                <span>Fleet Protocol</span>
                            </a>
                            <a href="demo.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-emerald-700 hover:bg-emerald-50 font-bold transition">
                                <i class="fa-solid fa-calendar-check text-emerald-600 w-4"></i>
                                <span>Book Live Demo</span>
                            </a>
                            <a href="about.html" class="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-700 hover:text-bikOrange hover:bg-orange-50 font-bold transition">
                                <i class="fa-solid fa-circle-info text-slate-400 w-4"></i>
                                <span>About Founders</span>
                            </a>
                        </div>
                    </div>

                    <!-- Products & Solutions -->
                    <div class="pt-2 border-t border-slate-100">
                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">AI Commerce Modules</div>
                        <div class="space-y-1 text-xs">
                            <a href="store-automation.html" class="flex items-center justify-between px-3 py-1.5 rounded-lg text-slate-600 hover:text-bikOrange hover:bg-orange-50 transition">
                                <span>Store Automation & WhatsApp</span>
                                <span class="text-[9px] bg-orange-100 text-bikOrange font-bold px-1.5 py-0.5 rounded">Core</span>
                            </a>
                            <a href="ai-voice-agents.html" class="flex items-center justify-between px-3 py-1.5 rounded-lg text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition">
                                <span>AI Voice Calling Agents</span>
                                <span class="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded">New</span>
                            </a>
                            <a href="instagram-automation.html" class="block px-3 py-1.5 rounded-lg text-slate-600 hover:text-pink-600 hover:bg-pink-50 transition">Instagram DMs & CTWA</a>
                            <a href="whatsapp-marketing.html" class="block px-3 py-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition">WhatsApp Broadcasts</a>
                            <a href="customer-data-platform.html" class="block px-3 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition">Customer Data (CDP 360)</a>
                        </div>
                    </div>
                </div>

                <!-- Drawer Bottom Actions -->
                <div class="p-5 border-t border-slate-100 bg-slate-50 space-y-2.5">
                    <button onclick="window.FC_AUTH.openTrialModal(); window.FC_WIDGETS.toggleMobileDrawer();" class="w-full py-2.5 rounded-xl bg-bikOrange hover:bg-bikOrangeDark text-white font-bold text-xs uppercase tracking-wider transition shadow-md shadow-orange-500/20">
                        Claim 14-Day Free Pilot
                    </button>
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

    // INTERACTIVE HERO REVENUE GRAPH & 3D TILT
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
            const base = 110000 + (day / 30) * 72000;
            const variance = Math.sin(day * 0.85) * 8500 + (day % 7 === 0 || day % 7 === 6 ? 12500 : -2500);
            const rev = Math.round(base + variance);
            const orders = Math.round(rev / 1750);
            const recovered = Math.round(rev * 0.21);
            telemetryData.push({ day, rev, orders, recovered });
        }

        // 3D Perspective Tilt on Card Hover
        if (container) {
            container.addEventListener('mousemove', (e) => {
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

            // Map index to SVG coordinates (x from 50 to 480)
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
                const surge = ((item.rev - 110000) / 110000 * 100).toFixed(1);
                tooltipRevenue.innerHTML = `₹${item.rev.toLocaleString('en-IN')} <span class="text-[10px] text-emerald-300 font-bold">(+${surge}%)</span>`;
                
                // Position tooltip dynamically to avoid overflowing
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

    // INITIALIZATION
    function initWidgets() {
        injectFavicon();
        injectWhatsAppWidget();
        injectMobileNavigation();
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
        initWidgets
    };

})(window, document);
