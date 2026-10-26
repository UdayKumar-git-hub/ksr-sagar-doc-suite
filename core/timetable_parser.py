import pdfplumber
import re
from core.course_catalog import ACRONYM_TO_NAME, resolve_course

def clean_text(val):
    if val is None:
        return ""
    return str(val).strip()

def is_lab_subject(course_code, room=""):
    if not course_code or course_code in ["-", ""]:
        return False
    parts = [p.strip().upper() for p in course_code.split("/") if p.strip()]
    if not parts:
        return False
    first = parts[0]
    if first in ACRONYM_TO_NAME:
        code, name = ACRONYM_TO_NAME[first]
        if "Laboratory" in name or "Workshop" in name or "Project" in name or "Design" in name:
            return True
    if first.endswith("L") or "LAB" in first:
        return True
    if first in ["EW", "SMML", "EL", "MIL", "EDP", "PWO", "PW-I", "CADL", "AIL", "DAAL", "FEWDL", "CAEG", "PCBD", "MML", "ESDL", "RFML", "DLDL"]:
        return True
    if len(parts) >= 2 and parts[0] == parts[1]:
        return True
    return False

def parse_cell(text):
    if not text:
        return None
    cleaned = text.strip()
    if cleaned in ["-", "", "None"]:
        return None
    
    lines = [l.strip() for l in cleaned.split("\n") if l.strip()]
    if not lines:
        return None
    
    course = lines[0]
    room = ""
    fac_ids = []
    fac_names = []
    
    remaining = lines[1:]
    
    # 1. Look for Room
    room_idx = -1
    for i, line in enumerate(remaining):
        if "Room" in line:
            room = line.replace("Room", "").replace(":", "").strip()
            room_idx = i
            break
    if room_idx != -1:
        remaining = remaining[:room_idx] + remaining[room_idx+1:]
        
    # 2. Extract Faculty IDs (lines with IARE)
    non_id_lines = []
    for line in remaining:
        if "IARE" in line:
            # Tokenize IARE IDs
            ids = re.findall(r'IARE\d+', line)
            if ids:
                fac_ids.extend(ids)
            else:
                fac_ids.append(line)
        else:
            non_id_lines.append(line)
            
    # 3. Remaining lines are Faculty Names
    full_fac_name = " ".join(non_id_lines).strip()
    # Normalize slashes
    full_fac_name = re.sub(r'\s*/\s*', ' / ', full_fac_name)
    
    formatted_fac_id = " / ".join(fac_ids) if fac_ids else ""
    
    is_lab = is_lab_subject(course, room)
    
    resolved_code, resolved_name = resolve_course(course, is_lab)
    
    return {
        "raw_text": text,
        "course_raw": course,
        "course_code": resolved_code,
        "course_name": resolved_name,
        "room": room,
        "faculty_id": formatted_fac_id,
        "faculty_name": full_fac_name,
        "is_lab": is_lab
    }

def parse_timetable_pdf(pdf_path):
    """
    Parses full timetable PDF and returns structured data:
    {
       "metadata": { "academic_year": ..., "semester": ..., "day": ..., "branches": [...] },
       "classes": [
          {
             "class_name": "AERO-I-SEM-A",
             "branch": "Aeronautical Engineering",
             "periods": {
                "1": { ... },
                ...
                "6": { ... }
             }
          }
       ]
    }
    """
    results = {
        "metadata": {
            "academic_year": "2026-27",
            "semester": "ODD Semester",
            "day": "Tuesday",
            "branches": []
        },
        "classes": []
    }
    
    current_ay = "2026-27"
    current_sem = "ODD Semester"
    current_day = "Tuesday"
    current_branch = "General"
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            tables = page.extract_tables()
            if not tables:
                continue
                
            for table in tables:
                if not table or len(table) < 2:
                    continue
                
                # Check if first row contains metadata header
                row0 = [clean_text(c) for c in table[0] if c is not None]
                header_str = " ".join(row0)
                
                start_row = 0
                if "Academic Year" in header_str or "Branch:" in header_str:
                    for item in row0:
                        if "Academic Year:" in item:
                            current_ay = item.replace("Academic Year:", "").strip()
                        elif "Semester" in item:
                            current_sem = item.strip()
                        elif "Branch:" in item:
                            current_branch = item.replace("Branch:", "").strip()
                            if current_branch not in results["metadata"]["branches"]:
                                results["metadata"]["branches"].append(current_branch)
                        elif "Day:" in item:
                            current_day = item.replace("Day:", "").strip()
                    start_row = 1
                
                # Second row may be CLASS/PERIOD header
                if start_row < len(table):
                    row_chk = [clean_text(c) for c in table[start_row] if c is not None]
                    if any("CLASS/PERIOD" in c for c in row_chk):
                        start_row += 1
                        
                # Now parse data rows
                for r_idx in range(start_row, len(table)):
                    row = table[r_idx]
                    # Filter None
                    cleaned_cells = [c for c in row if c is not None]
                    if not cleaned_cells or len(cleaned_cells) < 2:
                        continue
                        
                    first_cell = clean_text(cleaned_cells[0])
                    # If this is another embedded subheader row
                    if "Academic Year" in first_cell or "Branch:" in first_cell:
                        for item in cleaned_cells:
                            item_txt = clean_text(item)
                            if "Branch:" in item_txt:
                                current_branch = item_txt.replace("Branch:", "").strip()
                                if current_branch not in results["metadata"]["branches"]:
                                    results["metadata"]["branches"].append(current_branch)
                            if "Day:" in item_txt:
                                current_day = item_txt.replace("Day:", "").strip()
                        continue
                        
                    if "CLASS/PERIOD" in first_cell:
                        continue
                        
                    class_name = first_cell
                    if not class_name or class_name == "-":
                        continue
                        
                    # Period cells (I, II, III, IV, V, VI)
                    period_cells = cleaned_cells[1:]
                    period_data = {}
                    for p_num in range(1, 7):
                        cell_idx = p_num - 1
                        if cell_idx < len(period_cells):
                            cell_val = period_cells[cell_idx]
                            parsed = parse_cell(cell_val)
                            period_data[str(p_num)] = parsed
                        else:
                            period_data[str(p_num)] = None
                            
                    results["classes"].append({
                        "class_name": class_name,
                        "branch": current_branch,
                        "periods": period_data
                    })
                    
    results["metadata"]["academic_year"] = current_ay
    results["metadata"]["semester"] = current_sem
    results["metadata"]["day"] = current_day
    
    return results
