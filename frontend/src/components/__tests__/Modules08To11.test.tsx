import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/shared/ui/toast/Toast';
import { LessonManager } from '../lessons/LessonManager';
import { ResourceLibrary } from '../resources/ResourceLibrary';
import { AssessmentEngine } from '../assessments/AssessmentEngine';
import { GamificationDashboard } from '../grading/GamificationDashboard';
import type { StudyGroup, Mentor, Student } from '@/types';

// Mock API modules
vi.mock('@/api', () => ({
  lessonPlanApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'HTML & Semantic Web Asoslari',
          subject: 'Web Full-Stack Development',
          gradeLevel: '8-sinf',
          status: 'PUBLISHED',
          estimatedDurationMinutes: 80,
          learningObjectives: 'Semantic teglar va sahifa strukturasi',
          expectedOutcomes: 'O‘quvchi mustaqil semantik HTML sahifa tuza oladi',
          theoreticalSection: 'HTML5 semantik teglari: header, nav, main, section, footer',
          practicalSection: 'Portfolio landing sahifasining skeletini yig‘ish',
          exercises: '3 ta mustaqil mashq bajarish',
          homework: 'O‘z biografiya sahifasini HTML da formatlash',
        },
      ],
    }),
    create: vi.fn().mockResolvedValue({ data: { id: 2, title: 'CSS Grid & Flexbox' } }),
    updateStatus: vi.fn().mockResolvedValue({ data: { id: 1, status: 'COMPLETED' } }),
    cloneTemplate: vi.fn().mockResolvedValue({ data: { id: 3, title: 'HTML & Semantic Web Asoslari (Nusxa)' } }),
  },
  resourceApi: {
    search: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'JavaScript ES6+ To‘liq Qo‘llanma',
          description: 'Zamonaviy JS sintaksisi bo‘yicha qo‘llanma',
          resourceType: 'DOCUMENT',
          subject: 'Web Development',
          gradeLevel: '8-sinf',
          tags: 'JavaScript, ES6, Frontend',
          isPublished: true,
          downloadCount: 42,
          storageKey: 'doc_1.pdf',
        },
        {
          id: 2,
          title: 'CSS Grid Masterclass Video',
          description: 'YouTube video darsi',
          resourceType: 'VIDEO',
          subject: 'Web Development',
          gradeLevel: '8-sinf',
          tags: 'CSS, Grid, Layout',
          isPublished: true,
          downloadCount: 18,
          externalUrl: 'https://youtube.com/watch?v=example',
        },
      ],
    }),
    upload: vi.fn().mockResolvedValue({ data: { id: 3, title: 'Yangi Resurs' } }),
    createExternal: vi.fn().mockResolvedValue({ data: { id: 4, title: 'Yangi Havola' } }),
    download: vi.fn().mockResolvedValue({ data: new Blob(['file content']) }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
  assessmentApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'JavaScript Asoslari va DOM Manipulation',
          subject: 'Web Full-Stack Development',
          gradeLevel: '8-sinf',
          assessmentType: 'QUIZ',
          totalPoints: 20,
          durationMinutes: 30,
          passingScore: 60,
          maxAttempts: 2,
          isPublished: true,
        },
      ],
    }),
    getQuestionsForTaking: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          assessmentId: 1,
          questionText: 'HTML da giperhavola yaratish uchun qaysi teg ishlatiladi?',
          questionType: 'SINGLE_CHOICE',
          points: 10,
          optionsJson: JSON.stringify(['<link>', '<a>', '<href>', '<hyperlink>']),
        },
      ],
    }),
    create: vi.fn().mockResolvedValue({ data: { id: 2, title: 'Yangi Test' } }),
    submitAttempt: vi.fn().mockResolvedValue({
      data: {
        id: 101,
        assessmentId: 1,
        studentId: 1,
        totalScore: 10,
        maxScore: 10,
        percentage: 100,
        isPassed: true,
      },
    }),
  },
  assignmentApi: {
    getAll: vi.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'Interactive Todo App (JavaScript & LocalStorage)',
          subject: 'Frontend Development',
          gradeLevel: '8-sinf',
          instructions: 'LocalStorage bilan sinxronlashadigan to-do ilova yaratish',
          maxScore: 100,
          submissionType: 'CODE_AND_URL',
          status: 'ACTIVE',
        },
      ],
    }),
    submit: vi.fn().mockResolvedValue({ data: { id: 501, status: 'SUBMITTED' } }),
  },
  gradingApi: {
    getLeaderboard: vi.fn().mockResolvedValue({
      data: [
        {
          studentId: 1,
          displayName: 'Azizbek B. (#ID-8802)',
          groupName: 'FN-2026-A',
          gradeLevel: '8-sinf',
          totalPoints: 1250,
          rank: 1,
          badgeCount: 5,
        },
        {
          studentId: 2,
          displayName: 'Madina K. (#ID-9411)',
          groupName: 'FN-2026-A',
          gradeLevel: '8-sinf',
          totalPoints: 1100,
          rank: 2,
          badgeCount: 4,
        },
      ],
    }),
    getGroupLeaderboard: vi.fn().mockResolvedValue({
      data: [
        {
          groupName: 'FN-2026-A',
          totalPoints: 4500,
          studentCount: 15,
          averagePoints: 300,
          rank: 1,
        },
      ],
    }),
    awardPoints: vi.fn().mockResolvedValue({ data: { id: 1, amount: 50 } }),
  },
}));

