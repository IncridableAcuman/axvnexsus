export interface Mentor {
  id: number;
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  branchLocation?: string;
  bio?: string;
}

export interface StudyGroup {
  id: number;
  groupCode: string;
  name?: string;
  gradeLevel: string;
  subject?: string;
  branchLocation?: string;
  roomLocation?: string;
  room?: string;
  lessonDays?: string;
  lessonTime?: string;
  scheduleDays?: string;
  scheduleTime?: string;
  mentor?: Mentor;
  academicPeriod?: AcademicPeriodDto;
  status?: string;
  maxCapacity?: number;
  studentCount?: number;
}

export interface Schedule {
  id: number;
  studyGroup?: StudyGroup;
  mentor?: Mentor;
  gradeLevel: string;
  subject: string;
  days: string;
  startTime: string;
  endTime: string;
  room?: string;
  branchLocation?: string;
  academicYear?: string;
  topic?: string;
  durationMinutes?: number;
}

export interface Student {
  id: number;
  fullName: string;
  pinfl?: string;
  studentIdNumber?: string;
  district?: string;
  gradeLevel?: string;
  branchLocation?: string;
  phone?: string;
  direction?: string;
  status: string;
  studyGroup?: StudyGroup;
  mentor?: Mentor;
}

export interface ManualScheduleRequest {
  mentorName: string;
  mentorRole: string;
  groupCode: string;
  gradeLevel: string;
  subject: string;
  days: string;
  startTime: string;
  endTime: string;
  room: string;
  branchLocation: string;
  topic?: string;
  students: {
    fullName: string;
    pinfl?: string;
    studentIdNumber?: string;
    district?: string;
    gradeLevel?: string;
    phone?: string;
  }[];
}

export interface ParsedScheduleDto {
  groupCode: string;
  gradeLevel: string;
  subject: string;
  days: string;
  startTime: string;
  endTime: string;
  room: string;
  branchLocation: string;
  mentorName: string;
  mentorRole: string;
}

export interface ParsedStudentDto {
  orderNumber?: number;
  fullName: string;
  pinfl?: string;
  studentIdNumber?: string;
  district?: string;
  gradeLevel?: string;
  groupCode?: string;
  branchLocation?: string;
  phone?: string;
  status?: string;
}

export interface AiParsedResultDto {
  success: boolean;
  message: string;
  provider: string;
  targetMentor: string;
  branchLocation: string;
  schedules: ParsedScheduleDto[];
  students: ParsedStudentDto[];
  rawSummary?: string;
}

