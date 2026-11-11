import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { StudentsList } from './components/StudentsList';
import { CurriculumView } from './components/CurriculumView';
import { ManualScheduleModal } from './components/ManualScheduleModal';
import { AiImportModal } from './components/AiImportModal';
import { AppShell } from '@/widgets/app-shell/AppShell';
import { DesignSystemShowcase } from '@/pages/design-system/DesignSystemShowcase';
import { UserProfileModal, AuthModal } from '@/features/auth';
import type { Schedule, Student, Mentor, StudyGroup } from './types';

import { UsersDirectory } from './components/users/UsersDirectory';
import { GroupsDirectory } from './components/groups/GroupsDirectory';
import { MentorDirectory } from './components/mentors/MentorDirectory';
import { AttendanceCalendar } from './components/attendance/AttendanceCalendar';
import { LessonManager } from './components/lessons/LessonManager';
import { ResourceLibrary } from './components/resources/ResourceLibrary';
import { AssessmentEngine } from './components/assessments/AssessmentEngine';
import { GamificationDashboard } from './components/grading/GamificationDashboard';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { AiAssistantInterface } from './components/ai/AiAssistantInterface';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { AdminControlCenter } from '@/features/admin';
import { useAuth } from '@/features/auth/AuthContext';
import { navItems } from '@/widgets/sidebar/navConfig';
import { Skeleton } from '@/components/ui/skeleton';
import { scheduleApi, studentApi, mentorApi, groupApi } from './api';

export const App: React.FC<{ initialTab?: string }> = ({ initialTab = 'dashboard' }) => {
  const { user, isAdmin, isMentor } = useAuth();
  const canManageSchedules = isAdmin || isMentor;
  const userRoles = React.useMemo(() => user?.roles || [], [user?.roles]);

  const normalizeRole = (r: string) => {
    const clean = r.trim().toUpperCase();
    return clean.startsWith('ROLE_') ? clean.substring(5) : clean;
  };

  const isTabAllowed = React.useCallback(
    (tabId: string) => {
      const item = navItems.find((i) => i.id === tabId);
      if (!item || !item.allowedRoles || item.allowedRoles.length === 0) return true;
      if (!user || userRoles.length === 0) return false;
      const userNormRoles = userRoles.map(normalizeRole);
      return item.allowedRoles.some((role) => userNormRoles.includes(normalizeRole(role)));
    },
    [user, userRoles]
  );

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/profile')) {
      return 'profile';
    }
    return initialTab;
  });

  useEffect(() => {
    if (!isTabAllowed(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isTabAllowed]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [schedRes, studRes, mentRes, grpRes] = await Promise.all([
        scheduleApi.getAll(),
        studentApi.getAll(),
        mentorApi.getAll(),
        groupApi.getAll(),
      ]);

      setSchedules(schedRes.data);
      setStudents(studRes.data);
      setMentors(mentRes.data);
      setGroups(grpRes.data);
    } catch (err) {
      console.error('Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        const [schedRes, studRes, mentRes, grpRes] = await Promise.all([
          scheduleApi.getAll(),
          studentApi.getAll(),
          mentorApi.getAll(),
          groupApi.getAll(),
        ]);
        if (isMounted) {
          setSchedules(schedRes.data);
          setStudents(studRes.data);
          setMentors(mentRes.data);
          setGroups(grpRes.data);
        }
      } catch (err) {
        console.error('Data fetch error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAiModal = () => {
    if (!canManageSchedules) return;
    setIsAiModalOpen(true);
  };

  const handleOpenManualModal = () => {
    if (!canManageSchedules) return;
    setIsManualModalOpen(true);
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'ai-import') {
      if (canManageSchedules) {
        setIsAiModalOpen(true);
      }
    } else if (isTabAllowed(tab)) {
      setActiveTab(tab);
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onOpenManualModal={canManageSchedules ? handleOpenManualModal : undefined}
      onOpenAiModal={canManageSchedules ? handleOpenAiModal : undefined}
    >
      {loading && schedules.length === 0 ? (
        <div className="space-y-6">
          {/* Banner Skeleton */}
          <div className="rounded-3xl p-8 bg-card text-card-foreground shadow-xs border-0 space-y-4">
            <Skeleton className="h-6 w-48 rounded-full" />
            <Skeleton className="h-10 w-96 rounded-xl" />
            <Skeleton className="h-4 w-full max-w-xl rounded-md" />
          </div>

          {/* KPI Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-5 rounded-2xl bg-card text-card-foreground shadow-xs border-0 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-20 rounded" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
            ))}
          </div>

          {/* Table / Content Skeleton */}
          <div className="p-6 rounded-3xl bg-card text-card-foreground shadow-xs border-0 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-44 rounded-lg" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
            <div className="space-y-3 pt-2">
              {[1, 2, 3, 4, 5].map((row) => (
                <div key={row} className="flex items-center gap-4 py-3 border-b border-border/15">
                  <Skeleton className="h-5 w-12 rounded" />
                  <Skeleton className="h-5 w-40 rounded" />
                  <Skeleton className="h-5 w-28 rounded" />
                  <Skeleton className="h-5 w-24 rounded" />
                  <Skeleton className="h-5 w-20 rounded ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <Dashboard
              schedules={schedules}
              students={students}
              mentors={mentors}
              groups={groups}
              onOpenManualModal={() => setIsManualModalOpen(true)}
              onOpenAiModal={handleOpenAiModal}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard groups={groups} students={students} />
          )}

          {activeTab === 'ai-assistant' && (
            <AiAssistantInterface
              groups={groups}
              mentors={mentors}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'timetable' && (
            <AttendanceCalendar groups={groups} mentors={mentors} />
          )}

          {activeTab === 'lessons' && (
            <LessonManager groups={groups} mentors={mentors} />
          )}

          {activeTab === 'materials' && <ResourceLibrary />}

          {activeTab === 'assessments' && (
            <AssessmentEngine groups={groups} mentors={mentors} students={students} />
          )}

          {activeTab === 'grading' && <GamificationDashboard students={students} />}

          {activeTab === 'groups' && (
            <GroupsDirectory
              initialGroups={groups}
              mentors={mentors}
              students={students}
              onRefreshParent={fetchAllData}
            />
          )}

          {activeTab === 'students' && (
            <StudentsList
              students={students}
              groups={groups}
              mentors={mentors}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'mentors' && <MentorDirectory />}

          {activeTab === 'users' && <UsersDirectory />}

          {activeTab === 'admin' && <AdminControlCenter />}

          {activeTab === 'curriculum' && <CurriculumView onNavigateTab={setActiveTab} />}

          {activeTab === 'profile' && <ProfilePage />}

          {activeTab === 'design-system' && <DesignSystemShowcase />}
        </>
      )}

      {/* Manual Schedule Modal (Faqat Admin va Mentorlar uchun) */}
      {canManageSchedules && (
        <ManualScheduleModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          mentors={mentors}
          onSuccess={() => {
            fetchAllData();
            setActiveTab('timetable');
          }}
        />
      )}

      {/* AI Timetable & Students Import Modal (Faqat Admin va Mentorlar uchun) */}
      {canManageSchedules && (
        <AiImportModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          mentors={mentors}
          onSuccess={() => {
            fetchAllData();
            setActiveTab('timetable');
          }}
        />
      )}

      {/* User Profile Details Modal & Auth Modal */}
      <UserProfileModal />
      <AuthModal />
    </AppShell>
  );
};


export default App;
