import os
import sys
import copy
from typing import List, Dict, Any, Optional
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# IARE Brand Palette
COLOR_IARE_NAVY = RGBColor(0, 65, 112)       # #004170 (Primary deep navy)
COLOR_IARE_BLUE = RGBColor(0, 80, 148)       # #005094 (Institution royal blue)
COLOR_IARE_PURPLE = RGBColor(58, 25, 91)     # #3A195B (Master gradient purple)
COLOR_IARE_RED = RGBColor(220, 38, 38)       # #DC2626 (Topic accent red / #FF0000)
COLOR_BLACK = RGBColor(0, 0, 0)
COLOR_CHARCOAL = RGBColor(30, 41, 59)        # #1E293B
COLOR_DARK_TEXT = RGBColor(15, 23, 42)       # #0F172A
COLOR_MUTED = RGBColor(100, 116, 139)        # #64748B
COLOR_LIGHT_BG = RGBColor(248, 250, 252)     # #F8FAFC
COLOR_BORDER = RGBColor(203, 213, 225)       # #CBD5E1
COLOR_WHITE = RGBColor(255, 255, 255)
COLOR_TEAL = RGBColor(13, 148, 136)          # #0D9488
COLOR_AMBER = RGBColor(217, 119, 6)          # #D97706
COLOR_ROW_ALT = RGBColor(241, 245, 249)      # #F1F5F9

FONT_TITLE = "Times New Roman"
FONT_BODY = "Times New Roman"
FONT_UI = "Arial"

def get_base_presentation():
    ref_path = os.path.join(os.path.dirname(__file__), "..", "referencefiles", "IARE LECTURE PPT FORMAT50.pptx")
    if not os.path.exists(ref_path):
        ref_path = os.path.join(os.getcwd(), "referencefiles", "IARE LECTURE PPT FORMAT50.pptx")
    if not os.path.exists(ref_path):
        raise FileNotFoundError(f"Reference template not found at {ref_path}")
        
    prs = Presentation(ref_path)
    # Clean all slides keeping masters and layouts intact
    while len(prs.slides._sldIdLst) > 0:
        sldId = prs.slides._sldIdLst[0]
        rId = sldId.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        prs.part.drop_rel(rId)
        prs.slides._sldIdLst.remove(sldId)
        
    return prs

def add_slide_header(slide, title_text: str):
    """Adds the standard content slide title matching IARE reference format"""
    tb = slide.shapes.add_textbox(Inches(0.50), Inches(0.25), Inches(8.50), Inches(0.85))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_bottom = Inches(0)
    
    p = tf.paragraphs[0]
    p.text = title_text
    p.font.name = FONT_TITLE
    p.font.size = Pt(24)
    p.font.bold = True
    p.font.color.rgb = COLOR_BLACK

def add_speaker_notes(slide, notes_text: str):
    if notes_text:
        try:
            notes_slide = slide.notes_slide
            tf = notes_slide.notes_text_frame
            tf.text = notes_text
        except Exception:
            pass

def set_slide_number(slide, slide_num: int):
    """Sets the slide number on the slide number placeholder if present"""
    for shape in slide.shapes:
        if shape.is_placeholder and shape.placeholder_format.type == 13: # SLIDE_NUMBER
            shape.text_frame.text = str(slide_num)
            for p in shape.text_frame.paragraphs:
                p.font.name = FONT_UI
                p.font.size = Pt(10)
                p.font.color.rgb = COLOR_WHITE
            return

def cleanup_unused_placeholders(slide):
    """
    Removes any unpopulated or empty placeholder shapes inherited from the slide layout.
    This guarantees that PowerPoint never renders default prompt texts like
    'Click to edit Master text styles', 'Subhead Arial 24 pt', etc.
    """
    for shape in list(slide.shapes):
        if shape.is_placeholder:
            if shape.has_text_frame and not shape.text_frame.text.strip():
                try:
                    sp = shape._element
                    sp.getparent().remove(sp)
                except Exception:
                    pass

