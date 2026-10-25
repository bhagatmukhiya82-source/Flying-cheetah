import matplotlib.pyplot as plt
import matplotlib.patches as patches

def generate_flowchart_1(filename="flowchart_agency_lifecycle.png"):
    fig, ax = plt.subplots(figsize=(11, 4.2), dpi=250)
    ax.set_facecolor("#F8FAFC")
    fig.patch.set_facecolor("#F8FAFC")

    # Step boxes
    steps = [
        {"num": "STEP 1", "title": "Zero-Cost Infra", "sub": "n8n + Gemini API\nLocal Dev Environment", "col": "#EBF8FF", "border": "#3182CE"},
        {"num": "STEP 2", "title": "Agency Website", "sub": "Clean 1-Page Portfolio\nWhatsApp CTA + Demos", "col": "#E6FFFA", "border": "#319795"},
        {"num": "STEP 3", "title": "Target Audience", "sub": "Real Estate, CAs\nD2C & Local MSMEs", "col": "#FEFCBF", "border": "#D69E2E"},
        {"num": "STEP 4", "title": "Client Outreach", "sub": "Warm Audit + 3-Day Test\nZero Risk Proposal", "col": "#FEEBC8", "border": "#DD6B20"},
        {"num": "STEP 5", "title": "Retainer & Scale", "sub": "Setup Fee (₹25k)\n+ Monthly Retainer (₹10k)", "col": "#C6F6D5", "border": "#38A169"}
    ]

    for i, s in enumerate(steps):
        x = 0.5 + i * 2.1
        y = 1.0
        w = 1.8
        h = 2.2
        # Card shadow / card
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1,rounding_size=0.15",
                                      facecolor=s["col"], edgecolor=s["border"], linewidth=2)
        ax.add_patch(rect)

        # Number Pill
        pill = patches.FancyBboxPatch((x + 0.35, y + h - 0.35), 1.1, 0.32, boxstyle="round,pad=0.05,rounding_size=0.08",
                                      facecolor=s["border"], edgecolor="none")
        ax.add_patch(pill)
        ax.text(x + 0.9, y + h - 0.2, s["num"], color="white", fontsize=8.5, fontweight="bold", ha="center", va="center")

        # Title
        ax.text(x + 0.9, y + h - 0.75, s["title"], color="#1A202C", fontsize=10, fontweight="bold", ha="center")
        # Subtext
        ax.text(x + 0.9, y + 0.6, s["sub"], color="#4A5568", fontsize=8, ha="center", va="center")

        # Arrow
        if i < len(steps) - 1:
            ax.annotate('', xy=(x + w + 0.3, y + h/2), xytext=(x + w, y + h/2),
                        arrowprops=dict(arrowstyle="->", color="#2B6CB0", lw=2.5, mutation_scale=15))

    ax.set_xlim(0, 11)
    ax.set_ylim(0, 4.2)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(filename, bbox_inches="tight")
    plt.close()
    print(f"Generated {filename}")

def generate_flowchart_2(filename="flowchart_client_funnel.png"):
    fig, ax = plt.subplots(figsize=(11, 4.5), dpi=250)
    ax.set_facecolor("#F8FAFC")
    fig.patch.set_facecolor("#F8FAFC")

    # Left: Outreach -> Middle: Offer -> Right: Delivery & Retainer
    blocks = [
        {"title": "1. Sourcing Prospects", "items": ["• Google Maps (Mumbai clinics/builders)", "• Local warm network & BNI chapters", "• LinkedIn search: 'Managing Director Mumbai'"], "x": 0.4, "col": "#EBF8FF", "bc": "#3182CE"},
        {"title": "2. The Hook / Pitch", "items": ["• 'Free 15-Min Operational Audit'", "• 'Let me automate 1 boring task for 3 days'", "• Zero-risk: Pay only if time is saved"], "x": 3.9, "col": "#FEFCBF", "bc": "#D69E2E"},
        {"title": "3. The Retainer Contract", "items": ["• Setup: ₹20k - ₹35k upfront", "• Retainer: ₹5k - ₹15k/mo (monitoring)", "• Client pays software bills directly"], "x": 7.4, "col": "#C6F6D5", "bc": "#38A169"}
    ]

    for b in blocks:
        rect = patches.FancyBboxPatch((b["x"], 0.8), 3.1, 2.8, boxstyle="round,pad=0.15,rounding_size=0.18",
                                      facecolor=b["col"], edgecolor=b["bc"], linewidth=2)
        ax.add_patch(rect)
        ax.text(b["x"] + 1.55, 3.2, b["title"], color="#1A202C", fontsize=11, fontweight="bold", ha="center")
        
        y_text = 2.5
        for item in b["items"]:
            ax.text(b["x"] + 0.2, y_text, item, color="#2D3748", fontsize=8.5, va="center")
            y_text -= 0.65

    # Connectors
    ax.annotate('', xy=(3.8, 2.2), xytext=(3.5, 2.2), arrowprops=dict(arrowstyle="->", color="#2B6CB0", lw=2.5, mutation_scale=15))
    ax.annotate('', xy=(7.3, 2.2), xytext=(7.0, 2.2), arrowprops=dict(arrowstyle="->", color="#2B6CB0", lw=2.5, mutation_scale=15))

    ax.set_xlim(0, 11)
    ax.set_ylim(0, 4.5)
    ax.axis("off")
    plt.tight_layout()
    plt.savefig(filename, bbox_inches="tight")
    plt.close()
    print(f"Generated {filename}")

if __name__ == "__main__":
    generate_flowchart_1()
    generate_flowchart_2()
