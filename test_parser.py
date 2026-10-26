import pdfplumber
import re
import json

def parse_cell(text):
    if not text or text.strip() in ['-', '', 'None']:
        return None
    
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if not lines:
        return None
    
    # Example format:
    # Line 0: Course Code (e.g. OOPL/OOPL/OOPL or PC or FEWDL/FEWDL/FEWDL/FEWDL)
    # Line 1: Room : BUILD_IT-4004 or 3202
    # Line 2: IARE11040 / IARE10409 / IARE10077
    # Line 3+: Dr. JETTY WILSON / Mr. P SHIVA KUMAR/Ms. D ANITHA...
    
    course = lines[0]
    room = ""
    fac_id = ""
    fac_name = ""
    
    remaining = lines[1:]
    # Find Room
    for i, l in enumerate(remaining):
        if 'Room' in l:
            room = l.replace('Room', '').replace(':', '').strip()
            remaining = remaining[:i] + remaining[i+1:]
            break
            
    # Find Faculty ID (starts with IARE)
    for i, l in enumerate(remaining):
        if 'IARE' in l:
            fac_id = l.strip()
            remaining = remaining[:i] + remaining[i+1:]
            break
            
    # The rest is faculty name
    fac_name = " ".join(remaining).strip()
    
    # Determine if lab:
    # Typically courses ending with 'L' or containing 'LAB' or multiple identical items like OOPL/OOPL or EW/EW/EW
    # or rooms like BUILD_IT, CCC, PAT, ELRV, or known lab codes
    is_lab = False
    first_part = course.split('/')[0].strip().upper()
    if first_part.endswith('L') or 'LAB' in first_part or first_part in ['EW', 'SMML', 'EL', 'MIL', 'EDP']:
        is_lab = True
    elif '/' in course and len(course.split('/')) >= 2 and course.split('/')[0] == course.split('/')[1]:
        # Repeated like CAEG/CAEG/CAEG
        is_lab = True
        
    return {
        'raw': text,
        'course': course,
        'room': room,
        'fac_id': fac_id,
        'fac_name': fac_name,
        'is_lab': is_lab
    }

with pdfplumber.open(r'c:\Users\ADMIN\Downloads\Telegram Desktop\IARE - Day Time Table - DEAN_PG.pdf') as pdf:
    p1 = pdf.pages[0]
    tables = p1.extract_tables()
    t = tables[0]
    print("Header rows:")
    for r in t[:2]:
        print("  ", [c for c in r if c is not None])
    print("\nData row 1 (AERO-I-SEM-A):")
    row_cells = [c for c in t[2] if c is not None]
    print(f"Class: {row_cells[0]}")
    for period_idx, cell_text in enumerate(row_cells[1:], 1):
        parsed = parse_cell(cell_text)
        print(f"  Period {period_idx}: is_lab={parsed['is_lab'] if parsed else False} -> course={parsed['course'] if parsed else '-'}, room={parsed['room'] if parsed else '-'}, fac={parsed['fac_name'] if parsed else '-'}")
