"""Import real credentials — matches by email since students already exist with wrong usernames."""
import sqlite3, os

DB = os.path.join(os.path.dirname(__file__), "emotion_system.db")

DOCTOR_CREDS = [
    ('dr.ahmed',  'Ahmed@2024',  'Dr. Ahmed Smith',  'ahmed@university.edu'),
    ('dr.laila',  'Laila@2024',  'Dr. Laila Hassan', 'laila@university.edu'),
    ('dr.khalid', 'Khalid@2024', 'Dr. Khalid Omar',  'khalid@university.edu'),
    ('dr.sara',   'Sara@2024',   'Dr. Sara Nour',    'sara@university.edu'),
]

STUDENT_CREDS = [
    ('231006367.0','gAC72qFl','محمد علاء لطفى'),
    ('231015291.0','41sNLjVH','بيشوى مرقس حبيب'),
    ('231014184.0','WGaub52Z','مرام تامر عبدالحى'),
    ('231014670.0','td26fEeV','رضوى شريف حماد'),
    ('231006507.0','VhDIq2An','ندى شريف ابراهيم'),
    ('231005837.0','HTmt9OBG','مريم وائل البورصلى'),
    ('231006798.0','hnuKoneN','حسين هشام فريد'),
    ('231004345.0','o41eoPni','فرح ياسر ابراهيم'),
    ('231014067.0','6JDWYlgA','زينه محمد ابراهيم'),
    ('231005936.0','ACTP9gyv','مريم محمد سالم'),
    ('231004779.0','1plBArp5','ماريو رافت عياد'),
    ('231014972.0','B1Id9Z85','براء ايمن عبدالعظيم'),
    ('231006982.0','0kEnydx9','ندى محمد ابراهيم'),
    ('231006760.0','qWCA79IS','نور رضا ابوالخير'),
    ('231005898.0','js8JHUdK','معاذ وائل سلام'),
    ('231005756.0','F0j7elKP','شهد اسامه سعود'),
    ('231006916.0','oh3pKMzK','عبدالله خالد عمار'),
    ('231006688.0','G5mSoyPs','بلال اشرف حسن'),
    ('231006359.0','tUeC99en','انس مصطفى مكاوى'),
    ('231004095.0','q522wjZR','جون ماجد لبيب'),
    ('231005820.0','L9OaYsP6','عمر خالد يوسف'),
    ('231006309.0','ihgIqLSm','اروى يحيى سالمه'),
    ('231006563.0','NqE40fAr','محمود عمرو احمد'),
    ('231002467.0','aVNqTIAa','شيرين احمد حسنين'),
    ('231007895.0','e24HZKjh','ناريمان عادل الازهرى'),
    ('231014770.0','t3X13npg','فريده احمد سليم'),
    ('231015308.0','W2zMj518','عمر شريف الادهم'),
    ('231004836.0','Y2bTu5X1','لؤى وليد ابوالمعاطى'),
    ('231005027.0','YqWg21nY','ميرا عاطف صالح'),
    ('231004160.0','CsXoblu1','عبدالله محمد شتات'),
    ('231014083.0','7rNy8H6h','هنا ايهاب على'),
    ('231014373.0','LFxJpRa5','محمود احمد شلبى'),
    ('231006822.0','HSUPwePu','عبدالله عماد حسن'),
    ('231006766.0','t0Sstzys','زياد السيد حسن'),
    ('231014466.0','hA6P3MsH','روان طارق ابوالدهب'),
    ('231006844.0','arAJOCBn','ادهم هانى اسماعيل'),
    ('231004206.0','D3XkfFNu','ريم حسين حسن'),
    ('231006901.0','YUPnmbpD','زياد خالد احمد'),
    ('231006804.0','0ezNmREp','مارك هانى ابادير'),
    ('241004978.0','OaUVgAk7','عمر علاء الصناديدى'),
    ('231014763.0','Gdp0CXP9','يوستينا ممدوح مينا'),
    ('231005601.0','K63LSFZH','امال يوسف صالح'),
    ('232004221.0','MrerqtHi','اسماء عادل بيومى'),
    ('231006154.0','oRRdzHzm','ليندا احمد مصيلحى'),
    ('231008132.0','A4KR1Vxa','مروان عبدالمنعم عبدالمنعم'),
    ('231004918.0','vU07zUHL','محمد اسلام على'),
    ('231005865.0','nnBbuQzk','ضحى ايمن حسن'),
    ('231015004.0','ChMbyIbN','محمد احمد التهامى'),
    ('231014462.0','iCdxnuVx','تسنيم احمد الوزير'),
    ('231014761.0','UZpfbH9v','همسه اشرف السخي'),
    ('231006502.0','OWOU6mbj','بسمله محمد محمد'),
    ('231006272.0','hPInRVkL','احمد خورشيد ميهوب'),
    ('231004567.0','UhY7gbtP','ياسين شريف الجوهري'),
    ('231005711.0','0Lh8WvAw','باسل اسامه سليمان'),
    ('211014850.0','Fv0Yg7NZ','مروان محمد خلف'),
    ('231006900.0','RBT7qYHD','للوار صادق حسين'),
    ('231014783.0','BTq0Zf2p','منه الله عطيه'),
    ('231005915.0','CLxb0lnX','احمد فوزى الياسرجى'),
    ('231014666.0','v2Rra6fS','نور احمد محمد'),
    ('231006613.0','EVQOEXfn','جنى محمد رياض'),
    ('231017969.0','QsKDGAUu','انجى على طه'),
    ('231006601.0','RqphlhHV','نورالهدى اشرف محمود'),
    ('231006131.0','lnES8Grg','عمر حسام جاد'),
    ('231015037.0','molaHr8I','اسراء عمرو سلامه'),
    ('231014860.0','Rh1E2JDB','رنا ياسر عفيفي'),
    ('231004649.0','djIs9hVL','على سيد حسانين'),
    ('231004431.0','MLT6mnOj','ياسين وفيق طولان'),
    ('231014259.0','keaBKsoR','مهاب امين حجازى'),
    ('231014599.0','RCQ5WMO5','يوسف احمد الصواف'),
    ('231006928.0','AHO4Zekt','كريم محمد فتيح'),
    ('231006417.0','UJrhQR6F','مروان محمد الشامى'),
    ('231014691.0','EecAtpf7','زياد ايهاب احمد'),
    ('231014324.0','ZJ69PqcU','نديم كامل كامل'),
    ('231006879.0','DO4lKNEf','ياسين تامر عبدالحميد'),
    ('231005689.0','vuP1uRr6','ريتاج على على'),
    ('231005430.0','YICtu8zF','مهند وليد نصار'),
    ('231004387.0','9OHzlwUM','يوسف حسين نور'),
    ('231004747.0','VmI5BRh8','جيداء مجدى الخشاب'),
    ('231006572.0','LojIIf94','زياد محمد همام'),
    ('231004727.0','ChZESFqZ','مروان وليد حجاج'),
    ('231005789.0','8pIx5F21','روان عاطف حسن'),
    ('231014241.0','rWz5FYrs','مصطفى وليد الخولي'),
    ('231004224.0','K9EjHvIH','عمر نشأت على'),
    ('231014002.0','CtlRJoWc','سما سيد سليمان'),
    ('231014849.0','URYxPY8E','ديفيد عاطف مكاريوس'),
    ('231014025.0','SzOjD8uQ','ندى عبدالعزيز امنه'),
    ('231014449.0','O001xtSV','يوسف كريم محمد'),
    ('231014457.0','2ceN59UA','زياد محمد مخلوف'),
    ('231006127.0','gN2BR4cX','ميرنا عبدالعظيم مصطفى'),
    ('231004285.0','sxjGJXke','عبدالله اشرف عبدالعزيز'),
    ('231005940.0','1Mo4iCpp','مصطفى محمد جبر'),
    ('231014744.0','aX3QjBvK','محمد احمد مرسي'),
    ('231006574.0','NAp0mxDo','ليال احمد موسى'),
    ('231006950.0','JJ9s8OrJ','يوسف محمد نحله'),
    ('231014539.0','QUdLE4rX','ياسين السيد الهادى'),
    ('231005333.0','LvNMQSOZ','ضحى محمود ضيف'),
    ('231005400.0','M4OtBJTf','شهد محمد جبريل'),
    ('231014166.0','sUkiH8G4','نور احمد الجندى'),
    ('231006335.0','7i71S87X','محمد ياسر فرج'),
    ('231006825.0','wXaHCPPK','انس محمد ستيت'),
    ('231014647.0','Y6gob2I4','عبدالرحمن سيد توفيق'),
    ('231014333.0','ndZ4szi6','عبدالرحمن طارق نور'),
    ('231004419.0','sEg3iCPU','نور خالد خليف'),
    ('231015069.0','6zUjzgEz','ساره رائف عبدالسلام'),
    ('231006012.0','6cwB61gQ','حازم اسامه حجاج'),
    ('231014590.0','H8wylh0C','يوسف عبدالمنعم سالمان'),
    ('231006511.0','PNLbWphJ','زيد محمد حامد'),
    ('231006695.0','eVmn1uj3','عمر عماد الحبشى'),
    ('231016666.0','aWoukdTG','ملك احمد ابراهيم'),
    ('231006856.0','UDWFgF6c','يوسف محمد ابراهيم'),
    ('231014342.0','W1GC7dDy','فاطمه خليل خليل'),
    ('231005501.0','QE4efLer','نانسى محمد عرفات'),
    ('231015218.0','NHu9GCLg','عبدالرحمن محمد عبدالنبى'),
    ('231004713.0','R0OVSnBo','يحيى احمد الحاوى'),
    ('231014786.0','vCzfAPxj','احمد محمد محمد'),
    ('231005073.0','5eZffTYI','عبدالرحمن محمد الصاوى'),
    ('231014755.0','KIuhvPU1','عبدالرحمن احمد عليوه'),
    ('231006586.0','S8LvJnOn','رقيه حمدى ربه'),
    ('231014395.0','g0wVJY08','احمد فاروق دنيا'),
]