def create_title_slide(prs, meta: Dict[str, Any]):
    """Creates the official IARE Title Slide (Slide 1)"""
    layout0 = prs.slide_layouts[0] # Title Slide layout
    slide = prs.slides.add_slide(layout0)
    
    course_name = meta.get("course_name", "CLOUD APPLICATION DEVELOPMENT").upper()
    topic_title = meta.get("topic", "Reduce Risk And Confidently Accelerate Your Business In The Cloud")
    faculty_name = meta.get("faculty_name", "KS R Sagar")
    faculty_id = meta.get("faculty_id", "IARE11024")
    department = meta.get("department", "IT")
    lecture_no = meta.get("lecture_number", "56")
    
    # Placeholder 0: Title 1 (Course Name)
    ph_course = None
    ph_topic = None
    ph_faculty = None
    
    for shape in slide.shapes:
        if shape.is_placeholder:
            idx = shape.placeholder_format.idx
            if idx == 0:
                ph_course = shape
            elif idx == 1:
                ph_topic = shape
            elif idx == 10:
                ph_faculty = shape

    if ph_course:
        tf = ph_course.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = course_name
        p.alignment = PP_ALIGN.CENTER
        p.font.name = FONT_TITLE
        p.font.size = Pt(28 if len(course_name) > 30 else 32)
        p.font.bold = True
        p.font.color.rgb = COLOR_BLACK

    if ph_topic:
        tf = ph_topic.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = ""
        p.alignment = PP_ALIGN.CENTER
        
        r1 = p.add_run()
        r1.text = "Topic Title – "
        r1.font.name = FONT_TITLE
        r1.font.size = Pt(22)
        r1.font.bold = False
        r1.font.color.rgb = COLOR_BLACK
        
        r2 = p.add_run()
        r2.text = topic_title
        r2.font.name = FONT_TITLE
        r2.font.size = Pt(22)
        r2.font.bold = True
        r2.font.color.rgb = COLOR_IARE_RED

    if ph_faculty:
        tf = ph_faculty.text_frame
        tf.word_wrap = True
        tf.clear()
        
        items = [
            ("Presenter’s Name", faculty_name),
            ("Presenter’s ID", faculty_id),
            ("Department Name", department),
            ("Lecture Number", str(lecture_no))
        ]
        
        for i, (label, val) in enumerate(items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = PP_ALIGN.LEFT
            r_lbl = p.add_run()
            r_lbl.text = f"{label:<18} –  "
            r_lbl.font.name = FONT_TITLE
            r_lbl.font.size = Pt(15)
            r_lbl.font.bold = True
            r_lbl.font.color.rgb = COLOR_CHARCOAL
            
            r_val = p.add_run()
            r_val.text = val
            r_val.font.name = FONT_TITLE
            r_val.font.size = Pt(15)
            r_val.font.bold = False
            r_val.font.color.rgb = COLOR_CHARCOAL
            p.space_after = Pt(4)
            
    set_slide_number(slide, 1)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, f"Good morning students. Welcome to {course_name}. Today's lecture is on '{topic_title}', presented by {faculty_name}, Department of {department}.")
    return slide

