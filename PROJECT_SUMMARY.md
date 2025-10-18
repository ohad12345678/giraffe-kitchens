# Giraffe Kitchens - Food Quality System
## סיכום פרויקט עד כה

### 📋 מטרת הפרויקט
מערכת לניהול בקרת איכות עבור רשת מסעדות ג'ירף קיטשן עם 9 סניפים.
המערכת מאפשרת למנהלים לבצע בדיקות איכות על מנות שהוכנו על ידי טבחים.

---

## 🏗️ ארכיטקטורה טכנית

### Backend
- **Framework:** FastAPI (Python)
- **Database:** SQLite + SQLAlchemy ORM
- **Authentication:** JWT tokens (python-jose)
- **Password Hashing:** pbkdf2_sha256
- **Migrations:** Alembic
- **Port:** http://127.0.0.1:8000

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v3.4.15
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Language:** Hebrew (RTL support)
- **Port:** http://localhost:5174

---

## 📁 מבנה הפרויקט

```
giraffe11/
├── giraffe-kitchen/
│   ├── giraffe-backend/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── deps.py          # JWT validation
│   │   │   │   └── v1/
│   │   │   │       ├── auth.py      # Login endpoint
│   │   │   │       ├── branches.py  # Branch management
│   │   │   │       ├── checks.py    # DishCheck CRUD
│   │   │   │       ├── chefs.py     # Chef management
│   │   │   │       └── dishes.py    # Dish management
│   │   │   ├── core/
│   │   │   │   ├── config.py        # Environment settings
│   │   │   │   └── security.py      # JWT + password hashing
│   │   │   ├── models/
│   │   │   │   ├── user.py          # User model + RBAC
│   │   │   │   ├── branch.py        # Branch model
│   │   │   │   ├── dish.py          # Dish model
│   │   │   │   ├── chef.py          # Chef model
│   │   │   │   └── dish_check.py    # DishCheck model
│   │   │   ├── schemas/
│   │   │   │   └── ...              # Pydantic schemas
│   │   │   ├── db.py                # Database session
│   │   │   └── main.py              # FastAPI app
│   │   ├── alembic/                 # Database migrations
│   │   ├── seed_data.py             # Database seeding
│   │   └── requirements.txt
│   │
│   └── giraffe-frontend/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Login.tsx        # דף התחברות
│       │   │   ├── Dashboard.tsx    # דף ראשי
│       │   │   └── NewCheck.tsx     # טופס בדיקה חדשה ⭐
│       │   ├── contexts/
│       │   │   └── AuthContext.tsx  # ניהול אימות
│       │   ├── services/
│       │   │   └── api.ts           # Axios setup
│       │   ├── components/
│       │   │   └── ProtectedRoute.tsx
│       │   ├── App.tsx              # Router config
│       │   └── index.css            # RTL + Hebrew fonts
│       ├── tailwind.config.js       # RTL direction
│       └── package.json
```

---

## 🗄️ מודלים במסד הנתונים

### 1. User (משתמשים)
- **תפקידים:** HQ (מטה) / BRANCH_MANAGER (מנהל סניף)
- **שדות:** id, email, password_hash, full_name, role, branch_id
- **הרשאות:**
  - HQ: רואה את כל הסניפים
  - מנהל סניף: רואה רק את הסניף שלו

### 2. Branch (סניפים)
- **9 סניפים:** תל אביב, ירושלים, חיפה, באר שבע, אילת, נתניה, ראשון לציון, פתח תקווה, אשדוד
- **שדות:** id, name, address, city, is_active

### 3. Dish (מנות)
- **קטגוריות:** מנה עיקרית, סלטים, קינוחים, משקאות
- **שדות:** id, name, description, category, is_active

### 4. Chef (טבחים)
- **שדות:** id, name, branch_id, is_active
- **כל סניף:** יש לו טבחים משלו

### 5. DishCheck (בדיקות איכות)
- **שדות:** id, dish_id, chef_id, branch_id, inspector_id, rating (1-10), comments, checked_at
- **מטרה:** תיעוד ומעקב אחר איכות המנות

