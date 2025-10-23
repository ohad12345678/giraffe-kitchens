# 🔧 תיקון Database ב-Railway - שמירת כל הנתונים

## הבעיה
חסרה עמודה `manager_name` בטבלה `manager_reviews` ב-database של Railway.

## הפתרון - הוספת העמודה בלי למחוק כלום!

### שלב 1: פתח Shell ב-Railway

1. Railway Dashboard → giraffe-backend
2. לחץ על הdeployment האחרון
3. לחץ על "⚙️" → "Shell"

### שלב 2: הוסף את העמודה החסרה

בטרמינל שנפתח, הרץ:

```bash
sqlite3 /data/giraffe_kitchens.db "ALTER TABLE manager_reviews ADD COLUMN manager_name VARCHAR(255);"
```

### שלב 3: וודא שהעמודה נוספה

```bash
sqlite3 /data/giraffe_kitchens.db "PRAGMA table_info(manager_reviews);" | grep manager_name
```

אתה אמור לראות שורה עם `manager_name`.

### שלב 4: Restart (לא Redeploy!)

- חזור לדף הראשי של giraffe-backend
- Settings → Restart

---

## זהו!

✅ כל הנתונים נשמרו
✅ העמודה החסרה נוספה
✅ הכל יעבוד

---

## אם sqlite3 לא זמין בcontainer:

אז נריץ Python script:

```bash
python3 << 'PYEOF'
import sqlite3
conn = sqlite3.connect('/data/giraffe_kitchens.db')
cursor = conn.cursor()
try:
    cursor.execute("ALTER TABLE manager_reviews ADD COLUMN manager_name VARCHAR(255)")
    conn.commit()
    print("✅ Column added successfully!")
except Exception as e:
    print(f"Error: {e}")
    if "duplicate column" in str(e):
        print("✅ Column already exists!")
conn.close()
PYEOF
```

---

## לבדוק שהכל עובד:

1. נסה ליצור הערכת מנהל
2. נסה AI Summary
3. נסה Chat

הכל אמור לעבוד!
