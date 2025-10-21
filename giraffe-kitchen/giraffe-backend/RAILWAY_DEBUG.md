# Railway Deployment Debug Guide

## הבעיה
Health check נכשל - השרת לא עולה

## צעדים לבדיקה:

1. **בדוק לוגים ב-Railway Dashboard**
   - לך ל-Railway → הפרויקט שלך → Deployments
   - לחץ על הדפלוי האחרון
   - בדוק את Build Logs ואת Deploy Logs
   - חפש שגיאות (ERROR, FAILED, Traceback)

2. **שגיאות אפשריות לחפש:**
   - `ModuleNotFoundError` - חסר חבילה
   - `alembic.script.ScriptError` - בעיה במיגריישן
   - `ImportError` - בעיית import
   - `sqlalchemy.exc` - בעיית database

3. **תיקונים אפשריים:**

   **אם זה בעיית Migration:**
   ```bash
   # הוסף את זה לתחילת start.sh:
   alembic upgrade head || {
       echo "Migration failed, trying to create tables directly"
       python -c "from app.db.base import Base, engine; Base.metadata.create_all(bind=engine)"
   }
   ```

   **אם זה בעיית Dependencies:**
   - בדוק שכל החבילות ב-requirements.txt
   - וודא ש-anthropic מותקן (לצ'אט AI)

4. **שאלות לבדוק:**
   - האם DATABASE_URL מוגדר ב-Railway?
   - האם ANTHROPIC_API_KEY מוגדר?
   - האם PORT מוגדר?

