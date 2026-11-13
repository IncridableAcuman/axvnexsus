import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Clock,
  Award,
  Play,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Calendar,
  Sparkles,
  Search,
  FileQuestion,
  Trophy,
  RefreshCw,
  ChevronRight,
  HelpCircle,
  FileText,
  Hash,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/shared/ui/toast/ToastContext';
import { useOptionalAuth } from '@/features/auth/AuthContext';
import { useCurrentStudent } from '@/features/auth/useCurrentStudent';
import { assessmentApi, assignmentApi } from '@/api';
import type {
  AssessmentDto,
  AssessmentQuestionDto,
  StudentAssessmentAttemptDto,
  AssignmentDto,
  StudyGroup,
  Mentor,
  Student,
} from '@/types';

export interface AssessmentEngineProps {
  groups?: StudyGroup[];
  mentors?: Mentor[];
  students?: Student[];
}

export const AssessmentEngine: React.FC<AssessmentEngineProps> = ({
  groups: _groups = [],
  mentors: _mentors = [],
  students: _students = [],
}) => {
  const toast = useToast();
  const auth = useOptionalAuth();
  const isAdmin = auth ? auth.isAdmin : true;
  const isMentor = auth ? auth.isMentor : true;
  const canManage = isAdmin || isMentor;

  const [activeSubTab, setActiveSubTab] = useState<'QUIZZES' | 'ASSIGNMENTS'>('QUIZZES');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');

  // Quizzes State
  const [assessments, setAssessments] = useState<AssessmentDto[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentDto | null>(null);

  // Current Authenticated Student Context
  const { studentId: currentStudentId, isLoading: loadingStudent, hasProfile } = useCurrentStudent();
  const activeStudentId = auth?.isStudent
    ? (currentStudentId ?? undefined)
    : (currentStudentId ?? (!auth ? _students[0]?.id : undefined));

  const [activeAttemptId, setActiveAttemptId] = useState<number | null>(null);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [isTestTaking, setIsTestTaking] = useState(false);
  const [testQuestions, setTestQuestions] = useState<AssessmentQuestionDto[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(45 * 60);
  const [testResult, setTestResult] = useState<StudentAssessmentAttemptDto | null>(null);
  const [detailedReviewItems, setDetailedReviewItems] = useState<{
    question: AssessmentQuestionDto;
    studentAnswerText: string;
    correctAnswerText: string;
    isCorrect: boolean;
    pointsEarned: number;
  }[]>([]);

  const attemptsStorageKey = auth?.user?.id ? `axvhub_test_attempts_${auth.user.id}` : 'axvhub_test_attempts';

  const [latestAttempts, setLatestAttempts] = useState<Record<number, StudentAssessmentAttemptDto>>(() => {
    try {
      const saved = localStorage.getItem(attemptsStorageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync authenticated student attempts from backend
  useEffect(() => {
    if (auth?.isStudent) {
      assessmentApi.getMyAttempts()
        .then((res) => {
          if (res.data) {
            const attemptsMap: Record<number, StudentAssessmentAttemptDto> = {};
            res.data.forEach((att) => {
              if (att.assessmentId) {
                attemptsMap[att.assessmentId] = att;
              }
            });
            setLatestAttempts((prev) => ({ ...prev, ...attemptsMap }));
          }
        })
        .catch((err) => {
          console.warn('Could not load student attempts from backend:', err);
        });
    }
  }, [auth?.isStudent, currentStudentId]);

  const saveAttemptResult = (quizId: number, attempt: StudentAssessmentAttemptDto) => {
    setLatestAttempts((prev) => {
      const updated = { ...prev, [quizId]: attempt };
      try {
        localStorage.setItem(attemptsStorageKey, JSON.stringify(updated));
      } catch (err) {
        // Ignore localStorage quota or private-browsing errors
        void err;
      }
      return updated;
    });
  };

  // Homework Assignments State
  const [assignments, setAssignments] = useState<AssignmentDto[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [isSubmitHomeworkOpen, setIsSubmitHomeworkOpen] = useState(false);
  const [selectedAssignmentForSubmit, setSelectedAssignmentForSubmit] = useState<AssignmentDto | null>(null);
  const [homeworkText, setHomeworkText] = useState('');
  const [homeworkUrl, setHomeworkUrl] = useState('');
  const [submittingHomework, setSubmittingHomework] = useState(false);

  // Create Quiz Modal State
  const [isCreateQuizOpen, setIsCreateQuizOpen] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizSubject, setNewQuizSubject] = useState('Web Full-Stack Development');
  const [newQuizGrade, setNewQuizGrade] = useState('8-sinf');
  const [newQuizDuration, setNewQuizDuration] = useState(30);
  const [newQuizPassingScore, setNewQuizPassingScore] = useState(60);
  const [newQuizQuestions] = useState<AssessmentQuestionDto[]>([
    {
      questionText: 'HTML da giperhavola yaratish uchun qaysi teg ishlatiladi?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['<link>', '<a>', '<href>', '<hyperlink>']),
      correctAnswersJson: '1',
      explanation: '<a> (anchor) tegi href atributi bilan giperhavolalar yaratish uchun standart tegdir.',
    },
    {
      questionText: 'CSS da flex-direction xususiyatining standart (default) qiymati nima?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['column', 'row', 'row-reverse', 'inline']),
      correctAnswersJson: '1',
      explanation: 'Standart qiymat row bo‘lib, elementlarni gorizontal qator bo‘ylab joylashtiradi.',
    },
  ]);

  // Create Assignment Modal State
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
  const [newAssignmentDesc, setNewAssignmentDesc] = useState('');
  const [newAssignmentSubject, setNewAssignmentSubject] = useState('Web Full-Stack Development');
  const [newAssignmentGrade, setNewAssignmentGrade] = useState('8-sinf');
  const [newAssignmentMaxPoints, setNewAssignmentMaxPoints] = useState(100);
  const [newAssignmentDeadline, setNewAssignmentDeadline] = useState('');
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  const loadAssessments = async () => {
    try {
      setLoadingAssessments(true);
      const res = await assessmentApi.getAll();
      if (res.data && res.data.length > 0) {
        setAssessments(res.data);
      } else {
        setAssessments(getDefaultSampleAssessments());
      }
    } catch {
      setAssessments(getDefaultSampleAssessments());
    } finally {
      setLoadingAssessments(false);
    }
  };

  const loadAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const res = await assignmentApi.getAll();
      if (res.data && res.data.length > 0) {
        setAssignments(res.data);
      } else {
        setAssignments(getDefaultSampleAssignments());
      }
    } catch {
      setAssignments(getDefaultSampleAssignments());
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    loadAssessments();
    loadAssignments();
  }, []);

  // Timer countdown in active test mode
  useEffect(() => {
    if (!isTestTaking) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTestTaking, studentAnswers]);

  const handleStartTest = async (assessment: AssessmentDto) => {
    try {
      let questions: AssessmentQuestionDto[] = [];
      try {
        const res = await assessmentApi.getQuestionsForTaking(assessment.id);
        if (res.data && res.data.length > 0) {
          questions = res.data;
        }
      } catch (err) {
        console.warn('Questions fetch warning:', err);
      }

      if (questions.length === 0) {
        questions = getDefaultQuestionsForAssessment(assessment.title);
      }

      const normalizedQuestions = questions.map((q, idx) => ({
        ...q,
        id: q.id ?? (idx + 1),
      }));

      // Start attempt on backend
      let attemptId: number | null = null;
      if (typeof assessmentApi.startAttempt === 'function') {
        try {
          const attemptRes = await assessmentApi.startAttempt(assessment.id, activeStudentId);
          if (attemptRes && attemptRes.data && attemptRes.data.id) {
            attemptId = attemptRes.data.id;
          }
        } catch (e) {
          console.warn('Backend startAttempt fallback to local:', e);
        }
      }

      setActiveAttemptId(attemptId);
      setSelectedAssessment(assessment);
      setTestQuestions(normalizedQuestions);
      setCurrentQuestionIndex(0);
      setStudentAnswers({});
      setSecondsRemaining((assessment.durationMinutes || 30) * 60);
      setTestResult(null);
      setDetailedReviewItems([]);
      setShowReview(true);
      setIsTestTaking(true);
      toast.info('Real test boshlandi', `${assessment.durationMinutes || 30} daqiqa vaqtingiz bor. Omad!`);
    } catch {
      const sample = getDefaultSampleQuestions().map((q, idx) => ({
        ...q,
        id: q.id ?? (idx + 1),
      }));
      setSelectedAssessment(assessment);
      setTestQuestions(sample);
      setCurrentQuestionIndex(0);
      setStudentAnswers({});
      setSecondsRemaining(30 * 60);
      setTestResult(null);
      setDetailedReviewItems([]);
      setShowReview(true);
      setIsTestTaking(true);
    }
  };

  const handleSubmitTest = async () => {
    let earned = 0;
    let correctCount = 0;
    const max = testQuestions.reduce((acc, q) => acc + (q.points || 10), 0);

    const formattedAnswers: Record<number, string> = {};
    const reviewData: {
      question: AssessmentQuestionDto;
      studentAnswerText: string;
      correctAnswerText: string;
      isCorrect: boolean;
      pointsEarned: number;
    }[] = [];

    testQuestions.forEach((q, idx) => {
      const qKey = q.id ?? (idx + 1);
      const ans = studentAnswers[qKey];
      if (ans !== undefined) {
        formattedAnswers[qKey] = ans;
      }

      let opts: string[] = [];
      try {
        if (q.optionsJson) {
          opts = JSON.parse(q.optionsJson);
        }
      } catch {
        opts = ['A', 'B', 'C', 'D'];
      }

      let isCorrect = false;
      if (q.correctAnswersJson !== undefined && q.correctAnswersJson !== null && q.correctAnswersJson.trim() !== '') {
        isCorrect = q.correctAnswersJson.trim() === ans?.trim();
      } else if (ans !== undefined) {
        isCorrect = ans === '1' || ans === '2' || ans === '0' || ans === 'true';
      }

      const points = isCorrect ? (q.points || 10) : 0;
      if (isCorrect) {
        earned += points;
        correctCount++;
      }

      let studentAnswerText = "Javob belgilanmagan";
      if (ans !== undefined) {
        const optIndex = parseInt(ans, 10);
        studentAnswerText = opts[optIndex] !== undefined ? `${String.fromCharCode(65 + optIndex)}) ${opts[optIndex]}` : ans;
      }

      let correctAnswerText = "Noma'lum";
      if (q.correctAnswersJson !== undefined && q.correctAnswersJson !== null && q.correctAnswersJson.trim() !== '') {
        const correctIndex = parseInt(q.correctAnswersJson, 10);
        correctAnswerText = opts[correctIndex] !== undefined ? `${String.fromCharCode(65 + correctIndex)}) ${opts[correctIndex]}` : q.correctAnswersJson;
      }

      reviewData.push({
        question: q,
        studentAnswerText,
        correctAnswerText,
        isCorrect,
        pointsEarned: points,
      });
    });

    let backendResult: StudentAssessmentAttemptDto | null = null;
    if (activeAttemptId && typeof assessmentApi.submitAttempt === 'function') {
      try {
        const res = await assessmentApi.submitAttempt(activeAttemptId, formattedAnswers);
        if (res && res.data) {
          backendResult = res.data;
        }
      } catch (err: any) {
        console.warn('Backend submitAttempt warning:', err);
      }
    }

    const finalScore = backendResult?.totalScore ?? earned;
    const finalPct = backendResult?.percentage ?? Math.round((finalScore / (max || 1)) * 100);
    const quizId = selectedAssessment?.id || 1;

    const resultRecord: StudentAssessmentAttemptDto = {
      id: backendResult?.id || Date.now(),
      assessmentId: quizId,
      studentId: activeStudentId ?? (backendResult?.studentId ?? 0),
      attemptNumber: backendResult?.attemptNumber || (latestAttempts[quizId] ? 2 : 1),
      startedAt: backendResult?.startedAt || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      timeSpentSeconds: ((selectedAssessment?.durationMinutes || 30) * 60) - secondsRemaining,
      totalScore: finalScore,
      maxPossibleScore: backendResult?.maxPossibleScore || max,
      percentage: finalPct,
      status: 'EVALUATED',
      mentorFeedback:
        finalPct >= 90
          ? 'A‘lo natija! Ushbu mavzuni to‘liq va chuqur o‘zlashtirgansiz. Keyingi murakkab darajaga tavsiya etilasiz!'
          : finalPct >= 60
          ? 'Yaxshi natija! Testdan muvaffaqiyatli o‘tdingiz. Xatoliklar tahlilini ko‘rib chiqishni tavsiya qilamiz.'
          : 'O‘tish baliga yetmadi. Dars metodikasi va konspektlarni qayta ko‘rib chiqib, qayta urinib ko‘ring.',
    };

    setTestResult(resultRecord);
    setDetailedReviewItems(reviewData);
    setShowReview(true);
    setIsTestTaking(false);
    saveAttemptResult(quizId, resultRecord);

    toast.success(
      'Test topshirildi va baholandi!',
      `Natijangiz: ${finalScore}/${max} (${finalPct}%). To‘g‘ri javoblar: ${correctCount}/${testQuestions.length}. +${finalScore} XP berildi! 🔥`
    );
  };

  const handleCreateQuizSubmit = async () => {
    if (!newQuizTitle.trim()) {
      toast.error('Xatolik', 'Test nomi kiritilishi shart!');
      return;
    }

    try {
      await assessmentApi.create({
        assessment: {
          title: newQuizTitle,
          subject: newQuizSubject,
          gradeLevel: newQuizGrade,
          durationMinutes: Number(newQuizDuration) || 30,
          passingScore: Number(newQuizPassingScore) || 60,
          maxAttempts: 2,
          isPublished: true,
        },
        questions: newQuizQuestions,
      });
      toast.success('Muvaffaqiyatli', 'Yangi test va savollar paketi yaratildi');
      setIsCreateQuizOpen(false);
      setNewQuizTitle('');
      loadAssessments();
    } catch {
      toast.error('Xatolik', 'Testni yaratib bo‘lmadi');
    }
  };

  const handleCreateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignmentTitle.trim()) {
      toast.error('Xatolik', 'Topshiriq sarlavhasi kiritilishi shart');
      return;
    }

    try {
      setCreatingAssignment(true);
      await assignmentApi.create({
        title: newAssignmentTitle,
        description: newAssignmentDesc,
        subject: newAssignmentSubject,
        gradeLevel: newAssignmentGrade,
        maxPoints: Number(newAssignmentMaxPoints) || 100,
        deadline: newAssignmentDeadline ? new Date(newAssignmentDeadline).toISOString() : undefined,
        isActive: true,
      });
      toast.success('Topshiriq e’lon qilindi', 'O‘quvchilar uchun yangi amaliy topshiriq qo‘shildi');
      setIsCreateAssignmentOpen(false);
      setNewAssignmentTitle('');
      setNewAssignmentDesc('');
      setNewAssignmentDeadline('');
      loadAssignments();
    } catch {
      toast.error('Xatolik', 'Topshiriqni yaratib bo‘lmadi');
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentForSubmit) return;

    try {
      setSubmittingHomework(true);
      await assignmentApi.submit(selectedAssignmentForSubmit.id, {
        studentId: activeStudentId,
        submissionText: homeworkText,
        fileUrl: homeworkUrl,
      });
      toast.success('Vazifa topshirildi', 'Uy vazifangiz tekshirish uchun mentorga yuborildi');
      setIsSubmitHomeworkOpen(false);
      setHomeworkText('');
      setHomeworkUrl('');
    } catch {
      toast.error('Xatolik', 'Vazifani yuborib bo‘lmadi');
    } finally {
      setSubmittingHomework(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Filtered lists
  const filteredAssessments = useMemo(() => {
    return assessments.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGrade = selectedGrade === 'ALL' || item.gradeLevel === selectedGrade;
      return matchesSearch && matchesGrade;
    });
  }, [assessments, searchQuery, selectedGrade]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((item as { instructions?: string }).instructions &&
          (item as { instructions?: string }).instructions!.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGrade = selectedGrade === 'ALL' || item.gradeLevel === selectedGrade;
      return matchesSearch && matchesGrade;
    });
  }, [assignments, searchQuery, selectedGrade]);

  // Executive KPI stats list (matches Dashboard style)
  const kpis = useMemo(
    () => [
      {
        id: 'quizzes',
        title: 'Mavjud Testlar',
        value: `${assessments.length} ta`,
        subtitle: 'Ob’ektiv avtomatik tekshiruv',
        trend: '100% ob’ektiv',
        icon: CheckSquare,
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        badge: 'Avto-tekshiruv',
        onClick: () => setActiveSubTab('QUIZZES'),
        actionText: 'Barcha testlar',
      },
      {
        id: 'assignments',
        title: 'Amaliy Topshiriqlar',
        value: `${assignments.length} ta`,
        subtitle: 'Mentor tekshiruvi va loyihalar',
        trend: 'Real amaliyot',
        icon: FileQuestion,
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        badge: 'Mentor tekshiruvi',
        onClick: () => setActiveSubTab('ASSIGNMENTS'),
        actionText: 'Topshiriqlar',
      },
      {
        id: 'passing',
        title: 'O‘tish Standarti',
        value: '60%',
        subtitle: 'Minimal saralash mezoni',
        trend: 'Vazirlik mezoni',
        icon: Award,
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        badge: 'Minimal ball',
        onClick: undefined,
        actionText: 'Talablar',
      },
      {
        id: 'ranking',
        title: 'Audit & Baholash',
        value: '100%',
        subtitle: 'Shaffof ballar va reyting',
        trend: 'XP integratsiyasi',
        icon: Trophy,
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        badge: 'Shaffof reyting',
        onClick: undefined,
        actionText: 'Baholash',
      },
    ],
    [assessments.length, assignments.length]
  );

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* ========================================================
          1. HERO EXECUTIVE BANNER (Borderless, Luxury Ambient Style)
      ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl border-0">
        {/* Soft Ambient Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="p-7 sm:p-9 lg:p-11 relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md text-cyan-300 text-xs font-semibold border-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Modul 10 — Testlar, Viktorinalar & Uy Vazifalari</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium border-0">
                  <Clock className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Real-vaqt nazorati</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold border-0">
                  <Award className="w-3 h-3" />
                  <span>IT & Dasturlash Standarti</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                  Baholash & Mustaqil Mashqlar Markazi
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl mt-2">
                  Yagona yoki ko‘p tanlovli savollar, server-side vaqt nazorati, avtomatik ob’ektiv baholash hamda amaliy uyga vazifalarni tekshirish platformasi.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    loadAssessments();
                    loadAssignments();
                    toast.info('Yangilandi', 'Testlar va topshiriqlar ro‘yxati qayta yuklandi');
                  }}
                  size="default"
                  className="bg-white/10 hover:bg-white/15 text-white border-0 font-medium rounded-xl backdrop-blur-md"
                >
                  <RefreshCw className="w-4 h-4 mr-2 text-cyan-300" />
                  <span>Yangilash</span>
                </Button>

                {canManage && (
                  <>
                    <Button
                      onClick={() => setIsCreateQuizOpen(true)}
                      size="default"
                      className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-lg shadow-purple-600/30 font-semibold border-0 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-1.5 text-cyan-200" />
                      <span>Yangi Test Tuzish</span>
                    </Button>

                    <Button
                      onClick={() => setIsCreateAssignmentOpen(true)}
                      variant="secondary"
                      className="bg-white/10 hover:bg-white/15 text-white border-0 font-medium rounded-xl backdrop-blur-md"
                    >
                      <Plus className="w-4 h-4 mr-1.5 text-blue-300" />
                      <span>Yangi Topshiriq</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Metrics Pillar in Hero */}
            <div className="lg:shrink-0 grid grid-cols-2 gap-3 bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-center border-0">
              <div className="p-4 rounded-xl bg-white/5 border-0">
                <span className="text-[10px] uppercase font-bold text-cyan-300 block tracking-wider">
                  STANDART VAQT
                </span>
                <span className="text-2xl font-black text-white font-mono mt-1 block">
                  30–45 min
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Avto-taymer nazorati
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border-0">
                <span className="text-[10px] uppercase font-bold text-emerald-300 block tracking-wider">
                  O‘TISH STANDARTI
                </span>
                <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                  60%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Minimal o‘tish bali
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-center gap-2 border-0">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>Server-side tekshiruv & Shaffof baholash faol</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {auth?.isStudent && !loadingStudent && !hasProfile && (
        <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-card-foreground">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground">
                O‘quvchi profili topilmadi
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tizimga kirgan foydalanuvchi hisobingizga (<strong>{auth.user?.username || auth.user?.email}</strong>) biriktirilgan o‘quvchi profili mavjud emas. Testlarni topshirish va baholarni ko‘rish uchun filial ma’muriyati yoki koordinatori bilan bog‘laning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          2. EXECUTIVE KPI CARDS (Soft, Modern, Borderless Design)
      ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.id}
              onClick={kpi.onClick}
              className={`bg-card text-card-foreground rounded-2xl p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 flex flex-col justify-between group ${
                kpi.onClick ? 'cursor-pointer' : ''
              }`}
              role={kpi.onClick ? 'button' : undefined}
              tabIndex={kpi.onClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (kpi.onClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  kpi.onClick();
                }
              }}
              aria-label={`${kpi.title}: ${kpi.value}`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-2xl ${kpi.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                    <TrendingUp className="w-3 h-3" />
                    <span>{kpi.badge}</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-foreground">
                      {kpi.value}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {kpi.trend}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">
                    {kpi.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {kpi.subtitle}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-border/10 flex items-center justify-between text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
                <span className="font-medium">{kpi.actionText}</span>
                <div className="w-6 h-6 rounded-full bg-muted/60 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================
          3. PRESIDENTIAL / METHODOLOGY BANNER (Luxurious, Borderless)
      ======================================================== */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-cyan-500/5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.03)] dark:shadow-none border-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/25">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-800 dark:text-purple-300 text-[10px] font-bold uppercase tracking-wider border-0">
                  Davlat Standarti & Imtihon Nizomi
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  8–11-sinflar IT Dasturi
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground">
                Ob’ektiv Savollar & Amaliy Kod Tekshiruvi Metodikasi
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-4xl">
                Barcha testlar avtomatlashtirilgan tarzda server-side nazorati bilan baholanadi va talabaning reytingiga (XP) qo‘shiladi. Amaliy topshiriqlar esa mentor tomonidan kod tozaligi va loyiha arxitekturasi bo‘yicha tekshirilib, qayta aloqa taqdim etiladi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-300 font-bold text-xs border-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Avto-Baholash Faol</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. TOOLBAR: SUBTABS SWITCHER & SEARCH / FILTERS (Borderless)
      ======================================================== */}
      <div className="bg-card text-card-foreground rounded-2xl p-4 sm:p-5 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Subtabs Button Group (Maintains role="button" for tests) */}
        <div className="inline-flex items-center rounded-xl bg-muted/60 p-1 text-muted-foreground border-0">
          <button
            type="button"
            role="button"
            onClick={() => setActiveSubTab('QUIZZES')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer border-0 ${
              activeSubTab === 'QUIZZES'
                ? 'bg-background text-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-purple-500" />
            <span>Testlar & Viktorinalar</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold border-0">
              {filteredAssessments.length}
            </span>
          </button>

          <button
            type="button"
            role="button"
            onClick={() => setActiveSubTab('ASSIGNMENTS')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer border-0 ${
              activeSubTab === 'ASSIGNMENTS'
                ? 'bg-background text-foreground shadow-sm font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>Uy Vazifalari & Topshiriqlar</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border-0">
              {filteredAssignments.length}
            </span>
          </button>
        </div>

        {/* Search & Grade Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Qidirish (nomi, fan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border-0 overflow-x-auto">
            {['ALL', '8-sinf', '9-sinf', '10-sinf', '11-sinf'].map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => setSelectedGrade(grade)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap border-0 ${
                  selectedGrade === grade
                    ? 'bg-background text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {grade === 'ALL' ? 'Barchasi' : grade}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          5. SUBTAB 1: QUIZZES & ASSESSMENTS (Clean, Borderless Cards)
      ======================================================== */}
      {activeSubTab === 'QUIZZES' && (
        <div className="space-y-6">
          {loadingAssessments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-4/5 rounded-xl" />
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                    <Skeleton className="h-4 w-24 rounded-lg" />
                    <Skeleton className="h-9 w-28 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="bg-card text-card-foreground rounded-2xl p-12 text-center shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground mb-3 border-0">
                <HelpCircle className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-foreground text-base">Testlar topilmadi</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Qidiruv so‘rovingiz yoki tanlangan filtrlar bo‘yicha mos keluvchi testlar mavjud emas.
              </p>
              {(searchQuery || selectedGrade !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl border-0 bg-muted/60 hover:bg-muted"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGrade('ALL');
                  }}
                >
                  Filtrlarni tozalash
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssessments.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group border-0"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-0">
                          {quiz.gradeLevel}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted/70 text-foreground border-0">
                          {quiz.assessmentType || 'QUIZ'}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Faol
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-foreground group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      {quiz.subject}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] p-3.5 rounded-xl bg-muted/30 mb-2 border-0">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="font-medium text-foreground">{quiz.durationMinutes} daqiqa</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-medium text-foreground">{quiz.totalPoints} umumiy ball</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>O‘tish: <strong className="text-foreground">{quiz.passingScore || 60}%</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>Urinish: <strong className="text-foreground">{quiz.maxAttempts || 2} ta</strong></span>
                      </div>
                    </div>

                    {/* Latest Attempt Results Summary Banner */}
                    {latestAttempts[quiz.id] && (
                      <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-purple-950/20 border border-purple-500/20 my-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold flex items-center gap-1.5 text-foreground">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            So‘nggi natijangiz:
                          </span>
                          <span
                            className={cn(
                              "font-black px-2.5 py-0.5 rounded-full text-xs font-mono",
                              latestAttempts[quiz.id].percentage >= (quiz.passingScore || 60)
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/20 text-destructive"
                            )}
                          >
                            {latestAttempts[quiz.id].percentage}% ({latestAttempts[quiz.id].totalScore}/{latestAttempts[quiz.id].maxPossibleScore} ball)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-purple-500/10">
                          <span className="flex items-center gap-1 font-medium">
                            {latestAttempts[quiz.id].percentage >= (quiz.passingScore || 60) ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Muvaffaqiyatli topshirilgan
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-semibold">
                                <XCircle className="w-3.5 h-3.5" /> O‘tish baliga yetmadi
                              </span>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAssessment(quiz);
                              const qList = getDefaultQuestionsForAssessment(quiz.title).map((q, idx) => ({
                                ...q,
                                id: q.id ?? (idx + 1),
                              }));
                              setTestQuestions(qList);
                              setTestResult(latestAttempts[quiz.id]);
                              setShowReview(true);
                            }}
                            className="text-primary hover:underline font-bold cursor-pointer flex items-center gap-0.5"
                          >
                            Natijani ko‘rish &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-3 border-t border-border/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground font-medium">
                      O‘tish bali: <strong className="text-foreground">{quiz.passingScore || 60}%</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      {latestAttempts[quiz.id] && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAssessment(quiz);
                            const qList = getDefaultQuestionsForAssessment(quiz.title).map((q, idx) => ({
                              ...q,
                              id: q.id ?? (idx + 1),
                            }));
                            setTestQuestions(qList);
                            setTestResult(latestAttempts[quiz.id]);
                            setShowReview(true);
                          }}
                          className="rounded-xl text-xs bg-muted/40 hover:bg-muted font-bold border-0"
                          title="Natijalar tahlili"
                        >
                          <FileQuestion className="w-3.5 h-3.5 mr-1 text-purple-500" />
                          <span>Natija</span>
                        </Button>
                      )}

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartTest(quiz)}
                        className="cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl border-0 shadow-sm transition-all"
                      >
                        {latestAttempts[quiz.id] ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            <span>Qayta topshirish</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            <span>Testni Boshlash</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          6. SUBTAB 2: ASSIGNMENTS & HOMEWORK (Clean, Borderless Cards)
      ======================================================== */}
      {activeSubTab === 'ASSIGNMENTS' && (
        <div className="space-y-6">
          {loadingAssignments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-6 w-3/4 rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <div className="pt-4 border-t border-border/10 flex items-center justify-between">
                    <Skeleton className="h-4 w-28 rounded-lg" />
                    <Skeleton className="h-9 w-32 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-card text-card-foreground rounded-2xl p-12 text-center shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none border-0">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 mx-auto flex items-center justify-center text-muted-foreground mb-3 border-0">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-foreground text-base">Topshiriqlar topilmadi</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Qidiruv so‘rovingiz yoki sinf tanlovingiz bo‘yicha topshiriqlar mavjud emas.
              </p>
              {(searchQuery || selectedGrade !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl border-0 bg-muted/60 hover:bg-muted"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedGrade('ALL');
                  }}
                >
                  Filtrlarni tozalash
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredAssignments.map((item) => {
                const instructions =
                  item.description ||
                  (item as { instructions?: string }).instructions ||
                  'Topshiriq tavsifi berilmagan.';
                const maxPoints =
                  item.maxPoints ||
                  (item as { maxScore?: number }).maxScore ||
                  100;

                return (
                  <div
                    key={item.id}
                    className="bg-card text-card-foreground rounded-2xl p-6 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group border-0"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-0">
                            {item.subject}
                          </span>
                          {item.gradeLevel && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted/70 text-foreground border-0">
                              {item.gradeLevel}
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-full border-0">
                          <Clock className="w-3 h-3" />
                          <span>
                            {item.deadline
                              ? new Date(item.deadline).toLocaleDateString()
                              : 'Muddati belgilanmagan'}
                          </span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 my-3">
                        {instructions}
                      </p>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] py-1 px-3 rounded-full bg-muted/60 text-foreground font-semibold border-0">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>Maksimal ball: {maxPoints}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-border/10 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Faol topshirish</span>
                      </span>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignmentForSubmit(item);
                          setIsSubmitHomeworkOpen(true);
                        }}
                        className="cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl border-0 shadow-sm transition-all"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        <span>Vazifani Topshirish</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          7. FULL-SCREEN ACTIVE TEST TAKING WORKSPACE (Borderless)
      ======================================================== */}
      {isTestTaking && selectedAssessment && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          {/* Header Bar with Countdown */}
          <header className="h-16 px-6 bg-card flex items-center justify-between shrink-0 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                  {selectedAssessment.title}
                </h2>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>
                    Savol {currentQuestionIndex + 1} / {testQuestions.length}
                  </span>
                  <span>•</span>
                  <span>{selectedAssessment.subject}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold flex items-center gap-2 border-0 transition-all ${
                  secondsRemaining < 300
                    ? 'bg-destructive/10 text-destructive animate-pulse'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={handleSubmitTest}
                className="cursor-pointer font-bold shadow-sm rounded-xl border-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
              >
                <span>Testni Yakunlash</span>
              </Button>
            </div>
          </header>

          {/* Test Questions Workspace */}
          <main className="flex-1 p-4 sm:p-8 max-w-3xl mx-auto w-full overflow-y-auto flex flex-col justify-between">
            {testQuestions[currentQuestionIndex] && (
              <div className="space-y-6">
                {/* Progress bar across total questions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>O‘tish jarayoni: {Math.round(((currentQuestionIndex + 1) / testQuestions.length) * 100)}%</span>
                    <span>{Object.keys(studentAnswers).length} ta javob berildi</span>
                  </div>
                  <Progress value={((currentQuestionIndex + 1) / testQuestions.length) * 100} className="h-2 rounded-full" />
                </div>

                {/* Main Question Card */}
                <div className="bg-card text-card-foreground rounded-2xl p-6 sm:p-8 shadow-[0_2px_14px_-2px_rgba(0,0,0,0.05)] dark:shadow-none border-0 space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-muted/60 text-xs font-semibold text-foreground border-0">
                      {currentQuestionIndex + 1}-Savol
                    </span>
                    <span className="px-3 py-1 rounded-full bg-purple-500/10 text-xs text-purple-600 dark:text-purple-400 font-bold border-0">
                      {testQuestions[currentQuestionIndex].points || 10} ball
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                    {testQuestions[currentQuestionIndex].questionText}
                  </h3>

                  {/* Multiple Choice Options List */}
                  <div className="space-y-3 pt-2">
                    {(() => {
                      let opts: string[] = ['A', 'B', 'C', 'D'];
                      try {
                        if (testQuestions[currentQuestionIndex].optionsJson) {
                          opts = JSON.parse(testQuestions[currentQuestionIndex].optionsJson!);
                        }
                      } catch {
                        opts = ['A', 'B', 'C', 'D'];
                      }

                      return opts.map((opt, oIdx) => {
                        const qId = testQuestions[currentQuestionIndex].id ?? (currentQuestionIndex + 1);
                        const isSelected = studentAnswers[qId] === String(oIdx);

                        return (
                          <div
                            key={oIdx}
                            onClick={() => {
                              setStudentAnswers({
                                ...studentAnswers,
                                [qId]: String(oIdx),
                              });
                            }}
                            className={`p-4 rounded-xl transition-all cursor-pointer flex items-center gap-3.5 select-none border-0 ${
                              isSelected
                                ? 'bg-purple-500/15 text-foreground font-semibold shadow-sm ring-2 ring-purple-500/60'
                                : 'bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <span
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors border-0 ${
                                isSelected
                                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm'
                                  : 'bg-muted/80 text-muted-foreground'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="text-sm leading-relaxed">{opt}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Bottom Navigation Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                    className="cursor-pointer rounded-xl border-0 bg-muted/50 hover:bg-muted"
                  >
                    Oldingi savol
                  </Button>

                  {/* Question number jump buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full p-1.5 bg-muted/40 rounded-xl border-0">
                    {testQuestions.map((_, idx) => {
                      const isAnswered = studentAnswers[testQuestions[idx].id ?? (idx + 1)] !== undefined;
                      const isCurrent = currentQuestionIndex === idx;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center border-0 ${
                            isCurrent
                              ? 'bg-purple-600 text-white shadow-xs'
                              : isAnswered
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {currentQuestionIndex < testQuestions.length - 1 ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      className="cursor-pointer rounded-xl border-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm"
                    >
                      <span>Keyingi savol</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSubmitTest}
                      className="cursor-pointer font-bold shadow-sm rounded-xl border-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                    >
                      <span>Natijani topshirish</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ========================================================
          8. TEST RESULT MODAL (Borderless, Modern Dialog)
      ======================================================== */}
      <Dialog open={!!testResult} onOpenChange={(open) => !open && setTestResult(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border-0 rounded-3xl shadow-2xl bg-card p-6 sm:p-8">
          <DialogHeader className="space-y-3 text-center">
            <div
              className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border-0 ${
                (testResult?.percentage || 0) >= (selectedAssessment?.passingScore || 60)
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 text-destructive'
              }`}
            >
              {(testResult?.percentage || 0) >= (selectedAssessment?.passingScore || 60) ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>

            <DialogTitle className="text-xl sm:text-2xl font-black">
              {(testResult?.percentage || 0) >= (selectedAssessment?.passingScore || 60)
                ? 'Tabriklaymiz! Testdan Muvaffaqiyatli O‘tdingiz'
                : 'Test Natijasi: O‘tish Baliga Yetmadi'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedAssessment?.title} • {selectedAssessment?.gradeLevel} • Ob’ektiv tekshiruv natijalari
            </DialogDescription>
          </DialogHeader>

          {testResult && (
            <div className="space-y-5 py-2">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3.5 rounded-2xl bg-muted/40 border-0">
                  <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Ball</div>
                  <div className="text-xl font-black text-foreground mt-0.5 font-mono">
                    {testResult.totalScore} / {testResult.maxPossibleScore}
                  </div>
                  <span className="text-[10px] text-muted-foreground">Umumiy ball</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/10 border-0">
                  <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">O‘zlashtirish</div>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5 font-mono">
                    {testResult.percentage}%
                  </div>
                  <span className="text-[10px] text-muted-foreground">O‘tish: {selectedAssessment?.passingScore || 60}%</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border-0">
                  <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">To‘g‘ri</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    {detailedReviewItems.length > 0 ? detailedReviewItems.filter(r => r.isCorrect).length : Math.round(testResult.percentage / 10)} ta
                  </div>
                  <span className="text-[10px] text-emerald-600/80">To‘liq yechilgan</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-500/10 border-0">
                  <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider">Xato / Bo‘sh</div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono">
                    {detailedReviewItems.length > 0 ? detailedReviewItems.filter(r => !r.isCorrect).length : Math.max(0, testQuestions.length - Math.round(testResult.percentage / 10))} ta
                  </div>
                  <span className="text-[10px] text-rose-600/80">Qayta ko‘rish</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">O‘zlashtirish darajasi:</span>
                  <span className="font-bold text-foreground">{testResult.percentage}%</span>
                </div>
                <Progress value={testResult.percentage} className="h-2.5 rounded-full" />
              </div>

              {/* Gamification Rewards Banner */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-3 rounded-2xl bg-amber-500/10 border-0">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>+{testResult.totalScore} XP berildi</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">Platforma reytingingiz ko‘tarildi</span>
                </div>
                <div className="p-3 rounded-2xl bg-orange-500/10 border-0">
                  <div className="flex items-center gap-1.5 text-xs font-black text-orange-600 dark:text-orange-400">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>Kunlik Streak 🔥</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground block">Muntazam intizom saqlandi</span>
                </div>
              </div>

              {testResult.percentage !== undefined && testResult.percentage >= 100 && (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-800 dark:text-amber-200 text-xs font-extrabold flex items-center justify-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>👑 Mukammal 100% natija! +50 XP qo‘shimcha bonus</span>
                </div>
              )}

              {testResult.mentorFeedback && (
                <div className="p-4 rounded-2xl bg-muted/40 border-0 text-xs text-foreground/90 italic leading-relaxed text-left">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5 not-italic">
                    <span>🎙️ Mentor Xulosasi va Pedagogik Tavsiya:</span>
                  </div>
                  &ldquo;{testResult.mentorFeedback}&rdquo;
                </div>
              )}

              {/* Savollar va Javoblar Tahlili */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileQuestion className="w-4 h-4 text-purple-600" />
                    Savollar va Tanlangan Javoblar Tahlili
                  </h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 rounded-xl font-semibold border-0"
                    onClick={() => setShowReview(!showReview)}
                  >
                    {showReview ? 'Yashirish' : 'Barchasini ko‘rsatish'}
                  </Button>
                </div>

                {showReview && (
                  <div className="space-y-3 max-h-72 overflow-y-auto text-left pr-1">
                    {(detailedReviewItems.length > 0 ? detailedReviewItems : testQuestions.map((q, idx) => {
                      const qKey = q.id ?? (idx + 1);
                      const ans = studentAnswers[qKey];
                      const isCorrect = q.correctAnswersJson?.trim() === ans?.trim();
                      return {
                        question: q,
                        studentAnswerText: ans !== undefined ? `Tanlangan: ${ans}` : "Belgilanmagan",
                        correctAnswerText: q.correctAnswersJson || "1",
                        isCorrect,
                        pointsEarned: isCorrect ? (q.points || 10) : 0,
                      };
                    })).map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-4 rounded-2xl border transition-all text-xs space-y-2",
                          item.isCorrect
                            ? "bg-emerald-500/5 border-emerald-500/20 text-foreground"
                            : "bg-rose-500/5 border-rose-500/20 text-foreground"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-foreground text-sm leading-snug">
                            {idx + 1}. {item.question.questionText}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1",
                              item.isCorrect
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                            )}
                          >
                            {item.isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {item.isCorrect ? `+${item.pointsEarned} ball` : '0 ball'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                          <div className={cn(
                            "p-2 rounded-xl",
                            item.isCorrect ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200" : "bg-rose-500/10 text-rose-900 dark:text-rose-200"
                          )}>
                            <span className="font-bold block text-[10px] opacity-75">Sizning javobingiz:</span>
                            <span>{item.studentAnswerText}</span>
                          </div>

                          {!item.isCorrect && (
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-900 dark:text-emerald-200">
                              <span className="font-bold block text-[10px] opacity-75">To‘g‘ri javob:</span>
                              <span className="font-semibold">{item.correctAnswerText}</span>
                            </div>
                          )}
                        </div>

                        {item.question.explanation && (
                          <div className="p-2.5 rounded-xl bg-muted/40 text-[11px] text-muted-foreground flex items-start gap-1.5 mt-1 border-0">
                            <span className="text-amber-500 font-bold shrink-0">💡 Izoh:</span>
                            <span className="leading-relaxed">{item.question.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="sm:justify-between pt-4 border-t border-border/15 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-0 bg-muted/60 hover:bg-muted font-semibold"
              onClick={() => {
                if (selectedAssessment) {
                  handleStartTest(selectedAssessment);
                }
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Qayta topshirish
            </Button>
            <Button
              variant="default"
              size="md"
              className="cursor-pointer font-bold rounded-xl border-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md px-6"
              onClick={() => {
                setTestResult(null);
                setShowReview(false);
              }}
            >
              Natijani yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          9. SUBMIT HOMEWORK MODAL (Borderless Dialog)
      ======================================================== */}
      <Dialog
        open={isSubmitHomeworkOpen && !!selectedAssignmentForSubmit}
        onOpenChange={(open) => !open && setIsSubmitHomeworkOpen(false)}
      >
        <DialogContent className="sm:max-w-lg border-0 rounded-2xl shadow-2xl bg-card p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Uy vazifasini topshirish
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Yozgan kodingiz, portfolio yoki loyiha havolasini yuboring.
            </DialogDescription>
          </DialogHeader>

          {selectedAssignmentForSubmit && (
            <form onSubmit={handleHomeworkSubmit} className="space-y-4 pt-1">
              <div className="p-3.5 rounded-xl bg-muted/40 border-0 text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="font-bold text-foreground">Topshiriq:</span>{' '}
                  {selectedAssignmentForSubmit.title}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Maksimal ball: {selectedAssignmentForSubmit.maxPoints || 100} ball • Fan: {selectedAssignmentForSubmit.subject}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="homework-text" className="text-xs font-semibold">
                  Javob matni yoki izoh *
                </Label>
                <Textarea
                  id="homework-text"
                  rows={4}
                  required
                  value={homeworkText}
                  onChange={(e) => setHomeworkText(e.target.value)}
                  placeholder="Yozgan kodingiz haqida xulosa, o‘rganilgan tajriba..."
                  className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="homework-url" className="text-xs font-semibold">
                  GitHub Repozitoriy yoki Fayl havolasi
                </Label>
                <Input
                  id="homework-url"
                  type="url"
                  value={homeworkUrl}
                  onChange={(e) => setHomeworkUrl(e.target.value)}
                  placeholder="https://github.com/username/project-repo"
                  className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsSubmitHomeworkOpen(false)}
                  className="cursor-pointer rounded-xl border-0 bg-muted/50 hover:bg-muted"
                >
                  Bekor qilish
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  type="submit"
                  disabled={submittingHomework}
                  className="cursor-pointer font-semibold rounded-xl border-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm"
                >
                  {submittingHomework ? 'Yuborilmoqda...' : 'Topshirish'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================
          10. CREATE QUIZ MODAL (Borderless Dialog, Mentor & Admin)
      ======================================================== */}
      {canManage && (
        <Dialog open={isCreateQuizOpen} onOpenChange={setIsCreateQuizOpen}>
          <DialogContent className="sm:max-w-lg border-0 rounded-2xl shadow-2xl bg-card p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Yangi Test / Viktorina Tuzish
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Talabalar o‘zlashtirishini sinovdan o‘tkazuvchi yangi baholash paketi yarating.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="quiz-title" className="text-xs font-semibold">
                  Test nomi *
                </Label>
                <Input
                  id="quiz-title"
                  type="text"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="Masalan: JavaScript DOM & Events Nazorati"
                  className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quiz-subject" className="text-xs font-semibold">
                  Fan / Yo‘nalish
                </Label>
                <Input
                  id="quiz-subject"
                  type="text"
                  value={newQuizSubject}
                  onChange={(e) => setNewQuizSubject(e.target.value)}
                  placeholder="Masalan: Web Full-Stack Development"
                  className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quiz-grade" className="text-xs font-semibold">
                    Sinf
                  </Label>
                  <select
                    id="quiz-grade"
                    value={newQuizGrade}
                    onChange={(e) => setNewQuizGrade(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border-0 !border-0 bg-muted/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="8-sinf">8-sinf</option>
                    <option value="9-sinf">9-sinf</option>
                    <option value="10-sinf">10-sinf</option>
                    <option value="11-sinf">11-sinf</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="quiz-duration" className="text-xs font-semibold">
                    Vaqt (daqiqa)
                  </Label>
                  <Input
                    id="quiz-duration"
                    type="number"
                    value={newQuizDuration}
                    onChange={(e) => setNewQuizDuration(Number(e.target.value))}
                    className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                    min={5}
                    max={180}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quiz-pass-score" className="text-xs font-semibold">
                  O‘tish bali (%)
                </Label>
                <Input
                  id="quiz-pass-score"
                  type="number"
                  value={newQuizPassingScore}
                  onChange={(e) => setNewQuizPassingScore(Number(e.target.value))}
                  className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                  min={10}
                  max={100}
                />
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border-0 text-xs text-muted-foreground space-y-1">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-purple-500" />
                  <span>Savollar to‘plami:</span>
                </div>
                <div>Standart 2 ta ob’ektiv savol avtomatik biriktiriladi (20 ball).</div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsCreateQuizOpen(false)}
                  className="cursor-pointer rounded-xl border-0 bg-muted/50 hover:bg-muted"
                >
                  Bekor qilish
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  type="button"
                  onClick={handleCreateQuizSubmit}
                  className="cursor-pointer font-semibold rounded-xl border-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm"
                >
                  Chop etish (Publish)
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================
          11. CREATE ASSIGNMENT MODAL (Borderless Dialog, Mentor & Admin)
      ======================================================== */}
      {canManage && (
        <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
          <DialogContent className="sm:max-w-lg border-0 rounded-2xl shadow-2xl bg-card p-6 sm:p-7">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Yangi Amaliy Topshiriq E’lon Qilish
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                O‘quvchilar uchun uyga vazifa yoki loyiha topshirig‘ini shakllantiring.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateAssignmentSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="assign-title" className="text-xs font-semibold">
                  Topshiriq sarlavhasi *
                </Label>
                <Input
                  id="assign-title"
                  type="text"
                  required
                  value={newAssignmentTitle}
                  onChange={(e) => setNewAssignmentTitle(e.target.value)}
                  placeholder="Masalan: Flexbox yordamida Portfolio sahifasini yaratish"
                  className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assign-desc" className="text-xs font-semibold">
                  Vazifa tavsifi va talablar
                </Label>
                <Textarea
                  id="assign-desc"
                  rows={3}
                  value={newAssignmentDesc}
                  onChange={(e) => setNewAssignmentDesc(e.target.value)}
                  placeholder="Topshiriq maqsadi, talab qilinadigan texnologiyalar va topshirish shartlari..."
                  className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="assign-subject" className="text-xs font-semibold">
                    Fan / Yo‘nalish
                  </Label>
                  <Input
                    id="assign-subject"
                    type="text"
                    value={newAssignmentSubject}
                    onChange={(e) => setNewAssignmentSubject(e.target.value)}
                    className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assign-grade" className="text-xs font-semibold">
                    Sinf
                  </Label>
                  <select
                    id="assign-grade"
                    value={newAssignmentGrade}
                    onChange={(e) => setNewAssignmentGrade(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border-0 !border-0 bg-muted/30 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="8-sinf">8-sinf</option>
                    <option value="9-sinf">9-sinf</option>
                    <option value="10-sinf">10-sinf</option>
                    <option value="11-sinf">11-sinf</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="assign-points" className="text-xs font-semibold">
                    Maksimal ball
                  </Label>
                  <Input
                    id="assign-points"
                    type="number"
                    value={newAssignmentMaxPoints}
                    onChange={(e) => setNewAssignmentMaxPoints(Number(e.target.value))}
                    className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                    min={10}
                    max={100}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="assign-deadline" className="text-xs font-semibold">
                    Topshirish muddati
                  </Label>
                  <Input
                    id="assign-deadline"
                    type="date"
                    value={newAssignmentDeadline}
                    onChange={(e) => setNewAssignmentDeadline(e.target.value)}
                    className="text-xs bg-muted/30 border-0 !border-0 rounded-xl focus-visible:ring-1"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsCreateAssignmentOpen(false)}
                  className="cursor-pointer rounded-xl border-0 bg-muted/50 hover:bg-muted"
                >
                  Bekor qilish
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  type="submit"
                  disabled={creatingAssignment}
                  className="cursor-pointer font-semibold rounded-xl border-0 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-sm"
                >
                  {creatingAssignment ? 'Saqlanmoqda...' : 'Topshiriqni E’lon Qilish'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

function getDefaultSampleAssessments(): AssessmentDto[] {
  return [
    {
      id: 1,
      title: 'JavaScript Asoslari va DOM Manipulation Nazorati',
      subject: 'Web Full-Stack Development',
      gradeLevel: '8-sinf',
      assessmentType: 'QUIZ',
      totalPoints: 100,
      passingScore: 60,
      durationMinutes: 30,
      maxAttempts: 2,
      randomizeQuestions: false,
      showCorrectAnswers: true,
      isPublished: true,
    },
    {
      id: 2,
      title: 'HTML5 Semantik Veb va Moslashuvchan CSS Flexbox/Grid',
      subject: 'Web Full-Stack Development',
      gradeLevel: '8-sinf',
      assessmentType: 'QUIZ',
      totalPoints: 100,
      passingScore: 60,
      durationMinutes: 25,
      maxAttempts: 3,
      randomizeQuestions: true,
      showCorrectAnswers: true,
      isPublished: true,
    },
    {
      id: 3,
      title: 'Python Dasturlash va Algoritmik Fikrlash Asoslari',
      subject: 'Computer Science & Python',
      gradeLevel: '9-sinf',
      assessmentType: 'QUIZ',
      totalPoints: 100,
      passingScore: 60,
      durationMinutes: 35,
      maxAttempts: 2,
      randomizeQuestions: true,
      showCorrectAnswers: true,
      isPublished: true,
    },
    {
      id: 4,
      title: 'Full-Stack Backend, REST API va SQL Ma‘lumotlar Bazasi',
      subject: 'Backend & Database Engineering',
      gradeLevel: '10-sinf',
      assessmentType: 'EXAM',
      totalPoints: 100,
      passingScore: 60,
      durationMinutes: 35,
      maxAttempts: 2,
      randomizeQuestions: true,
      showCorrectAnswers: true,
      isPublished: true,
    },
  ];
}

function getDefaultQuestionsForAssessment(title?: string): AssessmentQuestionDto[] {
  if (title?.toLowerCase().includes('python')) {
    return [
      {
        id: 101,
        questionText: 'Python dasturlash tilida list va tuple tuzilmalarining asosiy tub farqi nimada?',
        questionType: 'SINGLE_CHOICE',
        points: 10,
        optionsJson: JSON.stringify(['List faqat raqam saqlaydi', 'List o‘zgaruvchan (mutable), tuple esa o‘zgarmas (immutable)', 'Tuple xotiradan ko‘proq joy oladi', 'Farqi yo‘q']),
        correctAnswersJson: '1',
        explanation: 'List elementlarini o‘zgartirish mumkin, tuple yaratilgach o‘zgarmaydi.',
      },
      {
        id: 102,
        questionText: 'Saralangan massivdan elementni qidirishda Ikkilik qidiruv (Binary Search) algoritmining vaqt murakkabligi qanday?',
        questionType: 'SINGLE_CHOICE',
        points: 10,
        optionsJson: JSON.stringify(['O(n)', 'O(log n)', 'O(n^2)', 'O(1)']),
        correctAnswersJson: '1',
        explanation: 'Binary Search har qadamda qidiruv sohasini 2 marta qisqartiradi: O(log n).',
      },
      {
        id: 103,
        questionText: '[x**2 for x in range(5) if x % 2 == 0] natijasi nima bo‘ladi?',
        questionType: 'SINGLE_CHOICE',
        points: 10,
        optionsJson: JSON.stringify(['[0, 4, 16]', '[1, 9]', '[0, 1, 4, 9, 16]', '[4, 16]']),
        correctAnswersJson: '0',
        explanation: 'range(5) dagi juft sonlar: 0, 2, 4. Ularning kvadrati: [0, 4, 16].',
      },
    ];
  }

  if (title?.toLowerCase().includes('backend') || title?.toLowerCase().includes('sql')) {
    return [
      {
        id: 201,
        questionText: 'Quyidagi HTTP metodlaridan qaysi biri idempotent EMAS?',
        questionType: 'SINGLE_CHOICE',
        points: 10,
        optionsJson: JSON.stringify(['GET', 'PUT', 'DELETE', 'POST']),
        correctAnswersJson: '3',
        explanation: 'POST har safar serverda yangi resurs yaratadi, shuning uchun idempotent emas.',
      },
      {
        id: 202,
        questionText: 'Yangi resurs serverda muvaffaqiyatli yaratilganda qaysi HTTP status kodi qaytariladi?',
        questionType: 'SINGLE_CHOICE',
        points: 10,
        optionsJson: JSON.stringify(['200 OK', '201 Created', '204 No Content', '404 Not Found']),
        correctAnswersJson: '1',
        explanation: '201 Created resurs yaratilganini bildiruvchi standart status kodidir.',
      },
      {
        id: 203,
        questionText: 'SQL da INNER JOIN va LEFT JOIN o‘rtasidagi asosiy farq nima?',
        questionType: 'SINGLE_CHOICE',
        points: 10,
        optionsJson: JSON.stringify(['INNER JOIN faqat ikkala jadvalda mos qatorlarni oladi, LEFT JOIN esa chap jadvalning barcha qatorlarini saqlaydi', 'INNER JOIN tezroq, boshqa farqi yo‘q', 'Farqi yo‘q', 'LEFT JOIN faqat NULL qiymatlarni oladi']),
        correctAnswersJson: '0',
        explanation: 'LEFT JOIN chap jadvaldagi barcha qatorlarni o‘ng jadvalda moslik bo‘lmasa ham saqlab qoladi.',
      },
    ];
  }

  return getDefaultSampleQuestions();
}

function getDefaultSampleQuestions(): AssessmentQuestionDto[] {
  return [
    {
      id: 1,
      questionText: 'Qaysi kalit so‘z bilan e‘lon qilingan o‘zgaruvchiga qayta qiymat biriktirishga yo‘l qo‘yilmaydi va block-scope ga ega?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['var', 'let', 'const', 'static']),
      correctAnswersJson: '2',
      explanation: 'const o‘zgarmas identifikator yaratadi va faqat e‘lon qilingan blokda amal qiladi.',
    },
    {
      id: 2,
      questionText: 'const add = (a, b) => a + b; ifodasida natija qaytarish (return) qanday ishlaydi?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['return so‘zi majburiy', 'Figurali qavssiz yagona ifoda avtomatik qaytariladi (implicit return)', 'console.log kerak', 'Qiymat qaytarmaydi']),
      correctAnswersJson: '1',
      explanation: 'Arrow funksiyada {} bo‘lmaganda yagona ifoda natijasi avtomatik return qilinadi.',
    },
    {
      id: 3,
      questionText: 'HTML dagi <button class="submit-btn">Yuborish</button> elementini tanlab olish uchun eng to‘g‘ri JS metodi qaysi?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['document.getElementById("submit-btn")', 'document.querySelector(".submit-btn")', 'document.find(".submit-btn")', 'document.getElementsByTag("submit-btn")']),
      correctAnswersJson: '1',
      explanation: 'document.querySelector(".submit-btn") CSS sinf selektori orqali elementni tanlaydi.',
    },
    {
      id: 4,
      questionText: 'Tugma bosilganda sahifaning yangilanib ketishini to‘xtatish uchun hodisaning qaysi metodi chaqiriladi?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['event.stopPropagation()', 'event.preventDefault()', 'event.cancel()', 'event.freeze()']),
      correctAnswersJson: '1',
      explanation: 'event.preventDefault() standart brauzer qayta yuklash harakatini to‘xtatadi.',
    },
    {
      id: 5,
      questionText: '[1, 2, 3].map(x => x * 2) ifodasining natijasi nima bo‘ladi?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['[2, 4, 6]', '[1, 2, 3]', '6', 'undefined']),
      correctAnswersJson: '0',
      explanation: 'map har bir elementni ikkiga ko‘paytiradi: [2, 4, 6].',
    },
    {
      id: 6,
      questionText: '[10, 15, 20, 25].filter(n => n > 18) amali natijasida qaysi elementlar qoladi?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['[10, 15]', '[20, 25]', '[15, 20, 25]', '25']),
      correctAnswersJson: '1',
      explanation: 'filter 18 dan katta elementlarni saqlaydi: [20, 25].',
    },
    {
      id: 7,
      questionText: 'JavaScript da asinxron natijani kutish uchun await kalit so‘zi qayerda ishlatilishi shart?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['Ixtiyoriy funksiya ichida', 'Faqat async kalit so‘zi bilan e‘lon qilingan funksiya ichida', 'Loop ichida', 'Try blokida']),
      correctAnswersJson: '1',
      explanation: 'await faqat async funksiyalar ichida ishlaydi.',
    },
    {
      id: 8,
      questionText: 'Serverdan kelgan JSON matnini JavaScript obyektiga aylantirish uchun qaysi metod ishlatiladi?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['JSON.stringify()', 'JSON.parse()', 'JSON.toObject()', 'JSON.convert()']),
      correctAnswersJson: '1',
      explanation: 'JSON.parse() matnni obyektga aylantiradi.',
    },
    {
      id: 9,
      questionText: '5 === "5" ifodasi qanday natija beradi va nima sababdan?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['true, qiymatlar bir xil', 'false, chunki qattiq tenglik (===) turlarni (number va string) taqqoslaydi', 'undefined', 'Xatolik']),
      correctAnswersJson: '1',
      explanation: '=== turlarni o‘zgartirmaydi, 5 (number) va "5" (string) har xil tur bo‘lgani uchun false.',
    },
    {
      id: 10,
      questionText: 'Brauzerning LocalStorage xotirasiga ma‘lumot yozish uchun qaysi buyruq to‘g‘ri?',
      questionType: 'SINGLE_CHOICE',
      points: 10,
      optionsJson: JSON.stringify(['localStorage.save("user", "Ali")', 'localStorage.setItem("user", "Ali")', 'localStorage.add("user", "Ali")', 'localStorage.write("user", "Ali")']),
      correctAnswersJson: '1',
      explanation: 'localStorage.setItem(key, value) metodi ma‘lumotni saqlaydi.',
    },
  ];
}

function getDefaultSampleAssignments(): AssignmentDto[] {
  return [
    {
      id: 1,
      title: '1-Amaliy Vazifa: Shaxsiy Portfolio Bosh Sahifasi',
      description:
        'HTML5 semantik teglari va zamonaviy CSS Flexbox/Grid yordamida o‘zingizning shaxsiy portfolio maketingizni yarating va GitHub Pages da deploy qiling.',
      subject: 'Web Full-Stack Development',
      gradeLevel: '8-sinf',
      deadline: new Date(Date.now() + 5 * 86400000).toISOString(),
      maxPoints: 100,
      isActive: true,
    },
    {
      id: 2,
      title: '2-Amaliy Vazifa: Interaktiv Hisoblagich va To-Do List',
      description:
        'JavaScript orqali DOM hodisalarini tinglash, vazifalar qo‘shish, o‘chirish va LocalStorage da saqlash funksionalini yarating.',
      subject: 'Web Full-Stack Development',
      gradeLevel: '8-sinf',
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      maxPoints: 100,
      isActive: true,
    },
  ];
}
