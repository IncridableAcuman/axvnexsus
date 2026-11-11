import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Edit3,
  Play,
  Save,
  Copy,
  Check,
  Volume2,
  X,
  Loader2,
  Plus,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ToastContext } from '@/shared/ui/toast/ToastContext';
import { aiAssistantApi, lessonPlanApi } from '@/api';
import type { LessonPlanDto, AiPromptRequest } from '@/types';

export interface AiPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson?: LessonPlanDto | null;
  initialTopic?: string;
  initialGrade?: string;
  initialSubject?: string;
  onSaveSuccess?: (updatedLesson: LessonPlanDto) => void;
}

export const AiPresentationModal: React.FC<AiPresentationModalProps> = ({
  isOpen,
  onClose,
  lesson,
  initialTopic,
  initialGrade,
  initialSubject,
  onSaveSuccess,
}) => {
  const toastContext = React.useContext(ToastContext);
  const toast = toastContext || {
    toast: () => {},
    success: (title: string) => console.log(title),
    error: (title: string) => console.error(title),
    warning: (title: string) => console.warn(title),
    info: (title: string) => console.info(title),
    dismiss: () => {},
  };

  // Mode: 'presenter' | 'editor' | 'ai-generator'
  const [activeTab, setActiveTab] = useState<'presenter' | 'editor' | 'ai-generator'>('presenter');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Markdown presentation text
  const [markdownContent, setMarkdownContent] = useState<string>('');

  // AI prompt form state
  const [topicInput, setTopicInput] = useState<string>('');
  const [gradeInput, setGradeInput] = useState<string>('8-sinf');
  const [subjectInput, setSubjectInput] = useState<string>('Web Full-Stack Development');

  // Initialize content on open or lesson change
  useEffect(() => {
    if (isOpen) {
      const topic = lesson?.topic || lesson?.title || initialTopic || 'Fon Neyman kompyuter arxitekturasi va CPU tuzilishi';
      const grade = lesson?.gradeLevel || initialGrade || '8-sinf';
      const subject = lesson?.subject || initialSubject || 'Web Full-Stack Development';

      setTopicInput(topic);
      setGradeInput(grade);
      setSubjectInput(subject);

      if (lesson?.presentationSlides && lesson.presentationSlides.trim().length > 0) {
        setMarkdownContent(lesson.presentationSlides);
        setActiveTab('presenter');
      } else {
        // Generate default initial slides for the topic if none exists
        const defaultSlides = getDefaultPresentationSlides(topic, grade, subject);
        setMarkdownContent(defaultSlides);
      }
      setCurrentSlideIndex(0);
    }
  }, [isOpen, lesson, initialTopic, initialGrade, initialSubject]);

  // Parse markdown into distinct slides by separator '---'
  const slides = useMemo(() => {
    if (!markdownContent || markdownContent.trim().length === 0) {
      return [];
    }
    const rawSlides = markdownContent.split(/^---+\s*$/m);
    return rawSlides
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [markdownContent]);

  // Slide navigation
  const totalSlides = slides.length || 1;
  const currentSlideRaw = slides[currentSlideIndex] || '';

  const goToNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.min(prev + 1, totalSlides - 1));
  }, [totalSlides]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation for presentation
  useEffect(() => {
    if (!isOpen || activeTab !== 'presenter') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, goToNextSlide, goToPrevSlide, isFullscreen, toggleFullscreen]);

  // Parse current slide into title, body, and speaker notes
  const parsedSlide = useMemo(() => {
    let title = '';
    const bodyLines: string[] = [];
    const speakerNotes: string[] = [];

    const lines = currentSlideRaw.split('\n');
    let readingSpeakerNotes = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!title && (trimmed.startsWith('# ') || trimmed.startsWith('## '))) {
        title = trimmed.replace(/^#+\s*/, '');
        continue;
      }

      if (
        trimmed.startsWith('> 🎙️') ||
        trimmed.toLowerCase().startsWith('*speaker notes:*') ||
        trimmed.toLowerCase().startsWith('> **spiker') ||
        trimmed.toLowerCase().startsWith('spiker izohi:')
      ) {
        readingSpeakerNotes = true;
        speakerNotes.push(
          trimmed
            .replace(/^>\s*/, '')
            .replace(/^🎙️\s*/, '')
            .replace(/^\*\*Spiker izohi:\*\*\s*/i, '')
            .replace(/^Spiker izohi:\s*/i, '')
        );
        continue;
      }

      if (readingSpeakerNotes) {
        if (trimmed.startsWith('>')) {
          speakerNotes.push(trimmed.replace(/^>\s*/, ''));
        } else {
          speakerNotes.push(trimmed);
        }
      } else {
        bodyLines.push(line);
      }
    }

    return {
      title: title || `Slayd ${currentSlideIndex + 1}`,
      body: bodyLines.join('\n').trim(),
      speakerNotes: speakerNotes.join(' ').trim(),
    };
  }, [currentSlideRaw, currentSlideIndex]);

  // AI Generation Handler
  const handleGenerateAiSlides = async (overridePrompt?: string) => {
    const topicToUse = overridePrompt || topicInput.trim();
    if (!topicToUse) {
      toast.error('Iltimos, dars mavzusini kiriting');
      return;
    }

    try {
      setGenerating(true);
      const req: AiPromptRequest = {
        userPrompt: `${gradeInput} o‘quvchilari uchun '${topicToUse}' mavzusida 6 slayddan iborat boyitilgan interaktiv maruza taqdimotini yaratib ber.`,
        role: 'MENTOR_ASSISTANT',
        intent: 'PRESENTATION_SLIDES',
        subject: subjectInput,
        gradeLevel: gradeInput,
        topic: topicToUse,
        language: 'uz',
      };

      const res = await aiAssistantApi.generate(req);
      if (res.data && res.data.content) {
        setMarkdownContent(res.data.content);
        setCurrentSlideIndex(0);
        setActiveTab('presenter');
        toast.success('AI maruza taqdimoti muvaffaqiyatli yaratildi!');
      } else {
        toast.error('AI javob bermadi.');
      }
    } catch (err: unknown) {
      console.error('AI slide generation error:', err);
      // Fallback to rich offline slides if API fails
      const fallback = getDefaultPresentationSlides(topicToUse, gradeInput, subjectInput);
      setMarkdownContent(fallback);
      setCurrentSlideIndex(0);
      setActiveTab('presenter');
      toast.success('Pedagogik andoza asosida slaydlar yaratildi!');
    } finally {
      setGenerating(false);
    }
  };

  // Save slides to lesson
  const handleSaveToLesson = async () => {
    if (!lesson?.id) {
      toast.error('Biriktirish uchun dars aniqlanmadi. Slaydlar nusxasini olishingiz mumkin.');
      return;
    }

    try {
      setSaving(true);
      const res = await lessonPlanApi.updatePresentation(lesson.id, markdownContent);
      toast.success("Taqdimot slaydlari darsga muvaffaqiyatli saqlandi!");
      if (onSaveSuccess && res.data) {
        onSaveSuccess(res.data);
      }
    } catch (e) {
      console.error('Failed to save presentation to lesson', e);
      toast.error("Taqdimotni darsga saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  // Copy to clipboard
  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setIsCopied(true);
    toast.success('Taqdimot matni nusxalandi!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Insert helper markdown snippet in editor
  const insertSnippet = (snippet: string) => {
    setMarkdownContent((prev) => prev + '\n\n' + snippet);
    toast.info("Format kiritildi");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        hideCloseButton={true}
        className={cn(
          "bg-card text-card-foreground border-0 shadow-2xl transition-all duration-300 p-0 overflow-hidden flex flex-col",
          isFullscreen
            ? "!fixed !inset-0 !left-0 !top-0 !translate-x-0 !translate-y-0 !transform-none !w-screen !h-screen !max-w-none !max-h-none !rounded-none z-[100] m-0 border-0"
            : "max-w-5xl max-h-[92vh] h-[850px] rounded-3xl"
        )}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-3.5 border-b border-border/15 bg-card/95 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-foreground">
                  AI Maruza Taqdimoti
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-0 bg-primary/10 text-primary">
                  Rich Text & Slides
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                {topicInput} • {gradeInput} • Al-Xorazmiy Vorislari Standarti
              </DialogDescription>
            </div>
          </div>

          {/* Navigation Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('presenter')}
              className={`text-xs font-bold rounded-xl h-8 px-3 transition-all border-0 ${
                activeTab === 'presenter'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Play className="w-3.5 h-3.5 mr-1 text-emerald-500" />
              Slaydlar Rejimi
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('editor')}
              className={`text-xs font-bold rounded-xl h-8 px-3 transition-all border-0 ${
                activeTab === 'editor'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 mr-1 text-primary" />
              Rich Text Muharriri
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('ai-generator')}
              className={`text-xs font-bold rounded-xl h-8 px-3 transition-all border-0 ${
                activeTab === 'ai-generator'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-500" />
              AI bilan Yangilash
            </Button>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Oynani kichraytirish (Esc)' : 'To‘liq ekran (F)'}
              className="w-8 h-8 p-0 rounded-xl hover:bg-muted/60 border-0"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-8 h-8 p-0 rounded-xl hover:bg-muted/60 border-0"
              title="Yopish"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-muted/20">
          {/* TAB 1: PRESENTER MODE (SLIDE VIEWER) */}
          {activeTab === 'presenter' && (
            <div className={cn(
              "flex-1 flex flex-col justify-between overflow-hidden mx-auto w-full transition-all duration-300",
              isFullscreen ? "p-6 sm:p-10 max-w-7xl h-full" : "p-4 sm:p-8 max-w-5xl"
            )}>
              {/* Slide Counter and Progress Pill */}
              <div className="flex items-center justify-between pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-primary/10 text-primary">
                    Slayd {currentSlideIndex + 1} / {totalSlides}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    (Navigatsiya: ← chap, → o‘ng, F to‘liq ekran)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSpeakerNotes((prev) => !prev)}
                    className={`text-xs rounded-xl h-8 px-2.5 border-0 ${
                      showSpeakerNotes ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold' : 'text-muted-foreground'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5 mr-1.5" />
                    Spiker Eslatmasi: {showSpeakerNotes ? 'Yoqilgan' : 'O‘chirilgan'}
                  </Button>
                </div>
              </div>

              {/* Current Slide Display Canvas (Luxury Presentation Style) */}
              <div className={cn(
                "flex-1 rounded-3xl bg-card text-card-foreground shadow-xl border border-border/20 flex flex-col justify-between overflow-y-auto animate-in fade-in zoom-in-98 duration-200",
                isFullscreen ? "p-8 sm:p-12 lg:p-14" : "p-6 sm:p-10"
              )}>
                <div className="space-y-6">
                  {/* Slide Title */}
                  <div className="space-y-2 border-b border-border/15 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black tracking-wider uppercase text-primary/80">
                        {gradeInput} • {subjectInput}
                      </span>
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        #{String(currentSlideIndex + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h2 className={cn(
                      "font-black text-foreground tracking-tight leading-tight",
                      isFullscreen ? "text-2xl sm:text-3xl lg:text-4xl" : "text-xl sm:text-2xl lg:text-3xl"
                    )}>
                      {parsedSlide.title}
                    </h2>
                  </div>

                  {/* Slide Body Content with Rich-Text formatting */}
                  <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed space-y-4">
                    {renderRichTextContent(parsedSlide.body)}
                  </div>
                </div>

                {/* Speaker Notes Box (Visible for Teacher/Mentor) */}
                {showSpeakerNotes && parsedSlide.speakerNotes && (
                  <div className="mt-6 pt-4 border-t border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl p-4 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <Volume2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>🎙️ O‘qituvchi / Spiker uchun Metodik Izoh:</span>
                    </div>
                    <p className="leading-relaxed pl-6">{parsedSlide.speakerNotes}</p>
                  </div>
                )}
              </div>

              {/* Bottom Slide Controller Bar */}
              <div className="flex items-center justify-between pt-4 shrink-0">
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%]">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        idx === currentSlideIndex
                          ? 'w-8 bg-primary shadow-xs'
                          : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      title={`Slayd ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation and Save Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPrevSlide}
                    disabled={currentSlideIndex === 0}
                    className="rounded-xl h-9 px-3 border-0 bg-card hover:bg-muted font-semibold shadow-xs disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Oldingi
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={goToNextSlide}
                    disabled={currentSlideIndex === totalSlides - 1}
                    className="rounded-xl h-9 px-4 border-0 font-bold shadow-sm disabled:opacity-40"
                  >
                    Keyingi
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>

                  {lesson && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveToLesson}
                      disabled={saving}
                      className="rounded-xl h-9 px-3 border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                      Darsga Saqlash
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RICH TEXT / MARKDOWN EDITOR */}
          {activeTab === 'editor' && (
            <div className={cn(
              "flex-1 p-6 mx-auto w-full flex flex-col space-y-4 overflow-hidden",
              isFullscreen ? "max-w-7xl h-full" : "max-w-5xl"
            )}>
              <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Taqdimot Slaydlari Tahrirlovchisi (Markdown)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Slaydlarni ajratish uchun <code className="text-primary font-mono font-bold">---</code> dan foydalaning.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertSnippet('---\n# Yangi Slayd Sarlavhasi\n- Asosiy tezis va matn\n\n> 🎙️ **Spiker izohi:** Darsdagi savol')}
                    className="text-xs rounded-xl h-8 bg-muted border-0 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Yangi Slayd
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyMarkdown}
                    className="text-xs rounded-xl h-8 bg-muted border-0 font-semibold"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {isCopied ? 'Nusxalandi' : 'Nusxa olish'}
                  </Button>
                  {lesson && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveToLesson}
                      disabled={saving}
                      className="text-xs rounded-xl h-8 px-3 border-0 font-bold shadow-xs"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                      Darsga Saqlash
                    </Button>
                  )}
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 rounded-2xl bg-card border border-border/20 p-4 shadow-sm flex flex-col overflow-hidden">
                <Textarea
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="Slaydlar matnini Markdown formatida kiriting..."
                  className="flex-1 resize-none font-mono text-xs sm:text-sm leading-relaxed border-0 focus-visible:ring-0 p-2 bg-transparent overflow-y-auto"
                />
              </div>

              {/* Quick Format Snippets Bar */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 overflow-x-auto pb-1">
                <span className="font-bold shrink-0">Tezkor andozalar:</span>
                <button
                  type="button"
                  onClick={() => insertSnippet('```python\n# Kod namunasi\ndef solution():\n    pass\n```')}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border/20 cursor-pointer font-mono"
                >
                  Kod bloki (Python)
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('> [!NOTE]\n> Muhim eslatma yoki analogiya')}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border/20 cursor-pointer"
                >
                  Eslatma (Callout)
                </button>
                <button
                  type="button"
                  onClick={() => insertSnippet('> 🎙️ **Spiker izohi:** O‘quvchilarga savol bering')}
                  className="px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border/20 cursor-pointer"
                >
                  Spiker Izohi
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AI GENERATOR */}
          {activeTab === 'ai-generator' && (
            <div className={cn(
              "flex-1 p-6 mx-auto w-full flex flex-col space-y-6 overflow-y-auto",
              isFullscreen ? "max-w-5xl h-full" : "max-w-4xl"
            )}>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Al-Xorazmiy Vorislari Bo‘yicha AI Taqdimot Generatori
                </h3>
                <p className="text-xs text-muted-foreground">
                  Tanlangan mavzu yoki o‘quv rejasi asosida 80 daqiqalik dars uchun mukammal, boyitilgan slaydlar to‘plamini bir zumda yarating.
                </p>
              </div>

              {/* Generation Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Sinf Darajasi:</label>
                  <select
                    value={gradeInput}
                    onChange={(e) => setGradeInput(e.target.value)}
                    className="w-full text-xs font-medium rounded-xl border border-border/30 bg-card p-2.5 focus:outline-none"
                  >
                    <option value="8-sinf">8-sinf (IT Foundation & Web Full-Stack)</option>
                    <option value="9-sinf">9-sinf (Python & Algoritmlar / Big-O)</option>
                    <option value="10-sinf">10-sinf (Backend & REST API / SQL)</option>
                    <option value="11-sinf">11-sinf (Portfolio & Xalqaro Freelance)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Fan Yo‘nalishi:</label>
                  <Input
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    placeholder="Masalan: Web Full-Stack Development"
                    className="text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Mavzu / Konsept:</label>
                  <Input
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder="Masalan: Fon Neyman arxitekturasi va CPU"
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Suggested Roadmap Prompts */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Tavsiya etilgan rasmiy o‘quv mavzulari:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      label: "8-Sinf: Fon Neyman Arxitekturasi & CPU",
                      topic: "Fon Neyman kompyuter arxitekturasi va zamonaviy CPU tuzilishi",
                      grade: "8-sinf",
                      subject: "Web Full-Stack Development",
                    },
                    {
                      label: "8-Sinf: HTML5 Semantika & Moslashuvchan CSS Flexbox",
                      topic: "HTML5 Semantik teglari va CSS Flexbox bilan moslashuvchan maketlash",
                      grade: "8-sinf",
                      subject: "Web Full-Stack Development",
                    },
                    {
                      label: "9-Sinf: Python & Algoritmlar (Big-O, Binary Search)",
                      topic: "Python ma'lumotlar tuzilmalari, Big-O va Ikkilik qidiruv (Binary Search)",
                      grade: "9-sinf",
                      subject: "Python, Algoritmlar va Data Structures",
                    },
                    {
                      label: "10-Sinf: Backend REST API & PostgreSQL Jadvallari",
                      topic: "RESTful API me'morchiligi va PostgreSQL relyatsion ma'lumotlar bazasi",
                      grade: "10-sinf",
                      subject: "Backend Engineering & Databases",
                    },
                    {
                      label: "11-Sinf: CI/CD Pipeline & Xalqaro Freelance",
                      topic: "GitHub Actions CI/CD, Production Deploy va Xalqaro Freelance Karyerasi",
                      grade: "11-sinf",
                      subject: "Professional IT & International Careers",
                    },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTopicInput(p.topic);
                        setGradeInput(p.grade);
                        setSubjectInput(p.subject);
                        handleGenerateAiSlides(p.topic);
                      }}
                      className="p-3.5 rounded-2xl bg-card hover:bg-primary/5 hover:border-primary/40 border border-border/20 text-left transition-all cursor-pointer group space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {p.label}
                        </span>
                        <Sparkles className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{p.topic}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <div className="pt-2">
                <Button
                  variant="default"
                  size="lg"
                  onClick={() => handleGenerateAiSlides()}
                  disabled={generating || !topicInput.trim()}
                  className="w-full sm:w-auto rounded-2xl font-bold px-8 shadow-lg shadow-primary/25 border-0 gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sun'iy Intellekt boyitilgan slaydlarni tayyorlamoqda...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-amber-300" />
                      <span>AI bilan Maruza Taqdimotini Generatsiya Qilish</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// HELPER: Simple Markdown Rich-Text Renderer for Slide Viewer
// ============================================================================
function renderRichTextContent(body: string) {
  if (!body) return null;

  const elements: React.ReactNode[] = [];
  const lines = body.split('\n');
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = '';

  lines.forEach((line, index) => {
    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        elements.push(
          <div
            key={`code-${index}`}
            className="my-3 rounded-2xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner border border-slate-800"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase">
              <span>{codeLanguage || 'KOD NAMOZASI'}</span>
              <span>SYNTAX HIGHLIGHTED</span>
            </div>
            <pre className="whitespace-pre">{codeBuffer.join('\n')}</pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        inCodeBlock = true;
        codeLanguage = line.trim().replace(/^```/, '');
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    const trimmed = line.trim();

    // Callout box (> [!NOTE] or > [!TIP] or > [!IMPORTANT])
    if (trimmed.startsWith('> [!NOTE]') || trimmed.startsWith('> [!TIP]') || trimmed.startsWith('> [!IMPORTANT]')) {
      const type = trimmed.includes('TIP') ? 'tip' : trimmed.includes('IMPORTANT') ? 'important' : 'note';
      const cleanText = trimmed.replace(/^>\s*\[![A-Z]+\]\s*/, '');
      elements.push(
        <div
          key={`callout-${index}`}
          className={`my-3 p-3.5 rounded-2xl text-xs font-medium border-0 flex items-start gap-2.5 ${
            type === 'tip'
              ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
              : type === 'important'
              ? 'bg-rose-500/10 text-rose-900 dark:text-rose-200'
              : 'bg-blue-500/10 text-blue-900 dark:text-blue-200'
          }`}
        >
          <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="leading-relaxed">{cleanText || 'Muhim eslatma'}</div>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('>')) {
      elements.push(
        <blockquote
          key={`quote-${index}`}
          className="my-2 pl-4 border-l-4 border-primary/40 text-xs text-muted-foreground italic"
        >
          {trimmed.replace(/^>\s*/, '')}
        </blockquote>
      );
      return;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${index}`} className="ml-4 list-disc text-sm text-foreground/90 leading-relaxed">
          {formatInlineRichText(trimmed.replace(/^[-*]\s*/, ''))}
        </li>
      );
      return;
    }

    // Numbered list
    if (/^[0-9]+\.\s+/.test(trimmed)) {
      elements.push(
        <li key={`num-${index}`} className="ml-4 list-decimal text-sm text-foreground/90 leading-relaxed">
          {formatInlineRichText(trimmed.replace(/^[0-9]+\.\s*/, ''))}
        </li>
      );
      return;
    }

    // Empty line
    if (!trimmed) {
      elements.push(<div key={`spacer-${index}`} className="h-1" />);
      return;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${index}`} className="text-sm text-foreground/90 leading-relaxed">
        {formatInlineRichText(line)}
      </p>
    );
  });

  return elements;
}

// Inline formatting: **bold**, `code`
function formatInlineRichText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-extrabold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-muted text-primary font-semibold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Default pedagogical presentation slides template for fast startup
function getDefaultPresentationSlides(topic: string, grade: string, subject: string): string {
  return `# 🚀 1. ${topic}
**Muhammad Al-Xorazmiy Vorislari • ${grade} Dasturi**
- **Fan:** ${subject}
- **Format:** 80 daqiqalik intensiv ma'ruza va live-coding (PQ-3274 standarti)
- **Kutilayotgan natija:** Mavzuni to'liq o'zlashtirish va amaliy laboratoriya topshirig'ini mustaqil bajarish.

> [!NOTE]
> Al-Xorazmiy vorislari dasturida har bir ma'ruza real ishlab chiqarish tajribasi va loyihalar bilan mustahkamlanadi!

> 🎙️ **Spiker izohi:** Darsni o'quvchilardan "Ushbu texnologiya siz ishlatayotgan qaysi ilovalarda bor?" degan savol bilan boshlang.
---
# 🧠 2. Asosiy Konsept va Arxitektura
- **Poydevor tamoyillari:** Har qanday dasturiy tizim qat'iy me'morchilik va toza kod standartlariga tayanadi.
- **Modullilik:** Murakkab muammolarni kichik, mustaqil bloklarga ajratish.
- **Ma'lumotlar oqimi:** Kiruvchi parametrlar (Input) -> Qayta ishlash mantiqi -> Natija (Output).

\`\`\`text
+---------------------+     +---------------------+     +---------------------+
|   KIRUVCHI (INPUT)  | --> |   QAYTA ISHLASH     | --> |   NATIJA (OUTPUT)   |
|   (Foydalanuvchi)   |     |   (Algoritm / API)  |     |   (Ekran / Baza)    |
+---------------------+     +---------------------+     +---------------------+
\`\`\`

> 🎙️ **Spiker izohi:** Oddiy qidiruv tizimi yoki kalkulyator misolida ma'lumotlar oqimini ko'rsating.
---
# ⚡ 3. Amaliy Kod Namunalari va Sintaksis
- **Toza kod (Clean Code):** O'zgaruvchilarni ma'noli nomlash va ortiqcha takrorlanishlardan saqlanish.
- **Xavfsizlik va barqarorlik:** Kiritilgan qiymatlarni doimo tekshirish (Validation).

\`\`\`javascript
// Dars bo'yicha interaktiv dasturiy namuna:
const lessonTopic = "${topic}";
console.log(\`Mavzu: \${lessonTopic} muvaffaqiyatli ishga tushirildi!\`);
\`\`\`

> 🎙️ **Spiker izohi:** Koddagi har bir qator nima vazifani bajarishini o'quvchilarga birma-bir savol berib tushuntiring.
---
# 💡 4. Muhim Tavsiyalar & Xatoliklarni Oldini Olish
1. **Bosqichma-bosqich tekshirish (Testing):** Har bir modulni yoziboq tekshiring.
2. **Versiyalar nazorati (Git):** Har bir muvaffaqiyatli qadamdan so'ng commit qiling.
3. **Traceback va konsol xabarlarini tahlil qilish:** Xatodan qo'rqmaslik, u o'rganishning eng yaxshi usulidir.

> [!TIP]
> Xatolik yuz berganda shoshilmang! Konsoldagi qizil xabar qaysi qatorda muammo borligini aniq aytadi.

> 🎙️ **Spiker izohi:** O'z tajribangizdagi eng qiziq bir dasturlash xatosi haqida 1 daqiqa hikoya qilib bering.
---
# 💻 5. Amaliy Laboratoriya Topshirig'i (25 daqiqa)
**Vazifa:**
- Ko'rsatilgan kod andozasi asosida o'z mustaqil yechimingizni ishlab chiqing.
- Juftlikda (Pair Programming) bir-biringizning kodingizni ko'rib chiqing (Code Review).
- Ishlayotgan natijani mentorga namoyish eting.

> 🎙️ **Spiker izohi:** Sinf bo'ylab aylanib, qiynalayotgan o'quvchilarga yo'naltiruvchi maslahatlar bering.
---
# 🎯 6. Dars Xulosasi, Oraliq Test va Uyga Vazifa
- **O'rganildi:** Mavzuning poydevor qoidalari, amaliy yechim va arxitektura.
- **Oraliq nazorat testi:** Platformada mavzu bo'yicha testni topshiring (Streak va XP olish uchun!).
- **Uyga vazifa:** Bajarilgan laboratoriya ishini kengaytirish va GitHub profilingizga push qilish.

> 🎙️ **Spiker izohi:** Darsda eng faol qatnashgan o'quvchilarni olqishlang va darsni yakunlang.`;
}
