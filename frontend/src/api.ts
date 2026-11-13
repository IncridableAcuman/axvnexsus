import axios from 'axios';
import type {
  Schedule,
  Student,
  Mentor,
  StudyGroup,
  ManualScheduleRequest,
  AiParsedResultDto,
  ConfirmImportRequest,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  try {
    const locale = localStorage.getItem('axm_nexus_locale') || 'uz';
    config.headers['Accept-Language'] = locale;

    const stored = localStorage.getItem('axm_nexus_user');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.accessToken) {
        config.headers.Authorization = `Bearer ${user.accessToken}`;
      }
    }
  } catch {
    // ignore
  }
  return config;
});

// Automatic Access/Refresh Token Refresh Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;
      try {
        const stored = localStorage.getItem('axm_nexus_user');
        if (stored) {
          const user = JSON.parse(stored);
          if (user?.refreshToken) {
            const refreshRes = await axios.post<{
              success: boolean;
              data: AuthResponse;
            }>(`${API_BASE_URL}/auth/refresh-token`, {
              refreshToken: user.refreshToken,
            });

            const newAuthData = refreshRes.data?.data;
            if (newAuthData?.accessToken) {
              user.accessToken = newAuthData.accessToken;
              if (newAuthData.refreshToken) {
                user.refreshToken = newAuthData.refreshToken;
              }
              localStorage.setItem('axm_nexus_user', JSON.stringify(user));
              originalRequest.headers.Authorization = `Bearer ${newAuthData.accessToken}`;
              return api(originalRequest);
            }
          }
        }
      } catch {
        // Refresh token failed -> clear user
        localStorage.removeItem('axm_nexus_user');
      }
    }
    return Promise.reject(error);
  }
);


export const scheduleApi = {
  getAll: (gradeLevel?: string, mentorId?: number) => {
    const params: Record<string, unknown> = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;
    if (mentorId) params.mentorId = mentorId;
    return api.get<Schedule[]>('/schedules', { params });
  },

  createManual: (data: ManualScheduleRequest) => {
    return api.post<Schedule>('/schedules/manual', data);
  },

  delete: (id: number) => {
    return api.delete(`/schedules/${id}`);
  },
};

export const studentApi = {
  getMe: () => {
    return api.get<Student>('/students/me');
  },

  getAll: (gradeLevel?: string, mentorId?: number, groupId?: number) => {
    const params: Record<string, unknown> = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;
    if (mentorId) params.mentorId = mentorId;
    if (groupId) params.groupId = groupId;
    return api.get<Student[]>('/students', { params });
  },

  save: (student: Partial<Student>) => {
    return api.post<Student>('/students', student);
  },

  provision: (data: import('./types').CreateStudentRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: import('./types').StudentProvisionDto;
    }>('/students/provision', data);
  },

  resetPassword: (id: number) => {
    return api.post<{
      success: boolean;
      message: string;
      data: import('./types').ResetPasswordResultDto;
    }>(`/students/${id}/reset-password`);
  },

  delete: (id: number) => {
    return api.delete(`/students/${id}`);
  },
};

export const mentorApi = {
  getAll: () => api.get<Mentor[]>('/mentors'),
  create: (mentor: Partial<Mentor>) => api.post<Mentor>('/mentors', mentor),
  provision: (data: import('./types').CreateMentorRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: import('./types').MentorProvisionDto;
    }>('/mentors/provision', data);
  },
  resetPassword: (id: number) => {
    return api.post<{
      success: boolean;
      message: string;
      data: import('./types').ResetPasswordResultDto;
    }>(`/mentors/${id}/reset-password`);
  },
};

export const groupApi = {
  getAll: (gradeLevel?: string) => {
    const params: Record<string, unknown> = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;
    return api.get<StudyGroup[]>('/groups', { params });
  },
};