def create_bullets_slide(prs, slide_data: Dict[str, Any], slide_num: int):
    """Layout Type A: Detailed Key Concepts & Paragraphs"""
    layout_content = prs.slide_layouts[11] # DEFAULT layout (matches reference slides 2-21, 0 ghost placeholders)
    slide = prs.slides.add_slide(layout_content)
    
    title = slide_data.get("title", "Lecture Topic Overview")
    add_slide_header(slide, title)
    
    bullets = slide_data.get("points", [])
    
    # Body text box
    tb = slide.shapes.add_textbox(Inches(0.50), Inches(1.20), Inches(9.00), Inches(3.80))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0)
    tf.margin_top = Inches(0)
    tf.margin_right = Inches(0)
    tf.margin_bottom = Inches(0)
    
    for i, point in enumerate(bullets):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.space_after = Pt(14)
        p.line_spacing = 1.2
        
        if ":" in point:
            lead, rest = point.split(":", 1)
            clean_lead = lead.strip().rstrip(".,;:–—- \t")
            clean_rest = rest.strip().lstrip(".,;:–—- \t")
            if clean_rest:
                clean_rest = clean_rest[0].upper() + clean_rest[1:]
                
            r1 = p.add_run()
            r1.text = f"•  {clean_lead}: "
            r1.font.name = FONT_TITLE
            r1.font.size = Pt(19)
            r1.font.bold = True
            r1.font.color.rgb = COLOR_IARE_NAVY
            
            r2 = p.add_run()
            r2.text = clean_rest
            r2.font.name = FONT_TITLE
            r2.font.size = Pt(19)
            r2.font.bold = False
            r2.font.color.rgb = COLOR_DARK_TEXT
        else:
            r = p.add_run()
            r.text = f"•  {point.strip().lstrip('•- \t')}"
            r.font.name = FONT_TITLE
            r.font.size = Pt(19)
            r.font.bold = False
            r.font.color.rgb = COLOR_DARK_TEXT

    set_slide_number(slide, slide_num)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, slide_data.get("notes", f"Discuss the core concepts of {title} with emphasis on real-world engineering trade-offs."))
    return slide

def create_flowchart_slide(prs, slide_data: Dict[str, Any], slide_num: int):
    """Layout Type B: Native PowerPoint Flowchart & Process Pipeline"""
    layout_content = prs.slide_layouts[11] # DEFAULT layout
    slide = prs.slides.add_slide(layout_content)
    
    title = slide_data.get("title", "Execution Flowchart & Pipeline")
    add_slide_header(slide, title)
    
    steps = slide_data.get("steps", [
        ("Phase 1: Ingestion", "Extract & validate input schema"),
        ("Phase 2: Validation", "Enforce boundary checks & invariants"),
        ("Phase 3: Execution", "Process logic across distributed worker pool"),
        ("Phase 4: Telemetry", "Monitor logs, metrics & compliance SLA")
    ])
    
    n_steps = len(steps)
    step_width = Inches(1.85 if n_steps >= 4 else 2.50)
    step_height = Inches(2.20)
    top_pos = Inches(1.50)
    start_left = Inches(0.50)
    gap = Inches(0.40 if n_steps >= 4 else 0.60)
    arrow_width = Inches(0.28)
    
    for idx, (stitle, sdesc) in enumerate(steps):
        left_pos = start_left + idx * (step_width + gap)
        
        # Step container card
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos, top_pos, step_width, step_height)
        card.fill.solid()
        card.fill.fore_color.rgb = COLOR_LIGHT_BG
        card.line.color.rgb = COLOR_IARE_BLUE
        card.line.width = Pt(1.5)
        
        # Top phase badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left_pos + Inches(0.15), top_pos + Inches(0.15), step_width - Inches(0.30), Inches(0.38))
        badge.fill.solid()
        badge.fill.fore_color.rgb = COLOR_IARE_NAVY if idx % 2 == 0 else COLOR_IARE_BLUE
        badge.line.fill.background()
        p_b = badge.text_frame.paragraphs[0]
        p_b.text = f"STEP {idx+1}"
        p_b.alignment = PP_ALIGN.CENTER
        p_b.font.name = FONT_UI
        p_b.font.size = Pt(11)
        p_b.font.bold = True
        p_b.font.color.rgb = COLOR_WHITE
        
        # Step title and desc
        tb = slide.shapes.add_textbox(left_pos + Inches(0.12), top_pos + Inches(0.60), step_width - Inches(0.24), Inches(1.50))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = Inches(0)
        
        p_h = tf.paragraphs[0]
        p_h.text = stitle
        p_h.font.name = FONT_TITLE
        p_h.font.size = Pt(13)
        p_h.font.bold = True
        p_h.font.color.rgb = COLOR_DARK_TEXT
        p_h.space_after = Pt(6)
        
        p_d = tf.add_paragraph()
        p_d.text = sdesc
        p_d.font.name = FONT_BODY
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = COLOR_MUTED
        
        # Right arrow between cards
        if idx < n_steps - 1:
            arrow_left = left_pos + step_width + Inches(0.06)
            arrow_top = top_pos + Inches(0.95)
            arrow = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, arrow_left, arrow_top, arrow_width, Inches(0.30))
            arrow.fill.solid()
            arrow.fill.fore_color.rgb = COLOR_IARE_RED
            arrow.line.fill.background()

    # Bottom takeaway card
    summary_text = slide_data.get("summary", "Sequential execution guarantees atomic transition states, fault recovery checkpoints, and deterministic latency bounds.")
    bottom_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.50), Inches(3.95), Inches(9.00), Inches(0.90))
    bottom_box.fill.solid()
    bottom_box.fill.fore_color.rgb = COLOR_LIGHT_BG
    bottom_box.line.color.rgb = COLOR_BORDER
    
    tb_bot = slide.shapes.add_textbox(Inches(0.70), Inches(4.02), Inches(8.60), Inches(0.75))
    tf_bot = tb_bot.text_frame
    tf_bot.word_wrap = True
    p_bi = tf_bot.paragraphs[0]
    r_bh = p_bi.add_run()
    r_bh.text = "Pipeline Invariant: "
    r_bh.font.name = FONT_TITLE
    r_bh.font.size = Pt(13)
    r_bh.font.bold = True
    r_bh.font.color.rgb = COLOR_IARE_NAVY
    
    r_bt = p_bi.add_run()
    r_bt.text = summary_text
    r_bt.font.name = FONT_BODY
    r_bt.font.size = Pt(12)
    r_bt.font.color.rgb = COLOR_CHARCOAL

    set_slide_number(slide, slide_num)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, slide_data.get("notes", f"Walk through the pipeline stages 1 to {n_steps} demonstrating how each phase preserves operational invariants."))
    return slide

