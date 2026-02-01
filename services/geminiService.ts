
import { GoogleGenAI, Type } from "@google/genai";
import { UserData, CalculationResult, Ingredient } from "../types";

export interface AiSuggestion {
  commentary: string;
  isBalanced: boolean;
  suggestedWeights: Record<string, number>;
  expectedProtein: number;
  addedIngredients?: string[];
}

export const getRationAdvice = async (userData: UserData, result: CalculationResult, allIngredients: Ingredient[]): Promise<AiSuggestion> => {
  // استخدام process.env.API_KEY حصراً حسب تعليمات النظام لضمان التوافق والأمان
  const apiKey = process.env.API_KEY;
  
  if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
    throw new Error("خطأ: مفتاح الـ API غير موجود. يرجى إضافته في Replit Secrets باسم API_KEY");
  }

  // استخدام موديل Pro للمهام التي تتطلب دقة علمية وحسابات معقدة مثل تغذية الحيوان
  const ai = new GoogleGenAI({ apiKey });
  
  const availableNames = allIngredients.map(i => i.name).join('، ');
  
  const prompt = `
    أنت أستاذ دكتور خبير في تغذية المجترات (بقر وجاموس). 
    قام المربي بتكوين عليقة لـ ${userData.animal} لغرض ${userData.purpose}.
    وزن الحيوان الحالي: ${userData.weight} كجم.
    ${userData.milk ? `إنتاج اللبن الحالي: ${userData.milk} لتر/يوم.` : ''}
    
    المكونات التي اختارها المربي (لكل 1000 كجم):
    ${Object.entries(result.weights).map(([name, weight]) => `- ${name}: ${weight.toFixed(1)} كجم`).join('\n')}
    
    التحليل الغذائي الحالي:
    - البروتين الخام: ${result.totalProtein.toFixed(1)}%
    - الطاقة (TDN): ${result.totalTDN.toFixed(1)}%
    
    المطلوب منك:
    1. تحليل العليقة بلهجة مصرية ريفية مهنية وودودة.
    2. إذا كانت العليقة غير متوازنة، اقترح توزيعاً جديداً (suggestedWeightsList) مجموع أوزانه 1000 كجم بالضبط.
    3. إذا كنت ترى ضرورة إضافة مكون من القائمة [${availableNames}] لتحسين النتائج، قم بذلك.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            commentary: { type: Type.STRING, description: "التحليل والنصيحة للمربي" },
            isBalanced: { type: Type.BOOLEAN, description: "هل العليقة الحالية مثالية؟" },
            suggestedWeightsList: { 
              type: Type.ARRAY, 
              items: {
                type: Type.OBJECT,
                properties: {
                  ingredientName: { type: Type.STRING },
                  weight: { type: Type.NUMBER }
                },
                required: ["ingredientName", "weight"]
              }
            },
            expectedProtein: { type: Type.NUMBER, description: "نسبة البروتين بعد التعديل" },
            addedIngredients: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "أسماء الخامات الجديدة المقترحة"
            }
          },
          required: ["commentary", "isBalanced", "suggestedWeightsList", "expectedProtein"]
        }
      }
    });

    const parsed = JSON.parse(response.text);
    
    const suggestedWeights: Record<string, number> = {};
    parsed.suggestedWeightsList.forEach((item: any) => {
      suggestedWeights[item.ingredientName] = item.weight;
    });

    return {
      commentary: parsed.commentary,
      isBalanced: parsed.isBalanced,
      suggestedWeights,
      expectedProtein: parsed.expectedProtein,
      addedIngredients: parsed.addedIngredients
    };
  } catch (error: any) {
    console.error("AI Error:", error);
    // معالجة الخطأ الشائع في حالة المفتاح غير الصحيح
    if (error.message?.includes("API key")) {
      throw new Error("تأكد من صحة مفتاح الـ API في قائمة Secrets.");
    }
    throw error;
  }
};
