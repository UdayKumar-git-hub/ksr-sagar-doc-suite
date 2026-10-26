import os
import shutil
import uuid
import json
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from core.timetable_parser import parse_timetable_pdf
from core.docx_generator import generate_theory_timetable_docx, generate_lab_timetable_docx
from core.pptx_generator import generate_presentation

app = FastAPI(title="KSR Sagar Document Converter", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")

IS_VERCEL = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
if IS_VERCEL:
    OUTPUTS_DIR = "/tmp/outputs"
    UPLOADS_DIR = "/tmp/uploads"
else:
    OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
    UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(OUTPUTS_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
if not IS_VERCEL:
    os.makedirs(TEMPLATES_DIR, exist_ok=True)
    os.makedirs(STATIC_DIR, exist_ok=True)

@app.get("/", response_class=FileResponse)
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"status": "KSR Sagar Document Converter API is running"})

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

DEFAULT_REF_PDF = os.path.join(BASE_DIR, "referencefiles", "IARE - Day Time Table - DEAN_PG.pdf")
if not os.path.exists(DEFAULT_REF_PDF):
    DEFAULT_REF_PDF = r"c:\Users\ADMIN\Downloads\Telegram Desktop\IARE - Day Time Table - DEAN_PG.pdf"

JOBS_STORE: Dict[str, Any] = {}

def convert_docx_to_doc_com(docx_path, doc_path):
    """Converts a DOCX to genuine Word 97-2003 binary .doc format using MS Word COM"""
    try:
        import win32com.client
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        doc = word.Documents.Open(os.path.abspath(docx_path))
        # 0 = wdFormatDocument (.doc)
        doc.SaveAs(os.path.abspath(doc_path), FileFormat=0)
        doc.Close()
        word.Quit()
        return True
    except Exception as e:
        print("Word COM save as .doc error:", e)
        # Fallback: copy file
        shutil.copyfile(docx_path, doc_path)
        return False

class TimetableExportRequest(BaseModel):
    data: Dict[str, Any]
    custom_date: Optional[str] = "10 October, 2026"
    selected_branch: Optional[str] = "ALL"

class PresentationRequest(BaseModel):
    title: str
    faculty_name: str
    department: str
    category: str = "Faculty Lecture"
    density: str = "Balanced"
    slides_count: int = 7
    speaker_notes: bool = True

@app.get("/api/info")
def get_info():
    ref_exists = os.path.exists(DEFAULT_REF_PDF)
    return {
        "institution": "KSR Sagar Document Converter",
        "reference_pdf_available": ref_exists,
        "reference_pdf_path": DEFAULT_REF_PDF if ref_exists else None
    }

@app.post("/api/timetable/process-reference")
def process_reference():
    if not os.path.exists(DEFAULT_REF_PDF):
        raise HTTPException(status_code=404, detail="Reference PDF not found on system.")
    
    job_id = str(uuid.uuid4())[:8]
    parsed_data = parse_timetable_pdf(DEFAULT_REF_PDF)
    
    theory_docx = os.path.join(OUTPUTS_DIR, f"Theory_Time_Table_{job_id}.docx")
    theory_doc = os.path.join(OUTPUTS_DIR, f"Theory_Time_Table_{job_id}.doc")
    
    lab_docx = os.path.join(OUTPUTS_DIR, f"Laboratories_Time_Table_{job_id}.docx")
    lab_doc = os.path.join(OUTPUTS_DIR, f"Laboratories_Time_Table_{job_id}.doc")
    
    t_path, t_cnt = generate_theory_timetable_docx(parsed_data, theory_docx)
    l_path, l_cnt = generate_lab_timetable_docx(parsed_data, lab_docx)
    
    # Also generate binary .doc versions
    convert_docx_to_doc_com(theory_docx, theory_doc)
    convert_docx_to_doc_com(lab_docx, lab_doc)
    
    return {
        "job_id": job_id,
        "success": True,
        "theory_download_url": f"/api/download/{os.path.basename(theory_docx)}",
        "lab_download_url": f"/api/download/{os.path.basename(lab_docx)}",
        "theory_docx_url": f"/api/download/{os.path.basename(theory_docx)}",
        "theory_doc_url": f"/api/download/{os.path.basename(theory_doc)}",
        "lab_docx_url": f"/api/download/{os.path.basename(lab_docx)}",
        "lab_doc_url": f"/api/download/{os.path.basename(lab_doc)}",
        "theory_classes_count": t_cnt,
        "lab_classes_count": l_cnt,
        "metadata": parsed_data.get("metadata", {}),
        "classes": parsed_data.get("classes", [])
    }