export const aiApi = {
  parseTimetable: (
    file: File,
    targetMentor: string,
    provider: string = 'smart_local',
    apiKey?: string
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetMentor', targetMentor);
    formData.append('provider', provider);
    if (apiKey) {
      formData.append('apiKey', apiKey);
    }
    return api.post<AiParsedResultDto>('/ai/parse-timetable', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  confirmImport: (data: ConfirmImportRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      savedSchedules: number;
      savedStudents: number;
      mentorName: string;
    }>('/ai/confirm-import', data);
  },
};

export const authApi = {
  getCaptcha: () => {
    return api.get<{
      success: boolean;
      message: string;
      data: import('./types').CaptchaResponse;
    }>('/auth/captcha');
  },

  register: (data: RegisterRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: AuthResponse;
    }>('/auth/register', data);
  },

  login: (data: LoginRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: AuthResponse;
    }>('/auth/login', data);
  },

  verifyEmail: (data: import('./types').VerifyEmailRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: AuthResponse;
    }>('/auth/verify-email', data);
  },

  resendVerification: (data: import('./types').ResendVerificationRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: null;
    }>('/auth/resend-verification', data);
  },

  refreshToken: (data: { refreshToken: string }) => {
    return api.post<{
      success: boolean;
      message: string;
      data: AuthResponse;
    }>('/auth/refresh-token', data);
  },

  forgotPassword: (data: import('./types').ForgotPasswordRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: string;
    }>('/auth/forgot-password', data);
  },

  resetPassword: (data: import('./types').ResetPasswordRequest) => {
    return api.post<{
      success: boolean;
      message: string;
      data: null;
    }>('/auth/reset-password', data);
  },

  getMe: () => {
    return api.get<{
      success: boolean;
      message: string;
      data: AuthResponse;
    }>('/auth/me');
  },
};

// Module 04: User Management & RBAC API
export const userApi = {
  getUsers: (params?: { query?: string; role?: string; enabled?: boolean; page?: number; size?: number; sortBy?: string; sortDir?: string }) => {
    return api.get<{ success: boolean; data: import('./types').PageResponse<import('./types').UserDto> }>('/users', { params });
  },

  getUserById: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').UserDto }>(`/users/${id}`);
  },

  assignRoles: (id: number, roles: string[]) => {
    return api.put<{ success: boolean; message: string; data: import('./types').UserDto }>(`/users/${id}/roles`, { roles });
  },

  revokeRole: (id: number, roleName: string) => {
    return api.delete<{ success: boolean; message: string; data: import('./types').UserDto }>(`/users/${id}/roles/${roleName}`);
  },

  updateStatus: (id: number, enabled: boolean, reason?: string) => {
    return api.patch<{ success: boolean; message: string; data: import('./types').UserDto }>(`/users/${id}/status`, { enabled, reason });
  },
};

export const rbacApi = {
  getRoles: () => {
    return api.get<{ success: boolean; data: import('./types').RoleDto[] }>('/roles');
  },

  getPermissions: () => {
    return api.get<{ success: boolean; data: import('./types').PermissionDto[] }>('/roles/permissions');
  },

  updateRolePermissions: (roleId: number, permissions: string[]) => {
    return api.put<{ success: boolean; message: string; data: import('./types').RoleDto }>(`/roles/${roleId}/permissions`, permissions);
  },
};

// Module 05: Education Structure & Groups API
export const groupStructureApi = {
  getAll: (gradeLevel?: string, mentorId?: number, status?: string, search?: string, branchId?: number) => {
    const params: Record<string, unknown> = {};
    if (gradeLevel) params.gradeLevel = gradeLevel;
    if (mentorId) params.mentorId = mentorId;
    if (status) params.status = status;
    if (search) params.search = search;
    if (branchId) params.branchId = branchId;
    return api.get<import('./types').StudyGroup[]>('/groups', { params });
  },

  getDetail: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').GroupDetailDto }>(`/groups/${id}`);
  },

  create: (data: Partial<import('./types').StudyGroup>, academicPeriodId?: number, mentorId?: number, branchId?: number) => {
    return api.post<{ success: boolean; message: string; data: import('./types').StudyGroup }>('/groups', data, {
      params: { academicPeriodId, mentorId, branchId },
    });
  },

  update: (id: number, data: Partial<import('./types').StudyGroup>, academicPeriodId?: number, mentorId?: number, branchId?: number) => {
    return api.put<{ success: boolean; message: string; data: import('./types').StudyGroup }>(`/groups/${id}`, data, {
      params: { academicPeriodId, mentorId, branchId },
    });
  },

  enrollStudent: (groupId: number, studentId: number) => {
    return api.post<{ success: boolean; message: string; data: import('./types').GroupMembershipDto }>(`/groups/${groupId}/students`, { studentId });
  },

  unenrollStudent: (groupId: number, studentId: number, reason?: string) => {
    return api.delete<{ success: boolean; message: string; data: import('./types').GroupMembershipDto }>(`/groups/${groupId}/students/${studentId}`, {
      params: { reason },
    });
  },

  transferStudent: (currentGroupId: number, studentId: number, targetGroupId: number, reason?: string) => {
    return api.post<{ success: boolean; message: string; data: import('./types').GroupMembershipDto }>(
      `/groups/${currentGroupId}/students/${studentId}/transfer`,
      { targetGroupId, reason }
    );
  },

  assignMentor: (groupId: number, mentorId: number) => {
    return api.put<{ success: boolean; message: string; data: import('./types').StudyGroup }>(`/groups/${groupId}/mentor/${mentorId}`);
  },

  getGroupHistory: (groupId: number) => {
    return api.get<{ success: boolean; data: import('./types').GroupMembershipDto[] }>(`/groups/${groupId}/history`);
  },

  getStudentHistory: (studentId: number) => {
    return api.get<{ success: boolean; data: import('./types').GroupMembershipDto[] }>(`/groups/students/${studentId}/history`);
  },

  updateStatus: (groupId: number, status: string) => {
    return api.patch<{ success: boolean; message: string; data: import('./types').StudyGroup }>(`/groups/${groupId}/status`, null, {
      params: { status },
    });
  },
};

