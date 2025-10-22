/**
 * Manager Review Categories Configuration
 * הגדרת קטגוריות והנקודות להערכת מנהלים
 */

export interface ReviewCategory {
  id: string;
  title: string;
  weight: string;
  subcategories: ReviewSubcategory[];
}

export interface ReviewSubcategory {
  id: string;
  title: string;
  weight: string;
  points: string[];
}

export const REVIEW_CATEGORIES: ReviewCategory[] = [
  {
    id: 'operational',
    title: '1. ניהול תפעולי',
    weight: '35%',
    subcategories: [
      {
        id: 'sanitation',
        title: 'תברואה ובטיחות מזון',
        weight: '10%',
        points: [
          'עמידה בתקני תברואה ותקן 1918',
          'ציוני דוחות בקרה חודשיים',
          'טיפול בליקויים במועד',
          'הכשרת צוות בנושאי תברואה',
        ],
      },
      {
        id: 'inventory',
        title: 'ניהול מלאי ושליטה בעלויות',
        weight: '10%',
        points: [
          'אחוזי בזבוז (waste)',
          'ניהול הזמנות וספקים',
          'שליטה במלאי וספירות',
          'עמידה בתקציב רכש',
        ],
      },
      {
        id: 'quality',
        title: 'איכות מוצר ושירות',
        weight: '10%',
        points: [
          'עקביות בטעם ובמראה המנות',
          'זמני המתנה ללקוחות',
          'טיפול בתלונות לקוחות',
          'ציוני Mystery Shopper',
        ],
      },
      {
        id: 'maintenance',
        title: 'תחזוקה וסדר',
        weight: '5%',
        points: [
          'מצב הציוד והמטבח',
          'ניקיון כללי',
          'טיפול בתקלות במועד',
        ],
      },
    ],
  },
  {
    id: 'people',
    title: '2. ניהול אנשים',
    weight: '30%',
    subcategories: [
      {
        id: 'recruitment',
        title: 'גיוס והכשרה',
        weight: '10%',
        points: [
          'איכות גיוס עובדים',
          'אונבורדינג נכון',
          'הכשרות שוטפות',
          'פיתוח עובדים',
        ],
      },
      {
        id: 'scheduling',
        title: 'ניהול משמרות ותזמון',
        weight: '10%',
        points: [
          'תכנון שבועי יעיל',
          'עמידה בתקן שעות עבודה',
          'גמישות והסתגלות',
        ],
      },
      {
        id: 'retention',
        title: 'אקלים ושימור עובדים',
        weight: '10%',
        points: [
          'תחלופת עובדים (turnover)',
          'מוטיבציה ורוח צוות',
          'טיפול בקונפליקטים',
          'משוב ושיחות אישיות',
        ],
      },
    ],
  },
  {
    id: 'business',
    title: '3. ביצועים עסקיים',
    weight: '25%',
    subcategories: [
      {
        id: 'sales',
        title: 'מכירות ורווחיות',
        weight: '15%',
        points: [
          'עמידה ביעדי מכירות',
          'צמיחה לעומת תקופה קודמת',
          'ממוצע הזמנה (ticket average)',
          'רווחיות הסניף',
        ],
      },
      {
        id: 'efficiency',
        title: 'יעילות תפעולית',
        weight: '10%',
        points: [
          'עלות עבודה (labor cost %)',
          'פריון עובדים',
          'זמני שירות',
        ],
      },
    ],
  },
  {
    id: 'leadership',
    title: '4. מנהיגות והתפתחות אישית',
    weight: '10%',
    subcategories: [
      {
        id: 'leadership',
        title: 'מנהיגות והתפתחות אישית',
        weight: '10%',
        points: [
          'יוזמה ופרואקטיביות',
          'יכולת פתרון בעיות',
          'תקשורת עם הנהלה ועמיתים',
          'רצון להתפתח וללמוד',
          'עמידה בערכי החברה',
        ],
      },
    ],
  },
];