db = sqlite3.connect(DB)
db.execute("PRAGMA journal_mode=WAL")

# Fix admin and parent
db.execute("UPDATE users SET password='admin' WHERE username='admin'")
db.execute("INSERT OR IGNORE INTO users (username,password,role,full_name,email) VALUES ('admin','admin','admin','System Administrator','admin@university.edu')")
db.execute("INSERT OR IGNORE INTO users (username,password,role,full_name,email) VALUES ('parent','parent','parent','Parent User','parent@university.edu')")
db.execute("UPDATE users SET password='parent' WHERE username='parent'")

# Fix doctors
for uname, pwd, name, email in DOCTOR_CREDS:
    db.execute("INSERT OR IGNORE INTO users (username,password,role,full_name,email) VALUES (?,?,'doctor',?,?)", (uname,pwd,name,email))
    db.execute("UPDATE users SET password=?, full_name=? WHERE username=?", (pwd,name,uname))

updated = 0
not_found = 0

# Students: the email is already in the DB as "{numeric_id}@university.edu"
# We UPDATE username + password by matching on email
for uname, pwd, name in STUDENT_CREDS:
    email = uname + '@university.edu'
    cur = db.execute("UPDATE users SET username=?, password=?, full_name=? WHERE email=?", (uname, pwd, name, email))
    if cur.rowcount > 0:
        updated += 1
    else:
        # Not found by email — try inserting fresh
        try:
            db.execute("INSERT INTO users (username,password,role,full_name,email) VALUES (?,?,'student',?,?)", (uname,pwd,name,email))
            updated += 1
        except Exception as e:
            not_found += 1

db.commit()
db.close()

print(f"Students updated: {updated}, not found: {not_found}")
print("\nAll credentials ready:")
print("  admin          / admin")
print("  parent         / parent")
print("  dr.ahmed       / Ahmed@2024")
print("  dr.laila       / Laila@2024")
print("  231014184.0    / WGaub52Z   (demo student)")