def create_architecture_slide(prs, slide_data: Dict[str, Any], slide_num: int):
    """Layout Type C: System Architecture & Tier Diagram"""
    layout_content = prs.slide_layouts[11] # DEFAULT layout
    slide = prs.slides.add_slide(layout_content)
    
    title = slide_data.get("title", "System Architecture & Modular Layers")
    add_slide_header(slide, title)
    
    layers = slide_data.get("layers", [
        ("Tier 1: Presentation & Client Gateway", "Web Portal, Mobile Clients, REST API Gateway, WebSocket Consumers", COLOR_IARE_NAVY),
        ("Tier 2: Business Logic & Microservices", "Core Engine Services, Worker Queue, Rule Dispatcher, Validation Filter", COLOR_IARE_BLUE),
        ("Tier 3: Distributed Storage & Cache", "Primary Relational DB, Redis In-Memory Cache, Object Store & Telemetry Sink", COLOR_IARE_PURPLE)
    ])
    
    layer_height = Inches(0.95)
    gap = Inches(0.20)
    top_pos = Inches(1.30)
    
    default_colors = [COLOR_IARE_NAVY, COLOR_IARE_BLUE, COLOR_IARE_PURPLE, COLOR_TEAL]
    for idx, layer_tuple in enumerate(layers):
        tier_title = layer_tuple[0]
        tier_components = layer_tuple[1]
        tier_color = layer_tuple[2] if len(layer_tuple) > 2 and layer_tuple[2] is not None else default_colors[idx % len(default_colors)]
        curr_top = top_pos + idx * (layer_height + gap)
        
        # Tier card
        tier_card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.50), curr_top, Inches(9.00), layer_height)
        tier_card.fill.solid()
        tier_card.fill.fore_color.rgb = COLOR_LIGHT_BG
        tier_card.line.color.rgb = tier_color
        tier_card.line.width = Pt(1.5)
        
        # Left color badge strip
        strip = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.50), curr_top, Inches(0.25), layer_height)
        strip.fill.solid()
        strip.fill.fore_color.rgb = tier_color
        strip.line.fill.background()
        
        # Text container
        tb = slide.shapes.add_textbox(Inches(0.90), curr_top + Inches(0.10), Inches(8.40), layer_height - Inches(0.20))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = Inches(0)
        
        p1 = tf.paragraphs[0]
        p1.text = tier_title
        p1.font.name = FONT_TITLE
        p1.font.size = Pt(14)
        p1.font.bold = True
        p1.font.color.rgb = tier_color
        p1.space_after = Pt(3)
        
        p2 = tf.add_paragraph()
        p2.text = f"Components: {tier_components}"
        p2.font.name = FONT_BODY
        p2.font.size = Pt(12)
        p2.font.color.rgb = COLOR_CHARCOAL
        
        # Bidirectional communication arrow between tiers
        if idx < len(layers) - 1:
            arr_top = curr_top + layer_height + Inches(0.02)
            arr = slide.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(4.85), arr_top, Inches(0.30), Inches(0.16))
            arr.fill.solid()
            arr.fill.fore_color.rgb = COLOR_IARE_RED
            arr.line.fill.background()

    # Architecture footnote
    tb_fn = slide.shapes.add_textbox(Inches(0.50), Inches(4.75), Inches(9.00), Inches(0.35))
    tf_fn = tb_fn.text_frame
    p_fn = tf_fn.paragraphs[0]
    p_fn.text = "High-Availability Pattern: Layer decoupling ensures zero single-point-of-failure and independent horizontal scaling."
    p_fn.font.name = FONT_BODY
    p_fn.font.size = Pt(11)
    p_fn.font.italic = True
    p_fn.font.color.rgb = COLOR_MUTED

    set_slide_number(slide, slide_num)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, slide_data.get("notes", f"Explain the architectural tiers of {title}, pointing out security boundaries and caching strategies."))
    return slide

