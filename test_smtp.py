import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
import main

path = os.path.abspath(os.path.join('frontend/src/assets/scanner.jpeg'))
print("Path exists?", os.path.exists(path))

html = """
<html><body>
<h2>Test</h2>
<img src="cid:scanner_img" alt="Scanner">
</body></html>
"""

ok, msg = main.send_via_smtp('dt@darshathoughtways.com', 'Scanner Test', html, path)
print("Result:", ok, msg)
