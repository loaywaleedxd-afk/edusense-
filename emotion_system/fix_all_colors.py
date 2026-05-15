"""Complete fix for all color transparency issues"""
import re
import os

files_to_fix = [
    'gui/pages/doctor_page.py',
    'gui/pages/parent_page.py',
    'gui/components.py',
    'gui/theme.py'
]

def fix_file(filepath):
    if not os.path.exists(filepath):
        print(f"⚠️  Skipping {filepath} (not found)")
        return
    
    print(f"Fixing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Pattern 1: Remove + "cc", + "22", etc. (transparency suffixes)
    content = re.sub(r'\s*\+\s*["\'][0-9a-fA-F]{2}["\']', '', content)
    
    # Pattern 2: Fix hover_color concatenations
    content = re.sub(r'hover_color\s*=\s*([a-zA-Z_\[\]"\']+)\s*\+\s*["\'][0-9a-fA-F]{2}["\']',
                     r'hover_color=\1', content)
    
    # Pattern 3: Fix fg_color concatenations
    content = re.sub(r'fg_color\s*=\s*([a-zA-Z_\[\]"\']+)\s*\+\s*["\'][0-9a-fA-F]{2}["\']',
                     r'fg_color=\1', content)
    
    # Pattern 4: Fix border_color concatenations  
    content = re.sub(r'border_color\s*=\s*([a-zA-Z_\[\]"\']+)\s*\+\s*["\'][0-9a-fA-F]{2}["\']',
                     r'border_color=\1', content)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✅ Fixed!")
    else:
        print(f"  ℹ️  No changes needed")

print("🔧 Fixing all color transparency issues...\n")

for filepath in files_to_fix:
    fix_file(filepath)

print("\n✅ All fixes applied!")
print("Now run: python gui/app.py")