def create_table_slide(prs, slide_data: Dict[str, Any], slide_num: int):
    """Layout Type D: Comparative Evaluation & Benchmark Table"""
    layout_content = prs.slide_layouts[11] # DEFAULT layout
    slide = prs.slides.add_slide(layout_content)
    
    title = slide_data.get("title", "Comparative Analysis & Evaluation Metrics")
    add_slide_header(slide, title)
    
    table_matrix = slide_data.get("table_data", [
        ["Evaluation Dimension", "Traditional Model", "Modern Framework", "Institutional Target"],
        ["Throughput & Scale", "Linear bottleneck", "Horizontally distributed", "Sub-second 99th percentile"],
        ["Fault Tolerance", "Manual failover", "Automated cluster quorum", "Zero-downtime replication"],
        ["Security Compliance", "Perimeter only", "Zero-Trust & mTLS", "ISO/IEC & SOC2 compliant"],
        ["Cost Efficiency", "High idle overhead", "Dynamic autoscaling", "Optimized unit economics"]
    ])
    
    n_rows = len(table_matrix)
    n_cols = len(table_matrix[0])
    
    left = Inches(0.50)
    top = Inches(1.30)
    width = Inches(9.00)
    height = Inches(3.40)
    
    tbl_shape = slide.shapes.add_table(n_rows, n_cols, left, top, width, height)
    tbl = tbl_shape.table
    
    # Column width allocation
    col_w = int(width / n_cols)
    for c in range(n_cols):
        tbl.columns[c].width = col_w
        
    for r_idx, row in enumerate(table_matrix):
        for c_idx, val in enumerate(row):
            cell = tbl.cell(r_idx, c_idx)
            cell.text = str(val)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.margin_left = Inches(0.12)
            cell.margin_right = Inches(0.12)
            cell.margin_top = Inches(0.08)
            cell.margin_bottom = Inches(0.08)
            
            p = cell.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER if c_idx > 0 else PP_ALIGN.LEFT
            p.font.name = FONT_TITLE
            
            if r_idx == 0:
                p.font.size = Pt(12)
                p.font.bold = True
                p.font.color.rgb = COLOR_WHITE
                cell.fill.solid()
                cell.fill.fore_color.rgb = COLOR_IARE_NAVY
            else:
                p.font.size = Pt(11)
                p.font.bold = (c_idx == 0)
                p.font.color.rgb = COLOR_DARK_TEXT
                cell.fill.solid()
                cell.fill.fore_color.rgb = COLOR_WHITE if r_idx % 2 == 1 else COLOR_ROW_ALT

    # Table takeaway badge
    tb_tb = slide.shapes.add_textbox(Inches(0.50), Inches(4.75), Inches(9.00), Inches(0.35))
    tf_tb = tb_tb.text_frame
    p_tb = tf_tb.paragraphs[0]
    p_tb.text = "Takeaway: Migrating from traditional configurations to modernized architectures yields an average 3.8x throughput increase."
    p_tb.font.name = FONT_BODY
    p_tb.font.size = Pt(11)
    p_tb.font.bold = True
    p_tb.font.color.rgb = COLOR_IARE_BLUE

    set_slide_number(slide, slide_num)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, slide_data.get("notes", f"Analyze each row of the comparative table, contrasting trade-offs between standard vs optimized models."))
    return slide

