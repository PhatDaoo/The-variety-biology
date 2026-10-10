# Bio-Scanner HUD 🌍🔬

A futuristic, Iron Man-style biological scanner web application. It uses your device's camera to capture an image of an animal or plant, analyzes it using a Local AI Vision model, retrieves biological data from Wikipedia, and maps its natural habitat onto an interactive 3D Holographic Globe.

## 🚀 Features
* **Cyberpunk / Sci-Fi HUD Interface**: Smooth CSS animations and responsive design.
* **Local AI Processing**: Completely offline image analysis, ensuring privacy and bypassing API rate limits.
* **3D Global Habitat Mapping**: Automatically translates AI habitat data into glowing geographic polygons on a 3D Earth using `Globe.gl`.
* **Mobile & iPad Ready**: Optimized image compression (400x400px base64) to drastically speed up AI inference over local WiFi.

## 🛠️ Prerequisites

1. **Python 3.x**
2. **LM Studio** (For running the Local AI)

## 🧠 Setup LM Studio (The AI Brain)
This project relies on a local LLM to analyze images.
1. Download and install [LM Studio](https://lmstudio.ai/).
2. Search and download a Vision Model. Recommended: **`Qwen2.5-VL-7B-Instruct-GGUF`** (Provides the best JSON formatting and image recognition).
3. Go to the "Local Server" tab in LM Studio.
4. Set the port to `1234` (Default).
5. **Important**: Turn on **CORS** in the server settings if accessing from other devices.
6. Click **Start Server**.

## 💻 Installation & Running

1. Clone this repository to your machine.
2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Flask server:
   ```bash
   python app.py
   ```
4. Open your browser and go to: `http://localhost:5000`
   *(To access via phone/iPad on the same WiFi, find your PC's IPv4 address, e.g., `http://192.168.1.X:5000`)*

## 📂 Project Structure
* `app.py`: The Flask backend. Bridges the frontend with LM Studio and handles prompt engineering.
* `static/js/main.js`: The nervous system. Handles camera streams, image compression, API calls, and 3D Globe rendering.
* `static/css/style.css`: The styling. Creates the Iron Man HUD aesthetic.
* `templates/index.html`: The structural layout of the HUD.
