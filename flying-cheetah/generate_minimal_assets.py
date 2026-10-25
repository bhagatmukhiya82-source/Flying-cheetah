import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Circle, Polygon, Wedge
import matplotlib.patheffects as pe

OUTPUT_DIR = "c:/AUTOMATION BUSSNIESS/flying-cheetah/images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Common Palette: Obsidian Luxury Tech
BG_DARK = "#07080C"
BG_SURFACE = "#0E111A"
BG_CARD = "#141824"
BORDER_SUBTLE = "#23293D"
BORDER_GLOW = "#4F442E"
GOLD_LIGHT = "#F8E3B6"
GOLD_PRIMARY = "#E5B869"
GOLD_DARK = "#A07930"
ACCENT_GREEN = "#10B981"
ACCENT_BLUE = "#3B82F6"
ACCENT_PURPLE = "#A855F7"
TEXT_MUTED = "#7F889B"
TEXT_WHITE = "#FFFFFF"

def generate_seated_winged_cheetah_logo():
    """
    Renders an ultra-sharp, luxury gold emblem:
    Regal seated cheetah facing right, upright poised chest, alert posture,
    magnificent multi-layered wings swept gracefully upward,
    encircled by subtle celestial astronomical tick rings.
    """
    fig, ax = plt.subplots(figsize=(8, 8), dpi=300)
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    # 1. Subtle radial gradient glow behind emblem
    for radius, alpha in [(0.46, 0.03), (0.43, 0.06), (0.39, 0.09), (0.33, 0.12)]:
        glow = Circle((0.5, 0.5), radius, color=GOLD_PRIMARY, alpha=alpha, ec=None)
        ax.add_patch(glow)

    # 2. Celestial Geometric Rings
    outer_ring = Circle((0.5, 0.5), 0.45, fill=False, edgecolor=GOLD_DARK, linewidth=1.0, alpha=0.5)
    ax.add_patch(outer_ring)
    
    inner_ring = Circle((0.5, 0.5), 0.432, fill=False, edgecolor=GOLD_LIGHT, linewidth=0.6, linestyle="--", alpha=0.4)
    ax.add_patch(inner_ring)

    # Compass / Astronomical tick marks on ring
    for deg in range(0, 360, 15):
        rad = np.radians(deg)
        r1 = 0.442 if deg % 45 == 0 else 0.446
        r2 = 0.452
        x1, y1 = 0.5 + r1 * np.cos(rad), 0.5 + r1 * np.sin(rad)
        x2, y2 = 0.5 + r2 * np.cos(rad), 0.5 + r2 * np.sin(rad)
        lw = 1.2 if deg % 45 == 0 else 0.6
        col = GOLD_LIGHT if deg % 45 == 0 else GOLD_DARK
        ax.plot([x1, x2], [y1, y2], color=col, linewidth=lw, alpha=0.7)

    # 3. Ground pedestal baseline (subtle minimalist horizon)
    ax.plot([0.22, 0.76], [0.19, 0.19], color=GOLD_DARK, linewidth=1.2, alpha=0.5)
    ax.plot([0.28, 0.70], [0.175, 0.175], color=GOLD_PRIMARY, linewidth=0.6, alpha=0.3)

    # 4. Sculpted Wing Feathers (Sweeping from shoulder up toward top-left)
    wing_feathers = [
        # (points, facecolor, edgecolor, linewidth)
        ([(0.44, 0.52), (0.24, 0.79), (0.33, 0.67), (0.43, 0.48)], GOLD_LIGHT, GOLD_PRIMARY, 1.2),
        ([(0.43, 0.48), (0.20, 0.73), (0.28, 0.61), (0.41, 0.44)], GOLD_PRIMARY, GOLD_LIGHT, 1.1),
        ([(0.41, 0.44), (0.17, 0.65), (0.25, 0.53), (0.39, 0.39)], GOLD_PRIMARY, GOLD_DARK, 1.0),
        ([(0.39, 0.39), (0.16, 0.56), (0.24, 0.47), (0.37, 0.35)], GOLD_DARK, GOLD_PRIMARY, 0.9),
        ([(0.37, 0.35), (0.18, 0.47), (0.25, 0.40), (0.35, 0.32)], "#7A5820", GOLD_DARK, 0.8),
    ]
    for pts, fc, ec, lw in wing_feathers:
        poly = Polygon(pts, closed=True, facecolor=fc, edgecolor=ec, linewidth=lw, alpha=0.95)
        ax.add_patch(poly)

    # Secondary inner wing layered relief
    inner_feather = Polygon([(0.43, 0.51), (0.29, 0.71), (0.35, 0.61), (0.42, 0.47)], closed=True, facecolor="#FFF2D6", edgecolor=GOLD_PRIMARY, linewidth=0.8, alpha=0.6)
    ax.add_patch(inner_feather)

    # 5. Seated Cheetah Silhouette (Poised & Regal)
    # Head, neck, muzzle
    head_profile = [
        (0.50, 0.71), (0.55, 0.72), (0.60, 0.70), (0.62, 0.67),
        (0.61, 0.64), (0.57, 0.63), (0.54, 0.60), (0.53, 0.50),
        (0.48, 0.40), (0.44, 0.28), (0.47, 0.19), (0.51, 0.19),
        (0.50, 0.23), (0.45, 0.32), (0.44, 0.47), (0.46, 0.62),
        (0.47, 0.69), (0.50, 0.71)
    ]
    cheetah_body = Polygon(head_profile, closed=True, facecolor=GOLD_PRIMARY, edgecolor=GOLD_LIGHT, linewidth=1.2, alpha=0.98)
    ax.add_patch(cheetah_body)

    # Cheetah Ear
    ear = Polygon([(0.47, 0.69), (0.49, 0.75), (0.52, 0.70)], closed=True, facecolor=GOLD_LIGHT, edgecolor=GOLD_PRIMARY, linewidth=0.9)
    ax.add_patch(ear)

    # Cheetah Eye & Iconic Teardrop Tearline
    ax.plot([0.56, 0.585], [0.675, 0.675], color="#07080C", linewidth=2.0)
    ax.plot([0.565, 0.565], [0.675, 0.635], color="#07080C", linewidth=1.5)  # tear line

    # Front paw & foreleg (Planted firmly and vertically)
    foreleg = [
        (0.49, 0.42), (0.52, 0.27), (0.54, 0.19), (0.58, 0.19),
        (0.56, 0.23), (0.54, 0.34), (0.51, 0.45)
    ]
    ax.add_patch(Polygon(foreleg, closed=True, facecolor=GOLD_PRIMARY, edgecolor=GOLD_LIGHT, linewidth=1.1, alpha=0.98))

    # Seated Hind Haunches & Thigh
    haunch = [
        (0.38, 0.38), (0.43, 0.32), (0.41, 0.22), (0.33, 0.19),
        (0.30, 0.19), (0.33, 0.26), (0.33, 0.37), (0.38, 0.38)
    ]
    ax.add_patch(Polygon(haunch, closed=True, facecolor=GOLD_PRIMARY, edgecolor=GOLD_LIGHT, linewidth=1.1, alpha=0.95))

    # Long sinuous tail curling resting along pedestal
    tail_x = np.linspace(0.30, 0.20, 60)
    tail_y = 0.19 + 0.045 * np.sin((tail_x - 0.20) * 16)
    ax.plot(tail_x, tail_y, color=GOLD_PRIMARY, linewidth=2.8, solid_capstyle='round')

    # Minimalist Star Spark accents (North star & constellation)
    ax.scatter([0.68], [0.74], color=GOLD_LIGHT, s=28, marker="*", alpha=0.9)
    ax.scatter([0.72], [0.66], color=GOLD_PRIMARY, s=12, marker="*", alpha=0.7)
    ax.scatter([0.27], [0.32], color=GOLD_DARK, s=8, marker="o", alpha=0.5)

    # Wordmark below emblem: FLYING CHEETAH
    ax.text(0.5, 0.10, "F L Y I N G   C H E E T A H", color=GOLD_LIGHT, fontsize=12, fontweight='bold',
            ha='center', va='center', fontfamily='sans-serif')
    ax.text(0.5, 0.055, "AUTONOMOUS COMMERCE LABS", color=TEXT_MUTED, fontsize=6.5,
            ha='center', va='center', fontfamily='monospace')

    ax.set_xlim(0.05, 0.95)
    ax.set_ylim(0.02, 0.96)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/cheetah_winged_seated_emblem.png", bbox_inches="tight", facecolor=BG_DARK, pad_inches=0.04)
    plt.close()
    print("✓ High-res Seated Winged Cheetah Logo generated successfully!")


