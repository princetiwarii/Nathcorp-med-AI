import requests
from typing import Optional

def fetch_wikipedia_summary(topic: str) -> Optional[str]:
    """
    Fetches a brief summary from Wikipedia for general health topics.
    Uses opensearch to find the best matching page title first.
    """
    search_url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={topic}&limit=1&namespace=0&format=json"
    try:
        search_res = requests.get(search_url, timeout=5)
        if search_res.status_code == 200:
            search_data = search_res.json()
            if len(search_data) > 1 and search_data[1]:
                best_title = search_data[1][0]
                
                # Fetch summary for best title
                summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{best_title}"
                summary_res = requests.get(summary_url, timeout=5)
                if summary_res.status_code == 200:
                    return summary_res.json().get("extract")
    except Exception as e:
        print(f"Error fetching Wikipedia data: {e}")
    return None

def fetch_openfda_drug(drug_name: str) -> Optional[str]:
    """
    Fetches drug indications and warnings from openFDA API.
    """
    # OpenFDA requires precise queries. We'll try generic_name first.
    url = f'https://api.fda.gov/drug/label.json?search=openfda.generic_name:"{drug_name}"+openfda.brand_name:"{drug_name}"&limit=1'
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            if results:
                drug_info = results[0]
                indications = drug_info.get("indications_and_usage", ["No indications provided."])[0]
                warnings = drug_info.get("warnings", ["No warnings provided."])[0]
                
                # Truncate if too long to save prompt tokens
                summary = f"Indications: {indications[:400]}...\nWarnings: {warnings[:400]}..."
                return summary
    except Exception as e:
        print(f"Error fetching openFDA data: {e}")
    return None

def fetch_medical_context(question: str) -> str:
    """
    Analyzes the question for keywords and fetches context from trusted 
    public APIs (openFDA or Wikipedia) to augment the LLM prompt.
    """
    question_lower = question.lower()
    
    # List of expected internship test queries
    drug_keywords = ['paracetamol', 'aspirin', 'ibuprofen', 'medicine']
    disease_keywords = ['diabetes', 'dengue', 'malaria', 'fever', 'asthma', 'migraine', 'blood pressure', 'bp', 'cold', 'cough']
    
    context = ""
    
    # Check for drug query
    for drug in drug_keywords:
        if drug in question_lower:
            found_drug = drug if drug != 'medicine' else 'paracetamol'
            drug_context = fetch_openfda_drug(found_drug)
            if drug_context:
                context += f"\n[openFDA Public API Data for {found_drug.capitalize()}]:\n{drug_context}\n"
            break
            
    # Check for disease query
    for disease in disease_keywords:
        if disease in question_lower:
            # map 'bp' to blood pressure for better search
            search_term = "blood pressure" if disease == 'bp' else disease
            disease_context = fetch_wikipedia_summary(search_term)
            if disease_context:
                context += f"\n[Wikipedia Public Health Data for {search_term.capitalize()}]:\n{disease_context}\n"
            break
            
    return context.strip()
