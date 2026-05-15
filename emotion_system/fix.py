import re

path = "gui/pages/login_page.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove letter_spacing line completely
content = re.sub(r",\s*\n\s*letter_spacing=\d+", "", content)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed successfully!")
