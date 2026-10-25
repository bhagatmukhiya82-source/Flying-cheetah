import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_case_study_docx():
    doc = Document()
    
    # Set page margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.6)
        section.bottom_margin = Inches(0.6)
        section.left_margin = Inches(0.7)
        section.right_margin = Inches(0.7)
        
        # Add footer with page numbering
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("Page ")
        f_run.font.name = "Calibri"
        f_run.font.size = Pt(9)
        f_run.font.color.rgb = RGBColor(120, 120, 120)
        # Add page field
        f_p_xml = f_p._p
        fldSimple = OxmlElement('w:fldSimple')
        fldSimple.set(qn('w:instr'), 'PAGE')
        f_p_xml.append(fldSimple)

    # 1. Insert SAKEC Blue Banner at the top
    banner_path = "sakec_blue_banner.png"
    if os.path.exists(banner_path):
        p_banner = doc.add_paragraph()
        p_banner.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_banner.paragraph_format.space_before = Pt(0)
        p_banner.paragraph_format.space_after = Pt(12)
        run_banner = p_banner.add_run()
        run_banner.add_picture(banner_path, width=Inches(7.1))

    # 2. Main Title & Subtitle
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(4)
    p_title.paragraph_format.space_after = Pt(2)
    run_title = p_title.add_run("INDIAN PHILOSOPHICAL SYSTEMS – CASE STUDY REPORT")
    run_title.bold = True
    run_title.font.name = "Arial"
    run_title.font.size = Pt(13.5)
    run_title.font.color.rgb = RGBColor(10, 42, 77) # SAKEC Blue

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_before = Pt(0)
    p_sub.paragraph_format.space_after = Pt(10)
    run_sub = p_sub.add_run("Course Code: ECCOR2IK201.1 | Module 4: Contemporary Applications and Synthesis")
    run_sub.bold = True
    run_sub.font.name = "Arial"
    run_sub.font.size = Pt(10)
    run_sub.font.color.rgb = RGBColor(50, 50, 50)

    # 3. Metadata Block
    meta_data = [
        ("Roll No.:", " 33, 34"),
        ("Case Study Title:", " Mind-Body Connection in Indian Philosophy: Implications for Holistic Health"),
        ("Group Members:", " 1. Bhagat Mukhiya (Roll No. 33)    2. Om Nathwani (Roll No. 34)"),
        ("Selected Indian Philosophical Concept/School:", " Samkhya-Yoga, Ayurveda & Upanishadic Systems – Pancha Kosha, Adhi-Vyadhi, Triguna-Tridosha, and Ashtanga Yoga"),
        ("Relevant SDG(s):", " SDG 3 (Good Health and Well-being), SDG 4 (Quality Education), SDG 12 (Responsible Consumption and Production)")
    ]

    for label, val in meta_data:
        p_m = doc.add_paragraph()
        p_m.paragraph_format.space_before = Pt(1)
        p_m.paragraph_format.space_after = Pt(2)
        p_m.paragraph_format.line_spacing = 1.15
        
        r_lbl = p_m.add_run(label)
        r_lbl.bold = True
        r_lbl.font.name = "Calibri"
        r_lbl.font.size = Pt(10.5)
        r_lbl.font.color.rgb = RGBColor(20, 20, 20)
        
        r_val = p_m.add_run(val)
        r_val.font.name = "Calibri"
        r_val.font.size = Pt(10.5)
        r_val.font.color.rgb = RGBColor(40, 40, 40)

    # Space before Section 1
    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_before = Pt(4)
    p_div.paragraph_format.space_after = Pt(4)

    # Helper function for section headings
    def add_section_heading(title_text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title_text)
        r.bold = True
        r.font.name = "Arial"
        r.font.size = Pt(11.5)
        r.font.color.rgb = RGBColor(10, 42, 77)
        return p

    def add_subheading(title_text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.keep_with_next = True
        r = p.add_run(title_text)
        r.bold = True
        r.font.name = "Arial"
        r.font.size = Pt(10.5)
        r.font.color.rgb = RGBColor(30, 30, 30)
        return p

    def add_body_p(text, bold_prefix=None, space_after=5):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_b = p.add_run(bold_prefix)
            r_b.bold = True
            r_b.font.name = "Calibri"
            r_b.font.size = Pt(10.5)
        r_t = p.add_run(text)
        r_t.font.name = "Calibri"
        r_t.font.size = Pt(10.5)
        r_t.font.color.rgb = RGBColor(30, 30, 30)
        return p

    def add_bullet_p(bold_prefix, text, space_after=4):
        p = doc.add_paragraph(style='List Bullet')
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.line_spacing = 1.15
        r_b = p.add_run(bold_prefix)
        r_b.bold = True
        r_b.font.name = "Calibri"
        r_b.font.size = Pt(10)
        r_t = p.add_run(text)
        r_t.font.name = "Calibri"
        r_t.font.size = Pt(10)
        r_t.font.color.rgb = RGBColor(35, 35, 35)
        return p

    # --- Section 1: Problem / Case Context ---
    add_section_heading("1. Problem / Case Context")
    
    add_body_p(
        "Modern healthcare, professional environments, and higher education are experiencing an unprecedented surge in psychosomatic ailments, chronic anxiety, burnout, sleep disturbances, and metabolic disorders. While biomedical science has made monumental strides in acute critical care and infectious disease control, it operates largely within a reductionist, mechanistic framework inherited from Cartesian dualism. This view separates the human mind from the physical body, treating somatic symptoms mechanically through pharmaceutical interventions while frequently neglecting the organismic, psychological, and lifestyle origins of chronic illness. In intense university environments, students face relentless academic deadlines, competitive placement drives, peer comparison on social media, sedentary desk routines, and irregular dietary patterns. The resulting dysregulation is visible in escalating rates of irritable bowel syndrome (IBS), tension-type headaches, persistent fatigue, and mood instability."
    )
    
    add_body_p(
        "This is an epistemological crisis as much as a public health challenge. Treating chronic, stress-induced physiological symptoms solely with symptom-masking drugs (e.g., antacids, anxiolytics, analgesics) without addressing cognitive distortion, emotional turbulence, and behavioral dissonance is unsustainable. India's National Education Policy 2020 (NEP 2020) explicitly emphasizes multidisciplinary holistic wellness, mental resilience, and the integration of traditional Indian Knowledge Systems (IKS) into mainstream pedagogical frameworks. The case therefore asks: Can the foundational Indian philosophical understanding of the Mind-Body Continuum—crystallized in the Upanishadic Pancha Kosha, Ayurvedic Tridosha-Triguna psychoneurobiology, and the Yoga-Vasistha's Adhi-Vyadhi paradigm—serve as an actionable, non-sectarian framework for sustainable holistic health and student well-being today?"
    )
    
    add_body_p(
        "A final-year engineering student preparing for competitive examinations and placement season undergoes intense chronic anxiety, sleep deprivation, and irregular consumption of ultra-processed food. Over several months, this psychological distress translates into severe gastrointestinal acid reflux, debilitating tension migraines, brain fog, and chronic fatigue. Standard medical consultations prescribe proton-pump inhibitors and sedatives, which mitigate acute symptoms temporarily but leave the underlying stress, sympathetic autonomic hyperarousal, and cognitive rumination unresolved. The Indian philosophical paradigm diagnoses this not as an isolated stomach or head dysfunction, but as a classic manifestation of Adhi (mental agitation) cascading through the Pranamaya (vital breath) layer to precipitate Vyadhi (somatic pathology) in the Annamaya (physical body). Restoring health requires addressing the entire mind-body continuum.",
        bold_prefix="Case scenario (The Modern Engineering Student under Psychosomatic Strain). "
    )

    # --- Section 2: Philosophical Framework and Application ---
    add_section_heading("2. Philosophical Framework and Application")
    
    add_body_p(
        "Unlike Western Cartesian dualism, which post-Renaissance thought framed as two mutually exclusive substances—the immaterial mind (res cogitans) and the material body (res extensa)—classical Indian philosophical traditions (Samkhya, Yoga, Vedanta, and Ayurveda) view the individual as a continuous, psychosomatic spectrum (Sharira-Manas-Atman samyoga). Both mind and body are evolutes of Prakriti (nature/matter), functioning in dynamic reciprocal dialogue, illuminated by Purusha/Atman (pure consciousness). Mind is subtle matter; body is gross matter. For this case study, four interconnected philosophical models provide the conceptual architecture for holistic health:"
    )

    add_bullet_p(
        "Pancha Kosha Model (Taittiriya Upanishad 2.1–2.8): ",
        "Human individuality comprises five nested, interpenetrating sheaths: Annamaya Kosha (the anatomical/physical body sustained by nutrition), Pranamaya Kosha (the bioenergetic field of respiration and vital currents), Manomaya Kosha (the mental-emotional apparatus of desires, perceptions, and automatic habits), Vijnanamaya Kosha (the intellect, self-awareness, and discriminatory wisdom/Buddhi), and Anandamaya Kosha (the innermost sheath of intrinsic bliss and experiential harmony). Chronic disturbance in the Manomaya and Vijnanamaya sheaths inevitably distorts the bioenergetic flow in Pranamaya, ultimately crystallizing as physical pathology in Annamaya. True health requires harmonic coherence across all five layers."
    )

    add_bullet_p(
        "Adhi and Vyadhi Framework (Yoga Vasistha 6.1.81–92 & Charaka Samhita): ",
        "The Yoga Vasistha provides the world's earliest systematic formulation of psychosomatic medicine. It classifies illnesses into Adhija Vyadhi (psychosomatic diseases originating in the mind) and Anadhija Vyadhi (non-psychosomatic/external diseases such as trauma or infections). Adhi represents primary mental agitations born of uncontrolled cravings, unmanaged stressors, and ignorance (Avidya). When Adhi remains unpacified, it violently destabilizes the Nadis (energy channels) and disrupts the Prana flow. Agitated Prana impairs Agni (digestive and metabolic fire), causing improper digestion and the formation of Ama (endogenous toxins), which settles in weak tissues to manifest as somatic disease (Vyadhi)."
    )

    add_bullet_p(
        "Triguna and Tridosha Dynamic (Samkhya & Ayurveda): ",
        "Samkhya metaphysics identifies three primal qualities of nature: Sattva (clarity, poise, luminosity), Rajas (kinetic passion, agitation, restlessness), and Tamas (inertia, heaviness, dullness). In Ayurveda (Charaka Samhita Sutrasthana 1.56–57), these mental Gunas directly govern the biological humors (Tridosha: Vata—neuro-motor function, Pitta—metabolism and thermoregulation, and Kapha—structural stability and immunity). Chronic Rajasic anxiety vitiates Vata and Pitta, producing hypertension, ulcers, and insomnia, while Tamasic lethargy creates Kapha congestion and metabolic depression. Cultivating a Sattvic mental state is thus the prerequisite for physiological homeostasis."
    )

    add_bullet_p(
        "Ashtanga Yoga as Autonomic and Cortical Regulation (Patanjali Yoga Sutras): ",
        "Patanjali defines yoga as Chitta-Vritti-Nirodha (the steadying of mental modifications, YS 1.2). The eight limbs form a complete psychosomatic methodology: Yama and Niyama establish ethical harmony and emotional tranquility; Asana builds neuromuscular poise and eliminates bodily restlessness (Sthira-sukham asanam, YS 2.46); Pranayama restores autonomic nervous system balance by downregulating the sympathetic fight-or-flight response and boosting vagal tone; while Pratyahara, Dharana, and Dhyana quiet the brain's default mode network (DMN), fostering sustained cognitive coherence and emotional resilience."
    )

    add_body_p(
        "Two further teachings complete this framework. First, the Bhagavad Gita (6.16–17) teaches Yuktahara-Vihara—the discipline of moderation in eating, recreation, sleep, and activity: 'Yoga is not for one who eats too much or too little, nor for one who sleeps too much or stays awake; for one disciplined in diet, rest, and action, Yoga destroys all sorrow (duhkha).' Second, Sushruta Samhita (Sutrasthana 15.48) establishes the definitive Indian definition of health (Svastha): 'One whose Doshas (humors) are balanced, Agni (digestion) is balanced, Dhatus (tissues) and Malas (excretions) function harmoniously, and whose Atman (soul), Indriyas (senses), and Manas (mind) abide in serene cheerfulness (Prasanna), is truly established in health.' Together, these teachings prove that physical health without mental serenity is incomplete."
    )

    # --- Section 3: Analysis and Proposed Response ---
    add_section_heading("3. Analysis and Proposed Response")
    add_subheading("A. Analysis. The table links each Indian philosophical concept to the health dimension it cultivates, the contemporary pathology it addresses, and its practical campus/daily application:")

    # Table creation
    table = doc.add_table(rows=1, cols=4)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(1.5), Inches(1.8), Inches(1.8), Inches(2.0)]
    
    headers = [
        "Philosophical Concept",
        "Holistic Health Dimension",
        "Contemporary Problem",
        "Practical Campus Application"
    ]
    
    # Style header row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "0A2A4D") # Dark Blue
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(title)
        r.bold = True
        r.font.name = "Arial"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)

    table_data = [
        (
            "Pancha Kosha Model\n(Taittiriya Upanishad)",
            "Integrated multi-sheath alignment; vital-mental-physical balance",
            "Chronic burnout, mental fatigue, dissociation from bodily warning signals",
            "Establish daily 'Kosha check-ins' (5 min breath awareness, physical posture scan, emotional self-audit)"
        ),
        (
            "Adhi-Vyadhi Formulation\n(Yoga Vasistha 6.1)",
            "Root-cause psychosomatic regulation; down-regulating stress before somaticization",
            "Stress-induced IBS, tension headaches, stress-related hypertension",
            "Stress-mapping workshops; identifying psychological triggers (Adhi) to prevent somatic flare-ups (Vyadhi)"
        ),
        (
            "Triguna & Tridosha\n(Samkhya / Ayurveda)",
            "Psychoneuroendocrine balance; shifting from Rajas/Tamas to Sattva",
            "Restless anxiety, depressive inertia, erratic study cycles, cognitive fog",
            "Dietary awareness (Sattvic Ahara in canteens); regulating circadian study/sleep intervals; reducing digital stimulation"
        ),
        (
            "Ashtanga Yoga & Pranayama\n(Patanjali Yoga Sutras)",
            "Autonomic regulation, vagal nerve stimulation, neuromuscular calm",
            "Panic attacks, exam anxiety, poor concentration, sleep deprivation",
            "10-minute pre-lecture breathing drills (Nadi Shodhana, Bhramari); structured Asana breaks to release spine tension"
        ),
        (
            "Yuktahara-Vihara &\nMitahara (Gita 6.16–17)",
            "Circadian equilibrium, mindful moderate consumption (Ahara, Nidra)",
            "Ultra-processed food addiction, late-night bingeing, circadian rhythm disruption",
            "Hostel/canteen 'Mitahara Charter' promoting wholesome balanced meals; peer digital curfew at 11:30 PM for restorative sleep"
        )
    ]

    for row_idx, row_values in enumerate(table_data):
        row = table.add_row()
        bg_hex = "F4F7FA" if row_idx % 2 == 1 else "FFFFFF"
        for i, val in enumerate(row_values):
            cell = row.cells[i]
            cell.width = col_widths[i]
            set_cell_background(cell, bg_hex)
            set_cell_margins(cell, top=100, bottom=100, left=130, right=130)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            r = p.add_run(val)
            r.font.name = "Calibri"
            r.font.size = Pt(9)
            if i == 0:
                r.bold = True
                r.font.color.rgb = RGBColor(10, 42, 77)
            else:
                r.font.color.rgb = RGBColor(40, 40, 40)

    # Subheading B
    add_subheading("B. Proposed response: The 'Swasthya-Manas' Campus Integrative Health Initiative")
    add_body_p(
        "The proposed response is a secular, evidence-based campus wellness module designed to embed the Indian philosophical mind-body continuum into the academic environment without requiring new physical infrastructure. It consists of five practical pillars:"
    )

    add_bullet_p(
        "Psychosomatic Awareness & Adhi-Mapping: ",
        "Orientation sessions during induction and mid-term exam periods teaching students to recognize the early cognitive signals of Adhi (worry, racing thoughts, irritation) before they trigger physiological Vyadhi (acid reflux, tension, insomnia)."
    )
    add_bullet_p(
        "Institutional 'Prana-Pause' (10 Minutes Daily): ",
        "A scheduled 10-minute pause prior to afternoon lab/lecture sessions featuring synchronized, non-sectarian breathing routines (Nadi Shodhana for autonomic balance, Bhramari for immediate cortical de-excitation) and postural realignments."
    )
    add_bullet_p(
        "Mitahara & Dinacharya Nutrition Charter: ",
        "Collaboration with campus cafeterias to ensure fresh, warm, wholesome, seasonal (Sattvic) food options; encouraging mindful eating (silence for first 5 minutes of lunch) and hydration rather than relying on excess energy drinks."
    )
    add_bullet_p(
        "Svadhyaya (Reflective Journaling) & Triguna Self-Audits: ",
        "Providing students with brief weekly self-reflection prompts to assess whether their recent activities were dominated by Sattva (clarity, steady work), Rajas (frenetic anxiety, multitasking), or Tamas (procrastination, lethargy), fostering self-corrective autonomy."
    )
    add_bullet_p(
        "Holistic Faculty-Peer Mentoring Circles: ",
        "Designating trained faculty and senior peer mentors who conduct monthly well-being check-ins focusing on sleep, emotional regulation, and lifestyle balance alongside academic progress."
    )

    add_body_p(
        "Feasibility and Policy Alignment: This initiative is exceptionally feasible because it utilizes existing mentoring slots, student activity hours, and campus digital communication channels. It directly satisfies the mandate of NEP 2020 (Sections 11.3 and 12.5), which calls for holistic, multi-disciplinary education, emotional well-being, and integrating Indian Knowledge Systems into institutional culture. The primary operational risks are: (1) misinterpretation as a religious ritual, and (2) reduction to superficial physical exercise. These are effectively mitigated by teaching the module strictly through secular neuroscientific and psychoneuroimmunological principles, emphasizing the philosophical depth of self-mastery and keeping all sessions entirely voluntary, inclusive, and pluralistic."
    )

    # Subheading C
    add_subheading("C. Comparison with Western Paradigms")
    add_body_p(
        "Modern Western medicine has begun shifting from Cartesian reductionism toward the Biopsychosocial Model (Engel, 1977) and the emerging field of Psychoneuroimmunology (PNI), which proves that mental states modulate neuro-endocrine-immune cascades via the hypothalamic-pituitary-adrenal (HPA) axis. Indian philosophy anticipated this paradigm millennia ago through the Adhi-Vyadhi continuum, but went further by offering a practical, subjective technology of consciousness (Yoga and Ayurveda) to intervene directly in those pathways. Furthermore, contemporary third-wave psychotherapies, particularly Cognitive Behavioral Therapy (CBT) and Mindfulness-Based Stress Reduction (MBSR, Jon Kabat-Zinn), mirror Patanjali's Sakshi Bhava (detached witness consciousness) by training individuals to observe cognitive distortions without reactive identification. However, while Western clinical models typically treat either the mind through cognitive reframing or the body through biochemistry, Indian philosophy integrates the anatomical body (Annamaya), respiratory-energetic field (Pranamaya), emotional mind (Manomaya), intellect (Vijnanamaya), and existential purpose (Dharma) into a seamless, unified prescription for human flourishing (Eudaimonia)."
    )

    # --- Section 4: SDG Relevance and Expected Impact ---
    add_section_heading("4. SDG Relevance and Expected Impact")
    
    add_bullet_p(
        "SDG 3 – Good Health and Well-being (Target 3.4): ",
        "Target 3.4 mandates reducing premature mortality from non-communicable diseases (NCDs) through prevention and treatment, and promoting mental health. The Indian mind-body paradigm targets the root drivers of lifestyle disorders—hypertension, type-2 diabetes, anxiety disorders, and depression—by preventing Adhi from somaticizing into chronic illness."
    )
    add_bullet_p(
        "SDG 4 – Quality Education (Target 4.7): ",
        "Target 4.7 emphasizes education that equips learners with knowledge and values for sustainable development and human well-being. Embedding mind-body self-regulation in technical education fosters emotional maturity, stress resilience, and self-directed focus, producing well-rounded engineers."
    )
    add_bullet_p(
        "SDG 12 – Responsible Consumption and Production (Target 12.8): ",
        "Target 12.8 calls for lifestyle harmony with nature. The principles of Mitahara (dietary moderation) and Aparigraha (non-possessiveness) cultivate conscious living, reducing fast-food dependence, over-medication, and consumption-driven stress."
    )

    add_body_p(
        "Ethically and behaviorally, students demonstrate greater self-regulation, accountability, and integrity. Socially, campus cohesion improves with decreased hostility, reduced cyberbullying, and more compassionate peer collaboration. Psychologically, participants experience measurable declines in chronic anxiety, panic, and sleep disturbances, accompanied by enhanced parasympathetic tone and emotional stability. Educationally, students achieve deeper cognitive focus, improved memory consolidation (Smriti), and resilience during rigorous examination and placement cycles. Environmentally, the promotion of seasonal, plant-rich nutrition (Sattvic Ahara) and mindful moderation minimizes unnecessary pharmaceutical dependencies and carbon-heavy consumption.",
        bold_prefix="Expected Impact Across Domains: "
    )

    # --- Section 5: Individual Reflection ---
    add_section_heading("5. Individual Reflection")
    
    add_body_p(
        "\"Investigating the mind-body connection in Indian philosophical thought profoundly transformed my perspective on engineering productivity and health. Prior to this study, I treated fatigue and academic stress as mere obstacles to be overridden with excess caffeine and prolonged screen hours. Learning about the Adhi-Vyadhi model revealed that mental agitation inevitably degrades physical vitality via the Pranamaya sheath. In my daily routine and future professional career, I have started incorporating conscious 'Prana-pauses' and adopting the Gita's principle of Mitahara. I now view physical fitness, mental composure, and ethical work not as disconnected obligations, but as mutually reinforcing elements of sustainable success.\"",
        bold_prefix="Bhagat Mukhiya (Roll No. 33): "
    )

    add_body_p(
        "\"Exploring the Pancha Kosha and Triguna frameworks provided me with a practical, scientific diagnostic tool for self-mastery. I realized that the restlessness and burnout I often experienced during intense study intervals were direct manifestations of an overactive Rajasic state, followed by Tamasic lethargy. Recognizing that the mind directly shapes neuro-muscular and metabolic equilibrium has motivated me to practice rhythmic Pranayama and maintain disciplined sleep hygiene. For my future endeavors as an engineer, this case study demonstrated that true technical competence must be anchored in inner serenity (Sthitaprajna) and holistic well-being.\"",
        bold_prefix="Om Nathwani (Roll No. 34): "
    )

    # --- Section 6: References ---
    add_section_heading("6. References")
    
    references = [
        "Taittiriya Upanishad (with Commentary of Shankaracharya). English translation by Swami Gambhirananda. Advaita Ashrama, Kolkata.",
        "Patanjali. (c. 400 CE). The Yoga Sutras of Patanjali: Translation and Commentary by Swami Vivekananda (Raja Yoga). Advaita Ashrama.",
        "Charaka Samhita. English Translation with Critical Notes by P. V. Sharma (Sutrasthana & Sharirasthana). Chaukhambha Orientalia, Varanasi.",
        "Sushruta Samhita. English Translation by K. R. Srikantha Murthy (Sutrasthana 15.48). Chaukhambha Orientalia, Varanasi.",
        "Valmiki (attributed). Yoga Vasistha (Nirvana Prakarana, Adhi-Vyadhi Nirupanam). English translation by Swami Venkatesananda. SUNY Press.",
        "The Bhagavad Gita (Chapters 2 & 6). Translated by Eknath Easwaran. Nilgiri Press, 2007.",
        "Engel, G. L. (1977). The need for a new medical model: A challenge for biomedicine. Science, 196(4286), 129–136.",
        "Kabat-Zinn, J. (2003). Mindfulness-based interventions in context: Past, present, and future. Clinical Psychology: Science and Practice, 10(2), 144–156.",
        "Ministry of Education, Government of India. (2020). National Education Policy 2020 (NEP 2020). New Delhi.",
        "United Nations. (2015). Transforming Our World: The 2030 Agenda for Sustainable Development (Sustainable Development Goals 3, 4, and 12)."
    ]

    for i, ref in enumerate(references, 1):
        p_ref = doc.add_paragraph()
        p_ref.paragraph_format.space_before = Pt(1)
        p_ref.paragraph_format.space_after = Pt(3)
        p_ref.paragraph_format.left_indent = Inches(0.25)
        p_ref.paragraph_format.first_line_indent = Inches(-0.25)
        r_num = p_ref.add_run(f"{i}.  ")
        r_num.bold = True
        r_num.font.name = "Calibri"
        r_num.font.size = Pt(9.5)
        r_num.font.color.rgb = RGBColor(20, 20, 20)
        r_txt = p_ref.add_run(ref)
        r_txt.font.name = "Calibri"
        r_txt.font.size = Pt(9.5)
        r_txt.font.color.rgb = RGBColor(40, 40, 40)

    output_path = "Mind_Body_Connection_Case_Study_Report_SAKEC.docx"
    doc.save(output_path)
    print(f"Document successfully created: {output_path}")

if __name__ == "__main__":
    create_case_study_docx()
