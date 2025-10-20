/**
 * Sanitation audit categories - Updated categories list
 * Each category can have a score deduction of 0-10 points
 */

export interface AuditCategoryDefinition {
  key: string;
  name: string;
  type: 'checkbox' | 'full'; // checkbox = just a checkbox for "exists/ok", full = notes + score + images
  checkboxLabel?: string; // Label for checkbox items (e.g., "תקין", "קיים")
  hasSubCheck?: boolean; // Does this category have an additional checkbox (e.g., temperature check)
  subCheckLabel?: string; // Label for the sub-check
}

export const sanitationCategories: AuditCategoryDefinition[] = [
  // כללי - Checkbox only (קיים)
  { key: 'msds_folder', name: 'קלסר MSDS', type: 'checkbox', checkboxLabel: 'קיים' },
  { key: 'pest_control_folder', name: 'תיק הדברה', type: 'checkbox', checkboxLabel: 'קיים' },
  { key: 'veterinary_folder', name: 'קלסר וטרינר', type: 'checkbox', checkboxLabel: 'קיים' },
  { key: 'cleaning_table', name: 'טבלת ניקיונות', type: 'checkbox', checkboxLabel: 'קיים' },

  // בדיקת תקינות סכינים - Checkbox with notes
  { key: 'knives_check', name: 'בדיקת תקינות סכינים', type: 'checkbox', checkboxLabel: 'תקין' },

  // קטגוריות מלאות - Full inspection (notes + score + images)
  { key: 'supplier_entrance', name: 'כניסת ספקים', type: 'full' },
  { key: 'storage', name: 'מחסן', type: 'full' },
  { key: 'daily_storage', name: 'מחסן יומי', type: 'full' },
  { key: 'vegetable_cooler', name: 'חדר קירור ירקות', type: 'full' },
  { key: 'meat_cooler', name: 'חדר קירור בשר', type: 'full' },
  { key: 'meat_station', name: 'עמדת בשר', type: 'full' },
  { key: 'vegetable_station', name: 'עמדת ירקות', type: 'full' },
  { key: 'fish_station', name: 'עמדת דגים', type: 'full' },
  { key: 'cleaning_materials', name: 'עמדת חומרי ניקוי', type: 'full' },
  { key: 'lockers_clothes', name: 'לוקרים וכלוב בגדים', type: 'full' },
  { key: 'electrical_fire', name: 'ארון חשמל וארון כיבוי אש', type: 'full' },
  { key: 'ice_machine', name: 'מכונת קרח', type: 'full' },
  { key: 'standing_fridges', name: 'מקררים עומדים', type: 'full' },
  { key: 'standing_freezers', name: 'מקפיאים עומדים', type: 'full' },
  { key: 'vegetable_washing', name: 'שטיפת ירקות', type: 'full' },
  { key: 'salad_station', name: 'עמדת סלטים', type: 'full' },
  { key: 'hot_line_wok', name: 'פס חם - ווק', type: 'full' },
  { key: 'stoves', name: 'כיריים', type: 'full' },
  { key: 'fryer', name: 'צ\'יפסר', type: 'full' },
  { key: 'oven', name: 'תנור', type: 'full' },
  { key: 'oil_quality', name: 'איכות שמן', type: 'full' },
  { key: 'sushi_station', name: 'עמדת סושי', type: 'full' },
  { key: 'heating_cabinet', name: 'ארון חימום', type: 'full' },
  { key: 'delivery_wok', name: 'ווק משלוחים', type: 'full' },
  { key: 'waiter_station', name: 'עמדת מלצרים', type: 'full' },
  { key: 'washing_station', name: 'עמדת שטיפה', type: 'full', hasSubCheck: true, subCheckLabel: 'טמפ\' מדיח כלים תקין' },
  { key: 'restaurant_wok', name: 'ווק מסעדה', type: 'full' },
  { key: 'checker_station', name: 'עמדת צ\'קר', type: 'full' },
  { key: 'blast_chiller', name: 'בלאסט צ\'ילר', type: 'full' },
  { key: 'bar', name: 'בר', type: 'full' },
  { key: 'goods_receiving', name: 'קבלת סחורה', type: 'full', hasSubCheck: true, subCheckLabel: 'בדיקת טמפ\' מדגמי בוצע' },
  { key: 'restrooms', name: 'שירותים', type: 'full' },
];

export type DefectLevel = 'תקין' | 'ליקוי קל' | 'ליקוי בינוני' | 'ליקוי חמור' | 'ליקוי קריטי';

export const defectLevelOptions: { value: DefectLevel; points: number }[] = [
  { value: 'תקין', points: 0 },
  { value: 'ליקוי קל', points: 1 },
  { value: 'ליקוי בינוני', points: 5 },
  { value: 'ליקוי חמור', points: 7 },
  { value: 'ליקוי קריטי', points: 10 },
];

export const getPointsForDefectLevel = (level: DefectLevel): number => {
  const option = defectLevelOptions.find(opt => opt.value === level);
  return option?.points ?? 0;
};

export const getScoreDeductionGuidelines = () => ({
  minor: { points: 1, description: 'ליקויים קלים - מכסים, ניקיון, מים עומדים' },
  moderate: { points: 5, description: 'ליקויים בינוניים - עובש, סכין מלוכלכת, חוסר סבון/מגבות' },
  serious: { points: 7, description: 'ליקויים חמורים - מזון על הרצפה, עובש בחדר קירור' },
  critical: { points: 10, description: 'ליקויים קריטיים - מוצרים פגי תוקף' },
});
