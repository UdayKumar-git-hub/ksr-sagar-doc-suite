import os
import re
import requests
from typing import Dict, Any, List, Optional, Tuple

STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
    "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for", 
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", 
    "him", "himself", "his", "how", "if", "in", "into", "is", "it", "its", "itself", "just", 
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", 
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same", "she", 
    "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them", 
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", 
    "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", 
    "while", "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself", 
    "yourselves", "reduce", "confidently", "accelerate", "best", "practices", "introduction", 
    "intro", "overview", "lecture", "unit", "chapter", "slide", "slides", "ppt", "study", 
    "comprehensive", "advanced", "modern", "fundamentals"
}

def clean_term(s: str) -> str:
    return re.sub(r'[^a-zA-Z0-9\s\-]', ' ', s).strip()

def extract_search_queries(topic: str, course_name: str = "") -> List[str]:
    queries = []
    
    # 1. Course name query if meaningful
    if course_name:
        c_words = [w for w in clean_term(course_name).split() if w.lower() not in STOP_WORDS]
        if c_words:
            queries.append(" ".join(c_words))
            
    # 2. Substantive keywords from topic
    t_words = [w for w in clean_term(topic).split() if w.lower() not in STOP_WORDS and len(w) > 2]
    
    if len(t_words) >= 2:
        queries.append(" ".join(t_words[:3]))
        queries.append(" ".join(t_words))
    elif len(t_words) == 1:
        queries.append(t_words[0])
        
    # 3. Combined course + topic keywords
    combined_words = []
    for w in (t_words + [w for w in clean_term(course_name).split() if w.lower() not in STOP_WORDS]):
        if w.lower() not in [x.lower() for x in combined_words]:
            combined_words.append(w)
            
    if combined_words:
        queries.append(" ".join(combined_words[:4]))
        
    # Add exact topic as fallback
    queries.append(topic.strip())
    
    # Remove duplicates preserving order
    seen = set()
    final_queries = []
    for q in queries:
        q_norm = q.lower().strip()
        if q_norm and q_norm not in seen:
            seen.add(q_norm)
            final_queries.append(q)
            
    return final_queries

def fetch_wiki_search_results(query: str, limit: int = 5) -> List[Dict[str, str]]:
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KSRDocSuite/3.0'}
    try:
        s_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={requests.utils.quote(query)}&utf8=&format=json"
        res = requests.get(s_url, headers=headers, timeout=6)
        return res.json().get('query', {}).get('search', [])[:limit]
    except Exception as e:
        return []

def fetch_wiki_page_details(title: str, max_sections: int = 15) -> Dict[str, Any]:
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KSRDocSuite/3.0'}
    data = {"title": title, "summary": "", "sections": {}}
    try:
        ext_url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles={requests.utils.quote(title)}&format=json"
        res = requests.get(ext_url, headers=headers, timeout=6)
        pages = res.json().get('query', {}).get('pages', {})
        for pid, pdata in pages.items():
            full_text = pdata.get('extract', '')
            if full_text:
                parts = re.split(r'\n==+\s*([^=]+?)\s*==+\n', full_text)
                data["summary"] = parts[0].strip()
                for i in range(1, len(parts), 2):
                    s_name = parts[i].strip()
                    s_body = parts[i+1].strip() if i+1 < len(parts) else ""
                    if s_name.lower() not in ["see also", "references", "external links", "further reading", "notes", "bibliography"]:
                        sents = [s.strip() for s in re.split(r'\.\s+', s_body) if len(s.strip()) > 30]
                        if sents:
                            data["sections"][s_name] = sents[:6]
                            if len(data["sections"]) >= max_sections:
                                break
    except Exception as e:
        print(f"Error fetching wiki page {title}: {e}")
    return data

def score_article_relevance(title: str, snippet: str, topic_words: List[str]) -> int:
    score = 0
    t_lower = (title + " " + snippet).lower()
    title_lower = title.lower()
    for w in topic_words:
        w_low = w.lower()
        if w_low in title_lower:
            score += 12
        elif w_low in t_lower:
            score += 3
            
    # Priority for canonical foundational academic articles
    if any(k in title_lower for k in ["computing", "architecture", "system", "security", "engineering", "network", "database", "algorithm", "learning", "intelligence"]):
        score += 8
        
    # Penalty for narrow specific SDKs if not explicitly requested
    if any(k in title_lower for k in ["firebase", "sdk", "library", "client", "plugin"]):
        if not any(k in " ".join(topic_words).lower() for k in ["firebase", "sdk"]):
            score -= 15
            
    return score

def deep_research_topic(topic: str, course_name: str = "") -> Dict[str, Any]:
    """
    Performs deep live web research for ANY academic or technical topic.
    Returns:
      {
         "primary_title": "Cloud computing",
         "summary": "...",
         "sections": {
             "Service models": [...],
             "Deployment models": [...],
             "Security and privacy": [...],
             ...
         },
         "related_articles": [...]
      }
    """
    queries = extract_search_queries(topic, course_name)
    all_topic_words = [w for w in clean_term(f"{topic} {course_name}").split() if w.lower() not in STOP_WORDS]
    
    candidate_matches = []
    
    for q in queries:
        results = fetch_wiki_search_results(q, limit=4)
        for r in results:
            title = r.get("title", "")
            snippet = r.get("snippet", "")
            score = score_article_relevance(title, snippet, all_topic_words)
            candidate_matches.append((score, title, snippet))
            
    if not candidate_matches:
        # Fallback to query directly
        candidate_matches.append((1, topic, ""))
        
    # Sort by relevance score descending
    candidate_matches.sort(key=lambda x: x[0], reverse=True)
    best_title = candidate_matches[0][1]
    
    print(f"[Deep Research] Best matched Wikipedia article: '{best_title}' (Score: {candidate_matches[0][0]})")
    
    research_data = fetch_wiki_page_details(best_title)
    research_data["primary_title"] = best_title
    research_data["queries_used"] = queries
    research_data["related_articles"] = list(dict.fromkeys([m[1] for m in candidate_matches if m[1] != best_title]))[:5]
    
    # Also fetch second best article if primary has few sections
    if len(research_data.get("sections", {})) < 4 and len(candidate_matches) > 1:
        second_title = candidate_matches[1][1]
        print(f"[Deep Research] Supplementing with second article: '{second_title}'")
        sec_data = fetch_wiki_page_details(second_title)
        for s_k, s_v in sec_data.get("sections", {}).items():
            if s_k not in research_data["sections"]:
                research_data["sections"][s_k] = s_v

    return research_data