def create_two_column_slide(prs, slide_data: Dict[str, Any], slide_num: int):
    """Layout Type E: Two-Column Side-by-Side Analysis"""
    layout_content = prs.slide_layouts[11] # DEFAULT layout
    slide = prs.slides.add_slide(layout_content)
    
    title = slide_data.get("title", "Core Architectural Trade-Offs")
    add_slide_header(slide, title)
    
    col1 = slide_data.get("col1", {
        "title": "Primary Paradigm & Strengths",
        "points": [
            "Deterministic State: Strict consistency guarantees across partitions.",
            "Minimal Latency: Direct memory mapping minimizes serialization overhead.",
            "Predictable Scaling: Linear resource consumption under burst traffic."
        ]
    })
    
    col2 = slide_data.get("col2", {
        "title": "Operational Constraints & Mitigations",
        "points": [
            "Resource Contention: Requires active CPU affinity and memory throttling.",
            "Partition Tolerance: Implements quorum elections during network splits.",
            "Replication Lag: Addressed through asynchronous write-ahead logging (WAL)."
        ]
    })
    
    col_w = Inches(4.35)
    col_h = Inches(3.50)
    top_pos = Inches(1.30)
    
    # Left Column
    card1 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.50), top_pos, col_w, col_h)
    card1.fill.solid()
    card1.fill.fore_color.rgb = COLOR_LIGHT_BG
    card1.line.color.rgb = COLOR_IARE_BLUE
    
    strip1 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.50), top_pos, col_w, Inches(0.10))
    strip1.fill.solid()
    strip1.fill.fore_color.rgb = COLOR_IARE_NAVY
    strip1.line.fill.background()
    
    tb1 = slide.shapes.add_textbox(Inches(0.70), top_pos + Inches(0.25), col_w - Inches(0.40), col_h - Inches(0.40))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    p1 = tf1.paragraphs[0]
    p1.text = col1["title"]
    p1.font.name = FONT_TITLE
    p1.font.size = Pt(15)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_IARE_NAVY
    p1.space_after = Pt(10)
    
    for pt in col1.get("points", []):
        p = tf1.add_paragraph()
        if ":" in pt:
            lead, rest = pt.split(":", 1)
            clean_lead = lead.strip().rstrip(".,;:–—- \t")
            clean_rest = rest.strip().lstrip(".,;:–—- \t")
            if clean_rest:
                clean_rest = clean_rest[0].upper() + clean_rest[1:]
            r1 = p.add_run()
            r1.text = f"•  {clean_lead}: "
            r1.font.name = FONT_TITLE
            r1.font.size = Pt(12)
            r1.font.bold = True
            r1.font.color.rgb = COLOR_IARE_NAVY
            r2 = p.add_run()
            r2.text = clean_rest
            r2.font.name = FONT_BODY
            r2.font.size = Pt(12)
            r2.font.color.rgb = COLOR_DARK_TEXT
        else:
            p.text = f"•  {pt.strip().lstrip('•- \t')}"
            p.font.name = FONT_BODY
            p.font.size = Pt(12)
            p.font.color.rgb = COLOR_DARK_TEXT
        p.space_after = Pt(8)
        
    # Right Column
    card2 = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(5.15), top_pos, col_w, col_h)
    card2.fill.solid()
    card2.fill.fore_color.rgb = COLOR_LIGHT_BG
    card2.line.color.rgb = COLOR_BORDER
    
    strip2 = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(5.15), top_pos, col_w, Inches(0.10))
    strip2.fill.solid()
    strip2.fill.fore_color.rgb = COLOR_IARE_RED
    strip2.line.fill.background()
    
    tb2 = slide.shapes.add_textbox(Inches(5.35), top_pos + Inches(0.25), col_w - Inches(0.40), col_h - Inches(0.40))
    tf2 = tb2.text_frame
    tf2.word_wrap = True
    p2 = tf2.paragraphs[0]
    p2.text = col2["title"]
    p2.font.name = FONT_TITLE
    p2.font.size = Pt(15)
    p2.font.bold = True
    p2.font.color.rgb = COLOR_IARE_RED
    p2.space_after = Pt(10)
    
    for pt in col2.get("points", []):
        p = tf2.add_paragraph()
        if ":" in pt:
            lead, rest = pt.split(":", 1)
            clean_lead = lead.strip().rstrip(".,;:–—- \t")
            clean_rest = rest.strip().lstrip(".,;:–—- \t")
            if clean_rest:
                clean_rest = clean_rest[0].upper() + clean_rest[1:]
            r1 = p.add_run()
            r1.text = f"•  {clean_lead}: "
            r1.font.name = FONT_TITLE
            r1.font.size = Pt(12)
            r1.font.bold = True
            r1.font.color.rgb = COLOR_IARE_RED
            r2 = p.add_run()
            r2.text = clean_rest
            r2.font.name = FONT_BODY
            r2.font.size = Pt(12)
            r2.font.color.rgb = COLOR_DARK_TEXT
        else:
            p.text = f"•  {pt.strip().lstrip('•- \t')}"
            p.font.name = FONT_BODY
            p.font.size = Pt(12)
            p.font.color.rgb = COLOR_DARK_TEXT
        p.space_after = Pt(8)

    set_slide_number(slide, slide_num)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, slide_data.get("notes", f"Contrast the two columns on {title}, clarifying when each architectural trade-off applies."))
    return slide