export interface ConfirmImportRequest {
  mentorName: string;
  mentorRole: string;
  branchLocation: string;
  schedules: ParsedScheduleDto[];
  students: ParsedStudentDto[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
  role?: string;
  phone?: string;
}

export interface CaptchaResponse {
  captchaId: string;
  captchaSvg: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  captchaId?: string;
  captchaCode?: string;
}

export interface CreateMentorRequest {
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  branchLocation?: string;
  bio?: string;
}

export interface MentorProvisionDto {
  id: number;
  fullName: string;
  role: string;
  phone?: string;
  email?: string;
  branchLocation?: string;
  bio?: string;
  hemisId: string;
  temporaryPassword: string;
  accountCreated: boolean;
  createdAt?: string;
}

export interface CreateStudentRequest {
  fullName: string;
  gradeLevel: string;
  studyGroupId?: number;
  direction?: string;
  phone?: string;
  pinfl?: string;
  district?: string;
  branchLocation?: string;
}

export interface StudentProvisionDto {
  id: number;
  fullName: string;
  studentIdNumber: string;
  temporaryPassword: string;
  gradeLevel: string;
  studyGroupId?: number;
  groupCode?: string;
  mentorName?: string;
  branchLocation?: string;
  phone?: string;
  pinfl?: string;
  direction?: string;
  status: string;
  accountCreated: boolean;
  createdAt?: string;
}

export interface ResetPasswordResultDto {
  targetId: number;
  identifier: string;
  fullName: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  id?: number;
  username: string;
  email?: string;
  fullName: string;
  roles: string[];
  permissions?: string[];
  emailVerified?: boolean;
}

export interface AuthUser {
  id?: number;
  username: string;
  email?: string;
  fullName: string;
  roles: string[];
  permissions?: string[];
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  emailVerified?: boolean;
}

export interface VerifyEmailRequest {
  token?: string;
  email?: string;
  code?: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Module 04: RBAC & User Management
export interface PermissionDto {
  id: number;
  name: string;
  category: string;
  description?: string;
}

export interface RoleDto {
  id: number;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions?: PermissionDto[];
}

export interface UserDto {
  id: number;
  username: string;
  email?: string;
  fullName: string;
  phone?: string;
  primaryRole: string;
  roles: string[];
  effectivePermissions?: string[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// Module 05: Education Structure & Groups
export interface AcademicPeriodDto {
  id: number;
  name: string;
  code: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface GroupMembershipDto {
  id: number;
  studentId: number;
  studentName?: string;
  studentGrade?: string;
  groupId: number;
  groupCode?: string;
  status: string;
  enrolledAt: string;
  leftAt?: string;
  transferReason?: string;
  previousGroupId?: number;
  previousGroupCode?: string;
}

export interface GroupDetailDto {
  id: number;
  groupCode: string;
  gradeLevel: string;
  subject?: string;
  branchLocation?: string;
  scheduleDays?: string;
  scheduleTime?: string;
  room?: string;
  mentor?: Mentor;
  academicPeriod?: AcademicPeriodDto;
  status: string;
  maxCapacity: number;
  studentCount: number;
  activeMembers: GroupMembershipDto[];
}

export interface TransferStudentRequest {
  targetGroupId: number;
  reason?: string;
}

// Module 06: Mentor Profiles
export interface SkillDto {
  id?: number;
  skillName: string;
  proficiencyLevel: string;
  category?: string;
}

export interface ExperienceDto {
  id?: number;
  companyName: string;
  roleTitle: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

export interface EducationDto {
  id?: number;
  institution: string;
  degreeOrCertificate: string;
  fieldOfStudy?: string;
  issueYear?: number;
  verificationStatus?: string;
}

export interface PublicMentorProfileDto {
  id: number;
  mentorId?: number;
  displayName: string;
  headline?: string;
  bio?: string;
  yearsOfExperience: number;
  branchLocation?: string;
  publicPhone?: string;
  publicEmail?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  profilePhotoUrl?: string;
  skills: SkillDto[];
  experiences?: ExperienceDto[];
  educations?: EducationDto[];
}

export interface MentorProfileDto extends PublicMentorProfileDto {
  userId?: number;
  phone?: string;
  email?: string;
  isContactPublic: boolean;
  publicationStatus: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface UpdateMentorProfileRequest {
  displayName: string;
  headline?: string;
  bio?: string;
  yearsOfExperience?: number;
  branchLocation?: string;
  phone?: string;
  email?: string;
  isContactPublic?: boolean;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  profilePhotoUrl?: string;
  skills?: SkillDto[];
  experiences?: ExperienceDto[];
  educations?: EducationDto[];
}

// Module 07: Scheduling & Attendance
export interface AttendanceItemDto {
  studentId: number;
  studentName?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | string;
  notes?: string;
}

export interface LessonSessionDto {
  id: number;
  scheduleId?: number;
  groupId: number;
  groupCode?: string;
  groupName?: string;
  gradeLevel?: string;
  mentorId: number;
  mentorName?: string;
  room?: string;
  roomNumber?: string;
  subject: string;
  topic?: string;
  lessonDate?: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | string;
  cancellationReason?: string;
  notes?: string;
  attendanceRecorded?: boolean;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  excusedCount?: number;
  totalStudents?: number;
  attendanceRecords?: AttendanceItemDto[];
}

export interface CreateLessonSessionRequest {
  groupId: number;
  mentorId: number;
  scheduleId?: number;
  room?: string;
  roomNumber?: string;
  subject: string;
  topic?: string;
  lessonDate?: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface RescheduleLessonRequest {
  newDate?: string;
  newStartTime: string;
  newEndTime: string;
  newRoom?: string;
  newRoomNumber?: string;
  reason?: string;
}

export interface SubmitAttendanceRequest {
  records: AttendanceItemDto[];
}

// ============================================================================
// Module 08: Lesson Planning & Delivery
// ============================================================================
export interface LessonPlanDto {
  id: number;
  title: string;
  subject: string;
  gradeLevel: string;
  topic?: string;
  learningObjectives?: string;
  expectedOutcomes?: string;
  requiredMaterials?: string;
  theoryContent?: string;
  theoryDurationMinutes?: number;
  practicalContent?: string;
  practicalDurationMinutes?: number;
  exercises?: string;
  homework?: string;
  durationMinutes: number;
  groupId?: number;
  mentorId?: number;
  scheduleId?: number;
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED' | string;
  actualOutcome?: string;
  mentorNotes?: string;
  presentationSlides?: string;
  isTemplate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonRevisionDto {
  id: number;
  lessonId: number;
  revisionNumber: number;
  title: string;
  contentSnapshot: string;
  changedBy?: string;
  changeSummary?: string;
  createdAt: string;
}

export interface StudentLessonProgressDto {
  id: number;
  lessonId: number;
  studentId: number;
  studentName?: string;
  status: 'ATTENDED' | 'PRACTICAL_SUBMITTED' | 'HOMEWORK_SUBMITTED' | 'COMPLETED' | string;
  score?: number;
  mentorFeedback?: string;
  updatedAt?: string;
}

// ============================================================================
// Module 09: Learning Materials & Resource Library
// ============================================================================
export type ResourceType = 'DOCUMENT' | 'PRESENTATION' | 'IMAGE' | 'LINK' | 'VIDEO' | 'CODE' | 'EXERCISE';

export interface LearningResourceDto {
  id: number;
  title: string;
  description?: string;
  resourceType: ResourceType | string;
  fileName?: string;
  fileExtension?: string;
  fileSize?: number;
  storageKey?: string;
  mimeType?: string;
  externalUrl?: string;
  subject?: string;
  gradeLevel?: string;
  topic?: string;
  tags?: string;
  lessonId?: number;
  mentorId?: number;
  publicationStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt?: string;
}

// ============================================================================
// Module 10: Assessments, Quizzes & Assignments
// ============================================================================
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_TEXT' | 'PRACTICAL';

export interface AssessmentQuestionDto {
  id?: number;
  assessmentId?: number;
  questionText: string;
  questionType: QuestionType | string;
  points: number;
  orderIndex?: number;
  optionsJson?: string;
  correctAnswersJson?: string;
  explanation?: string;
}

export interface AssessmentDto {
  id: number;
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  topic?: string;
  assessmentType: 'QUIZ' | 'EXAM' | 'PRACTICAL' | 'HOMEWORK' | string;
  totalPoints: number;
  passingScore: number;
  durationMinutes: number;
  startTime?: string;
  endTime?: string;
  maxAttempts: number;
  randomizeQuestions: boolean;
  showCorrectAnswers: boolean;
  isPublished: boolean;
  groupId?: number;
  createdByMentorId?: number;
  createdAt?: string;
}

export interface StudentAssessmentAttemptDto {
  id: number;
  assessmentId: number;
  studentId: number;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  timeSpentSeconds: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'EVALUATED' | 'EXPIRED' | string;
  mentorFeedback?: string;
}

export interface StudentAnswerDto {
  id?: number;
  attemptId: number;
  questionId: number;
  studentAnswerText?: string;
  selectedOptionsJson?: string;
  earnedPoints?: number;
  isCorrect?: boolean;
  mentorFeedback?: string;
}

export interface AssignmentDto {
  id: number;
  title: string;
  description?: string;
  subject: string;
  gradeLevel?: string;
  groupId?: number;
  mentorId?: number;
  deadline?: string;
  maxPoints: number;
  attachmentUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface AssignmentSubmissionDto {
  id: number;
  assignmentId: number;
  studentId: number;
  studentName?: string;
  submissionText?: string;
  fileUrl?: string;
  submittedAt: string;
  status: 'PENDING' | 'GRADED' | 'LATE' | 'RESUBMISSION_REQUESTED' | string;
  score?: number;
  feedback?: string;
  gradedByMentorId?: number;
  gradedAt?: string;
}

// ============================================================================
// Module 11: Grading, Points & Gamification
// ============================================================================
export interface GradeRecordDto {
  id: number;
  studentId: number;
  subject: string;
  gradeLevel: string;
  academicPeriodId?: number;
  evaluationType: 'EXAM' | 'QUIZ' | 'HOMEWORK' | 'PROJECT' | 'FINAL' | string;
  score: number;
  maxScore: number;
  letterGrade?: string;
  isPassing: boolean;
  comments?: string;
  mentorId?: number;
  createdAt?: string;
}

export interface PointTransactionDto {
  id: number;
  studentId: number;
  amount: number;
  pointSource: string;
  referenceId?: string;
  referenceType?: string;
  idempotencyKey?: string;
  reason: string;
  awardedByUserId?: number;
  createdAt: string;
}

export interface AchievementDto {
  id: number;
  code: string;
  title: string;
  description: string;
  icon: string;
  badgeColor: string;
  category: string;
  xpReward: number;
  criteriaType: string;
  criteriaThreshold: number;
  isActive: boolean;
}

export interface StudentAchievementDto {
  id: number;
  studentId: number;
  achievementId: number;
  unlockedAt: string;
  progressValue: number;
}

export interface LeaderboardEntryDto {
  rank: number;
  studentId: number;
  displayName: string;
  groupName: string;
  gradeLevel: string;
  totalPoints: number;
  highestSingleAward: number;
  earliestAchievedAt?: string;
  badgeCount: number;
  currentStreak?: number;
  longestStreak?: number;
  level?: number;
  levelName?: string;
}

export interface GroupLeaderboardEntryDto {
  rank: number;
  groupName: string;
  studentCount: number;
  totalPoints: number;
  averagePoints: number;
}

export interface StudentStreakDto {
  studentId: number;
  currentStreak: number;
  longestStreak: number;
  checkedInToday: boolean;
  lastActivityDate?: string;
  streakFreezeCount: number;
  totalActiveDays: number;
  nextMilestoneDays: number;
  nextMilestoneReward: number;
}

export interface StreakCheckInResultDto {
  studentId: number;
  alreadyRecorded: boolean;
  currentStreak: number;
  longestStreak: number;
  bonusXpEarned: number;
  message: string;
  lastActivityDate: string;
  streakFreezeAvailable: boolean;
}

export interface LevelInfoDto {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  progressPercent: number;
  badgeName: string;
  color: string;
}

export interface MetricItemDto {
  metric: string;
  value: string;
  description: string;
  categoryOrCondition: string;
}

export interface GamificationMetricsDto {
  title: string;
  gradingScales: MetricItemDto[];
  xpRules: MetricItemDto[];
  playerLevels: MetricItemDto[];
  streakRules: MetricItemDto[];
}

export interface StudentGamificationProfileDto {
  studentId: number;
  displayName: string;
  totalPoints: number;
  rank: number;
  currentStreak?: number;
  longestStreak?: number;
  checkedInToday?: boolean;
  totalActiveDays?: number;
  level?: number;
  levelName?: string;
  currentLevelMinXp?: number;
  nextLevelXp?: number;
  levelProgressPercent?: number;
  streakDetails?: StudentStreakDto;
  recentTransactions: PointTransactionDto[];
  unlockedAchievements: StudentAchievementDto[];
  availableAchievements: AchievementDto[];
}

// ============================================================================
// Module 12: Analytics & Reporting DTOs
// ============================================================================
export interface MetricRuleDocumentationDto {
  attendanceFormula: string;
  attendanceDenominatorPolicy: string;
  lessonCompletionFormula: string;
  assessmentCompletionFormula: string;
  averageScoreFormula: string;
  assignmentCompletionFormula: string;
  auditDisclaimer: string;
}

export interface TrendDataPointDto {
  periodLabel: string;
  attendanceRate: number;
  averageScore: number;
  lessonsCompleted: number;
  assessmentsTaken: number;
}

export interface IndividualStudentAnalyticsDto {
  studentId: number;
  studentName: string;
  studentIdNumber?: string;
  gradeLevel?: string;
  groupId?: number;
  groupCode?: string;
  mentorName?: string;
  branchLocation?: string;

  completedLessonsCount: number;
  totalCurriculumLessons: number;
  lessonCompletionRate: number;

  totalScheduledSessions: number;
  presentCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number;

  totalAssessmentsAssigned: number;
  assessmentsAttempted: number;
  assessmentCompletionRate: number;
  averageAssessmentScore: number;
  highestAssessmentScore: number;
  lowestAssessmentScore: number;

  totalAssignmentsAssigned: number;
  assignmentsSubmitted: number;
  assignmentCompletionRate: number;
  averageAssignmentScore: number;

  overallAverageScore: number;
  masteryLevel: string;

  progressOverTime: TrendDataPointDto[];
  ruleDocumentation: MetricRuleDocumentationDto;
}

export interface StudentPerformanceSummaryDto {
  studentId: number;
  studentName: string;
  studentIdNumber?: string;
  attendanceRate: number;
  averageScore: number;
  completedLessons: number;
  submittedAssignments: number;
  masteryLevel: string;
}

export interface GroupAnalyticsDto {
  groupId: number;
  groupCode: string;
  gradeLevel: string;
  subject: string;
  mentorName: string;
  branchLocation: string;
  studentCount: number;

  averageAttendanceRate: number;
  averageAssessmentScore: number;
  averageAssignmentCompletionRate: number;
  totalLessonsConducted: number;
  totalLessonsPlanned: number;
  lessonCompletionRate: number;

  scoreDistribution: Record<string, number>;
  students: StudentPerformanceSummaryDto[];
  weeklyTrend: TrendDataPointDto[];
  ruleDocumentation: MetricRuleDocumentationDto;
}

export interface AssessmentAnalyticsDto {
  assessmentId: number;
  title: string;
  subject: string;
  gradeLevel: string;
  topic?: string;
  passingScore: number;
  totalPoints: number;
  eligibleStudentsCount: number;
  attemptCount: number;
  participationRate: number;
  passRate: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  averageDurationMinutes: number;
  scoreRanges: Record<string, number>;
}

export interface MentorActivityAnalyticsDto {
  mentorId: number;
  mentorName: string;
  role: string;
  branchLocation: string;
  activeGroupsCount: number;
  totalAssignedStudents: number;
  conductedSessionsCount: number;
  scheduledSessionsCount: number;
  createdLessonsCount: number;
  createdAssessmentsCount: number;
  gradedAttemptsCount: number;
  gradedAssignmentsCount: number;
  attendanceRecordsCount: number;
  averageStudentAttendanceInMentorGroups: number;
  averageStudentScoreInMentorGroups: number;
  activeGroupCodes: string[];
}

export interface SubjectPerformanceDto {
  subject: string;
  gradeLevels: string[];
  totalGroups: number;
  totalStudents: number;
  averageAssessmentScore: number;
  averageAttendanceRate: number;
  passRatePercentage: number;
  totalAssessments: number;
  totalLessonsCompleted: number;
}

export interface AcademicPeriodSummaryDto {
  periodId: number;
  periodName: string;
  periodCode: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalGroups: number;
  totalStudents: number;
  totalMentors: number;
  totalSessionsConducted: number;
  overallAttendanceRate: number;
  overallAssessmentAverage: number;
  overallAssignmentCompletionRate: number;
  totalAssessmentsAdministered: number;
  groupSummaries: GroupComparisonDto[];
  ruleDocumentation: MetricRuleDocumentationDto;
}

export interface GroupComparisonDto {
  groupId: number;
  groupCode: string;
  gradeLevel: string;
  subject: string;
  mentorName: string;
  studentCount: number;
  attendanceRate: number;
  averageAssessmentScore: number;
  assignmentCompletionRate: number;
  completedLessons: number;
}

export interface DashboardOverviewDto {
  totalStudents: number;
  totalMentors: number;
  activeGroups: number;
  systemWideAttendanceRate: number;
  systemWideAverageScore: number;
  totalCompletedLessons: number;
  totalSubmittedAssignments: number;
  totalEvaluatedAssessments: number;
  groupComparisons: GroupComparisonDto[];
  systemTrend: TrendDataPointDto[];
  ruleDocumentation: MetricRuleDocumentationDto;
}

// ============================================================================
// Module 13: AI Assistant DTOs
// ============================================================================
export type AiRole = 'MENTOR_ASSISTANT' | 'STUDENT_ASSISTANT';

export type AiIntent =
  | 'LESSON_PLAN'
  | 'PRESENTATION_SLIDES'
  | 'CONCEPT_EXPLANATION'
  | 'PRACTICAL_EXERCISES'
  | 'QUIZ_GENERATION'
  | 'HOMEWORK_SUGGESTION'
  | 'SUMMARIZE_MATERIAL'
  | 'DIFFERENTIATED_EXERCISES'
  | 'PERFORMANCE_INSIGHTS'
  | 'SIMPLE_EXPLANATION'
  | 'EXERCISE_HINT'
  | 'EXPLAIN_INCORRECT_ANSWER'
  | 'FURTHER_RESOURCES'
  | 'INDEPENDENT_THINKING';

export interface AiPromptRequest {
  userPrompt: string;
  role: AiRole;
  intent: AiIntent;
  subject?: string;
  gradeLevel?: string;
  topic?: string;
  language?: string;
  contextData?: string;
  targetGroupId?: number;
  customApiKey?: string;
}

export interface AiQuizQuestionDto {
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

export interface AiLessonPlanDetailsDto {
  title: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  learningObjectives?: string;
  expectedOutcomes?: string;
  requiredMaterials?: string;
  theoryContent?: string;
  theoryDurationMinutes?: number;
  practicalContent?: string;
  practicalDurationMinutes?: number;
  exercises?: string;
  homework?: string;
  durationMinutes?: number;
}

export interface AiCompletionResponse {
  success: boolean;
  content: string;
  role: AiRole;
  intent: AiIntent;
  provider: string;
  model: string;
  tokensUsed: number;
  advisoryDisclaimer: string;
  generatedQuizQuestions?: AiQuizQuestionDto[];
  generatedLessonPlan?: AiLessonPlanDetailsDto;
  generatedPresentationSlides?: string[];
  errorMessage?: string;
}

// ============================================================================
// Module 14: Notification Center
// ============================================================================
export type NotificationType =
  | 'LESSON_PUBLISHED'
  | 'LESSON_RESCHEDULED'
  | 'LESSON_REMINDER'
  | 'ASSIGNMENT_NEW'
  | 'ASSIGNMENT_DEADLINE'
  | 'ASSESSMENT_RESULT'
  | 'MENTOR_FEEDBACK'
  | 'ENROLLMENT_UPDATED'
  | 'ADMIN_ANNOUNCEMENT';

export interface NotificationItem {
  id: number;
  recipientUserId: number;
  title: string;
  message: string;
  type: NotificationType | string;
  read: boolean;
  readAt?: string;
  actionUrl?: string;
  metadata?: string;
  createdAt: string;
}

export interface NotificationPreference {
  userId: number;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  lessonAlerts: boolean;
  assignmentAlerts: boolean;
  assessmentAlerts: boolean;
  announcementAlerts: boolean;
  digestFrequency: 'INSTANT' | 'DAILY' | 'OFF' | string;
}

export interface BroadcastNotificationRequest {
  title: string;
  message: string;
  targetRole?: string;
  specificUserIds?: number[];
  actionUrl?: string;
  sendEmail?: boolean;
}

export interface AiNotificationDraftRequest {
  topic: string;
  targetAudience?: string;
  tone?: string;
  customApiKey?: string;
}

export interface AiNotificationDraftResponse {
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  providerUsed?: string;
  modelUsed?: string;
}

export interface AiDailyDigestResponse {
  digest: string;
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | string;
  unreadCount: number;
  generatedAt: string;
  providerUsed?: string;
}

export interface AiBroadcastRequest {
  topic: string;
  targetRole?: string;
  sendEmail?: boolean;
  customApiKey?: string;
}

// ============================================================================
// Module 15: Localization & User Preferences
// ============================================================================
export type SupportedLocale = 'uz' | 'ru' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserPreference {
  userId: number;
  locale: SupportedLocale;
  theme: ThemeMode;
  reducedMotion: boolean;
  dateFormat: string;
}

// ============================================================================
// Module 16: Administration, Audit & System Operations
// ============================================================================
export interface AdminUserItem {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  phone?: string;
  primaryRole?: string;
  roles?: string[];
  enabled: boolean;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface AuditLogItem {
  id: number;
  action: string;
  entityName?: string;
  entityId?: string;
  performedBy: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'DENIED' | string;
  ipAddress?: string;
  details?: string;
  metadata?: string;
  createdAt: string;
}

export interface SystemConfigItem {
  id?: number;
  configKey: string;
  configValue: string;
  category: 'GENERAL' | 'FEATURES' | 'SECURITY' | 'NOTIFICATIONS' | string;
  secret: boolean;
  description?: string;
  updatedBy?: string;
}

export interface AdminOverview {
  totalUsers: number;
  totalStudents: number;
  totalMentors: number;
  totalStudyGroups: number;
  totalLessons: number;
  totalAssessments: number;
  totalAuditLogs: number;
  systemStatus: 'HEALTHY' | 'DEGRADED' | 'MAINTENANCE' | string;
  operationalMetrics: {
    jvmTotalMemoryMb?: number;
    jvmUsedMemoryMb?: number;
    availableProcessors?: number;
    uptimeSeconds?: number;
    [key: string]: unknown;
  };
}

export interface OperationalHealth {
  status: 'UP' | 'DEGRADED' | 'DOWN' | string;
  databaseStatus: 'CONNECTED' | 'DEGRADED' | 'ERROR' | string;
  totalJvmMemoryMb: number;
  usedJvmMemoryMb: number;
  freeJvmMemoryMb: number;
  availableProcessors: number;
  uptimeSeconds: number;
  serverTime: string;
  subsystemStatus: Record<string, string>;
}

export interface ContentModerationRequest {
  contentType: 'LESSON' | 'RESOURCE' | 'ASSESSMENT' | string;
  contentId: number;
  status: 'APPROVED' | 'FLAGGED' | 'ARCHIVED' | string;
  moderatorNote?: string;
}

export interface GradeOverrideRequest {
  gradeRecordId: number;
  newScore: number;
  reason: string;
}

// ============================================================================
// Section 25: Lesson Quality & Learning Outcomes Extension
// ============================================================================
export interface LessonQualityPlan {
  id?: number;
  lessonId: number;
  learningObjectives: string;
  expectedCompetencies?: string;
  requiredPriorKnowledge?: string;
  theoryDurationMinutes?: number;
  practicalDurationMinutes?: number;
  teachingMethods?: string;
  requiredMaterials?: string;
  assessmentCriteria?: string;
  expectedStudentOutcomes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LessonDeliveryRecord {
  id?: number;
  lessonId: number;
  mentorId?: number;
  actualDurationMinutes: number;
  topicsCovered?: string;
  practicalExercisesCompleted: number;
  commonDifficulties?: string;
  studentParticipationRate: number;
  homeworkAssigned?: string;
  topicsRequiringRevision?: string;
  whatWorkedWell?: string;
  needsFurtherExplanation?: string;
  exerciseDifficulty: 'TOO_EASY' | 'BALANCED' | 'TOO_DIFFICULT' | string;
  changeNextTime?: string;
  recordedAt?: string;
}

export interface StudentLearningOutcomeEvaluation {
  id?: number;
  lessonId: number;
  studentId: number;
  studentName?: string;
  objectiveId: string;
  objectiveTitle: string;
  status: 'NOT_EVALUATED' | 'INTRODUCED' | 'DEVELOPING' | 'ACHIEVED' | 'MASTERED';
  evidenceSource: 'QUIZ_RESULT' | 'ASSIGNMENT_SUBMISSION' | 'MENTOR_OBSERVATION';
  evidenceScore?: number;
  mentorNotes?: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export interface QualityAiSuggestion {
  lessonId: number;
  topic: string;
  isAdvisory: boolean;
  disclaimer: string;
  alternativeExplanations: string[];
  additionalPracticalExercises: string[];
  revisionActivities: string[];
  lessonPlanImprovements: string[];
}

export interface OutcomeAnalytics {
  studentId: number;
  studentName: string;
  groupId?: number;
  totalObjectivesTracked: number;
  achievedObjectivesCount: number;
  developingObjectivesCount: number;
  introducedObjectivesCount: number;
  masteryRatePercentage: number;
  attendancePercentage: number;
  averageAssessmentScore: number;
  mentorObservationAverage: number;
  objectiveStatusSummary: Record<string, string>;
}



