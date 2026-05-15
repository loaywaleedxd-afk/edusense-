"""Quick fix for login - makes DataStore read users from store.json"""
import re

with open('gui/data_store.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the user loading section
old = 'default_users={u["username"] for u in self.users}'
new = '''stored_users = data.get("users", [])
            if stored_users:
                stored_usernames = {u["username"] for u in stored_users}
                kept = [u for u in self.users if u["username"] not in stored_usernames]
                self.users = kept + stored_users
            #'''

if old in content:
    # Find the whole block and replace it
    pattern = r'default_users=\{u\["username"\] for u in self\.users\}.*?existing\["password"\]=u\["password"\]; break'
    replacement = '''stored_users = data.get("users", [])
            if stored_users:
                stored_usernames = {u["username"] for u in stored_users}
                kept = [u for u in self.users if u["username"] not in stored_usernames]
                self.users = kept + stored_users'''
    
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    with open('gui/data_store.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Fixed! Now run: python gui/app.py")
else:
    print("Already fixed or pattern not found!")
    print("Trying alternative fix...")
    
    # Direct replacement
    content = re.sub(
        r'default_users=\{.*?\}.*?for u in data\.get\("users",\[\]\):.*?existing\["password"\]=u\["password"\]; break',
        '''stored_users = data.get("users", [])
            if stored_users:
                stored_usernames = {u["username"] for u in stored_users}
                kept = [u for u in self.users if u["username"] not in stored_usernames]
                self.users = kept + stored_users''',
        content,
        flags=re.DOTALL
    )
    
    with open('gui/data_store.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("✅ Fixed with alternative method!")