def generate_architecture_mesh():
    """
    Renders a pristine, editorial-grade architecture blueprint (Dark Mode / Vercel-Stripe aesthetic):
    Webhook Ingestion -> Artificial Intelligence AI Cognition Node -> Async Event Router -> Borzo Dispatch & Tally Sync.
    """
    fig, ax = plt.subplots(figsize=(12, 7), dpi=300)
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    # Grid background dots
    for gx in np.linspace(0.05, 0.95, 25):
        for gy in np.linspace(0.08, 0.92, 16):
            ax.scatter(gx, gy, color="#161A26", s=1.2)

    def draw_card(x, y, w, h, title, subtitle, tag, border_c=BORDER_SUBTLE, bg_c=BG_SURFACE, tag_c=TEXT_MUTED):
        # Card body
        rect = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.015,rounding_size=0.025",
                              facecolor=bg_c, edgecolor=border_c, linewidth=1.2)
        ax.add_patch(rect)
        # Tag pill
        ax.text(x + 0.02, y + h - 0.035, tag, color=tag_c, fontsize=6.5, fontfamily='monospace', fontweight='bold')
        # Title
        ax.text(x + 0.02, y + h - 0.08, title, color=TEXT_WHITE, fontsize=9.5, fontweight='bold', fontfamily='sans-serif')
        # Subtitle
        ax.text(x + 0.02, y + 0.035, subtitle, color=TEXT_MUTED, fontsize=7.2, fontfamily='sans-serif')

    # Column 1: Client Ingestion Sources (Left)
    draw_card(0.05, 0.65, 0.22, 0.22, "WhatsApp Client", "Conversational Menu & UPI QR", "LAYER 01 // INPUT", ACCENT_BLUE, BG_CARD, ACCENT_BLUE)
    draw_card(0.05, 0.38, 0.22, 0.22, "Web Storefront", "Next.js Static Headless Checkout", "LAYER 01 // WEB", "#4B5563", BG_SURFACE, "#9CA3AF")
    draw_card(0.05, 0.11, 0.22, 0.22, "Vendor Invoice Scan", "Camera / Paper Receipt OCR", "LAYER 01 // MEDIA", GOLD_DARK, BG_SURFACE, GOLD_PRIMARY)

    # Column 2: Central Intelligence & Orchestration (Center)
    draw_card(0.36, 0.25, 0.28, 0.58, "Flying Cheetah Core", "Artificial Intelligence Multimodal Reasoner\n+ High-Throughput n8n Workflows\n\n• Token Latency: 110ms\n• Zero-Wait Event Webhook Loop\n• JSON Schema Enforced Payload", "LAYER 02 // COGNITION & ENGINE", GOLD_PRIMARY, "#0F131F", GOLD_LIGHT)

    # Column 3: Downstream Dispatch & Ledger (Right)
    draw_card(0.72, 0.70, 0.24, 0.20, "Borzo / Porter API", "Instant 2-Wheeler Fleet Dispatch\nLive GPS Tracking link sent to buyer", "LAYER 03 // LOGISTICS", ACCENT_GREEN, BG_CARD, ACCENT_GREEN)
    draw_card(0.72, 0.42, 0.24, 0.20, "Tally & Sheet Ledger", "GSTIN & Invoice auto-reconciliation\nZero human data-entry required", "LAYER 03 // FINANCES", ACCENT_PURPLE, BG_CARD, ACCENT_PURPLE)
    draw_card(0.72, 0.14, 0.24, 0.20, "Review & Loyalty Engine", "5-Star Google Maps Review Collector\nAutomated WhatsApp Broadcasts", "LAYER 03 // RETENTION", GOLD_PRIMARY, BG_CARD, GOLD_LIGHT)

    # Connecting Pipeline Paths with Glowing Dots
    def draw_wire(x1, y1, x2, y2, color=BORDER_SUBTLE, dot_color=GOLD_PRIMARY):
        ax.plot([x1, x2], [y1, y2], color=color, linewidth=1.4, linestyle="-", alpha=0.85)
        # Animated pulse dot midway
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.scatter([mx], [my], color=dot_color, s=18, zorder=6)

    # Left to Center
    draw_wire(0.27, 0.76, 0.36, 0.68, ACCENT_BLUE, ACCENT_BLUE)
    draw_wire(0.27, 0.49, 0.36, 0.54, GOLD_PRIMARY, GOLD_PRIMARY)
    draw_wire(0.27, 0.22, 0.36, 0.40, GOLD_DARK, GOLD_PRIMARY)

    # Center to Right
    draw_wire(0.64, 0.65, 0.72, 0.80, ACCENT_GREEN, ACCENT_GREEN)
    draw_wire(0.64, 0.54, 0.72, 0.52, ACCENT_PURPLE, ACCENT_PURPLE)
    draw_wire(0.64, 0.43, 0.72, 0.24, GOLD_PRIMARY, GOLD_LIGHT)

    # Header Telemetry Bar
    ax.text(0.05, 0.94, "SYSTEM BLUEPRINT // v2.6 REVISION", color=GOLD_PRIMARY, fontsize=8.5, fontfamily='monospace', fontweight='bold')
    ax.text(0.95, 0.94, "ACTIVE NODES: 6 • AVAILABILITY: 99.98% • ENCRYPTION: TLS 1.3", color=TEXT_MUTED, fontsize=7.5, fontfamily='monospace', ha='right')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/architecture_mesh.png", bbox_inches="tight", facecolor=BG_DARK, pad_inches=0.03)
    plt.close()
    print("✓ System Architecture Mesh generated successfully!")


