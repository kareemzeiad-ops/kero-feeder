
import { Ingredient, Purpose } from './types';

export const INGREDIENTS: Ingredient[] = [
  // مصادر الطاقة
  { id: '1', name: "ذرة صفراء", p: 8.0, tdn: 82.6, fib: 2.2, fat: 7.0, limit: 60 },
  { id: '12', name: "تفل بنجر", p: 7.0, tdn: 66.0, fib: 17.5, fat: 0.5, limit: 30 },
  { id: '7', name: "جلوتوفيد", p: 18.0, tdn: 80.0, fib: 8.0, fat: 3.0, limit: 25 },
  
  // مصادر البروتين
  { id: '2', name: "كسب صويا", p: 46.0, tdn: 68.1, fib: 5.2, fat: 1.7, limit: 25 },
  { id: '6', name: "جلوتين", p: 60.0, tdn: 83.0, fib: 2.0, fat: 2.0, limit: 15 },
  { id: '4', name: "كسب عباد", p: 33.5, tdn: 60.0, fib: 18.5, fat: 3.2, limit: 20 },
  { id: '5', name: "كسب قطن", p: 31.5, tdn: 64.0, fib: 10.0, fat: 3.2, limit: 20 },
  { id: '8', name: "كسب كانولا", p: 33.0, tdn: 60.0, fib: 12.5, fat: 3.5, limit: 15 },
  { id: '9', name: "كسب سمسم", p: 26.5, tdn: 85.0, fib: 8.5, fat: 6.0, limit: 15 },
  
  // النخالة والألياف
  { id: '3', name: "نخالة قمح", p: 13.0, tdn: 58.4, fib: 10.0, fat: 3.0, limit: 25 },
  { id: '10', name: "كسب حبة بركة", p: 31.5, tdn: 75.0, fib: 7.0, fat: 10.0, limit: 5 },
  { id: '11', name: "كسب كتان", p: 31.5, tdn: 65.0, fib: 10.5, fat: 4.7, limit: 5 },

  // الإضافات الأساسية (Fixed/Small Amounts)
  { id: 'add-1', name: "ملح طعام", p: 0, tdn: 0, fib: 0, fat: 0, limit: 1 },
  { id: 'add-2', name: "بريمكس", p: 0, tdn: 0, fib: 0, fat: 0, limit: 0.3 },
  { id: 'add-3', name: "بيكربونات صوديوم", p: 0, tdn: 0, fib: 0, fat: 0, limit: 1 },
  { id: 'add-4', name: "مضاد سموم", p: 0, tdn: 0, fib: 0, fat: 0, limit: 0.2 },
  { id: 'add-5', name: "حجر جيري", p: 0, tdn: 0, fib: 0, fat: 0, limit: 2 }
];

export const PURPOSES: Record<Purpose, number> = {
  "تسمين": 15,
  "حلاب": 18,
  "عجول صغيرة": 20,
  "ثيران": 13
};

export const ANIMAL_TYPES: string[] = ['بقر 🐄', 'جاموس 🐃'];