// Milestone 11: Branches & Multi-Branch Hierarchy API
export const branchApi = {
  getAll: (status?: string, region?: string, search?: string) => {
    const params: Record<string, unknown> = {};
    if (status) params.status = status;
    if (region) params.region = region;
    if (search) params.search = search;
    return api.get<{ success: boolean; data: import('./types').BranchDto[] }>('/branches', { params });
  },

  getById: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').BranchDto }>(`/branches/${id}`);
  },

  getStatistics: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').BranchStatisticsDto }>(`/branches/${id}/statistics`);
  },

  create: (data: import('./types').CreateBranchRequest) => {
    return api.post<{ success: boolean; message: string; data: import('./types').BranchDto }>('/branches', data);
  },

  update: (id: number, data: import('./types').UpdateBranchRequest) => {
    return api.put<{ success: boolean; message: string; data: import('./types').BranchDto }>(`/branches/${id}`, data);
  },

  delete: (id: number) => {
    return api.delete<{ success: boolean; message: string }>(`/branches/${id}`);
  },

  getGroups: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').StudyGroup[] }>(`/branches/${id}/groups`);
  },

  getRooms: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').Room[] }>(`/branches/${id}/rooms`);
  },
};

// Module 06: Mentor Profiles API
export const mentorProfileApi = {
  getPublicProfiles: () => {
    return api.get<{ success: boolean; data: import('./types').PublicMentorProfileDto[] }>('/mentors/public');
  },

  getPublicProfileById: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').PublicMentorProfileDto }>(`/mentors/public/${id}`);
  },

  getProfileByMentorId: (mentorId: number) => {
    return api.get<{ success: boolean; data: import('./types').MentorProfileDto }>(`/mentors/${mentorId}/profile`);
  },

  updateProfile: (mentorId: number, data: import('./types').UpdateMentorProfileRequest) => {
    return api.put<{ success: boolean; message: string; data: import('./types').MentorProfileDto }>(`/mentors/${mentorId}/profile`, data);
  },

  getAllProfilesForAdmin: () => {
    return api.get<{ success: boolean; data: import('./types').MentorProfileDto[] }>('/mentors/profiles/admin');
  },

  reviewProfile: (profileId: number, status: string, rejectionReason?: string) => {
    return api.patch<{ success: boolean; message: string; data: import('./types').MentorProfileDto }>(
      `/mentors/profiles/${profileId}/review`,
      { status, rejectionReason }
    );
  },
};

// Module 07: Scheduling & Attendance API
export const attendanceApi = {
  getSessions: (startDate?: string, endDate?: string, mentorId?: number, groupId?: number) => {
    const params: Record<string, unknown> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (mentorId) params.mentorId = mentorId;
    if (groupId) params.groupId = groupId;
    return api.get<{ success: boolean; data: import('./types').LessonSessionDto[] }>('/lessons', { params });
  },

  getTodaySessions: (mentorId?: number) => {
    return api.get<{ success: boolean; data: import('./types').LessonSessionDto[] }>('/lessons/today', {
      params: mentorId ? { mentorId } : undefined,
    });
  },

  getSessionById: (id: number) => {
    return api.get<{ success: boolean; data: import('./types').LessonSessionDto }>(`/lessons/${id}`);
  },

  createSession: (data: import('./types').CreateLessonSessionRequest) => {
    return api.post<{ success: boolean; message: string; data: import('./types').LessonSessionDto }>('/lessons', data);
  },

  rescheduleSession: (id: number, data: import('./types').RescheduleLessonRequest) => {
    return api.post<{ success: boolean; message: string; data: import('./types').LessonSessionDto }>(`/lessons/${id}/reschedule`, data);
  },

  cancelSession: (id: number, reason: string) => {
    return api.post<{ success: boolean; message: string; data: import('./types').LessonSessionDto }>(`/lessons/${id}/cancel`, { reason });
  },

  submitAttendance: (sessionId: number, records: import('./types').AttendanceItemDto[]) => {
    return api.post<{ success: boolean; message: string; data: import('./types').LessonSessionDto }>(`/lessons/${sessionId}/attendance`, { records });
  },
};

