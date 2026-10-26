import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Orange and Greys theme colors
COLOR_ORANGE = RGBColor(234, 88, 12)       # #EA580C
COLOR_DARK_ORANGE = RGBColor(194, 65, 12)  # #C2410C
COLOR_CHARCOAL = RGBColor(15, 23, 42)      # #0F172A
COLOR_SLATE_DARK = RGBColor(30, 41, 59)    # #1E293B
COLOR_SLATE_MID = RGBColor(71, 85, 105)    # #475569
COLOR_GREY_LIGHT = RGBColor(241, 245, 249) # #F1F5F9
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_BORDER = RGBColor(203, 213, 225)     # #CBD5E1

def create_slide_header(slide, title_text, category="KSR SAGAR • ACADEMIC PRESENTATION"):
    # Header Accent bar
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.5), Inches(8.4), Inches(0.06))
    shape.fill.solid()
    shape.fill.fore_color.rgb = COLOR_ORANGE
    shape.line.fill.background()

    # Category tiny badge
    tb_cat = slide.shapes.add_textbox(Inches(0.8), Inches(0.65), Inches(8.4), Inches(0.3))
    tf_cat = tb_cat.text_frame
    tf_cat.word_wrap = True
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = category.upper()
    p_cat.font.name = "Arial"
    p_cat.font.size = Pt(9)
    p_cat.font.bold = True
    p_cat.font.color.rgb = COLOR_ORANGE

    # Slide Title
    tb = slide.shapes.add_textbox(Inches(0.8), Inches(0.95), Inches(8.4), Inches(0.8))
    tf = tb.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = title_text
    p.font.name = "Arial"
    p.font.size = Pt(22)
    p.font.bold = True
    p.font.color.rgb = COLOR_CHARCOAL

def add_speaker_notes(slide, notes_text):
    if notes_text:
        notes_slide = slide.notes_slide
        tf = notes_slide.notes_text_frame
        tf.text = notes_text

