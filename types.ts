
export interface Ingredient {
  id: string;
  name: string;
  p: number;      // Protein %
  tdn: number;    // Energy %
  fib: number;    // Fiber %
  fat: number;    // Fat %
  limit: number;  // Max usage limit %
}

export type AnimalType = 'بقر 🐄' | 'جاموس 🐃';
export type Purpose = 'تسمين' | 'حلاب' | 'عجول صغيرة' | 'ثيران';

export interface UserData {
  animal: AnimalType;
  purpose: Purpose;
  weight: number;
  milk?: number;
  selectedIngredients: string[];
}

export interface CalculationResult {
  weights: Record<string, number>;
  totalProtein: number;
  totalTDN: number;
  totalFiber: number;
  totalFat: number;
  dailyConc: number;
}
