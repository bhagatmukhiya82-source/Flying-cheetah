import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

# Set common style
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'

def create_logo(path="c:/AUTOMATION BUSSNIESS/flying-cheetah/images/logo.png"):
    fig, ax = plt.subplots(figsize=(6, 1.6), dpi=300)
    fig.patch.set_facecolor("#0B0F19")
    ax.set_facecolor("#0B0F19")

    # Draw Cheetah Bolt / Wing Symbol
    poly = patches.Polygon([
        [0.4, 0.3], [1.1, 1.3], [0.85, 0.8], [1.5, 1.3], [0.7, 0.1], [0.85, 0.6]
    ], closed=True, facecolor="#F59E0B", edgecolor="#FBBF24", lw=1.5)
    ax.add_patch(poly)

    # Accent speed trail lines
    for i, offset in enumerate([0.15, 0.25, 0.35]):
        ax.plot([0.2 - offset, 0.5 - offset], [0.4 + i*0.25, 0.5 + i*0.25], color="#F59E0B", alpha=0.4 - i*0.1, lw=2.5)

    # Typography
    ax.text(1.75, 0.88, "FLYING CHEETAH", fontsize=22, fontweight='black', color="#FFFFFF", va="center")
    ax.text(1.78, 0.42, "AI AUTOMATIONS • HYPERLOCAL LOGISTICS • WEB", fontsize=8.5, fontweight='bold', color="#F59E0B", va="center")

    ax.set_xlim(0, 7)
    ax.set_ylim(0, 1.6)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(path, bbox_inches="tight", facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print("Logo created!")

def create_hero_graphic(path="c:/AUTOMATION BUSSNIESS/flying-cheetah/images/hero-visual.png"):
    fig, ax = plt.subplots(figsize=(10, 6.5), dpi=220)
    fig.patch.set_facecolor("#0B0F19")
    ax.set_facecolor("#0B0F19")

    # Dark Card Container
    card = patches.FancyBboxPatch((0.5, 0.5), 9, 5.5, boxstyle="round,pad=0.2,rounding_size=0.4",
                                  facecolor="#111827", edgecolor="#1F2937", lw=1.5)
    ax.add_patch(card)

    # Top Bar (Browser style)
    dots = [("#EF4444", 1.0), ("#F59E0B", 1.35), ("#10B981", 1.7)]
    for col, x in dots:
        circle = patches.Circle((x, 5.4), 0.1, facecolor=col, edgecolor="none")
        ax.add_patch(circle)
    ax.text(5.0, 5.4, "flyingcheetah.ai — Live Architecture Console", color="#9CA3AF", fontsize=9, ha="center", va="center")

    # 3 Core Flow Nodes
    # 1. Customer WhatsApp
    c1 = patches.FancyBboxPatch((1.0, 2.0), 2.2, 2.6, boxstyle="round,pad=0.1,rounding_size=0.2", facecolor="#1F2937", edgecolor="#25D366", lw=2)
    ax.add_patch(c1)
    ax.text(2.1, 4.1, "1. WhatsApp Store", color="#25D366", fontsize=11, fontweight="bold", ha="center")
    ax.text(2.1, 3.4, "• AI Catalog Chat\n• Instant UPI Pay\n• Zero App Install\n• 15-Sec Response", color="#D1D5DB", fontsize=9, ha="center")

    # 2. Flying Cheetah Core Engine
    c2 = patches.FancyBboxPatch((3.9, 1.7), 2.2, 3.2, boxstyle="round,pad=0.1,rounding_size=0.2", facecolor="#182234", edgecolor="#F59E0B", lw=2.5)
    ax.add_patch(c2)
    ax.text(5.0, 4.4, "FLYING CHEETAH", color="#F59E0B", fontsize=11, fontweight="bold", ha="center")
    ax.text(5.0, 4.0, "Brain & Dispatch", color="#93C5FD", fontsize=8.5, ha="center")
    ax.text(5.0, 2.8, "• Gemini 3.8 Intelligence\n• Auto-Tally / Sheets\n• Fraud & RTO Guard\n• Dispatch Orchestration", color="#E5E7EB", fontsize=9, ha="center")

    # 3. Rider Hyperlocal Delivery
    c3 = patches.FancyBboxPatch((6.8, 2.0), 2.2, 2.6, boxstyle="round,pad=0.1,rounding_size=0.2", facecolor="#1F2937", edgecolor="#3B82F6", lw=2)
    ax.add_patch(c3)
    ax.text(7.9, 4.1, "3. Auto-Delivery", color="#60A5FA", fontsize=11, fontweight="bold", ha="center")
    ax.text(7.9, 3.4, "• Borzo / Porter API\n• Rider at Shop in 5m\n• Live GPS Tracking\n• 0% Swiggy Cut", color="#D1D5DB", fontsize=9, ha="center")

    # Connection Arrows
    ax.annotate('', xy=(3.8, 3.3), xytext=(3.3, 3.3), arrowprops=dict(arrowstyle="->", color="#F59E0B", lw=3, mutation_scale=20))
    ax.annotate('', xy=(6.7, 3.3), xytext=(6.2, 3.3), arrowprops=dict(arrowstyle="->", color="#3B82F6", lw=3, mutation_scale=20))

    # Metric Bar at bottom
    m_box = patches.FancyBboxPatch((1.0, 0.8), 8.0, 0.65, boxstyle="round,pad=0.05,rounding_size=0.1", facecolor="#0F172A", edgecolor="#334155", lw=1)
    ax.add_patch(m_box)
    ax.text(2.3, 1.12, "⚡ 15s Lead Reply", color="#34D399", fontsize=9.5, fontweight="bold")
    ax.text(4.8, 1.12, "💰 0% Commission", color="#FBBF24", fontsize=9.5, fontweight="bold")
    ax.text(7.2, 1.12, "🛵 Instant Borzo/Porter API", color="#60A5FA", fontsize=9.5, fontweight="bold")

    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6.5)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(path, bbox_inches="tight", facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close()
    print("Hero graphic created!")

def create_feature_graphics():
    # 1. WhatsApp Commerce
    fig, ax = plt.subplots(figsize=(6, 4.2), dpi=200)
    fig.patch.set_facecolor("#111827")
    ax.set_facecolor("#111827")
    rect = patches.FancyBboxPatch((0.5, 0.5), 5.0, 3.2, boxstyle="round,pad=0.2,rounding_size=0.25", facecolor="#1F2937", edgecolor="#25D366", lw=2)
    ax.add_patch(rect)
    ax.text(3.0, 3.2, "📱 Conversational Commerce", color="#25D366", fontsize=13, fontweight="bold", ha="center")
    ax.text(3.0, 2.3, "Turn WhatsApp into a high-converting\nmini-store. Customers browse, add to cart,\nand pay via UPI directly inside chat.", color="#E5E7EB", fontsize=10, ha="center", va="center")
    ax.text(3.0, 1.1, "Higher Open Rates than Email (85%+)", color="#FBBF24", fontsize=9, fontweight="bold", ha="center")
    ax.axis("off"); ax.set_xlim(0, 6); ax.set_ylim(0, 4.2)
    plt.savefig("c:/AUTOMATION BUSSNIESS/flying-cheetah/images/feature-whatsapp.png", bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()

    # 2. Hyperlocal Delivery Dispatch
    fig, ax = plt.subplots(figsize=(6, 4.2), dpi=200)
    fig.patch.set_facecolor("#111827")
    ax.set_facecolor("#111827")
    rect = patches.FancyBboxPatch((0.5, 0.5), 5.0, 3.2, boxstyle="round,pad=0.2,rounding_size=0.25", facecolor="#1F2937", edgecolor="#3B82F6", lw=2)
    ax.add_patch(rect)
    ax.text(3.0, 3.2, "🛵 Zero-Payroll Fleet Dispatch", color="#60A5FA", fontsize=13, fontweight="bold", ha="center")
    ax.text(3.0, 2.3, "Direct integration with Borzo & Porter API.\nOrder placed -> Rider dispatches automatically.\nNo hiring, no vehicle overhead, no hassle.", color="#E5E7EB", fontsize=10, ha="center", va="center")
    ax.text(3.0, 1.1, "Save 25-30% Swiggy/Zomato Commissions", color="#34D399", fontsize=9, fontweight="bold", ha="center")
    ax.axis("off"); ax.set_xlim(0, 6); ax.set_ylim(0, 4.2)
    plt.savefig("c:/AUTOMATION BUSSNIESS/flying-cheetah/images/feature-delivery.png", bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()

    # 3. AI Back-Office & Invoicing
    fig, ax = plt.subplots(figsize=(6, 4.2), dpi=200)
    fig.patch.set_facecolor("#111827")
    ax.set_facecolor("#111827")
    rect = patches.FancyBboxPatch((0.5, 0.5), 5.0, 3.2, boxstyle="round,pad=0.2,rounding_size=0.25", facecolor="#1F2937", edgecolor="#F59E0B", lw=2)
    ax.add_patch(rect)
    ax.text(3.0, 3.2, "⚡ Gemini AI Back-Office", color="#FBBF24", fontsize=13, fontweight="bold", ha="center")
    ax.text(3.0, 2.3, "Extracts vendor invoices, syncs Tally / Sheets,\nauto-triages lead qualification, and sends\nautomated follow-ups with zero staff intervention.", color="#E5E7EB", fontsize=10, ha="center", va="center")
    ax.text(3.0, 1.1, "Eliminate 15+ Hours of Weekly Data Entry", color="#A78BFA", fontsize=9, fontweight="bold", ha="center")
    ax.axis("off"); ax.set_xlim(0, 6); ax.set_ylim(0, 4.2)
    plt.savefig("c:/AUTOMATION BUSSNIESS/flying-cheetah/images/feature-ai.png", bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print("Feature graphics created!")

def create_founders_badge(path="c:/AUTOMATION BUSSNIESS/flying-cheetah/images/founders.png"):
    fig, ax = plt.subplots(figsize=(8, 3.6), dpi=220)
    fig.patch.set_facecolor("#111827")
    ax.set_facecolor("#111827")

    # Bhagat Card
    b1 = patches.FancyBboxPatch((0.4, 0.4), 3.4, 2.8, boxstyle="round,pad=0.1,rounding_size=0.2", facecolor="#1F2937", edgecolor="#F59E0B", lw=1.5)
    ax.add_patch(b1)
    ax.text(2.1, 2.6, "Bhagat Mukhiya", color="#FFFFFF", fontsize=12, fontweight="bold", ha="center")
    ax.text(2.1, 2.2, "Co-Founder & AI Architect", color="#F59E0B", fontsize=9, fontweight="bold", ha="center")
    ax.text(2.1, 1.3, "• n8n Core Pipelines & APIs\n• Gemini 3.8 Intelligence Setup\n• Python & Web Architecture\n• Systems & Error Telemetry", color="#D1D5DB", fontsize=8.5, ha="center")

    # Yash Card
    b2 = patches.FancyBboxPatch((4.2, 0.4), 3.4, 2.8, boxstyle="round,pad=0.1,rounding_size=0.2", facecolor="#1F2937", edgecolor="#3B82F6", lw=1.5)
    ax.add_patch(b2)
    ax.text(5.9, 2.6, "Yash Gaikwad", color="#FFFFFF", fontsize=12, fontweight="bold", ha="center")
    ax.text(5.9, 2.2, "Co-Founder & Growth Lead", color="#60A5FA", fontsize=9, fontweight="bold", ha="center")
    ax.text(5.9, 1.3, "• South Mumbai Ground Outreach\n• Merchant Acquisition & Audits\n• Client Experience & Retention\n• Strategic Partnerships", color="#D1D5DB", fontsize=8.5, ha="center")

    ax.axis("off"); ax.set_xlim(0, 8); ax.set_ylim(0, 3.6)
    plt.tight_layout()
    plt.savefig(path, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close()
    print("Founders badge created!")

if __name__ == "__main__":
    create_logo()
    create_hero_graphic()
    create_feature_graphics()
    create_founders_badge()
