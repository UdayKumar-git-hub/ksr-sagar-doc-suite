import docx

doc = docx.Document('templates/B.Tech Laboratories Day time table (Sat).docx')
t = doc.tables[0]
for r_i in range(3):
    row = t.rows[r_i]
    print(f"Row {r_i} cell 0 borders:")
    tcPr = row.cells[0]._tc.tcPr
    for child in tcPr:
        if child.tag.endswith('tcBorders'):
            print("  tcBorders:", child.xml)
        if child.tag.endswith('tcMar'):
            print("  tcMar:", child.xml)
