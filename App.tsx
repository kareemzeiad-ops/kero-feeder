
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Beef, 
  Milk, 
  Scale, 
  CheckCircle2, 
  Info, 
  Lightbulb, 
  RefreshCw,
  Trash2,
  PieChart as PieChartIcon,
  AlertTriangle,
  Zap,
  ArrowRightLeft,
  Boxes,
  ClipboardList,
  Edit2,
  Check,
  X,
  FlaskConical,
  Plus,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  FilePlus2,
  Activity
} from 'lucide-react';
import { INGREDIENTS, PURPOSES, ANIMAL_TYPES } from './constants';
import { UserData, CalculationResult, AnimalType, Purpose, Ingredient } from './types';
import { getRationAdvice, AiSuggestion } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<UserData>({
    animal: 'بقر 🐄',
    purpose: 'تسمين',
    weight: 400,
    selectedIngredients: [],
  });
  
  const [customIngredients, setCustomIngredients] = useState<Ingredient[]>([]);
  const [aiResult, setAiResult] = useState<AiSuggestion | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [appliedWeights, setAppliedWeights] = useState<Record<string, number> | null>(null);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  
  // Custom Ingredient Form State
  const [customForm, setCustomForm] = useState({ name: '', p: '', tdn: '', fib: '', fat: '' });

  // Debounce/Automatic AI trigger ref
  const lastAnalysisRef = useRef<string>("");

  // Clear states when starting over
  useEffect(() => {
    if (step === 1) {
      setAiResult(null);
      setAppliedWeights(null);
      setEditingIngredient(null);
      setIsAddMenuOpen(false);
      setCustomIngredients([]);
    }
  }, [step]);

  const ADDITIVE_DEFAULTS: Record<string, number> = {
    "ملح طعام": 10,
    "بريمكس": 3,
    "بيكربونات صوديوم": 7,
    "مضاد سموم": 1,
    "حجر جيري": 15
  };

  const allAvailableIngredients = useMemo(() => [...INGREDIENTS, ...customIngredients], [customIngredients]);

  useEffect(() => {
    if (step === 4 && !appliedWeights && userData.selectedIngredients.length > 0) {
      const selected = [...userData.selectedIngredients];
      if (!selected.includes("ذرة صفراء") && !selected.some(s => Object.keys(ADDITIVE_DEFAULTS).includes(s))) {
         selected.unshift("ذرة صفراء");
      }
      const initialWeights: Record<string, number> = {};
      let totalSpace = 1000.0;
      Object.keys(ADDITIVE_DEFAULTS).forEach(addName => {
        if (selected.includes(addName)) {
          const w = ADDITIVE_DEFAULTS[addName];
          initialWeights[addName] = w;
          totalSpace -= w;
        }
      });
      const mainIngredients = selected.filter(name => !Object.keys(ADDITIVE_DEFAULTS).includes(name));
      if (mainIngredients.length > 0) {
        const fillerName = mainIngredients.includes("ذرة صفراء") ? "ذرة صفراء" : mainIngredients[0];
        const others = mainIngredients.filter(n => n !== fillerName);
        const sharePerOther = others.length > 0 ? (totalSpace * 0.4) / others.length : 0;
        others.forEach(name => {
          const ing = allAvailableIngredients.find(i => i.name === name);
          const limitKg = ing ? (ing.limit / 100) * 1000 : 200;
          const w = Math.min(sharePerOther, limitKg);
          initialWeights[name] = w;
          totalSpace -= w;
        });
        initialWeights[fillerName] = Math.max(0, totalSpace);
      }
      setAppliedWeights(initialWeights);
    }
  }, [step, userData.selectedIngredients, appliedWeights, allAvailableIngredients]);

  const calculateRation = useMemo((): CalculationResult | null => {
    if (userData.selectedIngredients.length === 0) return null;
    const weightsToUse: Record<string, number> = appliedWeights || {};
    let protein = 0, tdn = 0, fib = 0, fat = 0;
    Object.entries(weightsToUse).forEach(([name, weight]) => {
      const ing = allAvailableIngredients.find(i => i.name === name);
      if (ing) {
        const ratio = (weight as number) / 1000;
        protein += (ing.p || 0) * ratio;
        tdn += (ing.tdn || 0) * ratio;
        fib += (ing.fib || 0) * ratio;
        fat += (ing.fat || 0) * ratio;
      }
    });
    const dailyConc = userData.purpose === "حلاب" 
      ? (userData.weight * 0.01 + (userData.milk || 0) * 0.5) 
      : userData.weight * 0.02;
    return { weights: weightsToUse, totalProtein: protein, totalTDN: tdn, totalFiber: fib, totalFat: fat, dailyConc };
  }, [userData, appliedWeights, allAvailableIngredients]);

  // Automatic AI Analysis Logic
  useEffect(() => {
    if (step === 4 && calculateRation && !isCalculating) {
      const stateStr = JSON.stringify(calculateRation.weights);
      if (lastAnalysisRef.current !== stateStr) {
        const timer = setTimeout(() => {
          generateAdvice();
          lastAnalysisRef.current = stateStr;
        }, 1500); // 1.5s delay after changes to trigger automatic analysis
        return () => clearTimeout(timer);
      }
    }
  }, [step, appliedWeights]);

  const totalWeight = useMemo(() => {
    if (!appliedWeights) return 0;
    return Object.values(appliedWeights).reduce((sum, w) => sum + (w as number), 0);
  }, [appliedWeights]);

  const generateAdvice = async () => {
    if (!calculateRation) return;
    setIsCalculating(true);
    try {
      const result = await getRationAdvice(userData, calculateRation, allAvailableIngredients);
      setAiResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  const applyAiCorrection = () => {
    if (aiResult?.suggestedWeights) {
      if (aiResult.addedIngredients && aiResult.addedIngredients.length > 0) {
        setUserData(prev => ({
          ...prev,
          selectedIngredients: Array.from(new Set([...prev.selectedIngredients, ...aiResult.addedIngredients!]))
        }));
      }
      setAppliedWeights(aiResult.suggestedWeights);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const startEditing = (name: string, weight: number) => {
    setEditingIngredient(name);
    setEditValue(weight.toString());
  };

  const saveEdit = () => {
    if (editingIngredient && appliedWeights) {
      const newVal = parseFloat(editValue);
      if (!isNaN(newVal) && newVal >= 0) {
        setAppliedWeights({ ...appliedWeights, [editingIngredient]: newVal });
      }
      setEditingIngredient(null);
    }
  };

  const deleteIngredient = (name: string) => {
    if (appliedWeights) {
      const newWeights = { ...appliedWeights };
      delete newWeights[name];
      setAppliedWeights(newWeights);
      setUserData(prev => ({
        ...prev,
        selectedIngredients: prev.selectedIngredients.filter(i => i !== name)
      }));
    }
  };

  const addIngredientDirectly = (name: string) => {
    if (appliedWeights && !appliedWeights[name]) {
      setAppliedWeights({ ...appliedWeights, [name]: 0 });
      setUserData(prev => ({ ...prev, selectedIngredients: [...prev.selectedIngredients, name] }));
      setIsAddMenuOpen(false);
      startEditing(name, 0);
    }
  };

  const handleAddCustom = () => {
    const { name, p, tdn, fib, fat } = customForm;
    if (!name || isNaN(parseFloat(p))) return;

    const newIng: Ingredient = {
      id: `custom-${Date.now()}`,
      name,
      p: parseFloat(p),
      tdn: parseFloat(tdn) || 0,
      fib: parseFloat(fib) || 0,
      fat: parseFloat(fat) || 0,
      limit: 100
    };

    setCustomIngredients(prev => [...prev, newIng]);
    setUserData(prev => ({ ...prev, selectedIngredients: [...prev.selectedIngredients, name] }));
    
    if (appliedWeights) {
      setAppliedWeights({ ...appliedWeights, [name]: 0 });
    }
    
    setShowCustomModal(false);
    setCustomForm({ name: '', p: '', tdn: '', fib: '', fat: '' });
    setIsAddMenuOpen(false);
    startEditing(name, 0);
  };

  const categorizedIngredients = useMemo(() => {
    return {
      'مصادر طاقة (حبوب)': INGREDIENTS.filter(i => i.tdn > 70 && i.p < 15 && !i.id.startsWith('add-')),
      'مصادر بروتين (أكساب)': INGREDIENTS.filter(i => i.p >= 20 && !i.id.startsWith('add-')),
      'نخالة وألياف': INGREDIENTS.filter(i => ((i.p < 20 && i.tdn <= 70) || i.fib > 10) && !i.id.startsWith('add-')),
      'إضافات أساسية (لكل طن)': INGREDIENTS.filter(i => i.id.startsWith('add-')),
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-24 font-['Cairo']">
      <header className="w-full bg-[#1e293b] text-white p-6 shadow-xl text-center mb-8 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <Beef className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-black tracking-tight leading-none">كيرة AI</h1>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">خبير العلائق الذكي</span>
            </div>
          </div>
          {step > 1 && (
             <button onClick={() => setStep(1)} className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full font-bold transition-all">إعادة البدء</button>
          )}
        </div>
      </header>

      <main className="w-full max-w-4xl px-4 flex-grow">
        <div className="flex justify-between items-center mb-10 px-6 relative max-w-2xl mx-auto">
          <div className="absolute h-1 bg-slate-200 top-1/2 left-8 right-8 -z-10 -translate-y-1/2 rounded-full"></div>
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 font-bold ${
              step >= s ? 'bg-emerald-600 text-white shadow-lg scale-110' : 'bg-white text-slate-300 border-2 border-slate-100'
            }`}>{s}</div>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 mb-8 border border-slate-100 relative overflow-hidden transition-all duration-500">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">البداية: نوع الحيوان والهدف</h2>
                <p className="text-slate-400 text-sm mt-1">حدد بيانات حيوانك لنقدم لك أفضل توصية</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 block mr-2">نوع الحيوان:</label>
                  <div className="flex gap-4">
                    {ANIMAL_TYPES.map(type => (
                      <button key={type} onClick={() => setUserData(p => ({ ...p, animal: type as AnimalType }))}
                        className={`flex-1 p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-3 ${
                          userData.animal === type ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-50' : 'border-slate-100 bg-white hover:border-emerald-200 shadow-sm'
                        }`}>
                        <span className="text-5xl">{type.split(' ')[1]}</span>
                        <span className="font-black text-lg text-slate-700">{type.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-sm font-black text-slate-500 block mr-2">الغرض من التربية:</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(PURPOSES).map(purpose => (
                      <button key={purpose} onClick={() => setUserData(p => ({ ...p, purpose: purpose as Purpose }))}
                        className={`p-4 rounded-2xl border-2 font-black transition-all text-sm ${
                          userData.purpose === purpose ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-100 bg-slate-50 text-slate-500'
                        }`}>{purpose}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">بيانات الأوزان</h2>
                <p className="text-slate-400 text-sm mt-1">الميزان هو أساس العليقة الناجحة</p>
              </div>
              <div className="max-w-md mx-auto space-y-12">
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <label className="font-black text-slate-700 flex items-center gap-2 text-lg"><Scale className="text-emerald-500 w-5 h-5" /> وزن الحيوان</label>
                    <div className="text-3xl font-black text-emerald-600 font-mono">{userData.weight} <span className="text-xs text-slate-400">كجم</span></div>
                  </div>
                  <input type="range" min="50" max="1000" step="10" value={userData.weight} onChange={(e) => setUserData(p => ({ ...p, weight: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-600" />
                </div>
                {userData.purpose === 'حلاب' && (
                  <div className="space-y-6 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-end">
                      <label className="font-black text-slate-700 flex items-center gap-2 text-lg"><Milk className="text-blue-500 w-5 h-5" /> إنتاج اللبن</label>
                      <div className="text-3xl font-black text-blue-600 font-mono">{userData.milk || 0} <span className="text-xs text-slate-400">لتر/يوم</span></div>
                    </div>
                    <input type="range" min="0" max="60" step="1" value={userData.milk || 0} onChange={(e) => setUserData(p => ({ ...p, milk: parseInt(e.target.value) }))}
                      className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="text-center">
                <h2 className="text-2xl font-black text-slate-800">مكونات المخزن</h2>
                <p className="text-slate-400 text-sm mt-1">اختر الخامات المتاحة لديك، ولا تنسَ الإضافات الأساسية</p>
              </div>
              <div className="space-y-8">
                {Object.entries(categorizedIngredients).map(([category, items]) => (
                  <div key={category} className="space-y-4">
                    <h3 className={`text-xs font-black uppercase tracking-widest mr-2 flex items-center gap-2 ${category.includes('إضافات') ? 'text-amber-500' : 'text-slate-400'}`}>
                      {category.includes('إضافات') ? <FlaskConical className="w-3 h-3" /> : <Boxes className="w-3 h-3" />} {category}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {items.map(ing => (
                        <button key={ing.id} onClick={() => toggleIngredient(ing.name)}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between text-right relative group ${
                            userData.selectedIngredients.includes(ing.name) 
                              ? category.includes('إضافات') ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-100' : 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-100' 
                              : 'border-slate-50 bg-white hover:border-slate-200'
                          }`}>
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-slate-700">{ing.name}</span>
                            {ing.p > 0 && <span className="text-[10px] text-slate-400 font-bold">بروتين: %{ing.p}</span>}
                          </div>
                          {userData.selectedIngredients.includes(ing.name) && (
                            <CheckCircle2 className={`w-5 h-5 shrink-0 ${category.includes('إضافات') ? 'text-amber-500' : 'text-emerald-500'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {userData.selectedIngredients.length > 0 && (
                <div className="mt-8 p-4 bg-slate-900 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar ml-4">
                    {userData.selectedIngredients.map(name => (
                      <span key={name} className="whitespace-nowrap bg-white/10 text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/5">{name}</span>
                    ))}
                  </div>
                  <div className="text-white text-xs font-black shrink-0">{userData.selectedIngredients.length} أصناف</div>
                </div>
              )}
            </div>
          )}

          {step === 4 && calculateRation && (
            <div className="space-y-10 animate-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-800">تقرير العليقة النهائي</h2>
                  <p className="text-slate-400 text-xs font-bold">تحليل دقيق لخلطة الـ 1000 كجم (طن)</p>
                </div>
                <div className="flex items-center gap-3">
                  {isCalculating && (
                    <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-full text-[10px] font-black animate-pulse">
                      <Activity className="w-3 h-3 text-emerald-400" /> جاري التحديث التلقائي...
                    </div>
                  )}
                  <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    <span className="text-xs font-black">مسودة جاهزة</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-400 flex items-center gap-2 mr-2 uppercase tracking-widest">
                      <PieChartIcon className="w-4 h-4" /> التوزيع المئوي والأوزان
                    </h3>
                    <div className="relative">
                      <button 
                        onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-2 text-xs font-black"
                      >
                        <PlusCircle className="w-4 h-4" /> إضافة مكون
                      </button>
                      
                      {isAddMenuOpen && (
                        <div className="absolute left-0 mt-2 w-64 bg-white shadow-2xl rounded-2xl border border-slate-100 z-[60] p-3 max-h-80 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          <button 
                            onClick={() => { setShowCustomModal(true); setIsAddMenuOpen(false); }}
                            className="w-full text-right p-3 mb-2 bg-slate-900 text-white rounded-xl text-xs font-black flex justify-between items-center hover:bg-slate-800 transition-colors"
                          >
                            إضافة مكون خارجي (مخصص)
                            <FilePlus2 className="w-4 h-4 text-emerald-400" />
                          </button>
                          
                          <p className="text-[10px] font-black text-slate-400 mb-2 mr-1 border-t border-slate-50 pt-2">اختر من القائمة:</p>
                          <div className="space-y-1">
                            {allAvailableIngredients.filter(i => !Object.keys(calculateRation.weights).includes(i.name)).map(ing => (
                              <button 
                                key={ing.id}
                                onClick={() => addIngredientDirectly(ing.name)}
                                className="w-full text-right p-2 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex justify-between items-center"
                              >
                                {ing.name}
                                <Plus className="w-3 h-3 text-emerald-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(calculateRation.weights).map(([name, weight]) => {
                      const percentage = ((weight as number) / 10);
                      const isEditing = editingIngredient === name;
                      const isAdditive = Object.keys(ADDITIVE_DEFAULTS).includes(name);
                      
                      const aiWeight = aiResult?.suggestedWeights[name];
                      const hasChanged = aiWeight !== undefined && Math.abs(aiWeight - (weight as number)) > 0.1;
                      const isIncreased = hasChanged && aiWeight > (weight as number);

                      return (
                        <div key={name} className={`space-y-1.5 group p-2 rounded-xl transition-all ${hasChanged ? 'bg-amber-50/50 ring-1 ring-amber-100' : ''}`}>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                               <span className={`font-black text-sm ${isAdditive ? 'text-amber-700' : 'text-slate-700'}`}>{name}</span>
                               {hasChanged && (
                                 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${isIncreased ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                   {isIncreased ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                   تغيير مقترح
                                 </span>
                               )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1 animate-in zoom-in-95">
                                  <input 
                                    type="number" 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)} 
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit();
                                      if (e.key === 'Escape') setEditingIngredient(null);
                                    }}
                                    className="w-20 bg-slate-100 border-2 border-emerald-500 rounded-lg px-2 py-1 text-xs font-black text-slate-900 outline-none" 
                                    autoFocus 
                                  />
                                  <button onClick={saveEdit} className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"><Check className="w-4 h-4" /></button>
                                  <button onClick={() => setEditingIngredient(null)} className="p-1 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <>
                                  <div className="text-left flex flex-col items-end">
                                    <span className={`text-xs font-black font-mono ${isAdditive ? 'text-amber-600' : 'text-emerald-600'}`}>{(weight as number).toFixed(1)} كجم</span>
                                    <span className="text-[10px] text-slate-400 font-bold">({percentage.toFixed(2)}%)</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => startEditing(name, weight as number)} className="p-1.5 text-slate-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-emerald-50"><Edit2 className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => deleteIngredient(name)} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-1000 ease-out ${isAdditive ? 'bg-amber-400' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(percentage * 5, 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-4 border-t border-slate-100 mt-2">
                      <div className={`p-4 rounded-2xl flex items-center justify-between border-2 transition-all ${Math.abs(totalWeight - 1000) < 1 ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">إجمالي وزن العليقة</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-black font-mono ${Math.abs(totalWeight - 1000) < 1 ? 'text-slate-900' : 'text-red-600'}`}>{totalWeight.toFixed(1)} كجم</span>
                          {Math.abs(totalWeight - 1000) >= 1 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                   <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2"><Info className="w-4 h-4 text-slate-400" /> التحليل الغذائي للعليقة</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center group">
                        <span className="text-sm font-bold text-slate-500">البروتين الكلي</span>
                        <div className="flex flex-col items-end">
                          <span className={`text-2xl font-black font-mono ${calculateRation.totalProtein < PURPOSES[userData.purpose] - 0.5 ? 'text-red-500' : 'text-emerald-600'}`}>%{calculateRation.totalProtein.toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 font-bold">الهدف: %{PURPOSES[userData.purpose]}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-sm font-bold text-slate-500">الطاقة (TDN)</span>
                        <span className="text-2xl font-black font-mono text-amber-600">%{calculateRation.totalTDN.toFixed(1)}</span>
                      </div>
                      <div className="pt-4 border-t border-slate-200 mt-2">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg"><Scale className="w-4 h-4 text-slate-600" /></div>
                            <span className="text-xs font-black text-slate-700">للرأس يومياً</span>
                          </div>
                          <span className="text-xl font-black text-slate-900 font-mono">{calculateRation.dailyConc.toFixed(1)} كجم</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Advice Section */}
                  <div className="pt-4">
                    {!aiResult ? (
                      <div className="w-full bg-slate-100 text-slate-400 py-10 rounded-3xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-200">
                         <Activity className="w-10 h-10 animate-bounce" />
                         <p className="font-black text-sm">جاري تحليل العليقة تلقائياً...</p>
                      </div>
                    ) : (
                      <div className="animate-in slide-in-from-bottom-6 duration-700 space-y-6">
                        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] relative shadow-lg">
                          <div className="absolute -top-3 right-6 bg-amber-400 text-[#1e293b] px-4 py-1 rounded-full text-[10px] font-black shadow-md">رأي واستشارة الخبير</div>
                          <p className="text-slate-800 text-sm leading-relaxed font-bold whitespace-pre-wrap text-right">{aiResult.commentary}</p>
                        </div>

                        {!aiResult.isBalanced && (
                          <div className="bg-emerald-600 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"><Zap className="w-32 h-32" /></div>
                            <div className="relative z-10">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-white/20 p-1.5 rounded-lg"><Zap className="w-5 h-5 text-yellow-300 fill-current" /></div>
                                <h4 className="text-lg font-black">تعديل ذكي متوفر!</h4>
                              </div>
                              
                              {aiResult.addedIngredients && aiResult.addedIngredients.length > 0 && (
                                <div className="mb-4 bg-white/10 p-3 rounded-xl border border-white/10">
                                  <p className="text-[10px] font-black uppercase tracking-wider mb-2 text-emerald-200">سيتم إضافة مكونات جديدة:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {aiResult.addedIngredients.map(ing => (
                                      <span key={ing} className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                        <Plus className="w-3 h-3" /> {ing}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <p className="text-emerald-50 text-xs mb-6 opacity-90 font-bold">
                                تحسين البروتين ليكون <span className="bg-yellow-400 text-slate-900 px-1.5 py-0.5 rounded mx-1 font-black">%{aiResult.expectedProtein}</span> سيغير نتائجك تماماً.
                              </p>
                              <button onClick={applyAiCorrection}
                                className="w-full bg-white text-emerald-700 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-md active:scale-95 text-md">
                                <ArrowRightLeft className="w-4 h-4" /> تطبيق التعديلات المقترحة
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {aiResult.isBalanced && (
                          <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-3xl flex items-center gap-4">
                            <div className="bg-emerald-500 p-2 rounded-xl text-white">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-emerald-900 font-black text-sm">العليقة متوازنة تماماً!</p>
                              <p className="text-emerald-600 text-xs font-bold">نسبة البروتين والمكونات مثالية لحيواناتك.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-2xl mx-auto">
          {step < 4 && (
            <div className="flex gap-4">
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)} className="flex-1 bg-white text-slate-400 py-5 rounded-3xl font-black border-2 border-slate-100 hover:bg-slate-50 transition-all">السابق</button>
              )}
              <button onClick={() => setStep(s => Math.min(s + 1, 4))} disabled={step === 3 && userData.selectedIngredients.length === 0}
                className="flex-[2] bg-emerald-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-30">
                {step === 3 ? 'تكوين العليقة' : 'التالي'}
              </button>
            </div>
          )}
          {step === 4 && (
             <button onClick={() => { setStep(1); setUserData(p => ({ ...p, selectedIngredients: [] })); }}
              className="w-full bg-white text-slate-400 py-5 rounded-3xl font-black border-2 border-slate-200 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center gap-3 shadow-sm">
              <RefreshCw className="w-5 h-5" /> ابدأ من جديد (عليقة أخرى)
            </button>
          )}
        </div>
      </main>

      {/* Custom Ingredient Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">إضافة مكون خارجي</h3>
                <p className="text-slate-400 text-xs font-bold mt-1">أدخل البيانات الغذائية للمكون الجديد</p>
              </div>
              <button onClick={() => setShowCustomModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 mr-1">اسم المكون</label>
                <input 
                  type="text" 
                  value={customForm.name} 
                  onChange={(e) => setCustomForm({...customForm, name: e.target.value})}
                  placeholder="مثال: مخلفات مصانع بسكويت" 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 mr-1">البروتين (%)</label>
                  <input 
                    type="number" 
                    value={customForm.p} 
                    onChange={(e) => setCustomForm({...customForm, p: e.target.value})}
                    placeholder="0" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-mono font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 mr-1">الطاقة TDN (%)</label>
                  <input 
                    type="number" 
                    value={customForm.tdn} 
                    onChange={(e) => setCustomForm({...customForm, tdn: e.target.value})}
                    placeholder="0" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-mono font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 mr-1">الألياف (%)</label>
                  <input 
                    type="number" 
                    value={customForm.fib} 
                    onChange={(e) => setCustomForm({...customForm, fib: e.target.value})}
                    placeholder="0" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-mono font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 mr-1">الدهون (%)</label>
                  <input 
                    type="number" 
                    value={customForm.fat} 
                    onChange={(e) => setCustomForm({...customForm, fat: e.target.value})}
                    placeholder="0" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-mono font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleAddCustom}
              disabled={!customForm.name || !customForm.p}
              className="w-full mt-8 bg-emerald-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-emerald-700 disabled:opacity-30 transition-all shadow-xl shadow-emerald-100"
            >
              حفظ المكون وإضافته
            </button>
          </div>
        </div>
      )}

      <footer className="w-full text-center p-12 text-slate-300 font-bold text-[10px] tracking-widest uppercase">© {new Date().getFullYear()} KIRA LIVESTOCK • INTELLIGENT FEED FORMULATION</footer>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
    </div>
  );

  function toggleIngredient(name: string) {
    setUserData(prev => {
      const isSelected = prev.selectedIngredients.includes(name);
      return { ...prev, selectedIngredients: isSelected ? prev.selectedIngredients.filter(i => i !== name) : [...prev.selectedIngredients, name] };
    });
  }
};

export default App;
