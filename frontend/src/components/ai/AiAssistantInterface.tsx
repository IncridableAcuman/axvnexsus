import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  Copy,
  Check,
  Edit3,
  RotateCcw,
  BookOpen,
  CheckSquare,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast/ToastContext';
import { aiAssistantApi } from '@/api';
import { AiPresentationModal } from '../lessons/AiPresentationModal';
import type {
  AiRole,
  AiIntent,
  AiPromptRequest,
  AiCompletionResponse,
  StudyGroup,
  Mentor,
} from '@/types';

interface AiAssistantInterfaceProps {
  groups: StudyGroup[];
  mentors: Mentor[];
  onNavigateTab?: (tab: string) => void;
}

export const AiAssistantInterface: React.FC<AiAssistantInterfaceProps> = ({
  groups,
  mentors,
  onNavigateTab,
}) => {
  const toast = useToast();

  // Mode: Mentor Assistant vs Student Assistant
  const [role, setRole] = useState<AiRole>('MENTOR_ASSISTANT');
  const [intent, setIntent] = useState<AiIntent>('LESSON_PLAN');
  const [language, setLanguage] = useState<'uz' | 'ru' | 'en'>('uz');
  const [gradeLevel, setGradeLevel] = useState<string>('8-sinf');
  const [subject, setSubject] = useState<string>('Web Full-Stack Development');
  const [userPrompt, setUserPrompt] = useState<string>('');

  // Execution states
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<AiCompletionResponse | null>(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState<Array<{ label: string; prompt: string }>>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editableContent, setEditableContent] = useState<string>('');
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [isPresentationOpen, setIsPresentationOpen] = useState<boolean>(false);

  // History of recent prompts in current session
  const [history, setHistory] = useState<Array<{ prompt: string; intent: AiIntent; timestamp: string }>>([]);

  // Fetch suggested prompts on role/language change
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const res = await aiAssistantApi.getPrompts(role, language);
        setSuggestedPrompts(res.data);
      } catch (e) {
        console.error('Failed to load suggested prompts', e);
      }
    };
    fetchPrompts();
  }, [role, language]);

  // Submit AI prompt
  const handleGenerate = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt !== undefined ? overridePrompt : userPrompt;
    if (!promptToSend.trim()) {
      toast.error('Iltimos, so‘rov yoki mavzuni kiriting');
      return;
    }

    try {
      setLoading(true);
      setIsEditing(false);
      const req: AiPromptRequest = {
        userPrompt: promptToSend,
        role,
        intent,
        subject,
        gradeLevel,
        language,
        topic: promptToSend,
      };

      const res = await aiAssistantApi.generate(req);
      setResponse(res.data);
      setEditableContent(res.data.content);

      // Add to session history
      setHistory((prev) => [
        {
          prompt: promptToSend,
          intent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev.slice(0, 7),
      ]);
    } catch (err: unknown) {
      console.error('AI generation error:', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'AI xizmati vaqtinchalik band yoki xatolik yuz berdi.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Copy content
  const handleCopy = () => {
    const textToCopy = isEditing ? editableContent : response?.content || '';
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast.success('Matn nusxalandi!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Save as Lesson Draft (Module 08)
  const handleSaveAsLessonDraft = async () => {
    if (!response?.generatedLessonPlan) {
      toast.error('Dars rejasi tuzilmasi topilmadi.');
      return;
    }

    try {
      setSavingDraft(true);
      const group = groups.find((g) => g.gradeLevel === gradeLevel) || groups[0];
      const mentor = mentors[0];

      await aiAssistantApi.convertToLesson(
        response.generatedLessonPlan,
        mentor?.id,
        group?.id
      );

      toast.success(
        'Dars rejasi muvaffaqiyatli DRAFT sifatida saqlandi! Darslar bo‘limida ko‘rib chiqishingiz mumkin.'
      );
      if (onNavigateTab) {
        onNavigateTab('lessons');
      }
    } catch (err) {
      console.error('Error saving lesson draft:', err);
      toast.error('Dars rejasini saqlashda xatolik yuz berdi.');
    } finally {
      setSavingDraft(false);
    }
  };

  // Save as Assessment Draft (Module 10)
  const handleSaveAsAssessmentDraft = async () => {
    if (!response?.generatedQuizQuestions || response.generatedQuizQuestions.length === 0) {
      toast.error('Test savollari topilmadi.');
      return;
    }

    try {
      setSavingDraft(true);
      const group = groups.find((g) => g.gradeLevel === gradeLevel) || groups[0];
      const mentor = mentors[0];

      await aiAssistantApi.convertToAssessment({
        title: `${gradeLevel}: ${subject} bo‘yicha AI Test (Qoralama)`,
        subject,
        gradeLevel,
        groupId: group?.id,
        mentorId: mentor?.id,
        questions: response.generatedQuizQuestions,
      });

      toast.success(
        'Test savollari muvaffaqiyatli DRAFT sifatida saqlandi! Testlar bo‘limida ko‘rib chiqishingiz mumkin.'
      );
      if (onNavigateTab) {
        onNavigateTab('assessments');
      }
    } catch (err) {
      console.error('Error saving assessment draft:', err);
      toast.error('Testni saqlashda xatolik yuz berdi.');
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in-up">
      {/* 1. Page Header Banner (Soft, Borderless Modern Design) */}
      <div className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  AI Teaching & Learning Assistant
                </h1>
                <Badge variant="secondary" className="font-semibold text-xs rounded-full">
                  Modul 13
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mentorlar uchun dars rejalari va testlar tuzuvchi, o‘quvchilar uchun mavzularni tushuntiruvchi aqlli yordamchi
              </p>
            </div>
          </div>
        </div>

        {/* Advisory Header Badge (Border-free soft amber notice) */}
        <div className="flex items-center gap-2 p-2.5 px-3.5 bg-amber-500/10 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-medium border-0 shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>AI maslahat beradi — E’lon qilishdan oldin mentor tekshirishi shart</span>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Column (Options & Prompts) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Role Switcher & Configuration */}
          <Card className="rounded-2xl p-5 border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card text-card-foreground space-y-4">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Assistent Rejimi
            </div>

            {/* Segmented Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-muted/50 rounded-xl border-0">
              <button
                type="button"
                onClick={() => {
                  setRole('MENTOR_ASSISTANT');
                  setIntent('LESSON_PLAN');
                }}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border-0',
                  role === 'MENTOR_ASSISTANT'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <GraduationCap className="w-4 h-4 text-primary" />
                <span>Mentor Uchun</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('STUDENT_ASSISTANT');
                  setIntent('SIMPLE_EXPLANATION');
                }}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer border-0',
                  role === 'STUDENT_ASSISTANT'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Bot className="w-4 h-4 text-primary" />
                <span>O‘quvchi Uchun</span>
              </button>
            </div>

            {/* Task Intent Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Vazifa turi (Use Case):
              </label>
              <select
                aria-label="Vazifa turini tanlash"
                value={intent}
                onChange={(e) => setIntent(e.target.value as AiIntent)}
                className="w-full text-xs bg-muted/40 border-0 rounded-xl p-2.5 font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
              >
                {role === 'MENTOR_ASSISTANT' ? (
                  <>
                    <option value="LESSON_PLAN" className="bg-popover text-popover-foreground">
                      80 daqiqalik Dars Rejasi (Lesson Plan Draft)
                    </option>
                    <option value="PRESENTATION_SLIDES" className="bg-popover text-popover-foreground">
                      Maruza Taqdimot Slaydlari (Rich Text Slides)
                    </option>
                    <option value="QUIZ_GENERATION" className="bg-popover text-popover-foreground">
                      Oraliq Test Savollari (Draft Quiz)
                    </option>
                    <option value="CONCEPT_EXPLANATION" className="bg-popover text-popover-foreground">
                      Mavzuni Tushuntirish Metodikasi
                    </option>
                    <option value="DIFFERENTIATED_EXERCISES" className="bg-popover text-popover-foreground">
                      3 Darajali Differensial Topshiriqlar
                    </option>
                    <option value="PRACTICAL_EXERCISES" className="bg-popover text-popover-foreground">
                      Amaliy Laboratoriya Mashqlari
                    </option>
                    <option value="HOMEWORK_SUGGESTION" className="bg-popover text-popover-foreground">
                      Ijodiy Uyga Vazifalar
                    </option>
                    <option value="SUMMARIZE_MATERIAL" className="bg-popover text-popover-foreground">
                      O‘quv Materiallarini Qisqartirish
                    </option>
                  </>
                ) : (
                  <>
                    <option value="SIMPLE_EXPLANATION" className="bg-popover text-popover-foreground">
                      Oddiy So‘zlar Bilan Tushuntir (Simple Concept)
                    </option>
                    <option value="EXERCISE_HINT" className="bg-popover text-popover-foreground">
                      Masala Bo‘yicha Maslahat (Guided Hint)
                    </option>
                    <option value="EXPLAIN_INCORRECT_ANSWER" className="bg-popover text-popover-foreground">
                      Noto‘g‘ri Javob Tahlili (Error Analysis)
                    </option>
                    <option value="FURTHER_RESOURCES" className="bg-popover text-popover-foreground">
                      Qo‘shimcha O‘rganish Manbalari
                    </option>
                    <option value="INDEPENDENT_THINKING" className="bg-popover text-popover-foreground">
                      Sokratik Mustaqil Fikrlash
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* Parameters Row (Grade, Language) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Sinf:
                </label>
                <select
                  aria-label="Sinfni tanlash"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full text-xs bg-muted/40 border-0 rounded-xl p-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                >
                  <option value="8-sinf" className="bg-popover text-popover-foreground">8-sinf</option>
                  <option value="9-sinf" className="bg-popover text-popover-foreground">9-sinf</option>
                  <option value="10-sinf" className="bg-popover text-popover-foreground">10-sinf</option>
                  <option value="11-sinf" className="bg-popover text-popover-foreground">11-sinf</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  Til:
                </label>
                <select
                  aria-label="Tilni tanlash"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'uz' | 'ru' | 'en')}
                  className="w-full text-xs bg-muted/40 border-0 rounded-xl p-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
                >
                  <option value="uz" className="bg-popover text-popover-foreground">O‘zbekcha (Lotin)</option>
                  <option value="ru" className="bg-popover text-popover-foreground">Русский</option>
                  <option value="en" className="bg-popover text-popover-foreground">English</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground">
                Fan / Yo‘nalish:
              </label>
              <Input
                type="text"
                aria-label="Fan yoki yo‘nalish"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Masalan: Web Dasturlash, Kompyuter Arxitekturasi"
                className="w-full text-xs bg-muted/40 border-0 rounded-xl h-9 text-foreground focus-visible:ring-primary"
              />
            </div>

            {/* AI Engine Provider Indicator */}
            <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                AI Dvigatel:
              </span>
              <Badge variant="success" className="text-[11px] rounded-lg font-semibold">
                Groq LLM (Qwen 27B)
              </Badge>
            </div>
          </Card>

          {/* Suggested Quick Prompts */}
          <Card className="rounded-2xl p-5 border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card text-card-foreground space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Tavsiya Etilgan So‘rovlar</span>
            </div>
            <div className="space-y-2">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setUserPrompt(p.prompt);
                    handleGenerate(p.prompt);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-muted/30 hover:bg-muted/70 text-xs transition-all cursor-pointer border-0 group"
                >
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {p.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                    {p.prompt}
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Session History */}
          {history.length > 0 && (
            <Card className="rounded-2xl p-4 border-0 shadow-xs bg-card text-card-foreground space-y-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sessiya Tarixi
              </span>
              <div className="space-y-1.5 text-xs">
                {history.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setUserPrompt(h.prompt);
                      setIntent(h.intent);
                    }}
                    className="p-2.5 rounded-xl bg-muted/30 hover:bg-muted/70 cursor-pointer flex items-center justify-between text-xs transition-colors border-0"
                  >
                    <span className="truncate max-w-[200px] text-foreground font-medium">
                      {h.prompt}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{h.timestamp}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Output & Interactive Chat Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {/* Prompt Input Form */}
          <Card className="rounded-2xl p-5 border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card text-card-foreground space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Mavzu yoki So‘rovingizni kiriting:</span>
              </label>
              <span className="text-[11px] text-muted-foreground">
                Maksimal 4000 ta belgi (PII xavfsiz)
              </span>
            </div>

            <Textarea
              aria-label="AI so‘rov matni"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder={
                role === 'MENTOR_ASSISTANT'
                  ? 'Masalan: 8-sinf o‘quvchilariga Fon Neyman arxitekturasi va CPU buyruqlar siklini o‘rgatish bo‘yicha 80 daqiqalik dars rejasi tayyorlab ber...'
                  : 'Masalan: CPU va RAM o‘rtasidagi farqni oddiy hayotiy misol bilan tushuntirib ber...'
              }
              rows={3}
              className="w-full text-xs p-3.5 bg-muted/40 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary text-foreground resize-none"
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span>PII Himoyasi Faol: JSHSHIR va telefon raqamlari yashiriladi</span>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => handleGenerate()}
                disabled={loading || !userPrompt.trim()}
                className="rounded-xl shadow-xs gap-2 font-semibold text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Tayyorlamoqda...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Generatsiya Qilish</span>
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* AI Response Loading State */}
          {loading && (
            <Card className="rounded-2xl p-10 border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card text-card-foreground text-center space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground">
                  Pedagogik AI tavsiyalarni tuzmoqda...
                </p>
                <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
                  Dars rejalari, tushuntirishlar va test savollari 80 daqiqalik o‘quv standartiga moslanmoqda.
                </p>
              </div>
              <div className="space-y-2 pt-2 max-w-lg mx-auto">
                <Skeleton className="h-4 w-full bg-muted/60 rounded-md" />
                <Skeleton className="h-4 w-4/5 mx-auto bg-muted/60 rounded-md" />
                <Skeleton className="h-4 w-3/5 mx-auto bg-muted/40 rounded-md" />
              </div>
            </Card>
          )}

          {/* AI Response Card */}
          {!loading && response && (
            <Card className="rounded-2xl overflow-hidden border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card text-card-foreground animate-in fade-in duration-200">
              {/* Response Header & Actions Toolbar */}
              <div className="p-4 bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    AI
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground flex items-center gap-2">
                      <span>AXM Nexus Pedagogik Javobi</span>
                      <Badge variant="secondary" className="text-[10px] rounded-full">
                        {response.provider} / {response.model}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Response Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={handleCopy}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Nusxalandi' : 'Nusxa olish'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Ko‘rish' : 'Tahrirlash'}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => handleGenerate()}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Qayta yaratish</span>
                  </Button>
                </div>
              </div>

              {/* Advisory Disclaimer Notice (Soft amber, borderless) */}
              <div className="p-3 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-2 border-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{response.advisoryDisclaimer}</span>
              </div>

              {/* Content Workspace (Markdown or Editor) */}
              <div className="p-6">
                {isEditing ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editableContent}
                      onChange={(e) => setEditableContent(e.target.value)}
                      rows={14}
                      className="w-full font-mono text-xs p-3.5 bg-muted/40 border-0 rounded-xl focus-visible:ring-1 focus-visible:ring-primary text-foreground"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="text-xs rounded-lg"
                        onClick={() => {
                          if (response) response.content = editableContent;
                          setIsEditing(false);
                          toast.success('Tahrirlangan matn saqlandi');
                        }}
                      >
                        Tahrirni Tasdiqlash
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                    {response.content}
                  </div>
                )}
              </div>

              {/* Bottom Conversion Actions */}
              <div className="p-4 bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-0">
                <div className="text-[11px] text-muted-foreground">
                  Sarflangan tokenlar: {response.tokensUsed || 450} ta | Rasmiy hujjatga aylantirish:
                </div>

                <div className="flex items-center gap-2">
                  {response.generatedLessonPlan && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={savingDraft}
                      className="text-xs gap-1.5 font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border-0 rounded-xl"
                      onClick={handleSaveAsLessonDraft}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Dars Rejasi Sifatida Saqlash (DRAFT)</span>
                    </Button>
                  )}

                  {response.generatedQuizQuestions && response.generatedQuizQuestions.length > 0 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={savingDraft}
                      className="text-xs gap-1.5 font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 border-0 rounded-xl"
                      onClick={handleSaveAsAssessmentDraft}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Test Savollari Sifatida Saqlash (DRAFT)</span>
                    </Button>
                  )}

                  {(intent === 'PRESENTATION_SLIDES' || (response.content && response.content.includes('---'))) && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs gap-1.5 font-bold bg-gradient-to-r from-indigo-500/15 via-blue-500/15 to-cyan-500/15 text-indigo-700 dark:text-indigo-300 hover:opacity-90 border-0 rounded-xl"
                      onClick={() => setIsPresentationOpen(true)}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Taqdimot Rejimida Ochish & Ko‘rish</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Empty State when no response generated yet */}
          {!loading && !response && (
            <Card className="rounded-2xl p-12 text-center border-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none bg-card text-card-foreground space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Bot className="w-6 h-6" />
              </div>
              <CardTitle className="text-sm font-bold text-foreground">
                Pedagogik AI Yordamchi Ishga Tayyor
              </CardTitle>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                Chap tomondagi tayyor promptlardan birini tanlang yoki yuqoridagi maydonga dars mavzusini kiritib «Generatsiya Qilish» tugmasini bosing.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* AI Presentation Modal */}
      <AiPresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
        initialTopic={userPrompt}
        initialGrade={gradeLevel}
        initialSubject={subject}
      />
    </div>
  );
};
