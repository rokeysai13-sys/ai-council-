import sys
import uuid
import requests
import json
import os

def test_vector_store():
    print("Testing Vector Store Core...")
    try:
        from memory.vector_store import store_document, search_memory, retrieve_for_rag
    except ImportError as e:
        print(f"Error importing vector store: {e}")
        return False

    unique_token = f"TOKEN_{uuid.uuid4().hex[:8]}"
    secret_text = f"The secret recipe for futuristic dessert {unique_token} is marshmallow fluff."
    
    print(f"Storing test document with secret: {unique_token}")
    res = store_document(secret_text, source="verify_rag_test_doc", doc_type="test")
    print(f"Store result: {res}")
    
    if not res.get("success"):
        print("Failed to store document.")
        return False
        
    print("Searching for the stored document...")
    search_res = search_memory(f"recipe for futuristic dessert {unique_token}", n_results=1, collection="documents")
    print(f"Search result: {search_res}")
    
    if not search_res.get("success") or not search_res.get("results"):
        print("Failed to search/retrieve document.")
        return False
        
    found_text = search_res["results"][0]["text"]
    distance = search_res["results"][0].get("distance", 1.0)
    print(f"Found text: '{found_text}' with distance {distance}")
    if unique_token not in found_text:
        print("Stored unique token not found in search results.")
        return False
        
    print("Vector Store Core test PASSED!")
    return unique_token

def test_rag_prompt_builder(unique_token):
    print("\nTesting RAG Prompt Builder...")
    try:
        from core.rag import build_rag_prompt
    except ImportError as e:
        print(f"Error importing build_rag_prompt: {e}")
        return False
        
    query = f"What is the recipe for futuristic dessert {unique_token}?"
    base_prompt = "Please reply with the recipe ingredients."
    
    enhanced = build_rag_prompt(query, base_prompt)
    print(f"Enhanced prompt:\n{enhanced}\n")
    
    if unique_token not in enhanced:
        print("RAG Context Injection FAILED: unique token not found in enhanced prompt.")
        return False
        
    print("RAG Prompt Builder test PASSED!")
    return True

def test_api_ingest_and_stream():
    print("\nTesting API Ingest and Streaming (Multi-process Verification)...")
    
    unique_token = f"TOKEN_API_{uuid.uuid4().hex[:8]}"
    secret_text = f"The secret recipe for futuristic dessert {unique_token} is marshmallow fluff."
    
    # Write to a temp file
    temp_filename = "temp_secret_rag_doc.txt"
    with open(temp_filename, "w", encoding="utf-8") as f:
        f.write(secret_text)
        
    abs_temp_path = os.path.abspath(temp_filename)
    print(f"Created temp file: {abs_temp_path}")
    
    # Ingest via API
    ingest_url = "http://localhost:8000/rag/ingest"
    ingest_payload = {"path": abs_temp_path}
    try:
        res = requests.post(ingest_url, json=ingest_payload, timeout=30)
        print(f"Ingest API response: {res.status_code} - {res.json()}")
        if res.status_code != 200 or not res.json().get("success"):
            print("Failed to ingest document via API.")
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
            return False
    except Exception as e:
        print(f"Failed to call ingest API: {e}")
        if os.path.exists(temp_filename):
            os.unlink(temp_filename)
        return False
        
    # Verify search via API
    search_url = "http://localhost:8000/rag/search"
    try:
        search_res = requests.get(search_url, params={"q": f"recipe for futuristic dessert {unique_token}", "n": 3}, timeout=30)
        print(f"Search API response: {search_res.status_code} - {search_res.json()}")
    except Exception as e:
        print(f"Failed to search via API: {e}")
        
    # Query streaming agent
    url = "http://localhost:8000/chat/agent"
    payload = {
        "message": f"What is the recipe for futuristic dessert {unique_token}? Respond with the ingredients.",
        "stream": True,
        "session_id": "test_verification_session"
    }
    
    success = False
    try:
        r = requests.post(url, json=payload, stream=True, timeout=30)
        if r.status_code != 200:
            print(f"API returned HTTP {r.status_code}")
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
            return False
            
        print("Streaming tokens:")
        full_reply = ""
        for line in r.iter_lines():
            if line:
                decoded = line.decode('utf-8')
                if decoded.startswith("data: "):
                    data_str = decoded[6:]
                    try:
                        data = json.loads(data_str)
                        if data.get("type") == "token":
                            token = data.get("text", "")
                            print(token, end="", flush=True)
                            full_reply += token
                        elif data.get("type") == "error":
                            print(f"\nStream error token: {data.get('text')}")
                    except Exception as e:
                        pass
        print("\nFinished stream.")
        print(f"Full reply: '{full_reply}'")
        
        if "marshmallow" in full_reply.lower() or "fluff" in full_reply.lower():
            print("API Streaming RAG test PASSED!")
            success = True
        else:
            print(f"API Streaming response did not contain the ingredients 'marshmallow fluff'.")
            success = False
    except Exception as e:
        print(f"API test failed: {e}")
        success = False
        
    # Clean up
    if os.path.exists(temp_filename):
        os.unlink(temp_filename)
    return success

if __name__ == "__main__":
    # 1. Run local core tests
    token = test_vector_store()
    if not token:
        sys.exit(1)
        
    if not test_rag_prompt_builder(token):
        sys.exit(1)
        
    # 2. Run API integration tests
    api_ok = test_api_ingest_and_stream()
    if api_ok:
        print("\nALL RAG VERIFICATIONS PASSED SUCCESSFULLY!")
    else:
        sys.exit(1)
