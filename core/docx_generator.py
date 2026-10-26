import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
LOGO_PATH = os.path.join(TEMPLATES_DIR, "iare_logo.png")

# Exact Forensic Colors & Dimensions
COLOR_RED_TITLE = RGBColor(255, 0, 0)          # Exact #FF0000 from reference .doc
COLOR_HEADER_TEXT = RGBColor(0x20, 0x24, 0x29)    # Exact #202429 from reference .doc
COLOR_DATA_TEXT = RGBColor(0x21, 0x25, 0x29)      # Exact #212529 from reference .doc
COLOR_BORDER_HEX = "000000"                    # Exact black borders in reference tblBorders

FILL_HEADER_HEX = "FADAD6"                     # Exact light peach/rose pastel from reference
FILL_SECTION_HEX = "D9E7FC"                    # Exact light periwinkle blue from reference

# Exact Column Widths in dxa (Total = 10719 dxa = 7.444 inches)
COL_WIDTHS_DXA = [814, 1711, 2609, 1171, 2069, 1080, 1265]
TOTAL_WIDTH_DXA = sum(COL_WIDTHS_DXA)

def apply_table_exact_properties(table):
    """
    Applies exact tblPr, tblBorders, tblCellMar and tblGrid mirroring reference documents.
    """
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    tblPr = table._tbl.tblPr
    
    # 1. tblBorders (Single black borders sz="4" everywhere)
    for child in list(tblPr):
        if child.tag.endswith("tblBorders"):
            tblPr.remove(child)
            
    tblBorders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="{COLOR_BORDER_HEX}"/>
        </w:tblBorders>
    ''')
    tblPr.append(tblBorders)
    
    # 2. tblCellMar (Top/bottom 40 dxa, left/right 60 dxa)
    for child in list(tblPr):
        if child.tag.endswith("tblCellMar"):
            tblPr.remove(child)
            
    tblCellMar = parse_xml(f'''
        <w:tblCellMar {nsdecls("w")}>
            <w:top w:w="40" w:type="dxa"/>
            <w:left w:w="60" w:type="dxa"/>
            <w:bottom w:w="40" w:type="dxa"/>
            <w:right w:w="60" w:type="dxa"/>
        </w:tblCellMar>
    ''')
    tblPr.append(tblCellMar)
    
    # 3. tblGrid (Exact 7-column column definition)
    tblGrid = table._tbl.tblGrid
    for child in list(tblGrid):
        tblGrid.remove(child)
    for w_dxa in COL_WIDTHS_DXA:
        tblGrid.append(parse_xml(f'<w:gridCol {nsdecls("w")} w:w="{w_dxa}"/>'))

def set_cell_exact_width_and_shd(cell, width_dxa, fill_hex=None):
    """Sets cell tcW and optional background fill"""
    tcPr = cell._tc.get_or_add_tcPr()
    
    # tcW
    for child in list(tcPr):
        if child.tag.endswith("tcW"):
            tcPr.remove(child)
    tcPr.append(parse_xml(f'<w:tcW {nsdecls("w")} w:w="{width_dxa}" w:type="dxa"/>'))
    
    # shd
    for child in list(tcPr):
        if child.tag.endswith("shd"):
            tcPr.remove(child)
    if fill_hex:
        tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="{fill_hex}"/>'))

def generate_theory_timetable_docx(parsed_data, output_path, custom_date=None, selected_branch=None):
    """
    Generates Theory Classes Day Time Table (.docx) mirroring reference file:
    B.Tech Theory classes Day time table(Sat).doc
    Exact font, size, weight, alignments, colors, margins, and logos.
    """
    doc = docx.Document()
    
    # Configure Normal Style Font to Times New Roman 10pt
    style_normal = doc.styles["Normal"]
    style_normal.font.name = "Times New Roman"
    style_normal.font.size = Pt(10)
    
    # Exact Theory Page Margins
    sec = doc.sections[0]
    sec.page_width = Inches(8.5)
    sec.page_height = Inches(11.0)
    sec.top_margin = Inches(0.861)    # 62 pt
    sec.bottom_margin = Inches(0.833) # 60 pt
    sec.left_margin = Inches(0.25)    # 18 pt
    sec.right_margin = Inches(0.50)   # 36 pt

    # 1. Institutional Logo (Centered, 6.45 inches width)
    if os.path.exists(LOGO_PATH):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(0)
        p_logo.paragraph_format.space_after = Pt(2)
        r_logo = p_logo.add_run()
        r_logo.add_picture(LOGO_PATH, width=Inches(6.45))

    # 2. Document Titles (Times New Roman 14pt, Red #FF0000, Center aligned, bold=False in Theory)
    p0 = doc.add_paragraph()
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(1)
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r0 = p0.add_run("Planning, Monitoring & Continuing Studies")
    r0.font.name = "Times New Roman"
    r0.font.size = Pt(14)
    r0.font.bold = False
    r0.font.color.rgb = COLOR_RED_TITLE

    p1 = doc.add_paragraph()
    p1.paragraph_format.space_before = Pt(0)
    p1.paragraph_format.space_after = Pt(4)
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1 = p1.add_run("Theory Classes Day Time Table")
    r1.font.name = "Times New Roman"
    r1.font.size = Pt(14)
    r1.font.bold = False
    r1.font.color.rgb = COLOR_RED_TITLE

    # 3. Date line (Right-aligned, Times New Roman 10pt)
    p_date = doc.add_paragraph()
    p_date.paragraph_format.space_before = Pt(0)
    p_date.paragraph_format.space_after = Pt(6)
    p_date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    date_str = custom_date or "10 October, 2026"
    r_date = p_date.add_run(date_str)
    r_date.font.name = "Times New Roman"
    r_date.font.size = Pt(10)
    r_date.font.bold = False

    # 4. Table Construction (7 Columns)
    total_cols = len(COL_WIDTHS_DXA)
    table = doc.add_table(rows=0, cols=total_cols)
    apply_table_exact_properties(table)

    # Header Row (Row 0)
    header_row = table.add_row()
    header_trPr = header_row._tr.get_or_add_trPr()
    header_trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

    # Theory Headers exact alignments
    headers = [
        ("Period", WD_ALIGN_PARAGRAPH.CENTER),
        ("Faculty Id", WD_ALIGN_PARAGRAPH.CENTER),
        ("Faculty Name", WD_ALIGN_PARAGRAPH.LEFT),
        ("Course Code", WD_ALIGN_PARAGRAPH.CENTER),
        ("Course Name", WD_ALIGN_PARAGRAPH.LEFT),
        ("Room No", WD_ALIGN_PARAGRAPH.CENTER),
        ("Adjustment Faculty", WD_ALIGN_PARAGRAPH.CENTER)
    ]

    for i, (h_title, h_align) in enumerate(headers):
        cell = header_row.cells[i]
        set_cell_exact_width_and_shd(cell, COL_WIDTHS_DXA[i], FILL_HEADER_HEX)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = h_align
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(h_title)
        run.font.name = "Times New Roman"
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = COLOR_HEADER_TEXT

    # Classes Processing
    classes_to_process = parsed_data.get("classes", [])
    if selected_branch and selected_branch != "ALL":
        classes_to_process = [c for c in classes_to_process if c.get("branch") == selected_branch]

    added_classes = 0
    for cls in classes_to_process:
        class_name = cls.get("class_name", "")
        periods = cls.get("periods", {})
        
        theory_entries = []
        for p_num in range(1, 7):
            entry = periods.get(str(p_num))
            if entry and not entry.get("is_lab", False):
                theory_entries.append((p_num, entry))
                
        if not theory_entries:
            continue
            
        added_classes += 1

        # Section Row (Merged across all 7 cols, #D9E7FC fill, Centered, Bold 10pt)
        sec_row = table.add_row()
        sec_cell = sec_row.cells[0]
        for i in range(1, total_cols):
            sec_cell.merge(sec_row.cells[i])
        set_cell_exact_width_and_shd(sec_cell, TOTAL_WIDTH_DXA, FILL_SECTION_HEX)
        sec_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        
        sp = sec_cell.paragraphs[0]
        sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sp.paragraph_format.space_before = Pt(2)
        sp.paragraph_format.space_after = Pt(2)
        s_run = sp.add_run(class_name)
        s_run.font.name = "Times New Roman"
        s_run.font.size = Pt(10)
        s_run.font.bold = True
        s_run.font.color.rgb = COLOR_HEADER_TEXT

        # Data Rows for each period
        for p_num, entry in theory_entries:
            data_row = table.add_row()
            cells_data = [
                (str(p_num), WD_ALIGN_PARAGRAPH.CENTER),
                (entry.get("faculty_id", ""), WD_ALIGN_PARAGRAPH.CENTER),
                (entry.get("faculty_name", ""), WD_ALIGN_PARAGRAPH.LEFT),
                (entry.get("course_code", ""), WD_ALIGN_PARAGRAPH.CENTER),
                (entry.get("course_name", ""), WD_ALIGN_PARAGRAPH.LEFT),
                (entry.get("room", ""), WD_ALIGN_PARAGRAPH.CENTER),
                ("", WD_ALIGN_PARAGRAPH.CENTER)
            ]
            for col_idx, (val, col_align) in enumerate(cells_data):
                c = data_row.cells[col_idx]
                set_cell_exact_width_and_shd(c, COL_WIDTHS_DXA[col_idx], None)
                c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                cp = c.paragraphs[0]
                cp.alignment = col_align
                cp.paragraph_format.space_before = Pt(1)
                cp.paragraph_format.space_after = Pt(1)
                c_run = cp.add_run(val)
                c_run.font.name = "Times New Roman"
                c_run.font.size = Pt(10)
                c_run.font.bold = False
                c_run.font.color.rgb = COLOR_DATA_TEXT

    # 5. Footer Signature (DEAN- PMCS ... PRINCIPAL)
    p_footer = doc.add_paragraph()
    p_footer.paragraph_format.space_before = Pt(18)
    p_footer.paragraph_format.space_after = Pt(0)
    p_footer.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r_dean = p_footer.add_run("DEAN- PMCS" + " " * 95 + "PRINCIPAL")
    r_dean.font.name = "Times New Roman"
    r_dean.font.size = Pt(10)
    r_dean.font.bold = True

    doc.save(output_path)
    return output_path, added_classes


def generate_lab_timetable_docx(parsed_data, output_path, custom_date=None, selected_branch=None):
    """
    Generates Laboratories Day Time Table (.docx) mirroring reference file:
    B.Tech Laboratories Day time table (Sat).doc
    Exact font, size, weight, alignments, colors, margins, and logos.
    """
    doc = docx.Document()
    
    style_normal = doc.styles["Normal"]
    style_normal.font.name = "Times New Roman"
    style_normal.font.size = Pt(10)
    
    # Exact Lab Page Margins
    sec = doc.sections[0]
    sec.page_width = Inches(8.5)
    sec.page_height = Inches(11.0)
    sec.top_margin = Inches(0.197)    # 14.2 pt
    sec.bottom_margin = Inches(0.194) # 14.0 pt
    sec.left_margin = Inches(0.25)    # 18 pt
    sec.right_margin = Inches(0.50)   # 36 pt

    # 1. Institutional Logo (Centered, 4.51 inches width)
    if os.path.exists(LOGO_PATH):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_before = Pt(0)
        p_logo.paragraph_format.space_after = Pt(2)
        r_logo = p_logo.add_run()
        r_logo.add_picture(LOGO_PATH, width=Inches(4.51))

    # 2. Document Title (Times New Roman 14pt, Bold True in Lab, Red #FF0000, Center aligned)
    p0 = doc.add_paragraph()
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(2)
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r0 = p0.add_run("Planning, Monitoring & Continuing Studies Laboratories Day Time Table")
    r0.font.name = "Times New Roman"
    r0.font.size = Pt(14)
    r0.font.bold = True
    r0.font.color.rgb = COLOR_RED_TITLE

    # 3. Date line (Right-aligned, Times New Roman 10pt)
    p_date = doc.add_paragraph()
    p_date.paragraph_format.space_before = Pt(0)
    p_date.paragraph_format.space_after = Pt(4)
    p_date.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    date_str = custom_date or "10 October, 2026"
    r_date = p_date.add_run(date_str)
    r_date.font.name = "Times New Roman"
    r_date.font.size = Pt(10)
    r_date.font.bold = False

    # 4. Table Construction
    total_cols = len(COL_WIDTHS_DXA)
    table = doc.add_table(rows=0, cols=total_cols)
    apply_table_exact_properties(table)

    # Header Row
    header_row = table.add_row()
    header_trPr = header_row._tr.get_or_add_trPr()
    header_trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

    # Lab Headers exact alignments (Period & Room No centered, others Left as per reference doc)
    headers = [
        ("Period", WD_ALIGN_PARAGRAPH.CENTER),
        ("Faculty Id", WD_ALIGN_PARAGRAPH.LEFT),
        ("Faculty Name", WD_ALIGN_PARAGRAPH.LEFT),
        ("Course Code", WD_ALIGN_PARAGRAPH.LEFT),
        ("Course Name", WD_ALIGN_PARAGRAPH.LEFT),
        ("Room No", WD_ALIGN_PARAGRAPH.CENTER),
        ("Adjustment Faculty", WD_ALIGN_PARAGRAPH.LEFT)
    ]

    for i, (h_title, h_align) in enumerate(headers):
        cell = header_row.cells[i]
        set_cell_exact_width_and_shd(cell, COL_WIDTHS_DXA[i], FILL_HEADER_HEX)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.alignment = h_align
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(1)
        run = p.add_run(h_title)
        run.font.name = "Times New Roman"
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = COLOR_HEADER_TEXT

    # Classes Processing
    classes_to_process = parsed_data.get("classes", [])
    if selected_branch and selected_branch != "ALL":
        classes_to_process = [c for c in classes_to_process if c.get("branch") == selected_branch]

    added_classes = 0
    for cls in classes_to_process:
        class_name = cls.get("class_name", "")
        periods = cls.get("periods", {})
        
        lab_entries = []
        for p_num in range(1, 7):
            entry = periods.get(str(p_num))
            if entry and entry.get("is_lab", False):
                lab_entries.append((p_num, entry))
                
        if not lab_entries:
            continue
            
        added_classes += 1

        # Section Row (Merged across all 7 cols, #D9E7FC fill, Centered, Bold 10pt)
        sec_row = table.add_row()
        sec_cell = sec_row.cells[0]
        for i in range(1, total_cols):
            sec_cell.merge(sec_row.cells[i])
        set_cell_exact_width_and_shd(sec_cell, TOTAL_WIDTH_DXA, FILL_SECTION_HEX)
        sec_cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        
        sp = sec_cell.paragraphs[0]
        sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        sp.paragraph_format.space_before = Pt(2)
        sp.paragraph_format.space_after = Pt(2)
        s_run = sp.add_run(class_name)
        s_run.font.name = "Times New Roman"
        s_run.font.size = Pt(10)
        s_run.font.bold = True
        s_run.font.color.rgb = COLOR_HEADER_TEXT

        # Data Rows for each lab period
        for p_num, entry in lab_entries:
            data_row = table.add_row()
            cells_data = [
                (str(p_num), WD_ALIGN_PARAGRAPH.CENTER),
                (entry.get("faculty_id", ""), WD_ALIGN_PARAGRAPH.CENTER),
                (entry.get("faculty_name", ""), WD_ALIGN_PARAGRAPH.LEFT),
                (entry.get("course_code", ""), WD_ALIGN_PARAGRAPH.CENTER),
                (entry.get("course_name", ""), WD_ALIGN_PARAGRAPH.LEFT),
                (entry.get("room", ""), WD_ALIGN_PARAGRAPH.CENTER),
                ("", WD_ALIGN_PARAGRAPH.LEFT)
            ]
            for col_idx, (val, col_align) in enumerate(cells_data):
                c = data_row.cells[col_idx]
                set_cell_exact_width_and_shd(c, COL_WIDTHS_DXA[col_idx], None)
                c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                cp = c.paragraphs[0]
                cp.alignment = col_align
                cp.paragraph_format.space_before = Pt(1)
                cp.paragraph_format.space_after = Pt(1)
                c_run = cp.add_run(val)
                c_run.font.name = "Times New Roman"
                c_run.font.size = Pt(10)
                c_run.font.bold = False
                c_run.font.color.rgb = COLOR_DATA_TEXT

    # 5. Footer Signature (DEAN- PMCS\tPRINCIPAL)
    p_footer = doc.add_paragraph()
    p_footer.paragraph_format.space_before = Pt(14)
    p_footer.paragraph_format.space_after = Pt(0)
    p_footer.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r_dean = p_footer.add_run("DEAN- PMCS" + " " * 95 + "PRINCIPAL")
    r_dean.font.name = "Times New Roman"
    r_dean.font.size = Pt(10)
    r_dean.font.bold = True

    doc.save(output_path)
    return output_path, added_classes