def generate_hyperlocal_dispatch_map():
    """
    Renders a high-tech radar dispatch map of South Mumbai / MMR:
    Merchant Hub at Opera House/Girgaon, concentric radial coverage zones,
    active 2-wheeler riders cruising, route vector to customer with ETA telemetry.
    """
    fig, ax = plt.subplots(figsize=(11, 7), dpi=300)
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    # Grid background dots
    for gx in np.linspace(0.05, 0.95, 23):
        for gy in np.linspace(0.08, 0.92, 15):
            ax.scatter(gx, gy, color="#131622", s=1.2)

    # Radar concentric circles centered on Merchant Hub (0.35, 0.50)
    hub_x, hub_y = 0.35, 0.50
    radii = [0.12, 0.24, 0.36, 0.46]
    for i, r in enumerate(radii):
        radar = Circle((hub_x, hub_y), r, fill=False, edgecolor="#1E2436", linewidth=0.9, linestyle=":")
        ax.add_patch(radar)
        ax.text(hub_x + r - 0.015, hub_y + 0.015, f"{(i+1)*2} KM", color="#464F69", fontsize=6, fontfamily='monospace')

    # Merchant Store Node (Glowing Gold Core)
    for rad, a in [(0.04, 0.15), (0.025, 0.3), (0.015, 0.7)]:
        ax.add_patch(Circle((hub_x, hub_y), rad, color=GOLD_PRIMARY, alpha=a))
    ax.scatter([hub_x], [hub_y], color=GOLD_LIGHT, s=90, zorder=10)
    ax.text(hub_x, hub_y - 0.055, "MERCHANT HUB\nOpera House / Girgaon", color=GOLD_LIGHT,
            fontsize=8, fontweight='bold', ha='center', fontfamily='sans-serif')

    # Nearby active Borzo/Porter 2-wheeler couriers (Green radar pings)
    couriers = [
        (0.24, 0.62, "Rider #412 • 3 min"),
        (0.44, 0.59, "Rider #108 • 4 min"),
        (0.39, 0.34, "Rider #920 • 2 min"),
        (0.22, 0.41, "Rider #334 • 5 min"),
        (0.48, 0.41, "Rider #701 • 6 min")
    ]
    for cx, cy, label in couriers:
        # Ring ping
        ax.add_patch(Circle((cx, cy), 0.02, fill=False, edgecolor=ACCENT_GREEN, linewidth=0.8, alpha=0.5))
        ax.scatter([cx], [cy], color=ACCENT_GREEN, s=40, zorder=8)
        ax.plot([cx, hub_x], [cy, hub_y], color=ACCENT_GREEN, linewidth=0.7, linestyle="--", alpha=0.35)
        ax.text(cx, cy + 0.028, label, color="#A7F3D0", fontsize=6, fontfamily='monospace', ha='center')

    # Destination: Customer Doorstep at Marine Drive / Nariman Point
    dest_x, dest_y = 0.78, 0.64
    ax.add_patch(Circle((dest_x, dest_y), 0.03, fill=False, edgecolor=ACCENT_BLUE, linewidth=1.2))
    ax.scatter([dest_x], [dest_y], color=ACCENT_BLUE, s=75, zorder=10)
    ax.text(dest_x, dest_y + 0.05, "CUSTOMER DOORSTEP\nMarine Drive, Nariman Point", color="#93C5FD",
            fontsize=8, fontweight='bold', ha='center', fontfamily='sans-serif')

    # Curving Active GPS Trajectory Route
    t = np.linspace(hub_x, dest_x, 150)
    curve_y = hub_y + 0.22 * np.sin(np.pi * (t - hub_x) / (dest_x - hub_x))
    ax.plot(t, curve_y, color=ACCENT_BLUE, linewidth=2.4, alpha=0.9, zorder=6)
    # Animated rider en route midway
    mid_idx = 75
    ax.scatter([t[mid_idx]], [curve_y[mid_idx]], color="#FFFFFF", s=50, edgecolor=ACCENT_BLUE, linewidth=2, zorder=9)
    ax.text(t[mid_idx], curve_y[mid_idx] + 0.045, "EN ROUTE • LIVE GPS", color=GOLD_LIGHT,
            fontsize=7, fontweight='bold', ha='center', fontfamily='monospace')

    # Telemetry Panel Card (Top Right)
    panel = FancyBboxPatch((0.66, 0.12), 0.29, 0.30, boxstyle="round,pad=0.015,rounding_size=0.02",
                           facecolor=BG_SURFACE, edgecolor=BORDER_SUBTLE, linewidth=1.2)
    ax.add_patch(panel)
    ax.text(0.68, 0.38, "DISPATCH PROTOCOL METRICS", color=GOLD_PRIMARY, fontsize=7.5, fontfamily='monospace', fontweight='bold')
    ax.text(0.68, 0.32, "• Average Rider Pickup: 5.8 Mins", color=TEXT_WHITE, fontsize=8)
    ax.text(0.68, 0.26, "• Delivery Success Rate: 99.6%", color=ACCENT_GREEN, fontsize=8)
    ax.text(0.68, 0.20, "• Commission to Swiggy/Zomato: ₹0 (0%)", color=GOLD_LIGHT, fontsize=8, fontweight='bold')
    ax.text(0.68, 0.15, "• Network: Borzo + Porter 2-Wheeler Fleet", color=TEXT_MUTED, fontsize=7.2)

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/hyperlocal_dispatch_map.png", bbox_inches="tight", facecolor=BG_DARK, pad_inches=0.03)
    plt.close()
    print("✓ Hyperlocal Dispatch Map generated successfully!")