// ============================================================================
// Module 08: Lesson Planning & Delivery API
// ============================================================================
export const lessonPlanApi = {
  getAll: (params?: { groupId?: number; mentorId?: number }) => {
    return api.get<import('./types').LessonPlanDto[]>('/lesson-plans', { params });
  },
  getTemplates: () => {
    return api.get<import('./types').LessonPlanDto[]>('/lesson-plans/templates');
  },
  getById: (id: number) => {
    return api.get<import('./types').LessonPlanDto>(`/lesson-plans/${id}`);
  },
  create: (data: Partial<import('./types').LessonPlanDto>) => {
    return api.post<import('./types').LessonPlanDto>('/lesson-plans', data);
  },
  update: (id: number, data: Partial<import('./types').LessonPlanDto>, summary?: string) => {
    return api.put<import('./types').LessonPlanDto>(`/lesson-plans/${id}`, data, { params: { summary } });
  },
  transitionStatus: (id: number, status: string, reason?: string) => {
    return api.patch<import('./types').LessonPlanDto>(`/lesson-plans/${id}/status`, { status, reason });
  },
  updatePresentation: (id: number, presentationSlides: string) => {
    return api.patch<import('./types').LessonPlanDto>(`/lesson-plans/${id}/presentation`, { presentationSlides });
  },
  clone: (id: number, payload?: { groupId?: number; mentorId?: number; title?: string }) => {
    return api.post<import('./types').LessonPlanDto>(`/lesson-plans/${id}/clone`, payload);
  },
  getRevisions: (id: number) => {
    return api.get<import('./types').LessonRevisionDto[]>(`/lesson-plans/${id}/revisions`);
  },
  getProgress: (id: number) => {
    return api.get<import('./types').StudentLessonProgressDto[]>(`/lesson-plans/${id}/progress`);
  },
  recordProgress: (id: number, data: { studentId: number; status?: string; score?: number; feedback?: string }) => {
    return api.post<import('./types').StudentLessonProgressDto>(`/lesson-plans/${id}/progress`, data);
  },
  delete: (id: number) => {
    return api.delete(`/lesson-plans/${id}`);
  },
};

// ============================================================================
// Module 09: Learning Materials & Resources API
// ============================================================================
export const resourceApi = {
  search: (params?: { query?: string; subject?: string; gradeLevel?: string; type?: string }) => {
    return api.get<import('./types').LearningResourceDto[]>('/resources', { params });
  },
  getById: (id: number) => {
    return api.get<import('./types').LearningResourceDto>(`/resources/${id}`);
  },
  getByLessonId: (lessonId: number) => {
    return api.get<import('./types').LearningResourceDto[]>(`/resources/by-lesson/${lessonId}`);
  },
  upload: (formData: FormData) => {
    return api.post<import('./types').LearningResourceDto>('/resources/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  createLink: (data: {
    title: string;
    description?: string;
    externalUrl: string;
    resourceType: string;
    subject?: string;
    gradeLevel?: string;
    topic?: string;
    tags?: string;
    lessonId?: number;
    mentorId?: number;
  }) => {
    return api.post<import('./types').LearningResourceDto>('/resources/link', data);
  },
  delete: (id: number) => {
    return api.delete(`/resources/${id}`);
  },
};

