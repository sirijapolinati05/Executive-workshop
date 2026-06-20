import json
import urllib.request
import os

print("Testing locally...")
scanner_path = os.path.abspath(os.path.join("frontend/src/assets/scanner.jpeg"))
print("Scanner path:", scanner_path, os.path.exists(scanner_path))
