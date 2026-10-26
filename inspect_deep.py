import docx

def inspect_details(name, path):
    print("=" * 30, name, "=" * 30)
    doc = docx.Document(path)
    
    # Check headers / footers in sections
    for s_idx, sec in enumerate(doc.sections):
        print(f"Section {s_idx}: page_width={sec.page_width.inches}, page_height={sec.page_height.inches}, orientation={sec.orientation}")
        print(f"Margins: top={sec.top_margin.inches}, bottom={sec.bottom_margin.inches}, left={sec.left_margin.inches}, right={sec.right_margin.inches}")
        print("Header paragraphs:", [p.text for p in sec.header.paragraphs if p.text])
        print("Footer paragraphs:", [p.text for p in sec.footer.paragraphs if p.text])
    
    # Check images / shapes
    part = doc.part
    print("Images in doc:", len(part.related_parts))
    for rel_id, rel in part.related_parts.items():
        if "image" in rel.content_type:
            print(f"  Found image: {rel_id}, content_type: {rel.content_type}, size: {len(rel.blob)} bytes")

    # Check table structure
    if doc.tables:
        t = doc.tables[0]
        print(f"Table cols count: {len(t.columns)}, rows count: {len(t.rows)}")
        for i, c in enumerate(t.columns):
            print(f"  Col {i} width: {c.width.inches if c.width else None}")
        
        # Check first 3 rows cells and borders
        for r_i in range(min(3, len(t.rows))):
            row = t.rows[r_i]
            print(f"Row {r_i} cell texts ({len(row.cells)}): {[c.text.strip().replace(chr(10), ' ') for c in row.cells]}")

inspect_details("LAB", r"templates/B.Tech Laboratories Day time table (Sat).docx")
inspect_details("THEORY", r"templates/B.Tech Theory classes Day time table(Sat).docx")