// ============================================================================
// Module 10: Assessments, Quizzes & Assignments API
// ============================================================================
export const assessmentApi = {
  getAll: (params?: { subject?: string; gradeLevel?: string; groupId?: number }) => {
    return api.get<import('./types').AssessmentDto[]>('/assessments', { params });
  },
  getById: (id: number) => {
    return api.get<import('./types').AssessmentDto>(`/assessments/${id}`);
  },
  getQuestionsForAdmin: (id: number) => {
    return api.get<import('./types').AssessmentQuestionDto[]>(`/assessments/${id}/questions`);
  },
  getQuestionsForTaking: (id: number) => {
    return api.get<import('./types').AssessmentQuestionDto[]>(`/assessments/${id}/take`);
  },
  create: (data: { assessment: Partial<import('./types').AssessmentDto>; questions: import('./types').AssessmentQuestionDto[] }) => {
    return api.post<import('./types').AssessmentDto>('/assessments', data);
  },
  update: (id: number, data: { assessment: Partial<import('./types').AssessmentDto>; questions: import('./types').AssessmentQuestionDto[] }) => {
    return api.put<import('./types').AssessmentDto>(`/assessments/${id}`, data);
  },
  startAttempt: (assessmentId: number, studentId?: number) => {
    const params = studentId ? { studentId } : undefined;
    return api.post<import('./types').StudentAssessmentAttemptDto>(`/assessments/${assessmentId}/start`, null, {
      params,
    });
  },
  submitAttempt: (attemptId: number, answers: Record<number, string>) => {
    return api.post<import('./types').StudentAssessmentAttemptDto>(`/assessments/attempts/${attemptId}/submit`, answers);
  },
  gradeAttemptManually: (attemptId: number, mentorId: number, scores: Record<number, number>, feedback?: string) => {
    return api.post<import('./types').StudentAssessmentAttemptDto>(
      `/assessments/attempts/${attemptId}/grade`,
      { scores, feedback },
      { params: { mentorId } }
    );
  },
  getAttempt: (attemptId: number) => {
    return api.get<import('./types').StudentAssessmentAttemptDto>(`/assessments/attempts/${attemptId}`);
  },
  getAttemptAnswers: (attemptId: number) => {
    return api.get<import('./types').StudentAnswerDto[]>(`/assessments/attempts/${attemptId}/answers`);
  },
  getMyAttempts: () => {
    return api.get<import('./types').StudentAssessmentAttemptDto[]>('/assessments/my-attempts');
  },
  getStudentAttempts: (studentId: number) => {
    return api.get<import('./types').StudentAssessmentAttemptDto[]>(`/assessments/students/${studentId}/attempts`);
  },
};

export const assignmentApi = {
  getAll: (params?: { groupId?: number; subject?: string }) => {
    return api.get<import('./types').AssignmentDto[]>('/assignments', { params });
  },
  getById: (id: number) => {
    return api.get<import('./types').AssignmentDto>(`/assignments/${id}`);
  },
  create: (data: Partial<import('./types').AssignmentDto>) => {
    return api.post<import('./types').AssignmentDto>('/assignments', data);
  },
  submit: (id: number, data: { studentId?: number; submissionText?: string; fileUrl?: string }) => {
    return api.post<import('./types').AssignmentSubmissionDto>(`/assignments/${id}/submit`, data);
  },
  getMySubmissions: () => {
    return api.get<import('./types').AssignmentSubmissionDto[]>('/assignments/my-submissions');
  },
  grade: (submissionId: number, data: { mentorId: number; score: number; feedback?: string }) => {
    return api.post<import('./types').AssignmentSubmissionDto>(`/assignments/submissions/${submissionId}/grade`, data);
  },
  getSubmissions: (assignmentId: number) => {
    return api.get<import('./types').AssignmentSubmissionDto[]>(`/assignments/${assignmentId}/submissions`);
  },
  getStudentSubmissions: (studentId: number) => {
    return api.get<import('./types').AssignmentSubmissionDto[]>(`/assignments/students/${studentId}/submissions`);
  },
};