def generate_presentation(data, output_path):
    """
    data: {
       "title": "Data Structures & Algorithms in Computing",
       "faculty_name": "Dr. K. S. R. Sagar",
       "department": "Department of Computer Science and Engineering",
       "category": "Faculty Lecture", # "Academic Seminar", "Research Presentation", "Project Review"
       "density": "Balanced", # "Brief", "Balanced", "Detailed"
       "slides_count": 7,
       "speaker_notes": True,
       "custom_topics": [...]
    }
    """
    prs = Presentation()
    # 16:9 Widescreen: 13.333 x 7.5 inches
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    title = data.get("title", "Institutional Academic Lecture")
    faculty = data.get("faculty_name", "KSR Sagar Faculty")
    dept = data.get("department", "Department of Engineering")
    category = data.get("category", "Faculty Lecture")
    density = data.get("density", "Balanced")
    include_notes = data.get("speaker_notes", True)

    # ==================== SLIDE 1: TITLE SLIDE ====================
    slide1 = prs.slides.add_slide(blank_layout)
    
    # Left dark banner
    left_banner = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.5), Inches(7.5))
    left_banner.fill.solid()
    left_banner.fill.fore_color.rgb = COLOR_ORANGE
    left_banner.line.fill.background()

    # Institution branding block
    tb_inst = slide1.shapes.add_textbox(Inches(1.2), Inches(1.0), Inches(10.5), Inches(0.6))
    tf_inst = tb_inst.text_frame
    p_inst = tf_inst.paragraphs[0]
    p_inst.text = "KSR SAGAR FACULTY SUITE  |  INSTITUTIONAL PRESENTATION"
    p_inst.font.name = "Arial"
    p_inst.font.size = Pt(11)
    p_inst.font.bold = True
    p_inst.font.color.rgb = COLOR_ORANGE

    # Main Presentation Title
    tb_title = slide1.shapes.add_textbox(Inches(1.2), Inches(1.8), Inches(10.5), Inches(2.2))
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title
    p_title.font.name = "Arial"
    p_title.font.size = Pt(36)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_CHARCOAL

    p_sub = tf_title.add_paragraph()
    p_sub.text = f"{category} • Academic Year 2026-27"
    p_sub.font.name = "Arial"
    p_sub.font.size = Pt(16)
    p_sub.font.color.rgb = COLOR_SLATE_MID
    p_sub.space_before = Pt(12)

    # Faculty card
    card = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(4.5), Inches(10.5), Inches(1.6))
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_GREY_LIGHT
    card.line.color.rgb = COLOR_BORDER

    tb_fac = slide1.shapes.add_textbox(Inches(1.5), Inches(4.7), Inches(9.8), Inches(1.2))
    tf_fac = tb_fac.text_frame
    p_fac1 = tf_fac.paragraphs[0]
    p_fac1.text = faculty
    p_fac1.font.name = "Arial"
    p_fac1.font.size = Pt(18)
    p_fac1.font.bold = True
    p_fac1.font.color.rgb = COLOR_CHARCOAL

    p_fac2 = tf_fac.add_paragraph()
    p_fac2.text = f"{dept}  •  Academic Planning & Monitoring"
    p_fac2.font.name = "Arial"
    p_fac2.font.size = Pt(13)
    p_fac2.font.color.rgb = COLOR_SLATE_MID
    p_fac2.space_before = Pt(4)

    if include_notes:
        add_speaker_notes(slide1, f"Good morning everyone. Welcome to '{title}'. Presented by {faculty}, {dept}.")

    # ==================== SLIDE 2: OBJECTIVES & OUTCOMES ====================
    slide2 = prs.slides.add_slide(blank_layout)
    create_slide_header(slide2, "1. Learning Objectives & Pedagogical Outcomes", category)

    objectives = [
        ("Core Theoretical Mastery", "Establish a rigorous conceptual framework aligned with university syllabus and accreditation standards."),
        ("Analytical Problem Solving", "Deconstruct engineering scenarios into structured analytical models with demonstrable correctness."),
        ("Laboratory Implementation", "Bridge theoretical constructs with hands-on computational workflows and validation benchmarks."),
        ("Ethical & Professional Standards", "Foster best practices in academic integrity, systematic documentation, and reproducibility.")
    ]

    for idx, (head, desc) in enumerate(objectives):
        top_pos = Inches(2.0 + idx * 1.2)
        # Bullet box
        badge = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), top_pos, Inches(0.45), Inches(0.45))
        badge.fill.solid()
        badge.fill.fore_color.rgb = COLOR_ORANGE
        badge.line.fill.background()
        tf_b = badge.text_frame
        p_b = tf_b.paragraphs[0]
        p_b.text = str(idx + 1)
        p_b.alignment = PP_ALIGN.CENTER
        p_b.font.bold = True
        p_b.font.size = Pt(14)
        p_b.font.color.rgb = COLOR_WHITE

        # Text
        tb_obj = slide2.shapes.add_textbox(Inches(1.7), top_pos - Inches(0.05), Inches(10.0), Inches(1.0))
        tf_obj = tb_obj.text_frame
        tf_obj.word_wrap = True
        p_h = tf_obj.paragraphs[0]
        p_h.text = head
        p_h.font.name = "Arial"
        p_h.font.size = Pt(15)
        p_h.font.bold = True
        p_h.font.color.rgb = COLOR_CHARCOAL

        p_d = tf_obj.add_paragraph()
        p_d.text = desc
        p_d.font.name = "Arial"
        p_d.font.size = Pt(12)
        p_d.font.color.rgb = COLOR_SLATE_MID
        p_d.space_before = Pt(2)

    if include_notes:
        add_speaker_notes(slide2, "Highlight how these four outcomes directly map to Course Outcome (CO) statements and NBA graduate attributes.")

    # ==================== SLIDE 3: CONCEPTUAL FOUNDATIONS ====================
    slide3 = prs.slides.add_slide(blank_layout)
    create_slide_header(slide3, "2. Foundational Concepts & Architecture", category)

    # 3 Cards Layout
    cards_data = [
        ("Module A: Core Mechanics", "Formal principles, mathematical models, boundary conditions, and primary state representations."),
        ("Module B: Transform Pipeline", "Algorithmic pipelines, data transformations, optimization heuristics, and efficiency metrics."),
        ("Module C: Verification Suite", "Empirical benchmarking, asymptotic runtime validation, regression tests, and error thresholds.")
    ]

    for c_idx, (c_title, c_body) in enumerate(cards_data):
        left_pos = Inches(1.0 + c_idx * 3.8)
        card_box = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, Inches(2.2), Inches(3.5), Inches(4.2))
        card_box.fill.solid()
        card_box.fill.fore_color.rgb = COLOR_GREY_LIGHT
        card_box.line.color.rgb = COLOR_BORDER

        # Top orange strip
        strip = slide3.shapes.add_shape(MSO_SHAPE.RECTANGLE, left_pos, Inches(2.2), Inches(3.5), Inches(0.12))
        strip.fill.solid()
        strip.fill.fore_color.rgb = COLOR_ORANGE
        strip.line.fill.background()

        tb_c = slide3.shapes.add_textbox(left_pos + Inches(0.2), Inches(2.6), Inches(3.1), Inches(3.6))
        tf_c = tb_c.text_frame
        tf_c.word_wrap = True
        p_ct = tf_c.paragraphs[0]
        p_ct.text = c_title
        p_ct.font.name = "Arial"
        p_ct.font.size = Pt(16)
        p_ct.font.bold = True
        p_ct.font.color.rgb = COLOR_CHARCOAL

        p_cb = tf_c.add_paragraph()
        p_cb.text = c_body
        p_cb.font.name = "Arial"
        p_cb.font.size = Pt(12)
        p_cb.font.color.rgb = COLOR_SLATE_MID
        p_cb.space_before = Pt(10)

    if include_notes:
        add_speaker_notes(slide3, "Walk through each pillar systematically. Encourage students to link Module A foundations with Module B algorithms.")

    # ==================== SLIDE 4: COMPARATIVE ANALYSIS TABLE ====================
    slide4 = prs.slides.add_slide(blank_layout)
    create_slide_header(slide4, "3. Comparative Evaluation & Benchmark Metrics", category)

    # Add native PowerPoint table
    rows, cols = 5, 4
    left = Inches(1.0)
    top = Inches(2.2)
    width = Inches(11.0)
    height = Inches(4.2)
    tbl_shape = slide4.shapes.add_table(rows, cols, left, top, width, height)
    tbl = tbl_shape.table
    tbl.columns[0].width = Inches(3.0)
    tbl.columns[1].width = Inches(2.6)
    tbl.columns[2].width = Inches(2.6)
    tbl.columns[3].width = Inches(2.8)

    table_data = [
        ["Parameter / Dimension", "Baseline Approach", "Optimized Pipeline", "Target Standard"],
        ["Computational Complexity", "O(N²)", "O(N log N)", "Sub-linear / Asymptotic"],
        ["Memory Utilization", "High overhead", "Dynamic allocation", "Minimal Footprint"],
        ["Fault Tolerance", "Single-point failure", "Replicated nodes", "High Availability"],
        ["Implementation Readiness", "Experimental", "Validated in Lab", "Production Standard"]
    ]

    for r_i, row in enumerate(table_data):
        for c_i, val in enumerate(row):
            cell = tbl.cell(r_i, c_i)
            cell.text = val
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = cell.text_frame.paragraphs[0]
            p.font.name = "Arial"
            if r_i == 0:
                p.font.size = Pt(13)
                p.font.bold = True
                p.font.color.rgb = COLOR_WHITE
                cell.fill.solid()
                cell.fill.fore_color.rgb = COLOR_CHARCOAL
            else:
                p.font.size = Pt(11)
                p.font.color.rgb = COLOR_CHARCOAL
                cell.fill.solid()
                cell.fill.fore_color.rgb = COLOR_WHITE if r_i % 2 == 1 else COLOR_GREY_LIGHT

    if include_notes:
        add_speaker_notes(slide4, "Emphasize why O(N log N) scaling is mandatory for large-scale datasets in modern engineering systems.")

    # ==================== SLIDE 5: PRACTICAL LABORATORY WORKFLOW ====================
    slide5 = prs.slides.add_slide(blank_layout)
    create_slide_header(slide5, "4. Practical Laboratory Implementation & Protocols", category)

    lab_steps = [
        ("Step 1: Environment Setup", "Configure simulation runtime, dependencies, compilers, and hardware parameters."),
        ("Step 2: Execution & Test Cases", "Run automated test suites covering boundary conditions, nominal cases, and stress workloads."),
        ("Step 3: Instrumentation & Telemetry", "Record runtime logs, memory allocation graphs, latency figures, and precision metrics."),
        ("Step 4: Report Submission", "Synthesize findings in the official KSR Sagar laboratory manual format with faculty verification.")
    ]

    for s_idx, (stitle, sdesc) in enumerate(lab_steps):
        s_top = Inches(2.1 + s_idx * 1.2)
        bar = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), s_top, Inches(11.0), Inches(0.95))
        bar.fill.solid()
        bar.fill.fore_color.rgb = COLOR_GREY_LIGHT
        bar.line.color.rgb = COLOR_BORDER

        # Step indicator
        badge_s = slide5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), s_top + Inches(0.15), Inches(1.5), Inches(0.65))
        badge_s.fill.solid()
        badge_s.fill.fore_color.rgb = COLOR_ORANGE
        badge_s.line.fill.background()
        p_bs = badge_s.text_frame.paragraphs[0]
        p_bs.text = f"PHASE {s_idx+1}"
        p_bs.font.name = "Arial"
        p_bs.font.size = Pt(11)
        p_bs.font.bold = True
        p_bs.font.color.rgb = COLOR_WHITE
        p_bs.alignment = PP_ALIGN.CENTER

        tb_step = slide5.shapes.add_textbox(Inches(3.0), s_top + Inches(0.1), Inches(8.8), Inches(0.75))
        tf_step = tb_step.text_frame
        p_sh = tf_step.paragraphs[0]
        p_sh.text = stitle
        p_sh.font.name = "Arial"
        p_sh.font.size = Pt(14)
        p_sh.font.bold = True
        p_sh.font.color.rgb = COLOR_CHARCOAL

        p_sd = tf_step.add_paragraph()
        p_sd.text = sdesc
        p_sd.font.name = "Arial"
        p_sd.font.size = Pt(11)
        p_sd.font.color.rgb = COLOR_SLATE_MID

    if include_notes:
        add_speaker_notes(slide5, "Instruct students to verify each step with the lab in-charge before progressing to submission.")

    # ==================== SLIDE 6: SUMMARY & TAKEAWAYS ====================
    slide6 = prs.slides.add_slide(blank_layout)
    create_slide_header(slide6, "5. Summary, Key Takeaways & Action Items", category)

    takeaways = [
        "Theoretical principles directly translate into measurable computational advantages when structured systematically.",
        "Accreditation standards (NBA/NAAC) mandate accurate document tracking, lesson planning, and verified continuous assessment.",
        "Laboratory benchmarks must be correlated against theoretical bounds to validate student comprehension.",
        "Upcoming session: Advanced case studies, real-time lab deployment, and mid-term project evaluation."
    ]

    for t_idx, item in enumerate(takeaways):
        t_top = Inches(2.2 + t_idx * 1.1)
        # Checkmark icon box
        chk = slide6.shapes.add_shape(MSO_SHAPE.OVAL, Inches(1.0), t_top, Inches(0.4), Inches(0.4))
        chk.fill.solid()
        chk.fill.fore_color.rgb = COLOR_ORANGE
        chk.line.fill.background()
        p_c = chk.text_frame.paragraphs[0]
        p_c.text = "✓"
        p_c.font.bold = True
        p_c.font.size = Pt(14)
        p_c.font.color.rgb = COLOR_WHITE
        p_c.alignment = PP_ALIGN.CENTER

        tb_t = slide6.shapes.add_textbox(Inches(1.6), t_top - Inches(0.05), Inches(10.0), Inches(0.8))
        tf_t = tb_t.text_frame
        tf_t.word_wrap = True
        p_ti = tf_t.paragraphs[0]
        p_ti.text = item
        p_ti.font.name = "Arial"
        p_ti.font.size = Pt(13)
        p_ti.font.color.rgb = COLOR_CHARCOAL

    if include_notes:
        add_speaker_notes(slide6, "Conclude the presentation, answer questions from the floor, and collect student feedback.")

    # ==================== SLIDE 7: QUESTIONS & REFERENCES ====================
    slide7 = prs.slides.add_slide(blank_layout)
    
    # Left orange bar
    bar7 = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(0.5), Inches(7.5))
    bar7.fill.solid()
    bar7.fill.fore_color.rgb = COLOR_ORANGE
    bar7.line.fill.background()

    tb_q = slide7.shapes.add_textbox(Inches(1.5), Inches(2.0), Inches(10.0), Inches(2.0))
    tf_q = tb_q.text_frame
    p_q1 = tf_q.paragraphs[0]
    p_q1.text = "Questions & Academic Discussion"
    p_q1.font.name = "Arial"
    p_q1.font.size = Pt(36)
    p_q1.font.bold = True
    p_q1.font.color.rgb = COLOR_CHARCOAL

    p_q2 = tf_q.add_paragraph()
    p_q2.text = f"Contact: {faculty} • {dept} • KSR Sagar Institutional Portal"
    p_q2.font.name = "Arial"
    p_q2.font.size = Pt(16)
    p_q2.font.color.rgb = COLOR_ORANGE
    p_q2.space_before = Pt(14)

    # Reference box
    tb_ref = slide7.shapes.add_textbox(Inches(1.5), Inches(4.5), Inches(10.0), Inches(2.0))
    tf_ref = tb_ref.text_frame
    p_rh = tf_ref.paragraphs[0]
    p_rh.text = "Recommended Institutional References:"
    p_rh.font.name = "Arial"
    p_rh.font.size = Pt(14)
    p_rh.font.bold = True
    p_rh.font.color.rgb = COLOR_SLATE_MID

    refs = [
        "1. KSR Sagar Academic Regulations, Curriculum & Syllabi (2026-27).",
        "2. Planning, Monitoring & Continuing Studies (PMCS) Day Time Table Guidelines.",
        "3. IEEE Standard for Software Engineering and Laboratory Verification Protocols."
    ]
    for r in refs:
        pr = tf_ref.add_paragraph()
        pr.text = r
        pr.font.name = "Arial"
        pr.font.size = Pt(12)
        pr.font.color.rgb = COLOR_SLATE_MID
        pr.space_before = Pt(4)

    prs.save(output_path)
    return output_path