def generate_whatsapp_store_preview():
    """
    Renders an elegant smartphone UI mockup frame showing:
    WhatsApp conversational store, product selection, live dynamic UPI QR code,
    and automatic rider dispatch notification.
    """
    fig, ax = plt.subplots(figsize=(8, 10), dpi=300)
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    # Smartphone Outer Chassis
    phone_x, phone_y, phone_w, phone_h = 0.15, 0.05, 0.70, 0.90
    chassis = FancyBboxPatch((phone_x, phone_y), phone_w, phone_h, boxstyle="round,pad=0.02,rounding_size=0.06",
                             facecolor="#0B0D14", edgecolor=BORDER_SUBTLE, linewidth=2.0)
    ax.add_patch(chassis)

    # Screen Display Area
    screen_x, screen_y, screen_w, screen_h = phone_x + 0.03, phone_y + 0.04, phone_w - 0.06, phone_h - 0.08
    screen = FancyBboxPatch((screen_x, screen_y), screen_w, screen_h, boxstyle="round,pad=0.01,rounding_size=0.04",
                            facecolor="#090C12", edgecolor="#1C2130", linewidth=1.0)
    ax.add_patch(screen)

    # Top Status & Chat Header Bar
    header = FancyBboxPatch((screen_x + 0.01, screen_y + screen_h - 0.12), screen_w - 0.02, 0.11,
                            boxstyle="round,pad=0.005,rounding_size=0.02", facecolor="#131A26", edgecolor="#242E42", linewidth=0.8)
    ax.add_patch(header)
    ax.scatter([screen_x + 0.06], [screen_y + screen_h - 0.065], color=GOLD_PRIMARY, s=120)
    ax.text(screen_x + 0.11, screen_y + screen_h - 0.05, "Flying Cheetah Store Bot", color=TEXT_WHITE, fontsize=9, fontweight='bold')
    ax.text(screen_x + 0.11, screen_y + screen_h - 0.08, "Verified Business • Fast Response", color=ACCENT_GREEN, fontsize=6.8)

    # Message Bubbles (Customer & Bot)
    def chat_bubble(x, y, w, h, text, is_bot=True):
        bg = "#1A2233" if is_bot else "#1C352D"
        border = "#2A3650" if is_bot else "#265C47"
        bub = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.01,rounding_size=0.025",
                             facecolor=bg, edgecolor=border, linewidth=0.9)
        ax.add_patch(bub)
        ax.text(x + 0.02, y + h - 0.04, text, color=TEXT_WHITE, fontsize=7.2, va='top', fontfamily='sans-serif')

    # 1. Bot greeting with catalog
    msg1 = "Namaste Rahul! Welcome to Royal Farsan Mart.\nYour order: 1kg Kaju Katli + 500g Dry Fruit Mix\nTotal Bill: ₹1,250 • Free Delivery Applied"
    chat_bubble(screen_x + 0.03, screen_y + screen_h - 0.28, screen_w - 0.12, 0.13, msg1, is_bot=True)

    # 2. UPI QR Code Mockup Box inside chat
    qr_box = FancyBboxPatch((screen_x + 0.03, screen_y + screen_h - 0.50), screen_w - 0.16, 0.19,
                            boxstyle="round,pad=0.01,rounding_size=0.02", facecolor="#0E1420", edgecolor=GOLD_PRIMARY, linewidth=1.0)
    ax.add_patch(qr_box)
    ax.text(screen_x + 0.05, screen_y + screen_h - 0.33, "⚡ 1-TAP UPI INSTANT PAYMENT", color=GOLD_PRIMARY, fontsize=7.2, fontweight='bold', fontfamily='monospace')
    ax.text(screen_x + 0.05, screen_y + screen_h - 0.38, "GooglePay / PhonePe / Paytm Supported", color=TEXT_MUTED, fontsize=6.5)
    
    # Stylized QR matrix representation
    for qx in np.linspace(screen_x + 0.38, screen_x + 0.47, 5):
        for qy in np.linspace(screen_y + screen_h - 0.47, screen_y + screen_h - 0.38, 5):
            if (qx + qy) % 2 == 0:
                ax.scatter(qx, qy, color=GOLD_LIGHT, s=14, marker="s")

    # 3. Customer Confirmation
    msg2 = "Payment Done via UPI (UTR: 9028172638)!"
    chat_bubble(screen_x + 0.14, screen_y + screen_h - 0.59, screen_w - 0.17, 0.07, msg2, is_bot=False)

    # 4. Instant Dispatch Response
    msg3 = "✓ Payment Verified! Rider Assigned:\nBorzo 2-Wheeler (Rider: Suresh K.)\nETA to counter: 6 mins. Track live here:\nhttps://fc.link/track/9028"
    chat_bubble(screen_x + 0.03, screen_y + screen_h - 0.77, screen_w - 0.10, 0.15, msg3, is_bot=True)

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/whatsapp_store_preview.png", bbox_inches="tight", facecolor=BG_DARK, pad_inches=0.02)
    plt.close()
    print("✓ WhatsApp Store UI Preview generated successfully!")