// ============================================================================
// Module 11: Grading & Gamification API
// ============================================================================
export const gradingApi = {
  recordGrade: (data: Partial<import('./types').GradeRecordDto>) => {
    return api.post<import('./types').GradeRecordDto>('/grading/grades', data);
  },
  getMyGrades: () => {
    return api.get<import('./types').GradeRecordDto[]>('/grading/grades/me');
  },
  getStudentGrades: (studentId: number) => {
    return api.get<import('./types').GradeRecordDto[]>(`/grading/grades/student/${studentId}`);
  },
  awardPoints: (data: {
    studentId: number;
    amount: number;
    pointSource: string;
    referenceId?: string;
    referenceType?: string;
    idempotencyKey?: string;
    reason: string;
    awardedByUserId?: number;
  }) => {
    return api.post<import('./types').PointTransactionDto>('/grading/points', data);
  },
  adjustPoints: (data: { studentId: number; deltaAmount: number; reason: string; authorizedUserId?: number }) => {
    return api.post<import('./types').PointTransactionDto>('/grading/points/adjust', data);
  },
  getMyTransactions: () => {
    return api.get<import('./types').PointTransactionDto[]>('/grading/points/me');
  },
  getStudentTransactions: (studentId: number) => {
    return api.get<import('./types').PointTransactionDto[]>(`/grading/points/student/${studentId}`);
  },
  getLeaderboard: (period: 'WEEKLY' | 'MONTHLY' | 'ALL_TIME' = 'ALL_TIME') => {
    return api.get<import('./types').LeaderboardEntryDto[]>('/grading/leaderboard', { params: { period } });
  },
  getGroupLeaderboard: () => {
    return api.get<import('./types').GroupLeaderboardEntryDto[]>('/grading/leaderboard/groups');
  },
  getMyProfile: () => {
    return api.get<import('./types').StudentGamificationProfileDto>('/grading/profile/me');
  },
  getStudentProfile: (studentId: number) => {
    return api.get<import('./types').StudentGamificationProfileDto>(`/grading/profile/${studentId}`);
  },
  getMyStreak: () => {
    return api.get<import('./types').StudentStreakDto>('/grading/streak/me');
  },
  checkInStreak: (studentId?: number, activityType: string = 'DAILY_CHECKIN') => {
    const params: Record<string, unknown> = { activityType };
    if (studentId) {
      params.studentId = studentId;
    }
    return api.post<import('./types').StreakCheckInResultDto>('/grading/streak/check-in', null, {
      params,
    });
  },
  getStudentStreak: (studentId: number) => {
    return api.get<import('./types').StudentStreakDto>(`/grading/streak/student/${studentId}`);
  },
  getGamificationMetrics: () => {
    return api.get<import('./types').GamificationMetricsDto>('/grading/metrics');
  },
};

// ============================================================================
// Module 12: Analytics & Reporting API
// ============================================================================
export const analyticsApi = {
  getAdminDashboard: (params?: { from?: string; to?: string; groupId?: number }) => {
    return api.get<import('./types').AdminDashboardDto>('/analytics/dashboard/admin', { params });
  },
  getMentorDashboard: (params?: { from?: string; to?: string }) => {
    return api.get<import('./types').MentorDashboardDto>('/analytics/dashboard/mentor', { params });
  },
  getStudentDashboard: (params?: { from?: string; to?: string }) => {
    return api.get<import('./types').StudentDashboardDto>('/analytics/dashboard/student', { params });
  },
  getOverview: (params?: { from?: string; to?: string }) => {
    return api.get<import('./types').DashboardOverviewDto>('/analytics/overview', { params });
  },
  getStudentAnalytics: (studentId: number, params?: { from?: string; to?: string }) => {
    return api.get<import('./types').IndividualStudentAnalyticsDto>(`/analytics/student/${studentId}`, { params });
  },
  getGroupAnalytics: (groupId: number, params?: { from?: string; to?: string }) => {
    return api.get<import('./types').GroupAnalyticsDto>(`/analytics/group/${groupId}`, { params });
  },
  getAssessmentAnalytics: (assessmentId: number) => {
    return api.get<import('./types').AssessmentAnalyticsDto>(`/analytics/assessment/${assessmentId}`);
  },
  getMentorActivity: (mentorId: number, params?: { from?: string; to?: string }) => {
    return api.get<import('./types').MentorActivityAnalyticsDto>(`/analytics/mentor/${mentorId}`, { params });
  },
  getSubjectPerformance: (params?: { from?: string; to?: string }) => {
    return api.get<import('./types').SubjectPerformanceDto[]>('/analytics/subjects', { params });
  },
  getAcademicPeriodSummary: (periodId: number) => {
    return api.get<import('./types').AcademicPeriodSummaryDto>(`/analytics/academic-period/${periodId}`);
  },
  getRules: () => {
    return api.get<import('./types').MetricRuleDocumentationDto>('/analytics/rules');
  },
  downloadPdf: (type: string, id?: number, params?: { from?: string; to?: string }) => {
    let endpoint = `/reports/${type}/pdf`;
    if (type === 'student') endpoint = `/reports/student/${id}/pdf`;
    else if (type === 'group') endpoint = `/reports/group/${id}/pdf`;
    else if (type === 'assessment') endpoint = `/reports/assessment/${id}/pdf`;
    else if (type === 'attendance') endpoint = `/reports/attendance/${id}/pdf`;
    else if (type === 'lesson-completion') endpoint = `/reports/lesson-completion/${id}/pdf`;
    else if (type === 'mentor') endpoint = `/reports/mentor/${id}/pdf`;
    else if (type === 'subjects') endpoint = `/reports/subjects/pdf`;
    else if (type === 'academic-period') endpoint = `/reports/academic-period/${id}/pdf`;

    return api.get(endpoint, {
      params,
      responseType: 'blob',
    });
  },
};

