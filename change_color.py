import re

with open('frontend/src/pages/form/LandingPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all hex codes
content = content.replace('#00ff41', '#d4a843')
content = content.replace('rgba(0,255,65,', 'rgba(212,168,67,')
content = content.replace('#009922', '#a6802e')

with open('frontend/src/pages/form/LandingPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