def generate_ai_ocr_engine():
    """
    Renders the Artificial Intelligence Multimodal OCR & Ledger Engine:
    Physical handwritten/printed vendor bill on the left,
    neural OCR bounding boxes, and instant structured JSON & Tally format on the right.
    """
    fig, ax = plt.subplots(figsize=(11, 6), dpi=300)
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    # Left: Physical Bill Mockup
    bill = FancyBboxPatch((0.08, 0.15), 0.36, 0.70, boxstyle="round,pad=0.015,rounding_size=0.02",
                          facecolor="#121622", edgecolor="#2B344A", linewidth=1.2)
    ax.add_patch(bill)
    ax.text(0.12, 0.79, "TAX INVOICE / VENDOR BILL", color="#E2E8F0", fontsize=8.5, fontweight='bold', fontfamily='sans-serif')
    ax.text(0.12, 0.74, "M/s Lamington Hardware Traders\nGSTIN: 27AAAAA0000A1Z5\nDate: 24-Oct-2026", color="#94A3B8", fontsize=7.0)

    # Bounding Box 1 (Vendor Details)
    bb1 = patches.Rectangle((0.11, 0.71), 0.30, 0.07, fill=False, edgecolor=GOLD_PRIMARY, linewidth=1.2, linestyle="--")
    ax.add_patch(bb1)
    ax.text(0.38, 0.715, "99.8% CONF", color=GOLD_LIGHT, fontsize=5.8, fontfamily='monospace', fontweight='bold')

    # Invoice Line Items with simulated text
    ax.plot([0.11, 0.41], [0.66, 0.66], color="#2B344A", linewidth=0.8)
    items = [
        ("ESP32-S3 AI Core Dev Module", "10 Pcs", "₹12,500"),
        ("USB-C High-Speed Data Cable", "25 Pcs", "₹4,250"),
        ("5V 3A SMPS Regulated Supply", "10 Pcs", "₹3,800"),
    ]
    for idx, (name, qty, cost) in enumerate(items):
        y_pos = 0.58 - idx * 0.07
        ax.text(0.12, y_pos, f"{name} ({qty})", color="#CBD5E1", fontsize=7.2)
        ax.text(0.40, y_pos, cost, color=GOLD_LIGHT, fontsize=7.2, fontweight='bold', ha='right')

    # Bounding Box 2 (Total)
    bb2 = patches.Rectangle((0.11, 0.28), 0.30, 0.08, fill=False, edgecolor=ACCENT_GREEN, linewidth=1.2, linestyle="--")
    ax.add_patch(bb2)
    ax.text(0.12, 0.32, "TOTAL INVOICE PAYABLE: ₹20,550", color=ACCENT_GREEN, fontsize=7.8, fontweight='bold')

    # Center Process Beam: Artificial Intelligence Multimodal Vision Extraction
    ax.plot([0.45, 0.54], [0.50, 0.50], color=GOLD_PRIMARY, linewidth=2.0)
    ax.scatter([0.495], [0.50], color=GOLD_LIGHT, s=90, zorder=8)
    ax.text(0.495, 0.55, "Artificial Intelligence Vision\n< 1.8s Latency", color=GOLD_LIGHT, fontsize=7.2, fontweight='bold', ha='center')

    # Right: Structured Ledger & Tally Payload
    ledger = FancyBboxPatch((0.55, 0.15), 0.38, 0.70, boxstyle="round,pad=0.015,rounding_size=0.02",
                            facecolor=BG_SURFACE, edgecolor=BORDER_SUBTLE, linewidth=1.2)
    ax.add_patch(ledger)
    ax.text(0.58, 0.79, "STRUCTURED TALLY & SHEETS DATA", color=ACCENT_BLUE, fontsize=8.5, fontweight='bold', fontfamily='monospace')
    
    code_text = (
        '{\n'
        '  "vendor": "Lamington Hardware Traders",\n'
        '  "gstin": "27AAAAA0000A1Z5",\n'
        '  "invoice_date": "2026-10-24",\n'
        '  "subtotal": 20550.00,\n'
        '  "cgst_9": 1849.50,\n'
        '  "sgst_9": 1849.50,\n'
        '  "status": "AUTO_RECONCILED",\n'
        '  "pushed_to_tally": true\n'
        '}'
    )
    ax.text(0.58, 0.46, code_text, color="#E2E8F0", fontsize=7.5, fontfamily='monospace', va='center')

    ax.text(0.58, 0.22, "✓ Zero Manual Entry • Audited Against GST Portal", color=ACCENT_GREEN, fontsize=7.2, fontweight='bold')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/ai_ocr_engine.png", bbox_inches="tight", facecolor=BG_DARK, pad_inches=0.03)
    plt.close()
    print("✓ Artificial Intelligence OCR Engine diagram generated successfully!")