// ============================================================================
// Module 13: AI Assistant API
// ============================================================================
export const aiAssistantApi = {
  generate: (request: import('./types').AiPromptRequest) => {
    return api.post<import('./types').AiCompletionResponse>('/ai/assistant/generate', request);
  },
  convertToLesson: (details: import('./types').AiLessonPlanDetailsDto, mentorId?: number, groupId?: number) => {
    return api.post<import('./types').LessonPlanDto>('/ai/assistant/convert-to-lesson', { details, mentorId, groupId });
  },
  convertToAssessment: (payload: {
    title: string;
    subject: string;
    gradeLevel: string;
    groupId?: number;
    mentorId?: number;
    questions: import('./types').AiQuizQuestionDto[];
  }) => {
    return api.post<import('./types').AssessmentDto>('/ai/assistant/convert-to-assessment', payload);
  },
  getPrompts: (role?: string, language?: string) => {
    return api.get<Array<{ label: string; prompt: string }>>('/ai/assistant/prompts', {
      params: { role, language },
    });
  },
  getProviders: () => {
    return api.get<{ activeProvider: string; availableProviders: string[] }>('/ai/assistant/providers');
  },
};

// ============================================================================
// Module 14: Notification Center API
// ============================================================================
export const notificationApi = {
  getAll: (unreadOnly?: boolean, type?: string, page = 0, size = 15) => {
    const params: Record<string, unknown> = { page, size };
    if (unreadOnly !== undefined) params.unreadOnly = unreadOnly;
    if (type) params.type = type;
    return api.get<{ success: boolean; data: { content: import('./types').NotificationItem[]; totalElements: number; totalPages: number; page: number; size: number } }>('/v1/notifications', { params });
  },
  getUnreadCount: () => {
    return api.get<{ success: boolean; data: { unreadCount: number } }>('/v1/notifications/unread-count');
  },
  markAsRead: (id: number) => {
    return api.put<{ success: boolean; data: import('./types').NotificationItem }>(`/v1/notifications/${id}/read`);
  },
  markAllAsRead: () => {
    return api.put<{ success: boolean; data: { markedCount: number } }>('/v1/notifications/read-all');
  },
  delete: (id: number) => {
    return api.delete<{ success: boolean }>(`/v1/notifications/${id}`);
  },
  getPreferences: () => {
    return api.get<{ success: boolean; data: import('./types').NotificationPreference }>('/v1/notifications/preferences');
  },
  updatePreferences: (data: Partial<import('./types').NotificationPreference>) => {
    return api.put<{ success: boolean; data: import('./types').NotificationPreference }>('/v1/notifications/preferences', data);
  },
  broadcast: (data: import('./types').BroadcastNotificationRequest) => {
    return api.post<{ success: boolean; data: { deliveredCount: number } }>('/v1/notifications/broadcast', data);
  },
  getAiDailyDigest: (customApiKey?: string) => {
    return api.get<{ success: boolean; data: import('./types').AiDailyDigestResponse }>('/v1/notifications/ai/daily-digest', {
      params: customApiKey ? { customApiKey } : undefined,
    });
  },
  generateAiAnnouncement: (data: import('./types').AiNotificationDraftRequest) => {
    return api.post<{ success: boolean; data: import('./types').AiNotificationDraftResponse }>('/v1/notifications/ai/generate-announcement', data);
  },
  broadcastAiAnnouncement: (data: import('./types').AiBroadcastRequest) => {
    return api.post<{ success: boolean; data: { deliveredCount: number; title: string; message: string; providerUsed: string } }>('/v1/notifications/ai/broadcast', data);
  },
};

// ============================================================================
// Module 15: Localization & User Preferences API
// ============================================================================
export const userPreferenceApi = {
  getPreferences: () => {
    return api.get<{ success: boolean; data: import('./types').UserPreference }>('/v1/user-preferences');
  },
  updatePreferences: (data: Partial<import('./types').UserPreference>) => {
    return api.put<{ success: boolean; data: import('./types').UserPreference }>('/v1/user-preferences', data);
  },
};

