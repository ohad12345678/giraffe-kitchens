/**
 * Predefined evaluation categories for Manager Evaluations
 *
 * Based on the AI prompt requirements for evaluating restaurant managers
 */

export interface EvaluationCategoryTemplate {
  category_name: string;
  description: string;
  defaultRating: number;
}

export const MANAGER_EVALUATION_CATEGORIES: EvaluationCategoryTemplate[] = [
  {
    category_name: "תפעול",
    description: "יעילות ניהול המסעדה, איכות שירות, ניהול מלאי, תהליכים",
    defaultRating: 5,
  },
  {
    category_name: "ניהול אנשים",
    description: "יכולת ניהול צוות, מוטיבציה, פתרון קונפליקטים, פיתוח עובדים",
    defaultRating: 5,
  },
  {
    category_name: "ביצועים עסקיים",
    description: "עמידה ביעדים, ניהול תקציב, רווחיות",
    defaultRating: 5,
  },
  {
    category_name: "מנהיגות",
    description: "חזון, יוזמה, יכולת השפעה, קבלת החלטות",
    defaultRating: 5,
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
