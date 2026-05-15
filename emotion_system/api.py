from flask import Flask, jsonify
from flask_cors import CORS
import json, os

app = Flask(__name__)
CORS(app)

STORE = os.path.join(os.path.dirname(__file__), "gui", "store.json")

@app.route("/api/store")
def get_store():
    with open(STORE, encoding="utf-8") as f:
        return jsonify(json.load(f))

if __name__ == "__main__":
    app.run(port=5050, debug=True)