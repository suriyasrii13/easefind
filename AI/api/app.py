from flask import Flask, request, jsonify
import sys
import os

# Add parent directory to path so that utils can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.feature_extractor import extract_image_features
from utils.matcher import match_image_features, deep_text_similarity
from utils.voice_parser import parse_voice_transcript
from utils.image_verifier import verify_image_authenticity

app = Flask(__name__)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/matchAI", methods=["POST"])
def match_ai():

    lost_image = request.files.get("lost_image")
    found_image = request.files.get("found_image")

    lost_description = request.form.get("lost_description", "")
    found_description = request.form.get("found_description", "")

    lost_path = None
    found_path = None
    image_score = 0.0

    if lost_image and found_image:
        lost_path = os.path.join(UPLOAD_FOLDER, lost_image.filename)
        found_path = os.path.join(UPLOAD_FOLDER, found_image.filename)
        lost_image.save(lost_path)
        found_image.save(found_path)

        # Deep Image similarity
        lost_features = extract_image_features(lost_path)
        found_features = extract_image_features(found_path)
        image_score = match_image_features(lost_features, found_features)

    # Deep Semantic Text similarity
    text_score = deep_text_similarity(lost_description, found_description)

    # Hybrid scoring
    if lost_path and found_path:
        # We now trust the max of the two OR the weighted average to increase sensitivity
        final_score = round((0.5 * image_score + 0.5 * text_score), 2)
    else:
        # Text-only match
        final_score = text_score
    
    # Boost: If descriptions are highly similar, ensure it's at least a medium match
    if text_score > 0.8:
        final_score = max(final_score, 0.7)

    print(f"DEBUG AI: Comparing '{lost_description}' VS '{found_description}'")
    print(f"DEBUG AI: -> Image: {image_score}, Text: {text_score}, Final: {final_score}")

    if final_score > 0.85:
        status = "High Confidence"
    elif final_score >= 0.75:
        status = "Potential Match"
    else:
        status = "Low Confidence (Filtered)"

    return jsonify({
        "image_score": image_score,
        "text_score": text_score,
        "final_score": final_score,
        "status": status
    })

from utils.chat_engine import get_smart_response

@app.route("/chat", methods=["POST"])
def semantic_chat():
    data = request.get_json()
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query' field"}), 400
        
    user_query = data["query"]
    response_text = get_smart_response(user_query)
    
    return jsonify({
        "response": response_text
    })

from utils.moderator import generate_security_script

@app.route("/moderate", methods=["POST"])
def moderate_chat():
    data = request.get_json()
    lost_desc = data.get("lost_desc", "")
    found_desc = data.get("found_desc", "")
    
    bot_message = generate_security_script(lost_desc, found_desc)
    
    return jsonify({
        "message": bot_message
    })

@app.route("/voice", methods=["POST"])
def voice_parse():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' field"}), 400
        
    transcript = data["text"]
    print(f"VOICE_AI -> Processing transcript: '{transcript}'")
    
    try:
        result = parse_voice_transcript(transcript)
        print(f"VOICE_AI -> Parse Result: {result}")
        return jsonify(result)
    except Exception as e:
        print(f"VOICE_AI -> Error: {str(e)}")
        return jsonify({"error": f"Internal AI error: {str(e)}"}), 500

@app.route("/verify-image", methods=["POST"])
def verify_image():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
        
    image_file = request.files["image"]
    temp_path = os.path.join(UPLOAD_FOLDER, "verify_" + image_file.filename)
    image_file.save(temp_path)
    
    try:
        result = verify_image_authenticity(temp_path)
        os.remove(temp_path) # Cleanup
        return jsonify(result)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=5000, host='0.0.0.0', debug=True)
