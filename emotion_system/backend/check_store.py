import json
d = json.load(open('../store.json', encoding='utf-8'))
print('Keys:', list(d.keys()))
students = d.get('students', [])
print(f'Students: {len(students)}')
if students:
    s = students[0]
    print('Sample:', {k: s[k] for k in ['id','name','email','dept','year'] if k in s})
