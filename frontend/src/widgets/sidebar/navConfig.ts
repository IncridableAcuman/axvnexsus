import {
  Layers,
  Calendar,
  Users,
  Award,
  BookOpen,
  Palette,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  User,
  BookMarked,
  FolderGit2,
  CheckSquare,
  Trophy,
  BarChart3,
  Bot,
  Building2,
} from 'lucide-react'

export interface NavItem {
  id: string
  labelKey: string
  label?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  sectionKey: string
  section?: string
  allowedRoles?: string[]
}

export const navItems: NavItem[] = [
  // ASOSIY
  {
    id: 'dashboard',
    labelKey: 'nav.dashboard',
    label: 'Boshqaruv paneli',
    icon: Layers,
    sectionKey: 'nav.sectionMain',
    section: 'ASOSIY',
  },
  {
    id: 'timetable',
    labelKey: 'nav.timetable',
    label: 'Darslar & Davomat',
    icon: Calendar,
    sectionKey: 'nav.sectionMain',
    section: 'ASOSIY',
  },
  {
    id: 'analytics',
    labelKey: 'nav.analytics',
    label: 'Ta’lim Analitikasi',
    icon: BarChart3,
    sectionKey: 'nav.sectionMain',
    section: 'ASOSIY',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_MENTOR', 'ROLE_ENGLISH_MENTOR'],
  },

  // TA’LIM JARAYONI
  {
    id: 'lessons',
    labelKey: 'nav.lessons',
    label: 'Darslar Metodikasi',
    icon: BookMarked,
    sectionKey: 'nav.sectionEducation',
    section: 'TA’LIM',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_MENTOR', 'ROLE_ENGLISH_MENTOR'],
  },
  {
    id: 'materials',
    labelKey: 'nav.materials',
    label: 'O‘quv Resurslari',
    icon: FolderGit2,
    sectionKey: 'nav.sectionEducation',
    section: 'TA’LIM',
  },
  {
    id: 'assessments',
    labelKey: 'nav.assessments',
    label: 'Testlar & Topshiriqlar',
    icon: CheckSquare,
    sectionKey: 'nav.sectionEducation',
    section: 'TA’LIM',
  },
  {
    id: 'grading',
    labelKey: 'nav.grading',
    label: 'Ballar & Gamifikatsiya',
    icon: Trophy,
    sectionKey: 'nav.sectionEducation',
    section: 'TA’LIM',
  },
  {
    id: 'curriculum',
    labelKey: 'nav.curriculum',
    label: 'O‘quv Yo‘li (8–11)',
    icon: BookOpen,
    sectionKey: 'nav.sectionEducation',
    section: 'TA’LIM',
  },

  // JAMOA & TUZILMA
  {
    id: 'branches',
    labelKey: 'nav.branches',
    label: 'Filiallar & Markazlar',
    icon: Building2,
    sectionKey: 'nav.sectionStructure',
    section: 'TUZILMA',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_PROGRAM_ADMIN', 'ROLE_REGIONAL_COORDINATOR', 'ROLE_COORDINATOR'],
  },
  {
    id: 'groups',
    labelKey: 'nav.groups',
    label: 'Guruhlar & Sinflar',
    icon: GraduationCap,
    sectionKey: 'nav.sectionStructure',
    section: 'TUZILMA',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_MENTOR', 'ROLE_ENGLISH_MENTOR'],
  },
  {
    id: 'students',
    labelKey: 'nav.students',
    label: 'O‘quvchilar',
    icon: Users,
    sectionKey: 'nav.sectionStructure',
    section: 'TUZILMA',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_MENTOR', 'ROLE_ENGLISH_MENTOR'],
  },
  {
    id: 'mentors',
    labelKey: 'nav.mentors',
    label: 'Mentorlar',
    icon: Award,
    sectionKey: 'nav.sectionStructure',
    section: 'TUZILMA',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_MENTOR', 'ROLE_ENGLISH_MENTOR'],
  },

  // TIZIM
  {
    id: 'admin',
    labelKey: 'nav.admin',
    label: 'Admin Markazi & Audit',
    icon: ShieldAlert,
    sectionKey: 'nav.sectionSystem',
    section: 'TIZIM',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'],
  },
  {
    id: 'users',
    labelKey: 'nav.users',
    label: 'Foydalanuvchilar & RBAC',
    icon: ShieldCheck,
    sectionKey: 'nav.sectionSystem',
    section: 'TIZIM',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'],
  },

  // INTELLEKT
  {
    id: 'ai-assistant',
    labelKey: 'nav.aiAssistant',
    label: 'AI Yordamchi',
    icon: Bot,
    badge: 'AI',
    sectionKey: 'nav.sectionIntellect',
    section: 'INTELLEKT',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'ROLE_MENTOR', 'ROLE_ENGLISH_MENTOR'],
  },

  // SHAXSIY
  {
    id: 'profile',
    labelKey: 'nav.profile',
    label: 'Mening profilim',
    icon: User,
    sectionKey: 'nav.sectionPersonal',
    section: 'SHAXSIY',
  },
  {
    id: 'design-system',
    labelKey: 'nav.designSystem',
    label: 'Dizayn Tizimi',
    icon: Palette,
    sectionKey: 'nav.sectionPersonal',
    section: 'SHAXSIY',
    allowedRoles: ['ROLE_ADMIN', 'ROLE_SUPER_ADMIN'],
  },
]
