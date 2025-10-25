/**
 * Predefined evaluation categories for Manager Evaluations
 *
 * Based on the AI prompt requirements for evaluating restaurant managers
 */

export interface SubCategory {
  name: string;
  placeholder: string;
}

export interface EvaluationCategoryTemplate {
  category_name: string;
  description: string;
  defaultRating: number;
  subCategories?: SubCategory[];
}

export const MANAGER_EVALUATION_CATEGORIES: EvaluationCategoryTemplate[] = [
  {
    category_name: "תפעול",
    description: "יעילות ניהול המסעדה, איכות שירות, ניהול מלאי, תהליכים",
    defaultRating: 5,
    subCategories: [
      { name: "ניהול תהליכים", placeholder: "תאר את יעילות התהליכים התפעוליים..." },
      { name: "ניהול מלאי וספקים", placeholder: "איך מנוהל המלאי והקשר עם ספקים..." },
      { name: "בקרת איכות", placeholder: "איכות המוצרים והשירות..." },
      { name: "עמידה בתקנים", placeholder: "תקני בריאות, היגיינה ובטיחות..." },
    ],
  },
  {
    category_name: "ניהול אנשים",
    description: "יכולת ניהול צוות, מוטיבציה, פתרון קונפליקטים, פיתוח עובדים",
    defaultRating: 5,
    subCategories: [
      { name: "יכולת ניהול צוות", placeholder: "כיצד המנהל מוביל ומנהל את הצוות..." },
      { name: "מוטיבציה", placeholder: "יכולת ליצור מוטיבציה ומחויבות..." },
      { name: "פתרון קונפליקטים", placeholder: "התמודדות עם קונפליקטים וחיכוכים..." },
      { name: "פיתוח עובדים", placeholder: "השקעה בפיתוח והכשרת הצוות..." },
    ],
  },
  {
    category_name: "ביצועים עסקיים",
    description: "עמידה ביעדים, ניהול תקציב, רווחיות",
    defaultRating: 5,
    subCategories: [
      { name: "עמידה ביעדי מכירות", placeholder: "ביצועים ביחס ליעדים שנקבעו..." },
      { name: "ניהול תקציב ועלויות", placeholder: "שליטה בהוצאות ורווחיות..." },
      { name: "צמיחה עסקית", placeholder: "יוזמות להגדלת מכירות..." },
    ],
  },
  {
    category_name: "מנהיגות",
    description: "חזון, יוזמה, יכולת השפעה, קבלת החלטות",
    defaultRating: 5,
    subCategories: [
      { name: "חשיבה אסטרטגית", placeholder: "יכולת לראות את התמונה הגדולה..." },
      { name: "יוזמה וחדשנות", placeholder: "הצעת רעיונות ויוזמות..." },
      { name: "השפעה ארגונית", placeholder: "תרומה מעבר לסניף..." },
    ],
  },
];

/**
 * Get default categories for a new evaluation
 */
export function getDefaultEvaluationCategories() {
  return MANAGER_EVALUATION_CATEGORIES.map(cat => ({
    category_name: cat.category_name,
    rating: cat.defaultRating,
    comments: null,
  }));
}
