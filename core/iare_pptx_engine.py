import os
import sys
from typing import Dict, Any, List

from core.iare_slide_builders import (
    get_base_presentation,
    create_title_slide,
    create_bullets_slide,
    create_flowchart_slide,
    create_architecture_slide,
    create_table_slide,
    create_two_column_slide,
    create_review_slide,
    create_closing_slide
)
from core.iare_content_engine import generate_curriculum

def generate_iare_presentation(data: Dict[str, Any], output_path: str) -> str:
    """
    Generates a full presentation strictly matching the format, logos,
    colors, fonts, and layout of IARE LECTURE PPT FORMAT50.pptx.
    
    data: {
       "topic": "Reduce Risk And Confidently Accelerate Your Business In The Cloud",
       "course_name": "CLOUD APPLICATION DEVELOPMENT",
       "faculty_name": "KS R Sagar",
       "faculty_id": "IARE11024",
       "department": "IT",
       "lecture_number": "56",
       "slides_count": 10,
       "include_flowcharts": True,
       "include_diagrams": True,
       "include_tables": True,
       "custom_subtopics": "..."
    }
    """
    prs = get_base_presentation()
    
    # Generate the curriculum slide definitions
    deck_plan = generate_curriculum(data)
    total_slides = len(deck_plan)
    
    for idx, slide_info in enumerate(deck_plan):
        slide_num = idx + 1
        stype = slide_info.get("type", "bullets")
        
        if stype == "title":
            create_title_slide(prs, data)
        elif stype == "flowchart":
            create_flowchart_slide(prs, slide_info, slide_num)
        elif stype == "architecture":
            create_architecture_slide(prs, slide_info, slide_num)
        elif stype == "table":
            create_table_slide(prs, slide_info, slide_num)
        elif stype == "two_column":
            create_two_column_slide(prs, slide_info, slide_num)
        elif stype == "review":
            create_review_slide(prs, slide_info, slide_num)
        elif stype == "closing":
            create_closing_slide(prs, data, slide_num)
        else: # bullets
            create_bullets_slide(prs, slide_info, slide_num)
            
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    prs.save(output_path)
    return output_path

print("IARE presentation engine ready.")
