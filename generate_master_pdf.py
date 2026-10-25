import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_full_master_pdf(filename="Agency_Master_Playbook_Bhagat_Yash.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Premium Brand Palette
    c_primary = colors.HexColor("#0F172A")    # Deep Slate
    c_accent_blue = colors.HexColor("#2563EB")# Royal Tech Blue
    c_teal = colors.HexColor("#0D9488")       # Vibrant Teal
    c_dark = colors.HexColor("#334155")       # Charcoal
    c_light = colors.HexColor("#F8FAFC")      # Off-white
    c_border = colors.HexColor("#E2E8F0")     # Clean border

    # Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=c_primary,
        spaceAfter=4
    )

    sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=c_accent_blue,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_teal,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13.5,
        textColor=c_dark,
        spaceAfter=5
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=13,
        textColor=c_dark,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3
    )

    elements = []

    # Title & Founders Header
    elements.append(Paragraph("Agency Master Playbook & Execution Roadmap", title_style))
    elements.append(Paragraph("<b>Co-Founders:</b> Bhagat Mukhiya & Yash Gaikwad | <b>Focus:</b> Automation, Web Dev, SaaS & Consumer Connect", sub_style))
    elements.append(Spacer(1, 4))

    # SECTION 1: End-to-End Lifecycle Flowchart
    elements.append(Paragraph("1. Complete Business Lifecycle (From Zero to Retainers)", h1_style))
    elements.append(Paragraph(
        "A step-by-step sequential path designed to take your agency from a local zero-cost setup "
        "to a high-margin monthly recurring revenue (MRR) model in Mumbai and beyond.", body_style
    ))
    
    # Embed Flowchart 1
    if os.path.exists("flowchart_agency_lifecycle.png"):
        elements.append(Image("flowchart_agency_lifecycle.png", width=535, height=195))
        elements.append(Spacer(1, 10))

    # SECTION 2: Website & Portfolio Architecture
    elements.append(Paragraph("2. Agency Website Architecture (High-Converting 1-Page Layout)", h1_style))
    elements.append(Paragraph(
        "Do not build a 10-page bloated corporate website. A modern agency website needs only <b>5 high-impact sections</b> focused on solving business bottlenecks:",
        body_style
    ))

    web_data = [
        [Paragraph("<b>Website Section</b>", body_style), Paragraph("<b>Key Elements & Content</b>", body_style), Paragraph("<b>Conversion Goal</b>", body_style)],
        [
            Paragraph("<b>1. Hero Header</b>", body_style),
            Paragraph("One clear hook: <i>'We automate manual office work, build custom web portals, and scale your customer outreach.'</i> Direct WhatsApp CTA button.", body_style),
            Paragraph("Captures attention in under 5 seconds.", body_style)
        ],
        [
            Paragraph("<b>2. 3 Core Pillars</b>", body_style),
            Paragraph("<b>1) Web & SaaS Dev:</b> Custom portals, dashboards, landing pages.<br/><b>2) Workflow Automation:</b> Invoices, CRM sync, auto-triage.<br/><b>3) Consumer Connect:</b> WhatsApp API bots, automated SMS/email sequences.", body_style),
            Paragraph("Shows full-service capability.", body_style)
        ],
        [
            Paragraph("<b>3. Interactive Proof</b>", body_style),
            Paragraph("Two short 60-second video screen recordings (Loom):<br/>• Invoice PDF $\to$ Excel row in 5 seconds.<br/>• Meta Lead $\to$ Instant WhatsApp greeting + calendar booking.", body_style),
            Paragraph("Builds immediate visual trust.", body_style)
        ],
        [
            Paragraph("<b>4. Founder Credibility</b>", body_style),
            Paragraph("Photo & bios of Bhagat Mukhiya & Yash Gaikwad: Highlighting technical speed, personal accountability, and local Mumbai availability.", body_style),
            Paragraph("Eliminates 'nameless agency' doubt.", body_style)
        ],
        [
            Paragraph("<b>5. The No-Risk CTA</b>", body_style),
            Paragraph("<i>'Book a Free 15-Minute Operations Audit'</i> (Cal.com / WhatsApp link). We analyze your current manual tasks and give a free automation blueprint.", body_style),
            Paragraph("Zero-friction meeting bookings.", body_style)
        ]
    ]

    t_web = Table(web_data, colWidths=[110, 310, 115])
    t_web.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_light),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('LINEBELOW', (0,0), (-1,0), 1.5, c_accent_blue),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_web)
    elements.append(Spacer(1, 10))

    # PAGE BREAK
    elements.append(PageBreak())

    # SECTION 3: Client Acquisition Funnel Flowchart
    elements.append(Paragraph("3. Client Acquisition Funnel (Sourcing to Signed Retainer)", h1_style))
    elements.append(Paragraph(
        "How Bhagat and Yash will generate warm leads, pitch with zero resistance, and close monthly retainer contracts:",
        body_style
    ))

    # Embed Flowchart 2
    if os.path.exists("flowchart_client_funnel.png"):
        elements.append(Image("flowchart_client_funnel.png", width=535, height=205))
        elements.append(Spacer(1, 10))

    # SECTION 4: Target Audience & High-Ticket Offers
    elements.append(Paragraph("4. Target Audience Matrix & Concrete Offers in Mumbai", h1_style))

    offer_data = [
        [Paragraph("<b>Target Niche</b>", body_style), Paragraph("<b>Their Daily Bottleneck</b>", body_style), Paragraph("<b>Your Exact Solution</b>", body_style), Paragraph("<b>Price Point</b>", body_style)],
        [
            Paragraph("<b>Real Estate & Channel Partners</b><br/>(Thane, Andheri, Navi Mumbai)", body_style),
            Paragraph("Hundreds of leads from 99acres & Facebook ads go cold because callers respond hours late.", body_style),
            Paragraph("<b>Instant WhatsApp Responder:</b> 15-sec greeting, budget pre-qualification, auto-schedules site visits to Google Calendar.", body_style),
            Paragraph("₹25,000 setup<br/>+ ₹7,500/mo", body_style)
        ],
        [
            Paragraph("<b>Chartered Accountants & Traders</b><br/>(Fort, Crawford Market, BKC)", body_style),
            Paragraph("Accountants spend 10-15 hours/week typing invoice data from PDFs/photos into Tally.", body_style),
            Paragraph("<b>AI Invoice-to-Sheet Scanner:</b> Artificial Intelligence Vision OCR reads bills, extracts GST, total, vendor, and fills spreadsheets automatically.", body_style),
            Paragraph("₹30,000 setup<br/>+ ₹10,000/mo", body_style)
        ],
        [
            Paragraph("<b>D2C Brands & Local Clinics</b><br/>(Bandra, Juhu, South Bombay)", body_style),
            Paragraph("Staff bombarded by repeated FAQs, clinic timing queries, and manual appointment logging.", body_style),
            Paragraph("<b>Smart Web Booking + AI Bot:</b> Custom interactive website with WhatsApp triage bot handling 80% of routine questions.", body_style),
            Paragraph("₹40,000 setup<br/>+ ₹10,000/mo", body_style)
        ]
    ]

    t_offer = Table(offer_data, colWidths=[120, 130, 205, 80])
    t_offer.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_light),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('LINEBELOW', (0,0), (-1,0), 1.5, c_teal),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_offer)
    elements.append(Spacer(1, 10))

    # SECTION 5: The Founders' Co-Working Division (Bhagat & Yash)
    elements.append(Paragraph("5. Co-Founder Responsibility Split", h1_style))
    elements.append(Paragraph("To execute smoothly and scale rapidly without overlapping or confusion, divide tasks clearly:", body_style))
    elements.append(Paragraph("• <b>Technical & Automation Architect (Bhagat Mukhiya):</b> n8n workflow construction, Artificial Intelligence API prompts, Python scripts, web portal logic, and error monitoring.", bullet_style))
    elements.append(Paragraph("• <b>Client Acquisition & Frontend Experience (Yash Gaikwad):</b> Outreach message sequences, client discovery calls, demo recordings, UI/UX frontend styling, and weekly client reporting.", bullet_style))
    elements.append(Spacer(1, 8))

    # SECTION 6: The Golden Pitch Script
    elements.append(Paragraph("6. The 'Zero-Resistance' Client Outreach Script", h1_style))
    elements.append(Paragraph(
        "<i>'Hi [Name], we noticed your team is running ads on Facebook/Google. Most businesses lose 40% of their ad spend because leads aren't contacted within 5 minutes. "
        "Bhagat and I built an automated system that connects incoming leads to WhatsApp in 15 seconds and puts qualified appointments on your phone. "
        "Can we set this up for 3 days on a test run for free? If it saves your team time, we can discuss a monthly partnership. If not, you owe us nothing.'</i>",
        body_style
    ))

    # Build PDF
    doc.build(elements)
    print(f"Master PDF successfully generated at: {os.path.abspath(filename)}")

if __name__ == "__main__":
    generate_full_master_pdf()
