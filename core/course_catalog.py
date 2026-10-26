import json
import os

# Known acronyms and subject name mappings from academic curriculum
ACRONYM_TO_NAME = {
    "OOPL": ("ACSE02", "Object Oriented Programming Laboratory"),
    "PC": ("AHSE03", "Professional Communication"),
    "EP": ("AHSE02", "Engineering Physics"),
    "MC": ("MC01", "Mandatory Course / Environmental Science"),
    "NCL": ("AAEE07", "Networks and Computation Laboratory"),
    "EAE": ("AAEE01", "Elements of Aerospace Engineering"),
    "FD": ("AAEE03", "Fluid Dynamics"),
    "AMPT": ("AAEE04", "Aerospace Materials and Processing Techniques"),
    "AAS": ("AAEE05", "Aircraft Structures"),
    "AIAE": ("AAEE08", "Aerodynamics and Aircraft Propulsion"),
    "ASC": ("AAEE10", "Aircraft Stability and Control"),
    "APDL": ("AAEE11", "Aerospace Propulsion Design Laboratory"),
    "EHCD": ("AAEE15", "Ethics, Human Values and Cyber Dharma"),
    "FVD": ("AAEE14", "Flight Vehicle Design"),
    "ASD": ("AAEE16", "Aerospace Structural Dynamics"),
    "ATS": ("AAEE17", "Air Traffic Systems"),
    "AI": ("ACSD01", "Artificial Intelligence"),
    "ECL": ("AECE02", "Electronic Circuit Analysis Laboratory"),
    "BEEE": ("AEEE01", "Basic Electrical and Electronics Engineering"),
    "OOP": ("ACSE01", "Object Oriented Programming"),
    "EC": ("AHSE01", "Engineering Chemistry"),
    "FEWDL": ("ACSE04", "Frontend Web Development Laboratory"),
    "CAEG": ("AMEE01", "Computer Aided Engineering Graphics"),
    "EPS": ("AHSE04", "Engineering Physics and Semiconductors"),
    "OS": ("ACSE11", "Operating Systems"),
    "DBMSL": ("AITE03", "Database Management Systems Laboratory"),
    "PSM": ("AHSE09", "Probability and Statistics Methods"),
    "MADL": ("ACSD21", "Mobile Application Development Laboratory"),
    "DAAL": ("ACSE12", "Design and Analysis of Algorithms Laboratory"),
    "OSL": ("ACSE13", "Operating Systems Laboratory"),
    "CSA": ("ACSE08", "Computer Organization and Architecture"),
    "AIL": ("ACSD26", "Artificial Intelligence Laboratory"),
    "ISM": ("AITE07", "Information Security Management"),
    "DMML": ("ACSD08", "Data Mining and Machine Learning"),
    "CAD": ("AMEE15", "Computer Aided Design"),
    "SADP": ("ACSE19", "Software Architecture and Design Patterns"),
    "JFSD": ("ACSE20", "Java Full Stack Development"),
    "CADL": ("AMEE18", "Computer Aided Design Laboratory"),
    "EDP": ("ACSD29", "Engineering Design Project"),
    "HPC": ("ACSE24", "High Performance Computing"),
    "ICPS": ("AITE14", "Industrial Cyber Physical Systems"),
    "CC": ("ACSE25", "Cloud Computing"),
    "NLP": ("ACSD14", "Natural Language Processing"),
    "CTL": ("ACSE28", "Cloud Technologies Laboratory"),
    "SPL": ("ACSE29", "Systems Programming Laboratory"),
    "PW-I": ("ACSD56", "Project Work (Phase - I)"),
    "PWO": ("ACSD56", "Project Work (Phase - I)"),
    "DL": ("ACSD12", "Deep Learning"),
    "LM": ("ACSD15", "Language Models"),
    "NLPL": ("ACSD25", "Natural Language Processing Laboratory"),
    "ARVR": ("ACSD16", "Augmented and Virtual Reality"),
    "STMA": ("ACSE32", "Software Testing and Maintenance"),
    "DHVT": ("ACSD17", "Data Handling and Visualization Tools"),
    "SE": ("ACSE16", "Software Engineering"),
    "LIL": ("ACSD22", "Linux Internals Laboratory"),
    "TC": ("AHSE11", "Technical Communication"),
    "SFDS": ("ACSD19", "Statistical Foundations for Data Science"),
    "OOSE": ("ACSE18", "Object Oriented Software Engineering"),
    "MLAL": ("ACSD23", "Machine Learning Algorithms Laboratory"),
    "MLA": ("ACSD10", "Machine Learning Algorithms"),
    "KRR": ("ACSD11", "Knowledge Representation and Reasoning"),
    "DLT": ("ACSD27", "Deep Learning Tools"),
    "CV": ("ACSD28", "Computer Vision"),
    "DSS": ("ACSD30", "Decision Support Systems"),
    "BDML": ("ACSD31", "Big Data and Machine Learning Laboratory"),
    "DCP": ("ACSD33", "Distributed Cloud Platforms"),
    "BDM": ("ACSD34", "Big Data Management"),
    "DSSL": ("ACSD35", "Data Science Systems Laboratory"),
    "SAP": ("ACSE35", "Systems and Architecture Programming"),
    "CCDF": ("ACSD38", "Cloud Computing and Digital Forensics"),
    "SPORTS": ("SP01", "Physical Education and Sports"),
    "LIBRARY": ("LIB01", "Library and Self Study"),
    "ACA": ("ACSE36", "Advanced Computer Architecture"),
    "ELCS": ("AHSE08", "English Language and Communication Skills Laboratory"),
    "EPL": ("AHSE06", "Engineering Physics Laboratory"),
    "EDCL": ("AECE05", "Electronic Devices and Circuits Laboratory"),
    "SSP": ("AECE11", "Signals and Systems Processing"),
    "CS": ("AECE12", "Control Systems"),
    "DLD": ("AECE08", "Digital Logic Design"),
    "PCBD": ("AECE07", "PCB Design"),
    "AWP": ("AECE18", "Antennas and Wave Propagation"),
    "HSC": ("AECE20", "Hardware Software Co-Design"),
    "MPMC": ("AECE14", "Microprocessors and Microcontrollers"),
    "5GC": ("AECE25", "5G Communication Systems"),
    "MML": ("AECE22", "Microprocessors and Microcontrollers Laboratory"),
    "ESDL": ("AECE24", "Embedded Systems Design Laboratory"),
    "NSC": ("AECE26", "Network Security and Cryptography"),
    "ESDD": ("AECE27", "Embedded System Design Development"),
    "LPVC": ("AECE28", "Low Power VLSI Circuits"),
    "RFML": ("AECE29", "Radio Frequency and Microwave Laboratory"),
    "MRE": ("AECE30", "Microwave and Radar Engineering"),
    "DCMT": ("AEEE07", "DC Machines and Transformers"),
    "EDC": ("AECE03", "Electronic Devices and Circuits"),
    "DLDL": ("AECE10", "Digital Logic Design Laboratory"),
    "PE": ("AEEE12", "Power Electronics"),
    "EMI": ("AEEE14", "Electrical Measurements and Instrumentation"),
    "EECA": ("AEEE16", "Electrical and Electronic Circuit Analysis"),
    "PTLC": ("AEEE18", "Power Transmission Lines and Circuits"),
    "SGPE": ("AEEE22", "Switchgear and Protection Engineering"),
    "EW": ("AMEE04", "Engineering Workshop"),
    "MSM": ("AMEE06", "Mechanics of Solids and Materials"),
    "SM": ("AMEE07", "Solid Mechanics"),
    "PT": ("AMEE08", "Production Technology"),
    "SMML": ("AMEE11", "Strength of Materials and Mechanics Laboratory"),
    "AIME": ("AMEE16", "Artificial Intelligence in Mechanical Engineering"),
    "CAE": ("AMEE17", "Computer Aided Engineering"),
    "FEA": ("AMEE19", "Finite Element Analysis"),
    "DMA": ("AMEE22", "Design of Machine Architectures"),
    "ES": ("AMEE24", "Energy Systems"),
    "MIL": ("AMEE25", "Manufacturing and Industry Laboratory"),
    "GE": ("ACEE06", "Geotechnical Engineering"),
    "FM": ("ACEE07", "Fluid Mechanics"),
    "EL": ("ACEE09", "Environmental Engineering Laboratory"),
    "RSGIS": ("ACEE12", "Remote Sensing and GIS"),
    "SA": ("ACEE14", "Structural Analysis"),
    "HWRE": ("ACEE16", "Hydrology and Water Resources Engineering"),
    "RCD": ("ACEE18", "Reinforced Concrete Design"),
    "GIT": ("ACEE22", "Ground Improvement Techniques"),
    "TE": ("ACEE24", "Transportation Engineering"),
    "RRR": ("ACEE25", "Rehabilitation and Retrofitting"),
    "EE": ("ACEE26", "Environmental Engineering"),
}

# Load saved catalog if available
CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "templates", "course_directory.json")

def get_catalog():
    if os.path.exists(CATALOG_PATH):
        try:
            with open(CATALOG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"theory_courses": {}, "lab_courses": {}, "faculty_map": {}}

def resolve_course(raw_course_code, is_lab=False):
    """
    Returns (code, name) for any course string.
    """
    clean = raw_course_code.strip()
    first_token = clean.split("/")[0].strip()
    
    # Check acronym table first
    if first_token in ACRONYM_TO_NAME:
        code, name = ACRONYM_TO_NAME[first_token]
        return code, name
    
    catalog = get_catalog()
    table = catalog.get("lab_courses" if is_lab else "theory_courses", {})
    if first_token in table:
        return first_token, table[first_token]
        
    for k, v in table.items():
        if k.upper() == first_token.upper():
            return k, v
            
    # Fallback to token as code and formatted token as name
    return first_token, clean