describe('Modules 08 - 11 Frontend Integration Tests', () => {
  const sampleGroups: StudyGroup[] = [
    {
      id: 1,
      groupCode: 'FN-2026-A',
      subject: 'Web Full-Stack',
      gradeLevel: '8-sinf',
      room: 'Lab-1',
      mentorId: 1,
      capacity: 15,
      studentCount: 12,
      status: 'ACTIVE',
      scheduleDays: 'DU_CHOR_JUMA',
      startTime: '14:00',
      endTime: '15:20',
      createdDate: '2026-01-01',
    },
  ];

  const sampleMentors: Mentor[] = [
    {
      id: 1,
      fullName: 'Javlon IT Mentor',
      email: 'mentor@axm.uz',
      phone: '+998901234567',
      subject: 'Web Full-Stack Development',
      status: 'ACTIVE',
      assignedGroupsCount: 1,
      joinedDate: '2026-01-01',
    },
  ];

  const sampleStudents: Student[] = [
    {
      id: 1,
      fullName: 'Azizbek B.',
      studentId: 'ST-001',
      groupCode: 'FN-2026-A',
      gradeLevel: '8-sinf',
      phone: '+998911111111',
      status: 'ACTIVE',
      attendanceRate: 98,
      points: 1250,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================
  // MODULE 08: LessonManager
  // ==========================================================
  describe('Module 08: LessonManager', () => {
    it('renders lesson manager and displays lesson plans with 80-minute timing indicators', async () => {
      render(
        <ToastProvider>
          <LessonManager groups={sampleGroups} mentors={sampleMentors} />
        </ToastProvider>
      );

      expect(screen.getByText(/Dars Rejalari & Jonli O‘tkazish Boshqaruvi/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('HTML & Semantic Web Asoslari')).toBeInTheDocument();
      });

      // Verify 80-minute breakdown badges
      expect(screen.getByText('Standart 80 daqiqalik taqsimot')).toBeInTheDocument();
      expect(screen.getByText('Nazariya')).toBeInTheDocument();
      expect(screen.getByText('Amaliyot')).toBeInTheDocument();
      expect(screen.getByText('Loyiha')).toBeInTheDocument();
      expect(screen.getByText('Natija')).toBeInTheDocument();
    });

    it('toggles interactive presentation delivery mode', async () => {
      const user = userEvent.setup();
      render(
        <ToastProvider>
          <LessonManager groups={sampleGroups} mentors={sampleMentors} />
        </ToastProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('HTML & Semantic Web Asoslari')).toBeInTheDocument();
      });

      const startButtons = screen.getAllByRole('button', { name: /Darsni Boshlash/i });
      await user.click(startButtons[0]);

      // Delivery view modal/mode is displayed
      await waitFor(() => {
        expect(screen.getByText(/Jonli Dars Taqdimot Rejimi/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/1\. Tushunish \(Nazariya\)/i)).toBeInTheDocument();
    });
  });

  // ==========================================================
  // MODULE 09: ResourceLibrary
  // ==========================================================
  describe('Module 09: ResourceLibrary', () => {
    it('renders learning materials and allows filtering by category', async () => {
      render(
        <ToastProvider>
          <ResourceLibrary />
        </ToastProvider>
      );

      expect(screen.getByText(/Raqamli Resurslar & Foydali Manbalar Markazi/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('JavaScript ES6+ To‘liq Qo‘llanma')).toBeInTheDocument();
        expect(screen.getByText('CSS Grid Masterclass Video')).toBeInTheDocument();
      });

      // Filter category buttons
      expect(screen.getByRole('button', { name: /Hujjatlar \(PDF\)/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Videolar & YouTube/i })).toBeInTheDocument();
    });

    it('opens file upload modal when clicking "Fayl Yuklash"', async () => {
      const user = userEvent.setup();
      render(
        <ToastProvider>
          <ResourceLibrary />
        </ToastProvider>
      );

      const uploadBtn = screen.getByRole('button', { name: /Fayl Yuklash/i });
      await user.click(uploadBtn);

      await waitFor(() => {
        expect(screen.getByText(/Fayl yuklash \(PDF, PPTX, Kod\)/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Material sarlavhasi/i)).toBeInTheDocument();
    });
  });

  // ==========================================================
  // MODULE 10: AssessmentEngine
  // ==========================================================
  describe('Module 10: AssessmentEngine', () => {
    it('renders assessment list and provides interactive test-taking mode', async () => {
      const user = userEvent.setup();
      render(
        <ToastProvider>
          <AssessmentEngine groups={sampleGroups} mentors={sampleMentors} students={sampleStudents} />
        </ToastProvider>
      );

      expect(screen.getByText(/Baholash & Mustaqil Mashqlar Markazi/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('JavaScript Asoslari va DOM Manipulation')).toBeInTheDocument();
      });

      // Start quiz
      const startBtn = screen.getByRole('button', { name: /Testni Boshlash/i });
      await user.click(startBtn);

      await waitFor(() => {
        expect(screen.getByText(/HTML da giperhavola yaratish uchun qaysi teg ishlatiladi\?/i)).toBeInTheDocument();
      });

      // Answer question and submit
      const optionB = screen.getByText('<a>');
      await user.click(optionB);

      const submitBtn = screen.getByRole('button', { name: /Testni Yakunlash/i });
      await user.click(submitBtn);

      // Verify test results modal
      await waitFor(() => {
        expect(screen.getByText(/Tabriklaymiz! Testdan Muvaffaqiyatli O‘tdingiz/i)).toBeInTheDocument();
      });
    });

    it('switches to homework assignments subtab', async () => {
      const user = userEvent.setup();
      render(
        <ToastProvider>
          <AssessmentEngine groups={sampleGroups} mentors={sampleMentors} students={sampleStudents} />
        </ToastProvider>
      );

      const homeworkTab = screen.getByRole('button', { name: /Uy Vazifalari & Topshiriqlar/i });
      await user.click(homeworkTab);

      await waitFor(() => {
        expect(screen.getByText('Interactive Todo App (JavaScript & LocalStorage)')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================
  // MODULE 11: GamificationDashboard
  // ==========================================================
  describe('Module 11: GamificationDashboard', () => {
    it('renders student leaderboard with masked identities and podium', async () => {
      render(
        <ToastProvider>
          <GamificationDashboard students={sampleStudents} />
        </ToastProvider>
      );

      expect(screen.getByText(/Shaxsiy Natijalar & Rag‘batlantirish Tizimi/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getAllByText(/Azizbek B\. \(#ID-8802\)/i).length).toBeGreaterThan(0);
      });

      // Verify badge list is visible
      expect(screen.getByText(/Faol Nishonlar \(Badges\)/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Namunali Davomat' })).toBeInTheDocument();
    });

    it('opens award points modal when mentor clicks "Ball / XP Taqdim Etish"', async () => {
      const user = userEvent.setup();
      render(
        <ToastProvider>
          <GamificationDashboard students={sampleStudents} />
        </ToastProvider>
      );

      const awardBtn = screen.getByRole('button', { name: /Ball \/ XP Taqdim Etish/i });
      await user.click(awardBtn);

      await waitFor(() => {
        expect(screen.getByText(/O‘quvchiga Ball \/ XP Taqdim Etish/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Ball miqdori \(XP\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Asoslovchi sabab/i)).toBeInTheDocument();
    });
  });
});