def create_review_slide(prs, slide_data: Dict[str, Any], slide_num: int):
    """Layout Type G: Review Questions & Viva / Assessment Checklist"""
    layout_content = prs.slide_layouts[11] # DEFAULT layout
    slide = prs.slides.add_slide(layout_content)
    
    title = slide_data.get("title", "Review Questions & Continuous Evaluation")
    add_slide_header(slide, title)
    
    questions = slide_data.get("questions", [
        ("Explain the fundamental principles governing resource isolation and state consistency.", "CO1 • Bloom's L2 Understand"),
        ("Construct an analytical model demonstrating asymptotic scaling under high concurrency workloads.", "CO2 • Bloom's L3 Apply"),
        ("Critique the failure recovery protocols used in distributed distributed topologies.", "CO3 • Bloom's L4 Analyze"),
        ("Design an automated test verification harness for continuous integration benchmarks.", "CO4 • Bloom's L6 Create")
    ])
    
    for q_idx, (q_txt, co_tag) in enumerate(questions):
        q_top = Inches(1.30 + q_idx * 0.85)
        
        # Number badge
        badge = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.50), q_top, Inches(0.40), Inches(0.40))
        badge.fill.solid()
        badge.fill.fore_color.rgb = COLOR_IARE_NAVY
        badge.line.fill.background()
        p_b = badge.text_frame.paragraphs[0]
        p_b.text = f"Q{q_idx+1}"
        p_b.alignment = PP_ALIGN.CENTER
        p_b.font.name = FONT_UI
        p_b.font.size = Pt(11)
        p_b.font.bold = True
        p_b.font.color.rgb = COLOR_WHITE
        
        # Question text
        tb = slide.shapes.add_textbox(Inches(1.05), q_top - Inches(0.05), Inches(6.80), Inches(0.75))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = Inches(0)
        p_q = tf.paragraphs[0]
        p_q.text = q_txt
        p_q.font.name = FONT_TITLE
        p_q.font.size = Pt(13)
        p_q.font.bold = True
        p_q.font.color.rgb = COLOR_DARK_TEXT
        
        # CO Tag
        tb_tag = slide.shapes.add_textbox(Inches(7.95), q_top - Inches(0.02), Inches(1.55), Inches(0.40))
        tf_tag = tb_tag.text_frame
        p_tag = tf_tag.paragraphs[0]
        p_tag.alignment = PP_ALIGN.RIGHT
        p_tag.text = co_tag
        p_tag.font.name = FONT_UI
        p_tag.font.size = Pt(10)
        p_tag.font.bold = True
        p_tag.font.color.rgb = COLOR_IARE_BLUE

    set_slide_number(slide, slide_num)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, slide_data.get("notes", "Pose these questions to evaluate student comprehension against target Bloom's cognitive taxonomy levels."))
    return slide