def generate_roi_metric_dashboard():
    """
    Renders an analytics telemetry card:
    Monthly savings comparison (Flying Cheetah vs Swiggy/Zomato cut),
    active delivery volume, and operator hours saved.
    """
    fig, ax = plt.subplots(figsize=(10, 6), dpi=300)
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    # Main Dashboard Card
    card = FancyBboxPatch((0.06, 0.10), 0.88, 0.80, boxstyle="round,pad=0.02,rounding_size=0.03",
                          facecolor=BG_SURFACE, edgecolor=BORDER_SUBTLE, linewidth=1.2)
    ax.add_patch(card)

    ax.text(0.10, 0.82, "MONTHLY MERCHANT FINANCIAL TELEMETRY", color=GOLD_PRIMARY, fontsize=9.5, fontweight='bold', fontfamily='monospace')
    ax.text(0.90, 0.82, "LIVE BENCHMARK: SOUTH MUMBAI RETAIL", color=TEXT_MUTED, fontsize=7.5, fontfamily='monospace', ha='right')

    # 3 Metric stat boxes
    stats = [
        (0.10, 0.54, "₹1,48,500", "COMMISSION SAVED / MO", "vs 28% Swiggy aggregator fee", GOLD_LIGHT),
        (0.38, 0.54, "1,240 Orders", "AUTONOMOUSLY DISPATCHED", "Average courier arrival: 5.6 mins", ACCENT_GREEN),
        (0.66, 0.54, "48.5 Hours", "STAFF TIME PRESERVED", "Zero manual bill & ledger entry", ACCENT_BLUE)
    ]
    for x, y, val, label, sub, col in stats:
        b = FancyBboxPatch((x, y), 0.24, 0.22, boxstyle="round,pad=0.015,rounding_size=0.02",
                           facecolor="#121623", edgecolor=BORDER_SUBTLE, linewidth=1.0)
        ax.add_patch(b)
        ax.text(x + 0.02, y + 0.15, val, color=col, fontsize=12, fontweight='bold')
        ax.text(x + 0.02, y + 0.09, label, color=TEXT_WHITE, fontsize=7.0, fontweight='bold', fontfamily='monospace')
        ax.text(x + 0.02, y + 0.04, sub, color=TEXT_MUTED, fontsize=6.2)

    # Bar comparison: Traditional Commission vs Flying Cheetah Fixed Retainer
    ax.text(0.10, 0.44, "FINANCIAL COMPARISON: 300 ORDERS / MONTH @ ₹500 AOV", color=TEXT_WHITE, fontsize=8.2, fontweight='bold')
    
    # Aggregator Bar
    ax.barh(0.34, 42000, height=0.06, left=0.10, color="#EF4444", alpha=0.85)
    ax.text(0.11, 0.34, "Swiggy / Zomato 28% Cut: ₹42,000 / month lost", color="#FFFFFF", fontsize=7.2, va='center', fontweight='bold')

    # Flying Cheetah Bar
    ax.barh(0.24, 6500, height=0.06, left=0.10, color=GOLD_PRIMARY, alpha=0.95)
    ax.text(0.11, 0.24, "Flying Cheetah Fixed Retainer: ₹6,500 / month (Keep 100% Margin)", color="#07080C", fontsize=7.2, va='center', fontweight='bold')

    ax.text(0.10, 0.15, "PROFIT DELTA: Merchant retains +₹35,500 extra pure profit every single month.", color=ACCENT_GREEN, fontsize=7.8, fontweight='bold')

    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/roi_metric_dashboard.png", bbox_inches="tight", facecolor=BG_DARK, pad_inches=0.03)
    plt.close()
    print("✓ ROI Metric Dashboard generated successfully!")

if __name__ == "__main__":
    generate_seated_winged_cheetah_logo()
    generate_architecture_mesh()
    generate_hyperlocal_dispatch_map()
    generate_whatsapp_store_preview()
    generate_ai_ocr_engine()
    generate_roi_metric_dashboard()
    print("\nAll brand assets generated in luxury minimalist aesthetic!")
