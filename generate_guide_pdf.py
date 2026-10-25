import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon, Group

def create_guide_pdf(filename="Automation_Business_Starter_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    c_primary = colors.HexColor("#1A365D")   # Deep Navy
    c_secondary = colors.HexColor("#2B6CB0") # Vibrant Blue
    c_accent = colors.HexColor("#319795")    # Teal
    c_dark = colors.HexColor("#2D3748")      # Charcoal Body
    c_light = colors.HexColor("#F7FAFC")     # Soft grey background
    c_border = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=c_primary,
        alignment=0,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        alignment=0,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_secondary,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=c_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=c_dark,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#2C5282")
    )

    elements = []

    # Header / Title Block
    elements.append(Paragraph("AI & Automation Agency Launch Blueprint", title_style))
    elements.append(Paragraph("Complete Practical Guide: Zero-Cost Setup, Flowcharts & High-Value Automations", subtitle_style))
    elements.append(Spacer(1, 10))

    # SECTION 1: Zero-Cost Tech Stack & Setup
    elements.append(Paragraph("1. Zero-Cost Core Software Stack", h1_style))
    elements.append(Paragraph(
        "You do not need paid enterprise subscriptions to launch. Everything required to build, test, "
        "and demo high-ticket business automations is already installed or accessible on your machine at zero cost:",
        body_style
    ))

    stack_data = [
        [Paragraph("<b>Component</b>", body_style), Paragraph("<b>Software / Tool</b>", body_style), Paragraph("<b>Cost</b>", body_style), Paragraph("<b>Purpose</b>", body_style)],
        [Paragraph("Core Engine", body_style), Paragraph("n8n (Self-Hosted)", body_style), Paragraph("₹0", body_style), Paragraph("Visual drag-and-drop workflow builder. Runs locally on port 5678 without task quotas.", body_style)],
        [Paragraph("AI Reasoning", body_style), Paragraph("Google Gemini API (AI Studio)", body_style), Paragraph("₹0", body_style), Paragraph("Gemini 1.5/2.0 Flash with free tier (15 requests/min) for OCR, parsing, and chat.", body_style)],
        [Paragraph("Scripting & Code", body_style), Paragraph("Python 3.15 + VS Code", body_style), Paragraph("₹0", body_style), Paragraph("Custom logic, webhooks, data transformations, and browser automation.", body_style)],
        [Paragraph("Data Storage", body_style), Paragraph("Google Sheets / Airtable", body_style), Paragraph("₹0", body_style), Paragraph("Client-friendly lightweight databases for tracking leads, logs, and orders.", body_style)],
        [Paragraph("Screen Demos", body_style), Paragraph("Loom (Free Plan)", body_style), Paragraph("₹0", body_style), Paragraph("2-minute proof-of-concept videos to pitch non-technical owners.", body_style)]
    ]
    t_stack = Table(stack_data, colWidths=[90, 130, 40, 270])
    t_stack.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_light),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('LINEBELOW', (0,0), (-1,0), 1.5, c_secondary),
    ]))
    elements.append(t_stack)
    elements.append(Spacer(1, 12))

    # SECTION 2: How to Run & Connect Locally
    elements.append(Paragraph("2. Quick Setup Verification", h2_style))
    elements.append(Paragraph("• <b>Launch n8n:</b> Open PowerShell and run <code>n8n start</code>. Access the visual editor in Chrome at <code>http://localhost:5678</code>.", bullet_style))
    elements.append(Paragraph("• <b>Get Free Gemini Key:</b> Visit <code>aistudio.google.com</code>, sign in with your Google account, click 'Get API Key', and copy the key.", bullet_style))
    elements.append(Paragraph("• <b>Run Custom Script:</b> Run <code>python lead_qualifier_demo.py</code> inside your workspace folder to test AI parsing on incoming customer requests.", bullet_style))
    elements.append(Spacer(1, 14))

    # FLOWCHART 1: Lead Capture & WhatsApp Qualifier
    elements.append(Paragraph("3. High-Value Automation #1: Instant WhatsApp Lead Qualifier", h1_style))
    elements.append(Paragraph(
        "<b>Best for:</b> Real estate developers, interior designers, coaching classes, clinics.<br/>"
        "<b>The Problem:</b> 99acres, Facebook ads, and website leads go cold because human sales reps call hours late.<br/>"
        "<b>The Automation Flow:</b>", body_style
    ))

    # Draw Flowchart 1
    d1 = Drawing(530, 100)
    # Background card
    d1.add(Rect(0, 0, 530, 100, fillColor=colors.HexColor("#F8FAFC"), strokeColor=c_border, strokeWidth=1, rx=6, ry=6))
    
    def draw_node(d, x, y, w, h, title, sub, bg_color):
        d.add(Rect(x, y, w, h, fillColor=bg_color, strokeColor=colors.HexColor("#CBD5E0"), strokeWidth=1, rx=4, ry=4))
        d.add(String(x + w/2, y + h - 14, title, textAnchor='middle', fontName='Helvetica-Bold', fontSize=8.5, fillColor=colors.HexColor("#1A202C")))
        d.add(String(x + w/2, y + 8, sub, textAnchor='middle', fontName='Helvetica', fontSize=7.5, fillColor=colors.HexColor("#4A5568")))

    def draw_arrow(d, x1, y1, x2, y2, label=""):
        d.add(Line(x1, y1, x2, y2, strokeColor=c_secondary, strokeWidth=1.5))
        # Arrowhead
        d.add(Polygon(points=[x2, y2, x2-6, y2+3, x2-6, y2-3], fillColor=c_secondary, strokeColor=c_secondary))
        if label:
            d.add(String((x1+x2)/2, y1 + 4, label, textAnchor='middle', fontName='Helvetica', fontSize=7, fillColor=c_secondary))

    draw_node(d1, 15, 30, 95, 42, "Ad / Form Lead", "FB Ads / Webhook", colors.HexColor("#EBF8FF"))
    draw_arrow(d1, 110, 51, 140, 51)
    draw_node(d1, 140, 30, 105, 42, "n8n Processing", "Deduplicate & Parse", colors.HexColor("#E6FFFA"))
    draw_arrow(d1, 245, 51, 275, 51)
    draw_node(d1, 275, 30, 110, 42, "Gemini Flash AI", "Qualify & Score Intent", colors.HexColor("#FEFCBF"))
    draw_arrow(d1, 385, 51, 415, 51)
    draw_node(d1, 415, 30, 100, 42, "Action & Alert", "WhatsApp + Sheet", colors.HexColor("#C6F6D5"))
    elements.append(d1)
    elements.append(Spacer(1, 15))

    # PAGE BREAK FOR CRISP LAYOUT
    elements.append(PageBreak())

    # SECTION 4: High-Value Automation #2 & #3
    elements.append(Paragraph("4. High-Value Automation #2: AI Document & Invoice Scanner", h1_style))
    elements.append(Paragraph(
        "<b>Best for:</b> Chartered Accountants (CAs), logistics firms, traders, wholesalers.<br/>"
        "<b>The Problem:</b> Accountants waste 10–20 hours a week manually entering figures from paper bills or PDF invoices into Tally or Excel.<br/>"
        "<b>The Automation Flow:</b>", body_style
    ))

    # Draw Flowchart 2
    d2 = Drawing(530, 100)
    d2.add(Rect(0, 0, 530, 100, fillColor=colors.HexColor("#F8FAFC"), strokeColor=c_border, strokeWidth=1, rx=6, ry=6))
    draw_node(d2, 15, 30, 95, 42, "Bill / Invoice PDF", "Email / WhatsApp", colors.HexColor("#FED7D7"))
    draw_arrow(d2, 110, 51, 140, 51)
    draw_node(d2, 140, 30, 105, 42, "n8n Trigger", "Extract Attachment", colors.HexColor("#EBF8FF"))
    draw_arrow(d2, 245, 51, 275, 51)
    draw_node(d2, 275, 30, 110, 42, "Gemini Vision OCR", "Vendor, GST, Total, Date", colors.HexColor("#FEFCBF"))
    draw_arrow(d2, 385, 51, 415, 51)
    draw_node(d2, 415, 30, 100, 42, "Export to Accounting", "Google Sheet / Tally XML", colors.HexColor("#C6F6D5"))
    elements.append(d2)
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("5. Top 4 Automation Services You Should Sell", h1_style))
    
    catalog_data = [
        [Paragraph("<b>Service</b>", body_style), Paragraph("<b>Target Mumbai Business</b>", body_style), Paragraph("<b>Pain Solved</b>", body_style), Paragraph("<b>Typical Pricing</b>", body_style)],
        [
            Paragraph("<b>Instant WhatsApp Lead Responder</b>", body_style),
            Paragraph("Real Estate Brokers, Interior Designers, Salons", body_style),
            Paragraph("Leads reply within 15 seconds; books appointments on Google Calendar 24/7.", body_style),
            Paragraph("₹20,000 setup<br/>+ ₹5,000/mo", body_style)
        ],
        [
            Paragraph("<b>Invoice & Receipt OCR to Sheet</b>", body_style),
            Paragraph("CAs, Wholesalers, Distributors (Crawford Market, Fort)", body_style),
            Paragraph("Converts physical/PDF bills into clean spreadsheet rows automatically.", body_style),
            Paragraph("₹25,000 setup<br/>+ ₹7,500/mo", body_style)
        ],
        [
            Paragraph("<b>Customer Support & FAQ Chatbot</b>", body_style),
            Paragraph("D2C E-commerce, Diagnostic Labs, Coaching Centers", body_style),
            Paragraph("Handles 80% of routine questions without hiring extra reception or support staff.", body_style),
            Paragraph("₹35,000 setup<br/>+ ₹10,000/mo", body_style)
        ],
        [
            Paragraph("<b>Automated Review & Feedback Engine</b>", body_style),
            Paragraph("Dental Clinics, Restaurants, Local Boutiques", body_style),
            Paragraph("Sends automated polite WhatsApp messages post-visit asking for 5-star Google reviews.", body_style),
            Paragraph("₹15,000 setup<br/>+ ₹3,000/mo", body_style)
        ]
    ]
    t_catalog = Table(catalog_data, colWidths=[120, 120, 190, 100])
    t_catalog.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_light),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('LINEBELOW', (0,0), (-1,0), 1.5, c_secondary),
    ]))
    elements.append(t_catalog)
    elements.append(Spacer(1, 14))

    # SECTION 6: The 30-Day Action Roadmap
    elements.append(Paragraph("6. Step-by-Step 30-Day Execution Roadmap", h1_style))
    elements.append(Paragraph("• <b>Week 1 (Build 1 Demo):</b> Connect n8n to Google Sheets. Use your free Gemini key to build the lead qualification flow. Record a 90-second video demo.", bullet_style))
    elements.append(Paragraph("• <b>Week 2 (The Warm Circle):</b> Talk to 5 business owners you already know (family friends, local shops, dentists). Offer to automate 1 small manual task for free for 3 days.", bullet_style))
    elements.append(Paragraph("• <b>Week 3 (Case Study & Testimonial):</b> Once they see it save time, ask for a short testimonial or introduce you to 2 other business owners.", bullet_style))
    elements.append(Paragraph("• <b>Week 4 (Close First Paid Client):</b> Pitch the WhatsApp or Invoice Automation with a ₹15,000 setup + ₹5,000/month monitoring fee.", bullet_style))

    # Build the PDF
    doc.build(elements)
    print(f"✅ PDF successfully generated at: {os.path.abspath(filename)}")

if __name__ == "__main__":
    create_guide_pdf()
