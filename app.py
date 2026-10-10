import os
import requests
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/scan', methods=['POST'])
def scan_image():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image provided"}), 400
            
        base64_image_url = data['image']
        # Extract the base64 string without the prefix
        if ',' in base64_image_url:
            base64_image = base64_image_url.split(',')[1]
        else:
            base64_image = base64_image_url
            
        mimetype = "image/jpeg"
        
        prompt = "What is the primary animal or plant in this image? Reply strictly in this format: Common Name | Comma-separated list of all specific countries where it naturally lives. Keep it very short. Example: Tiger | India, Russia, Indonesia, Malaysia"
        
        payload = {
            "model": "local-model",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mimetype};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "temperature": 0.1,
            "max_tokens": 100
        }
        
        lm_response = requests.post("http://localhost:1234/v1/chat/completions", json=payload)
        
        if lm_response.status_code != 200:
            return jsonify({"error": f"LM Studio Error: {lm_response.text}"}), 500
            
        data = lm_response.json()
        text_result = data['choices'][0]['message']['content'].strip()
        print(f"RAW AI RESPONSE: {text_result}")
        
        if not text_result:
            text_result = "Unknown Entity | Unknown"
            
        text_clean = text_result.replace("The image shows a", "").replace("This is a", "").strip(" .")
        
        parts = text_clean.split('|')
        name = parts[0].strip() if len(parts) > 0 else "Unknown Entity"
        habitat_query = parts[1].strip() if len(parts) > 1 else ""
            
        result = {
            "name": name,
            "habitat_query": habitat_query,
            "scientific_name": "Searching Database...",
            "type": "unknown",
            "confidence": 0.88,
            "origin": habitat_query if habitat_query else "Refer to Wiki Summary below",
            "diet": "Refer to Wiki Summary below",
            "status": "Refer to Wiki Summary below"
        }
        
        return jsonify(result)
        
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to LM Studio. Is the Local Server running on port 1234?"}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, port=5000)
