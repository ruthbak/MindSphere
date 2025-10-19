# railway_api/fix_imports.py
# Automated script to fix import errors in route files

import os
import re

IMPORT_FIX = """import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

"""

def fix_file(filepath):
    """Fix imports in a single file"""
    if not os.path.exists(filepath):
        print(f"⚠️  {filepath} not found, skipping...")
        return
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already fixed
    if 'sys.path.insert' in content:
        print(f"✅ {filepath} already fixed")
        return
    
    # Find the line after the file comment
    lines = content.split('\n')
    insert_index = 0
    
    # Skip file comment at the top
    for i, line in enumerate(lines):
        if line.strip() and not line.strip().startswith('#'):
            # Found first non-comment line
            if line.startswith('from ') or line.startswith('import '):
                insert_index = i
                break
    
    # Insert the path fix before first import
    lines.insert(insert_index, IMPORT_FIX.rstrip())
    
    # Join back and fix relative imports
    new_content = '\n'.join(lines)
    
    # Replace ..module with module (parent relative imports)
    new_content = re.sub(r'from \.\.(\w+) import', r'from \1 import', new_content)
    
    # Replace .module with module (sibling relative imports) 
    new_content = re.sub(r'from \.(\w+) import', r'from \1 import', new_content)
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"✅ Fixed {filepath}")

print("🔧 Fixing import errors in route files...\n")

# List of route files to fix
route_files = [
    'routes/avatars.py',
    'routes/mood.py',
    'routes/geolocation.py',
    'routes/professionals.py',
    'routes/communities.py',
    'routes/messaging.py'
]

# Fix each file
for filepath in route_files:
    fix_file(filepath)

print("\n" + "="*50)
print("🎉 Import fix complete!")
print("="*50)
print("\n📝 Next steps:")
print("1. Run: python main_modular.py")
print("2. Visit: http://localhost:8000/docs")
print("3. You should see all 63 endpoints!\n")