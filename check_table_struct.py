import docx

doc_th = docx.Document('templates/B.Tech Theory classes Day time table(Sat).docx')
t = doc_th.tables[0]
print(f"Theory table has {len(t.rows)} rows and {len(t.columns)} cols")
# Look at row 0 (headers)
r0 = t.rows[0]
print("Row 0 cells count:", len(r0.cells))
headers = []
for i, c in enumerate(r0.cells):
    headers.append((i, c.text.strip().replace('\n', ' ')))
print("Row 0 distinct cells:", set(headers))

# Look at row 1 (section)
r1 = t.rows[1]
print("Row 1 text:", r1.cells[0].text)

# Look at row 2 (data)
r2 = t.rows[2]
print("Row 2 cells:")
for i, c in enumerate(r2.cells):
    print(f"  Col {i}: '{c.text.strip().replace(chr(10), ' ')}'")