def create_closing_slide(prs, meta: Dict[str, Any], slide_num: int):
    """Creates the official IARE Closing 'Thank You' Slide (Layout 10)"""
    layout10 = prs.slide_layouts[10] # Closing Slide layout
    slide = prs.slides.add_slide(layout10)
    
    faculty_name = meta.get("faculty_name", "KS R Sagar")
    faculty_id = meta.get("faculty_id", "IARE11024")
    department = meta.get("department", "IT")
    course_name = meta.get("course_name", "Cloud Application Development")
    
    # Title 1 placeholder is "Thank You"
    ph_title = None
    for shape in slide.shapes:
        if shape.is_placeholder and shape.placeholder_format.idx == 0:
            ph_title = shape
            break
            
    if ph_title:
        tf = ph_title.text_frame
        p = tf.paragraphs[0]
        p.text = "Thank You"
        p.alignment = PP_ALIGN.CENTER
        p.font.name = FONT_UI
        p.font.size = Pt(36)
        p.font.bold = True
        p.font.color.rgb = COLOR_IARE_PURPLE
        
    # Faculty Contact & Institution Card below
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.00), Inches(3.40), Inches(6.00), Inches(1.50))
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_LIGHT_BG
    card.line.color.rgb = COLOR_BORDER
    
    tb = slide.shapes.add_textbox(Inches(2.20), Inches(3.50), Inches(5.60), Inches(1.30))
    tf = tb.text_frame
    tf.word_wrap = True
    
    p1 = tf.paragraphs[0]
    p1.alignment = PP_ALIGN.CENTER
    p1.text = faculty_name
    p1.font.name = FONT_TITLE
    p1.font.size = Pt(17)
    p1.font.bold = True
    p1.font.color.rgb = COLOR_CHARCOAL
    
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    p2.text = f"Presenter ID: {faculty_id}  •  Department of {department}"
    p2.font.name = FONT_BODY
    p2.font.size = Pt(12)
    p2.font.color.rgb = COLOR_IARE_BLUE
    p2.space_before = Pt(3)
    
    p3 = tf.add_paragraph()
    p3.alignment = PP_ALIGN.CENTER
    p3.text = "INSTITUTE OF AERONAUTICAL ENGINEERING (Autonomous)"
    p3.font.name = FONT_UI
    p3.font.size = Pt(11)
    p3.font.bold = True
    p3.font.color.rgb = COLOR_CHARCOAL
    p3.space_before = Pt(4)
    
    p4 = tf.add_paragraph()
    p4.alignment = PP_ALIGN.CENTER
    p4.text = "Dundigal, Hyderabad - 500043, Telangana, India  |  www.iare.ac.in"
    p4.font.name = FONT_UI
    p4.font.size = Pt(10)
    p4.font.color.rgb = COLOR_MUTED
    
    set_slide_number(slide, slide_num)
    cleanup_unused_placeholders(slide)
    add_speaker_notes(slide, f"Conclude lecture on {course_name}. Invite questions from students, assign reading exercises, and provide contact details.")
    return slide

print("Slide builder primitives defined.")
