import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak, KeepTogether
)
from reportlab.pdfgen import canvas
import pymupdf

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#555555"))
        page_text = f"Page {self._pageNumber}"
        self.drawRightString(A4[0] - 42, 28, page_text)
        self.restoreState()

def build_pdf():
    pdf_filename = "Mind_Body_Connection_Case_Study_Report_SAKEC.pdf"
    
    # 38pt margins
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=32,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=15,
        alignment=1,
        textColor=colors.HexColor("#0A2A4D"),
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        alignment=1,
        textColor=colors.HexColor("#222222"),
        spaceAfter=8
    )

    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#111111")
    )

    meta_val_style = ParagraphStyle(
        'MetaVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#222222")
    )

    heading1_style = ParagraphStyle(
        'SecHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13.5,
        textColor=colors.HexColor("#0A2A4D"),
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    heading2_style = ParagraphStyle(
        'SubHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12.5,
        textColor=colors.HexColor("#222222"),
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.6,
        leading=11.2,
        alignment=4,
        textColor=colors.HexColor("#1A1A1A"),
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.1,
        alignment=4,
        textColor=colors.HexColor("#1A1A1A"),
        leftIndent=12,
        firstLineIndent=-12,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=9.8,
        textColor=colors.white
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=9.6,
        textColor=colors.HexColor("#0A2A4D")
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=9.6,
        textColor=colors.HexColor("#1A1A1A")
    )

    ref_style = ParagraphStyle(
        'RefText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=10.6,
        leftIndent=16,
        firstLineIndent=-16,
        spaceAfter=2.5,
        textColor=colors.HexColor("#1A1A1A")
    )

    story = []

    # 1. SAKEC Blue Banner Image at top of Page 1
    banner_img_path = "sakec_blue_banner.png"
    if os.path.exists(banner_img_path):
        banner_w = 515.0
        banner_h = 73.0
        img = RLImage(banner_img_path, width=banner_w, height=banner_h)
        story.append(img)
        story.append(Spacer(1, 6))

    # 2. Main Title & Subtitle
    story.append(Paragraph("INDIAN PHILOSOPHICAL SYSTEMS – CASE STUDY REPORT", title_style))
    story.append(Paragraph("Course Code: ECCOR2IK201.1 | Module 4: Contemporary Applications and Synthesis", subtitle_style))

    # 3. Metadata Table
    meta_table_data = [
        [Paragraph("<b>Roll No.:</b>", meta_label_style), Paragraph("33, 34", meta_val_style)],
        [Paragraph("<b>Case Study Title:</b>", meta_label_style), Paragraph("<b>Mind-Body Connection in Indian Philosophy: Implications for Holistic Health</b>", meta_val_style)],
        [Paragraph("<b>Group Members:</b>", meta_label_style), Paragraph("1. Bhagat Mukhiya (Roll No. 33) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 2. Om Nathwani (Roll No. 34)", meta_val_style)],
        [Paragraph("<b>Selected Indian Philosophical Concept/School:</b>", meta_label_style), Paragraph("Samkhya-Yoga, Ayurveda &amp; Upanishadic Systems – Pancha Kosha, Adhi-Vyadhi, Triguna-Tridosha, and Ashtanga Yoga", meta_val_style)],
        [Paragraph("<b>Relevant SDG(s):</b>", meta_label_style), Paragraph("SDG 3 (Good Health and Well-being), SDG 4 (Quality Education), SDG 12 (Responsible Consumption and Production)", meta_val_style)]
    ]
    t_meta = Table(meta_table_data, colWidths=[165, 350])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 5))

    # --- Section 1: Problem / Case Context ---
    story.append(Paragraph("1. Problem / Case Context", heading1_style))
    story.append(Paragraph(
        "Modern education, intense corporate workplaces, and digital lifestyles reward speed, metrics, competitive visibility, and cognitive output, but they provide minimal support for the physiological and emotional harmony of the individual. Students and young professionals frequently experience pervasive examination stress, academic comparison on social media, chronic sleep deficit, and poor nutritional habits. The consequence is evident in surging rates of psychosomatic ailments, mental fatigue, burnout, panic episodes, irritable bowel syndrome (IBS), and stress-induced migraines. Conventional biomedical healthcare operates predominantly under a Cartesian dualistic model that separates the psyche from the soma, addressing physical symptoms mechanically through pharmaceuticals (e.g., antacids, analgesics, and sedatives) without rectifying the cognitive and lifestyle root causes.",
        body_style
    ))
    story.append(Paragraph(
        "This is a systemic lifestyle crisis as much as a healthcare challenge. Compartmentalized intervention without cognitive clarity, autonomic self-regulation, and emotional balance cannot produce sustainable wellness. India’s National Education Policy 2020 (NEP 2020) explicitly mandates education that integrates traditional Indian Knowledge Systems (IKS), ethical resilience, and holistic self-care. The case therefore asks: <i>Can classical Indian philosophical frameworks—specifically the Upanishadic Pancha Kosha model, the Yoga-Vasistha's Adhi-Vyadhi paradigm, and Ayurvedic psychoneurobiology—provide a scientific, preventative, and holistic foundation for well-being in high-stress academic environments today?</i>",
        body_style
    ))
    story.append(Paragraph(
        "<b>Case scenario (The Modern Engineering Student under Psychosomatic Strain).</b> Over several months of preparing for rigorous semester exams and competitive technical placements, a student experiences severe anxiety, irregular eating, and screen-induced insomnia. Soon, this psychological distress translates into chronic gastrointestinal acid reflux, debilitating tension headaches, and cognitive brain fog. Traditional medical consultations result in repeated prescriptions for proton-pump inhibitors and anti-anxiety medication, which temporarily mask the discomfort without resolving the underlying autonomic hyperarousal. In Indian philosophical terms, this case is a textbook demonstration of <i>Adhi</i> (mental agitation) disturbing the <i>Pranamaya Kosha</i> (vital breath), impairing <i>Agni</i> (metabolism), and culminating in <i>Vyadhi</i> (physical illness) within the <i>Annamaya Kosha</i>. Restoring health requires addressing the entire mind-body continuum.",
        body_style
    ))

    # --- Section 2: Philosophical Framework and Application ---
    story.append(Paragraph("2. Philosophical Framework and Application", heading1_style))
    story.append(Paragraph(
        "Classical Indian philosophy rejects the Cartesian bifurcation of mind (res cogitans) and body (res extensa). Instead, traditions including Samkhya, Yoga, Vedanta, and Ayurveda view human existence as an integrated spectrum (<i>Sharira-Manas-Atman samyoga</i>). Body and mind are both evolutes of <i>Prakriti</i> (nature/matter)—body being gross matter (<i>Sthula Sharira</i>) and mind subtle matter (<i>Sukshma Sharira</i>)—illuminated by pure consciousness (<i>Purusha/Atman</i>). Four core philosophical frameworks explain this mind-body unity:",
        body_style
    ))

    story.append(Paragraph(
        "• &nbsp;<b>Pancha Kosha Model (Taittiriya Upanishad 2.1–2.8):</b> Human existence comprises five nested, interpenetrating sheaths: <i>Annamaya</i> (physical/anatomical body), <i>Pranamaya</i> (vital breath and autonomic energy), <i>Manomaya</i> (sensory-emotional mind and desires), <i>Vijnanamaya</i> (intellect, self-reflection, and discernment/Buddhi), and <i>Anandamaya</i> (the inner core of intrinsic bliss). Disturbances in the psychological and intellectual layers directly distort the flow of Prana, ultimately precipitating physical pathology in the Annamaya layer. True health requires multi-sheath alignment.",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>Adhi and Vyadhi Framework (Yoga Vasistha 6.1.81–92 &amp; Charaka Samhita):</b> The Yoga Vasistha delivers the earliest documented model of psychosomatic pathology, distinguishing between <i>Adhija Vyadhi</i> (diseases originating from mental disturbance) and <i>Anadhija Vyadhi</i> (external/infectious illnesses). Chronic unfulfilled cravings, anxiety, and mental ego-conflict (<i>Adhi</i>) agitate the Manomaya Kosha, destabilizing the Nadis and Prana currents. Erratic Prana impairs <i>Agni</i> (digestive fire), generating metabolic toxins (<i>Ama</i>) that manifest as somatic disease (<i>Vyadhi</i>).",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>Triguna and Tridosha Dynamic (Samkhya &amp; Ayurveda):</b> Samkhya defines three cosmic qualities of mind: <i>Sattva</i> (purity, harmony, clarity), <i>Rajas</i> (restless passion, agitation), and <i>Tamas</i> (inertia, dullness). In Ayurveda (Charaka Samhita Sutrasthana 1.56–57), mental Gunas directly govern the biological humors (<i>Tridosha: Vata, Pitta, Kapha</i>). Chronic Rajasic anxiety vitiates Vata and Pitta, producing hypertension, ulcers, and insomnia, while Tamas provokes Kapha stagnation and metabolic depression. Cultivating Sattva restores biological equilibrium.",
        bullet_style
    ))

    # Page 2 begins here naturally or with PageBreak
    story.append(PageBreak())

    story.append(Paragraph(
        "• &nbsp;<b>Ashtanga Yoga as Psychoneuro-Regulator (Patanjali Yoga Sutras):</b> Patanjali defines Yoga as <i>Chitta-Vritti-Nirodha</i> (the cessation of mental fluctuations, YS 1.2). The eight limbs systematically harmonize mind and body: <i>Yama</i> and <i>Niyama</i> provide ethical and cognitive peace; <i>Asana</i> builds neuromuscular stability (<i>Sthira-sukham asanam</i>, YS 2.46); <i>Pranayama</i> restores autonomic balance by stimulating vagal nerve tone; and <i>Pratyahara/Dharana/Dhyana</i> quiet the brain’s default mode network, fostering emotional resilience.",
        bullet_style
    ))
    story.append(Paragraph(
        "Two foundational teachings support this vision. The Bhagavad Gita (6.16–17) teaches <i>Yuktahara-Vihara</i>—disciplined moderation in diet, recreation, sleep, and activity, declaring that balanced living destroys all sorrow and disease (<i>Yogo bhavati duhkha-ha</i>). Furthermore, Sushruta Samhita (Sutrasthana 15.48) establishes the classical definition of genuine health (<i>Svastha</i>): balanced humors (<i>Samadosha</i>), balanced metabolism (<i>Samagnischa</i>), proper tissue and excretory function, united with a serene, cheerful soul, senses, and mind (<i>Prasannatmendriyamanah</i>). Health is thus active mind-body harmony.",
        body_style
    ))

    # --- Section 3: Analysis and Proposed Response ---
    story.append(Paragraph("3. Analysis and Proposed Response", heading1_style))
    story.append(Paragraph(
        "<b>A. Analysis.</b> The table links each Indian philosophical concept to the health dimension it cultivates, the contemporary pathology it addresses, and its practical campus/daily application:",
        body_style
    ))

    table_data = [
        [
            Paragraph("<b>Philosophical Concept</b>", table_header_style),
            Paragraph("<b>Holistic Health Dimension</b>", table_header_style),
            Paragraph("<b>Contemporary Problem</b>", table_header_style),
            Paragraph("<b>Practical Campus Application</b>", table_header_style)
        ],
        [
            Paragraph("<b>Pancha Kosha Model</b><br/>(Taittiriya Upanishad)", table_cell_bold),
            Paragraph("Multi-sheath coherence; physical-energetic-mental alignment", table_cell_style),
            Paragraph("Chronic burnout, mental fatigue, dissociation from bodily signals", table_cell_style),
            Paragraph("Daily 'Kosha check-in' (5-min posture scan, breath awareness, emotional audit)", table_cell_style)
        ],
        [
            Paragraph("<b>Adhi-Vyadhi Formulation</b><br/>(Yoga Vasistha 6.1)", table_cell_bold),
            Paragraph("Root-cause psychosomatic regulation; pacifying mental triggers", table_cell_style),
            Paragraph("Stress-induced IBS, tension headaches, stress-related hypertension", table_cell_style),
            Paragraph("Stress-mapping workshops; identifying psychological triggers (Adhi) to prevent somatic flare-ups", table_cell_style)
        ],
        [
            Paragraph("<b>Triguna &amp; Tridosha</b><br/>(Samkhya / Ayurveda)", table_cell_bold),
            Paragraph("Psychoneuroendocrine balance; shifting from Rajas/Tamas to Sattva", table_cell_style),
            Paragraph("Restless anxiety, depressive inertia, erratic study cycles, brain fog", table_cell_style),
            Paragraph("Dietary awareness (Sattvic Ahara in canteens); regularizing circadian sleep/study routines", table_cell_style)
        ],
        [
            Paragraph("<b>Ashtanga Yoga &amp; Pranayama</b><br/>(Patanjali Yoga Sutras)", table_cell_bold),
            Paragraph("Autonomic regulation, vagal nerve tone, neuromuscular calm", table_cell_style),
            Paragraph("Panic attacks, exam anxiety, poor concentration, sleep disorders", table_cell_style),
            Paragraph("10-min pre-lecture breathing drills (Nadi Shodhana, Bhramari); structured desk-stretch breaks", table_cell_style)
        ],
        [
            Paragraph("<b>Yuktahara-Vihara &amp; Mitahara</b><br/>(Gita 6.16–17)", table_cell_bold),
            Paragraph("Circadian equilibrium, mindful moderate consumption (Ahara, Nidra)", table_cell_style),
            Paragraph("Junk food addiction, late-night bingeing, circadian sleep disruption", table_cell_style),
            Paragraph("Hostel/canteen 'Mitahara Charter' for fresh balanced meals; digital curfew at 11:30 PM", table_cell_style)
        ]
    ]

    col_widths = [105, 135, 135, 140]
    t_analysis = Table(table_data, colWidths=col_widths, repeatRows=1)
    t_analysis.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0A2A4D")),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D0D7DE")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F6F8FA")]),
    ]))
    story.append(t_analysis)
    story.append(Spacer(1, 5))

    # Subheading B
    story.append(Paragraph("<b>B. Proposed response: The 'Swasthya-Manas' Campus Integrative Health Initiative.</b> A secular, evidence-based campus wellness module designed to embed the Indian philosophical mind-body continuum into the college environment without requiring new infrastructure:", heading2_style))
    story.append(Paragraph(
        "• &nbsp;<b>Psychosomatic Awareness &amp; Adhi-Mapping:</b> Orientation workshops teaching students to identify early psychological triggers (Adhi) before they manifest as bodily dysfunctions (Vyadhi).",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>Institutional 'Prana-Pause' (10 Minutes Daily):</b> A scheduled pause prior to afternoon sessions featuring synchronized, non-sectarian breathing (Nadi Shodhana for autonomic balance, Bhramari for cortical calm).",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>Mitahara &amp; Dinacharya Nutrition Charter:</b> Collaboration with campus cafeterias to provide fresh, wholesome, seasonal (Sattvic) meal options and encourage mindful, moderate eating habits.",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>Svadhyaya (Reflective Journaling) &amp; Triguna Self-Audits:</b> Weekly self-inquiry prompts enabling students to audit their mental states (Sattva vs. Rajas vs. Tamas) and consciously recalibrate daily habits.",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>Integrative Faculty-Peer Mentoring Circles:</b> Incorporating emotional composure, sleep hygiene, and stress resilience reviews into regular mentor-mentee interactions.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>Feasibility and Policy Alignment:</b> The initiative is highly feasible as it fits seamlessly into existing mentoring hours and student life programs. It satisfies the mandate of NEP 2020 for holistic wellness and traditional knowledge integration. Potential risks—such as misperception as a religious practice or dilution into superficial exercise—are mitigated by framing the module through secular neuroscience and psychoneuroimmunology, maintaining voluntary, inclusive participation for all backgrounds.",
        body_style
    ))

    # Subheading C
    story.append(Paragraph("<b>C. Comparison with Western Paradigms.</b> Aristotle's virtue ethics and modern positive psychology identify character and mental composure as habits formed by practice. In medicine, Western paradigms have historically relied on Cartesian dualism, treating mind and body as discrete entities. Today, cutting-edge biomedical science is converging with ancient Indian thought through Psychoneuroimmunology (PNI) and the Biopsychosocial Model (Engel, 1977), proving that psychological stress directly suppresses immune function and alters gut microbiome health via the autonomic nervous system and neuroendocrine pathways.", body_style))

    # Page 3 begins here
    story.append(PageBreak())

    story.append(Paragraph(
        "This modern synthesis validates the Yoga Vasistha's ancient <i>Adhi-Vyadhi</i> formulation. Furthermore, contemporary cognitive behavioral therapies (CBT) and Mindfulness-Based Stress Reduction (MBSR, Jon Kabat-Zinn) utilize techniques that mirror Patanjali's <i>Sakshi Bhava</i> (witness consciousness) and <i>Chitta-Vritti-Nirodha</i>. However, while Western clinical models typically compartmentalize care into psychotherapy for the mind or pharmacology for the body, Indian philosophy presents an integrated lifestyle science (Ayurveda and Yoga) that coordinates diet (<i>Mitahara</i>), respiration (<i>Prana</i>), posture (<i>Asana</i>), and cognitive purpose (<i>Dharma</i>) into a seamless framework for sustainable human flourishing.",
        body_style
    ))

    # --- Section 4: SDG Relevance and Expected Impact ---
    story.append(Paragraph("4. SDG Relevance and Expected Impact", heading1_style))
    story.append(Paragraph(
        "• &nbsp;<b>SDG 3 – Good Health and Well-being (Target 3.4):</b> Target 3.4 mandates reducing premature mortality from non-communicable diseases (NCDs) and promoting mental health and well-being. Practices drawn from the Indian mind-body continuum—such as autonomic downregulation through Pranayama, mental calming through Dhyana, and moderation in lifestyle—provide cost-effective, scalable interventions against hypertension, metabolic disorders, and depression.",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>SDG 4 – Quality Education (Target 4.7):</b> Target 4.7 emphasizes education for sustainable development, global citizenship, and human well-being. A mind-body integrative module equips future engineers and professionals with essential self-regulation skills, emotional resilience, and values that standardized examinations alone cannot cultivate.",
        bullet_style
    ))
    story.append(Paragraph(
        "• &nbsp;<b>SDG 12 – Responsible Consumption and Production (Target 12.8):</b> Target 12.8 calls for lifestyle harmony with nature. Classical Indian concepts of <i>Mitahara</i> (dietary moderation) and <i>Aparigraha</i> (non-possessiveness) reduce fast-food overconsumption, minimize pharmaceutical over-reliance, and promote conscious environmental living.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>Expected Impact Across Domains:</b> Ethically, students demonstrate greater integrity, emotional honesty, and accountability. Socially, campus cohesion improves with decreased peer hostility, reduced cyberbullying, and more compassionate peer collaboration. Psychologically, participants experience measurable declines in chronic anxiety, panic, and sleep disturbances, accompanied by enhanced parasympathetic tone and emotional stability. Educationally, students achieve deeper cognitive focus, improved memory consolidation (<i>Smriti</i>), and resilience during rigorous examination and placement cycles. Environmentally, the promotion of seasonal, plant-rich nutrition (<i>Sattvic Ahara</i>) and mindful moderation minimizes unnecessary pharmaceutical dependencies and carbon-heavy consumption.",
        body_style
    ))

    # --- Section 5: Individual Reflection ---
    story.append(Paragraph("5. Individual Reflection", heading1_style))
    story.append(Paragraph(
        "<i>“Investigating the mind-body connection in Indian philosophical thought profoundly transformed my perspective on engineering productivity and health. Prior to this study, I treated fatigue and academic stress as mere obstacles to be overridden with excess caffeine and prolonged screen hours. Learning about the Adhi-Vyadhi model revealed that mental agitation inevitably degrades physical vitality via the Pranamaya sheath. In my daily routine and future professional career, I have started incorporating conscious 'Prana-pauses' and adopting the Gita's principle of Mitahara. I now view physical fitness, mental composure, and ethical work not as disconnected obligations, but as mutually reinforcing elements of sustainable success.”</i><br/>— <b>Bhagat Mukhiya (Roll No. 33)</b>",
        body_style
    ))
    story.append(Paragraph(
        "<i>“Exploring the Pancha Kosha and Triguna frameworks provided me with a practical, scientific diagnostic tool for self-mastery. I realized that the restlessness and burnout I often experienced during intense study intervals were direct manifestations of an overactive Rajasic state, followed by Tamasic lethargy. Recognizing that the mind directly shapes neuro-muscular and metabolic equilibrium has motivated me to practice rhythmic Pranayama and maintain disciplined sleep hygiene. For my future endeavors as an engineer, this case study demonstrated that true technical competence must be anchored in inner serenity (Sthitaprajna) and holistic well-being.”</i><br/>— <b>Om Nathwani (Roll No. 34)</b>",
        body_style
    ))

    # --- Section 6: References ---
    story.append(Paragraph("6. References", heading1_style))
    references = [
        "1. Taittiriya Upanishad (with Commentary of Shankaracharya). English translation by Swami Gambhirananda. Advaita Ashrama, Kolkata.",
        "2. Patanjali. (c. 400 CE). The Yoga Sutras of Patanjali: Translation and Commentary by Swami Vivekananda (Raja Yoga). Advaita Ashrama.",
        "3. Charaka Samhita. English Translation with Critical Notes by P. V. Sharma (Sutrasthana &amp; Sharirasthana). Chaukhambha Orientalia, Varanasi.",
        "4. Sushruta Samhita. English Translation by K. R. Srikantha Murthy (Sutrasthana 15.48). Chaukhambha Orientalia, Varanasi.",
        "5. Valmiki (attributed). Yoga Vasistha (Nirvana Prakarana, Adhi-Vyadhi Nirupanam). English translation by Swami Venkatesananda. SUNY Press.",
        "6. The Bhagavad Gita (Chapters 2 &amp; 6). Translated by Eknath Easwaran. Nilgiri Press, 2007.",
        "7. Engel, G. L. (1977). The need for a new medical model: A challenge for biomedicine. <i>Science</i>, 196(4286), 129–136.",
        "8. Kabat-Zinn, J. (2003). Mindfulness-based interventions in context: Past, present, and future. <i>Clinical Psychology: Science and Practice</i>, 10(2), 144–156.",
        "9. Ministry of Education, Government of India. (2020). National Education Policy 2020 (NEP 2020). New Delhi.",
        "10. United Nations. (2015). Transforming Our World: The 2030 Agenda for Sustainable Development (SDGs 3, 4, and 12)."
    ]
    for r in references:
        story.append(Paragraph(r, ref_style))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {pdf_filename}")

    # Re-render PNG images of pages
    doc_fitz = pymupdf.open(pdf_filename)
    print(f"Generated {len(doc_fitz)} pages in PDF.")
    for i, page in enumerate(doc_fitz):
        pix = page.get_pixmap(dpi=150)
        pix.save(f"page_{i+1}.png")

if __name__ == "__main__":
    build_pdf()
