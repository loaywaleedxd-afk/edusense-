"""Fix color issues in doctor_page and components"""
import re

# Fix doctor_page.py
print("Fixing doctor_page.py...")
with open('gui/pages/doctor_page.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all + "cc", + "22", etc. transparency suffixes
content = re.sub(r'\+ ["\'][0-9a-f]{2}["\']', '', content)

with open('gui/pages/doctor_page.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Fixed doctor_page.py")

# Fix components.py
print("Fixing components.py...")
with open('gui/components.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove transparency suffixes
content = re.sub(r'\+ ["\'][0-9a-f]{2}["\']', '', content)

with open('gui/components.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Fixed components.py")

print("\n✅ All fixes applied! Now run: python gui/app.py")