---

## 🔐 אימות והרשאות

### פרטי התחברות לדמו
- **מטה (HQ):** `hq@giraffe.com` / `Giraffe2025!`
- **מנהל סניף תל אביב:** `telaviv@giraffe.com` / `giraffe123`
- **מנהל סניף ירושלים:** `jerusalem@giraffe.com` / `giraffe123`

### תהליך האימות
1. משתמש מזין email + password
2. Backend מאמת ויוצר JWT token
3. Token נשמר ב-localStorage
4. כל בקשה API מכילה את ה-Token ב-header
5. Backend מאמת Token ומחלץ פרטי משתמש

### JWT Token Structure
```json
{
  "sub": "1",           // User ID (string - חובה!)
  "email": "hq@giraffe.com",
  "role": "HQ",
  "branch_id": null,
  "exp": 1234567890
}
```

**⚠️ תיקון קריטי שביצענו:**
- JWT דורש ש-`sub` יהיה **string** ולא integer
- שינינו מ-`"sub": user.id` ל-`"sub": str(user.id)`
- זה פתר את שגיאת 401 Unauthorized

---

## 🎨 עיצוב UI/UX

### עיצוב מבוסס על RiseUp
- צבעים עיקריים: כתום-אדום (#FF4D00), לבן, אפור
- פונטים: Assistant (Hebrew), Heebo
- RTL layout מלא
- Responsive design
- Cards עם shadows ו-hover effects

### דפים קיימים

#### 1. Login (`/login`)
- טופס התחברות עברי מימין לשמאל
- שדות: אימייל, סיסמה
- כפתור "התחבר"
- הודעות שגיאה בעברית

#### 2. Dashboard (`/dashboard`)
- **Header:** ברוכים הבאים + שם המשתמש
- **בורר סניפים:** (HQ רואה את כל ה-9 סניפים)
- **סטטיסטיקות מהירות:**
  - בדיקות היום
  - ציון ממוצע
  - מנות נבדקו
  - התראות
- **כרטיסי פעולה:**
  - 🆕 **בדיקה חדשה** - עובר לטופס בדיקה
  - 📊 דוחות (בקרוב)
  - 👨‍🍳 טבחים (בקרוב)
  - 🍽️ מנות (בקרוב)
- **בדיקות אחרונות:** (בקרוב)

#### 3. New Check (`/new-check`) ⭐ **חדש!**
- **בחירת מנה:** Dropdown עם מנות דמו בעברית
  - המבורגר קלאסי
  - צ'יזבורגר
  - המבורגר BBQ
  - סלט קיסר
  - סלט ירקות
  - פיצה מרגריטה
  - שניצל
  - צ'יפס
  - טירמיסו
  - עוגת שוקולד

- **בחירת טבח:** Dropdown עם טבחים דמו בעברית
  - דוד
  - שרה
  - מיכאל
  - רחל
  - יוסי

- **דירוג:** 10 כוכבים אינטראקטיביים
  - Hover effect
  - Click לבחירה
  - ברירת מחדל: 10 כוכבים

- **הערות:** Textarea אופציונלי

- **כפתורים:**
  - ✅ שלח בדיקה (מציג alert וחוזר לדשבורד)
  - ❌ ביטול (חוזר לדשבורד)

---

## 🐛 באגים שתיקנו

### 1. Tailwind v4 Incompatibility
- **בעיה:** `Cannot apply unknown utility class 'bg-gray-50'`
- **פתרון:** שנמוך ל-Tailwind v3.4.15

### 2. Bcrypt Password Length
- **בעיה:** `password cannot be longer than 72 bytes`
- **פתרון:** החלפה ל-pbkdf2_sha256

### 3. Duplicate User Emails
- **בעיה:** `UNIQUE constraint failed: users.email`
- **פתרון:** emails ייחודיים לכל סניף (telaviv, jerusalem...)

### 4. JWT "Subject must be a string" ⭐ **קריטי**
- **בעיה:** `JWT Decode Error: Subject must be a string`
- **פתרון:** שינוי מ-`"sub": user.id` ל-`"sub": str(user.id)`
- **השפעה:** תיקון זה פתר את כל בעיות ה-401 Unauthorized

### 5. 401 After Login
- **בעיה:** Login succeeded but API calls got 401
- **פתרון:** אותו תיקון כמו #4

---

## ✅ מה עובד עכשיו

1. ✅ **התחברות מלאה:** Login + JWT + Protected Routes
2. ✅ **Dashboard עם בורר סניפים:** HQ רואה הכל
3. ✅ **ניווט לטופס בדיקה:** כפתור "בדיקה חדשה" עובד
4. ✅ **טופס בדיקה מלא:** מנות, טבחים, דירוג, הערות
5. ✅ **Flow מלא:** Login → Dashboard → New Check → Submit → Back
6. ✅ **RTL מלא:** כל הממשק בעברית מימין לשמאל
7. ✅ **RBAC:** תמיכה ב-HQ vs Branch Manager

---

## 🚧 מה עדיין לא מחובר

### לא מחובר למסד נתונים:
- ✅ **כוונה:** אתה אמרת במפורש **"אנחנו עובדים רק על הפלואו"**
- טופס הבדיקה משתמש ב-**mock data** (נתונים דמו)
- Submit מציג alert ולא שומר למסד נתונים
- Recent Checks בדשבורד מציג placeholder

### עוד לא בנוי:
- 📊 **דף דוחות:** גרפים, KPIs, השוואות בין סניפים
- 👨‍🍳 **ניהול טבחים:** הוספה/עריכה של טבחים
- 🍽️ **ניהול מנות:** הוספה/עריכה של מנות בתפריט
- 📥 **ייצוא לאקסל:** הורדת דוחות
- 🔔 **התראות בזמן אמת:** WebSocket
- 🚀 **Deployment:** Railway / Fly.io

---

## 🎯 הצעדים הבאים (לפי עדיפות)

### אופציה 1: חיבור Backend לטופס הבדיקה
- חיבור NewCheck.tsx ל-API
- שמירת בדיקות במסד נתונים
- טעינת מנות וטבחים אמיתיים מה-DB
- הצגת Recent Checks אמיתיות בדשבורד

### אופציה 2: בניית דף הדוחות
- גרפים של ציונים לאורך זמן
- טבלת מנות חלשות
- השוואה בין סניפים
- סינון לפי תאריכים

### אופציה 3: ניהול טבחים ומנות
- דף להוספת/עריכת טבחים
- דף להוספת/עריכת מנות
- CRUD מלא

---

## 📝 הערות חשובות

### שמירת קונטקסט:
- קובץ זה נוצר כדי לשמור הקשר בין שיחות
- קרא אותו בתחילת כל שיחה כדי לדעת איפה עצרנו

### Credentials לזכור:
- **HQ Demo:** hq@giraffe.com / Giraffe2025!
- **Backend:** http://127.0.0.1:8000
- **Frontend:** http://localhost:5174
- **API Docs:** http://127.0.0.1:8000/docs

### פקודות להרצה:
```bash
# Backend
cd giraffe-backend
source venv/bin/activate
uvicorn app.main:app --reload

# Frontend
cd giraffe-frontend
npm run dev

# Database Seed (if needed)
python seed_data.py
```

---

## 📞 יצירת קשר עם המשתמש

אתה (אוהד) אמרת:
- **"אנחנו עובדים רק על הפלואו"** - לכן לא חיברנו למסד נתונים עדיין
- **"הטבחים והמנות צריכים להיות בתוך הטופס בדיקה"** - עשינו את זה!
- השתמשת במק, לא ידעת מה זה CMD (הסברנו)
- מדברים בעברית בשיחה

---

**📅 עודכן לאחרונה:** 2025-10-17
**🔄 גרסה:** 1.0 - Flow מלא עם mock data
**✍️ נוצר על ידי:** Claude Code