// ============================================================================
// Module 16: Administration, Audit & System Operations API
// ============================================================================
export const adminApi = {
  getOverview: () => {
    return api.get<{ success: boolean; data: import('./types').AdminOverview }>('/v1/admin/overview');
  },
  getUsers: (params?: { query?: string; role?: string; enabled?: boolean; page?: number; size?: number; sortBy?: string; sortDir?: string }) => {
    return api.get<{ success: boolean; data: { content: import('./types').AdminUserItem[]; totalElements: number; totalPages: number; page: number; size: number } }>('/v1/admin/users', { params });
  },
  updateUserStatus: (id: number, enabled: boolean, reason: string) => {
    return api.put<{ success: boolean; data: import('./types').AdminUserItem }>(`/v1/admin/users/${id}/status`, { enabled, reason });
  },
  updateUserRoles: (id: number, roles: string[], reason?: string) => {
    return api.put<{ success: boolean; data: import('./types').AdminUserItem }>(`/v1/admin/users/${id}/roles`, { roles, reason });
  },
  getAuditLogs: (params?: { query?: string; action?: string; entityName?: string; performedBy?: string; from?: string; to?: string; page?: number; size?: number }) => {
    return api.get<{ success: boolean; data: { content: import('./types').AuditLogItem[]; totalElements: number; totalPages: number; page: number; size: number } }>('/v1/admin/audit-logs', { params });
  },
  exportAuditLogs: (format: 'csv' | 'json' = 'csv') => {
    return api.get(`/v1/admin/audit-logs/export?format=${format}`, { responseType: 'blob' });
  },
  getSystemConfigs: () => {
    return api.get<{ success: boolean; data: import('./types').SystemConfigItem[] }>('/v1/admin/system-config');
  },
  updateSystemConfig: (data: { key: string; value: string; description?: string }) => {
    return api.put<{ success: boolean; data: import('./types').SystemConfigItem }>('/v1/admin/system-config', data);
  },
  getHealthOverview: () => {
    return api.get<{ success: boolean; data: import('./types').OperationalHealth }>('/v1/admin/health-overview');
  },
  moderateContent: (data: import('./types').ContentModerationRequest) => {
    return api.post<{ success: boolean }>('/v1/admin/content-moderation', data);
  },
  overrideGrade: (data: import('./types').GradeOverrideRequest) => {
    return api.post<{ success: boolean; data: import('./types').GradeRecordDto }>('/v1/admin/grade-override', data);
  },
};

// ============================================================================
// Section 25: Lesson Quality & Learning Outcomes API
// ============================================================================
export const lessonQualityApi = {
  getQualityPlan: (lessonId: number) => {
    return api.get<{ success: boolean; data: import('./types').LessonQualityPlan }>(`/v1/lessons/${lessonId}/quality-plan`);
  },
  saveQualityPlan: (lessonId: number, data: import('./types').LessonQualityPlan) => {
    return api.put<{ success: boolean; data: import('./types').LessonQualityPlan }>(`/v1/lessons/${lessonId}/quality-plan`, data);
  },
  recordDelivery: (lessonId: number, data: import('./types').LessonDeliveryRecord) => {
    return api.post<{ success: boolean; data: import('./types').LessonDeliveryRecord }>(`/v1/lessons/${lessonId}/delivery`, data);
  },
  getDeliveryRecords: (lessonId: number) => {
    return api.get<{ success: boolean; data: import('./types').LessonDeliveryRecord[] }>(`/v1/lessons/${lessonId}/delivery`);
  },
  saveOutcomeEvaluations: (lessonId: number, evaluations: import('./types').StudentLearningOutcomeEvaluation[]) => {
    return api.post<{ success: boolean; data: import('./types').StudentLearningOutcomeEvaluation[] }>(`/v1/lessons/${lessonId}/evaluations`, {
      lessonId,
      evaluations,
    });
  },
  getOutcomeEvaluationsByLesson: (lessonId: number) => {
    return api.get<{ success: boolean; data: import('./types').StudentLearningOutcomeEvaluation[] }>(`/v1/lessons/${lessonId}/evaluations`);
  },
  getOutcomeEvaluationsByStudent: (studentId: number) => {
    return api.get<{ success: boolean; data: import('./types').StudentLearningOutcomeEvaluation[] }>(`/v1/learning-outcomes/students/${studentId}/evaluations`);
  },
  getQualityAiSuggestions: (lessonId: number) => {
    return api.get<{ success: boolean; data: import('./types').QualityAiSuggestion }>(`/v1/lessons/${lessonId}/ai-suggestions`);
  },
  getOutcomeAnalytics: (studentId: number, groupId?: number) => {
    return api.get<{ success: boolean; data: import('./types').OutcomeAnalytics }>(`/v1/learning-outcomes/students/${studentId}/analytics`, {
      params: { groupId },
    });
  },
};

export default api;