@app.post("/api/timetable/upload")
async def upload_timetable(file: UploadFile = File(...), custom_date: str = Form("10 October, 2026")):
    job_id = str(uuid.uuid4())[:8]
    saved_path = os.path.join(UPLOADS_DIR, f"{job_id}_{file.filename}")
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        parsed_data = parse_timetable_pdf(saved_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse timetable PDF: {str(e)}")
        
    theory_docx = os.path.join(OUTPUTS_DIR, f"Theory_Time_Table_{job_id}.docx")
    theory_doc = os.path.join(OUTPUTS_DIR, f"Theory_Time_Table_{job_id}.doc")
    
    lab_docx = os.path.join(OUTPUTS_DIR, f"Laboratories_Time_Table_{job_id}.docx")
    lab_doc = os.path.join(OUTPUTS_DIR, f"Laboratories_Time_Table_{job_id}.doc")
    
    t_path, t_cnt = generate_theory_timetable_docx(parsed_data, theory_docx, custom_date=custom_date)
    l_path, l_cnt = generate_lab_timetable_docx(parsed_data, lab_docx, custom_date=custom_date)
    
    convert_docx_to_doc_com(theory_docx, theory_doc)
    convert_docx_to_doc_com(lab_docx, lab_doc)
    
    return {
        "job_id": job_id,
        "success": True,
        "theory_download_url": f"/api/download/{os.path.basename(theory_docx)}",
        "lab_download_url": f"/api/download/{os.path.basename(lab_docx)}",
        "theory_docx_url": f"/api/download/{os.path.basename(theory_docx)}",
        "theory_doc_url": f"/api/download/{os.path.basename(theory_doc)}",
        "lab_docx_url": f"/api/download/{os.path.basename(lab_docx)}",
        "lab_doc_url": f"/api/download/{os.path.basename(lab_doc)}",
        "theory_classes_count": t_cnt,
        "lab_classes_count": l_cnt,
        "metadata": parsed_data.get("metadata", {}),
        "classes": parsed_data.get("classes", [])
    }

@app.post("/api/timetable/export")
def export_timetable(req: TimetableExportRequest):
    job_id = str(uuid.uuid4())[:8]
    parsed_data = req.data
    custom_date = req.custom_date
    selected_branch = req.selected_branch
    
    theory_docx = os.path.join(OUTPUTS_DIR, f"Theory_Time_Table_Edited_{job_id}.docx")
    theory_doc = os.path.join(OUTPUTS_DIR, f"Theory_Time_Table_Edited_{job_id}.doc")
    
    lab_docx = os.path.join(OUTPUTS_DIR, f"Laboratories_Time_Table_Edited_{job_id}.docx")
    lab_doc = os.path.join(OUTPUTS_DIR, f"Laboratories_Time_Table_Edited_{job_id}.doc")
    
    t_path, t_cnt = generate_theory_timetable_docx(parsed_data, theory_docx, custom_date=custom_date, selected_branch=selected_branch)
    l_path, l_cnt = generate_lab_timetable_docx(parsed_data, lab_docx, custom_date=custom_date, selected_branch=selected_branch)
    
    convert_docx_to_doc_com(theory_docx, theory_doc)
    convert_docx_to_doc_com(lab_docx, lab_doc)
    
    return {
        "job_id": job_id,
        "success": True,
        "theory_download_url": f"/api/download/{os.path.basename(theory_docx)}",
        "lab_download_url": f"/api/download/{os.path.basename(lab_docx)}",
        "theory_docx_url": f"/api/download/{os.path.basename(theory_docx)}",
        "theory_doc_url": f"/api/download/{os.path.basename(theory_doc)}",
        "lab_docx_url": f"/api/download/{os.path.basename(lab_docx)}",
        "lab_doc_url": f"/api/download/{os.path.basename(lab_doc)}",
        "theory_classes_count": t_cnt,
        "lab_classes_count": l_cnt
    }

@app.post("/api/presentation/generate")
def create_presentation(req: PresentationRequest):
    job_id = str(uuid.uuid4())[:8]
    filename = f"KSR_Presentation_{job_id}.pptx"
    output_path = os.path.join(OUTPUTS_DIR, filename)
    
    generate_presentation(req.dict(), output_path)
    
    return {
        "success": True,
        "filename": filename,
        "download_url": f"/api/download/{filename}",
        "slides_count": req.slides_count,
        "title": req.title,
        "category": req.category,
        "faculty_name": req.faculty_name
    }

def get_or_generate_file(filename: str) -> str:
    p = os.path.join(OUTPUTS_DIR, filename)
    if os.path.exists(p):
        return p
    
    p_template = os.path.join(TEMPLATES_DIR, filename)
    if os.path.exists(p_template):
        return p_template

    # Auto-generation on demand if file is requested but missing
    if "Theory_Time_Table" in filename or filename == "Theory_Time_Table.docx" or filename == "Theory_Time_Table.doc":
        if os.path.exists(DEFAULT_REF_PDF):
            parsed_data = parse_timetable_pdf(DEFAULT_REF_PDF)
            docx_target = os.path.join(OUTPUTS_DIR, "Theory_Time_Table.docx")
            doc_target = os.path.join(OUTPUTS_DIR, "Theory_Time_Table.doc")
            generate_theory_timetable_docx(parsed_data, docx_target)
            convert_docx_to_doc_com(docx_target, doc_target)
            return doc_target if filename.endswith(".doc") else docx_target

    if "Laboratories_Time_Table" in filename or filename == "Laboratories_Time_Table.docx" or filename == "Laboratories_Time_Table.doc":
        if os.path.exists(DEFAULT_REF_PDF):
            parsed_data = parse_timetable_pdf(DEFAULT_REF_PDF)
            docx_target = os.path.join(OUTPUTS_DIR, "Laboratories_Time_Table.docx")
            doc_target = os.path.join(OUTPUTS_DIR, "Laboratories_Time_Table.doc")
            generate_lab_timetable_docx(parsed_data, docx_target)
            convert_docx_to_doc_com(docx_target, doc_target)
            return doc_target if filename.endswith(".doc") else docx_target

    if "Presentation" in filename or filename.endswith(".pptx"):
        pptx_target = os.path.join(OUTPUTS_DIR, "KSR_Faculty_Presentation.pptx")
        generate_presentation({
            "title": "Faculty Lecture & Course Plan",
            "faculty_name": "Faculty Member",
            "department": "Computer Science & Engineering",
            "category": "Faculty Lecture",
            "density": "Balanced",
            "slides_count": 7,
            "speaker_notes": True
        }, pptx_target)
        return pptx_target

    raise HTTPException(status_code=404, detail="Requested file not found and could not be generated.")

@app.get("/api/download/theory/docx")
def download_direct_theory_docx():
    p = get_or_generate_file("Theory_Time_Table.docx")
    return FileResponse(
        path=p,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="Theory_Classes_Day_Time_Table.docx",
        headers={"Content-Disposition": 'attachment; filename="Theory_Classes_Day_Time_Table.docx"'}
    )

@app.get("/api/download/theory/doc")
def download_direct_theory_doc():
    p = get_or_generate_file("Theory_Time_Table.doc")
    return FileResponse(
        path=p,
        media_type="application/msword",
        filename="Theory_Classes_Day_Time_Table.doc",
        headers={"Content-Disposition": 'attachment; filename="Theory_Classes_Day_Time_Table.doc"'}
    )

@app.get("/api/download/lab/docx")
def download_direct_lab_docx():
    p = get_or_generate_file("Laboratories_Time_Table.docx")
    return FileResponse(
        path=p,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename="Laboratories_Day_Time_Table.docx",
        headers={"Content-Disposition": 'attachment; filename="Laboratories_Day_Time_Table.docx"'}
    )

@app.get("/api/download/lab/doc")
def download_direct_lab_doc():
    p = get_or_generate_file("Laboratories_Time_Table.doc")
    return FileResponse(
        path=p,
        media_type="application/msword",
        filename="Laboratories_Day_Time_Table.doc",
        headers={"Content-Disposition": 'attachment; filename="Laboratories_Day_Time_Table.doc"'}
    )

@app.get("/api/download/presentation/pptx")
def download_direct_presentation_pptx():
    p = get_or_generate_file("KSR_Faculty_Presentation.pptx")
    return FileResponse(
        path=p,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename="KSR_Faculty_Presentation.pptx",
        headers={"Content-Disposition": 'attachment; filename="KSR_Faculty_Presentation.pptx"'}
    )

@app.get("/api/download/{filename}")
def download_file(filename: str):
    p = get_or_generate_file(filename)

    ext = os.path.splitext(filename)[1].lower()
    if ext == ".doc":
        media_type = "application/msword"
    elif ext == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif ext == ".pptx":
        media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    elif ext == ".pdf":
        media_type = "application/pdf"
    else:
        media_type = "application/octet-stream"

    return FileResponse(
        path=p,
        media_type=media_type,
        filename=filename,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
