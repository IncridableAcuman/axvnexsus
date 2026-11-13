package uz.axm.nexus.shared.infrastructure;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import uz.axm.nexus.access.domain.Permission;
import uz.axm.nexus.access.domain.Role;
import uz.axm.nexus.access.infrastructure.PermissionRepository;
import uz.axm.nexus.access.infrastructure.RoleRepository;
import uz.axm.nexus.branches.domain.Branch;
import uz.axm.nexus.branches.infrastructure.BranchRepository;
import uz.axm.nexus.classrooms.domain.GroupMembership;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.GroupMembershipRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.education.domain.AcademicPeriod;
import uz.axm.nexus.education.infrastructure.AcademicPeriodRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.domain.MentorProfile;
import uz.axm.nexus.mentors.domain.MentorSkill;
import uz.axm.nexus.mentors.domain.MentorExperience;
import uz.axm.nexus.mentors.domain.MentorEducation;
import uz.axm.nexus.mentors.infrastructure.MentorProfileRepository;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.mentors.infrastructure.MentorSkillRepository;
import uz.axm.nexus.mentors.infrastructure.MentorExperienceRepository;
import uz.axm.nexus.mentors.infrastructure.MentorEducationRepository;
import uz.axm.nexus.scheduling.domain.AttendanceRecord;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.domain.Schedule;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.scheduling.infrastructure.ScheduleRepository;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import uz.axm.nexus.assessments.domain.Assessment;
import uz.axm.nexus.assessments.domain.AssessmentQuestion;
import uz.axm.nexus.assessments.domain.StudentAssessmentAttempt;
import uz.axm.nexus.assessments.infrastructure.AssessmentQuestionRepository;
import uz.axm.nexus.assessments.infrastructure.AssessmentRepository;
import uz.axm.nexus.assessments.infrastructure.StudentAssessmentAttemptRepository;
import uz.axm.nexus.assignments.domain.Assignment;
import uz.axm.nexus.assignments.domain.AssignmentSubmission;
import uz.axm.nexus.assignments.infrastructure.AssignmentRepository;
import uz.axm.nexus.assignments.infrastructure.AssignmentSubmissionRepository;
import uz.axm.nexus.grading.domain.GradeRecord;
import uz.axm.nexus.grading.domain.PointTransaction;
import uz.axm.nexus.grading.domain.StudentStreak;
import uz.axm.nexus.grading.domain.StudentAchievement;
import uz.axm.nexus.grading.infrastructure.GradeRecordRepository;
import uz.axm.nexus.grading.infrastructure.PointTransactionRepository;
import uz.axm.nexus.grading.infrastructure.StudentStreakRepository;
import uz.axm.nexus.grading.infrastructure.StudentAchievementRepository;
import uz.axm.nexus.grading.infrastructure.AchievementRepository;
import uz.axm.nexus.lessons.domain.Lesson;
import uz.axm.nexus.lessons.domain.StudentLessonProgress;
import uz.axm.nexus.lessons.infrastructure.LessonRepository;
import uz.axm.nexus.lessons.infrastructure.StudentLessonProgressRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final MentorRepository mentorRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final ScheduleRepository scheduleRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final AcademicPeriodRepository academicPeriodRepository;
    private final BranchRepository branchRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final MentorProfileRepository mentorProfileRepository;
    private final MentorSkillRepository mentorSkillRepository;
    private final MentorExperienceRepository mentorExperienceRepository;
    private final MentorEducationRepository mentorEducationRepository;
    private final LessonSessionRepository lessonSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LessonRepository lessonRepository;
    private final StudentLessonProgressRepository studentLessonProgressRepository;
    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository assessmentQuestionRepository;
    private final StudentAssessmentAttemptRepository studentAssessmentAttemptRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentSubmissionRepository assignmentSubmissionRepository;
    private final GradeRecordRepository gradeRecordRepository;
    private final PointTransactionRepository pointTransactionRepository;
    private final StudentStreakRepository studentStreakRepository;
    private final StudentAchievementRepository studentAchievementRepository;
    private final AchievementRepository achievementRepository;
    private final uz.axm.nexus.notifications.infrastructure.NotificationRepository notificationRepository;
    private final uz.axm.nexus.notifications.infrastructure.NotificationPreferenceRepository notificationPreferenceRepository;
    private final uz.axm.nexus.users.infrastructure.UserPreferenceRepository userPreferenceRepository;
    private final uz.axm.nexus.audit.infrastructure.AuditLogRepository auditLogRepository;
    private final uz.axm.nexus.audit.infrastructure.SystemConfigRepository systemConfigRepository;
    private final uz.axm.nexus.identity.infrastructure.SuperAdminBootstrapService superAdminBootstrapService;
    private final org.springframework.core.env.Environment environment;

    @org.springframework.beans.factory.annotation.Value("${app.seeder.demo-data-enabled:true}")
    private boolean demoDataEnabled;

    @Override
    public void run(String... args) {
        seedRbacSystem();
        seedDefaultAdmin();

        if (!demoDataEnabled) {
            log.info("[DATA_SEEDER] Demo data seeding is disabled (app.seeder.demo-data-enabled=false). Skipping sample learning and user data.");
            return;
        }

        if (mentorRepository.count() == 0) {
            seedCoreEntities();
        }

        seedMentorProfileDetails();

        if (assessmentRepository.count() == 0) {
            seedOperationalLearningData();
        }

        seedRealAssessmentsAndGamificationData();
        seedAlXorazmiyRoadmapLessonsAndPresentations();
        seedModule14To16Data();
    }

    private void seedCoreEntities() {

        log.info("Seeding initial authentic data for AXV Hub (Nexus)...");

        // 1. Academic Period
        AcademicPeriod period = academicPeriodRepository.save(AcademicPeriod.builder()
                .name("2026-2027 O'quv yili (Kuzgi semestr)")
                .code("AY-2026-F")
                .startDate(LocalDate.now().minusMonths(1))
                .endDate(LocalDate.now().plusMonths(5))
                .isActive(true)
                .build());

        // 1.1 Default Branch (Milestone 11)
        Branch branchYangiariq = branchRepository.findByCodeIgnoreCase("ITP-YANGIARIQ")
                .orElseGet(() -> branchRepository.save(Branch.builder()
                        .name("IT Park Yangiariq filiali")
                        .code("ITP-YANGIARIQ")
                        .description("Al-Xorazmiy Vorislari tizimidagi tayanch IT markazi va inkubatsiya filiali")
                        .region("Xorazm viloyati")
                        .district("Yangiariq tumani")
                        .address("Mustaqillik ko‘chasi, 24-uy")
                        .phone("+998 62 227 12 34")
                        .email("yangiariq@axm.uz")
                        .status("ACTIVE")
                        .build()));

        // 2. Mentors
        Mentor mentorIzzatbek = mentorRepository.save(Mentor.builder()
                .fullName("Abdusharipov Izzatbek quranboy o'g'li")
                .role("IT mentor")
                .phone("+998 90 123 45 67")
                .email("abdusharipovizzat03@gmail.com")
                .branchLocation("IT Park Yangiariq")
                .branch(branchYangiariq)
                .bio("Al-Xorazmiy Vorislari loyihasi IT mentori, Web Full-stack va Advanced Front-end o'qituvchisi.")
                .build());

        Mentor mentorDilnoza = mentorRepository.save(Mentor.builder()
                .fullName("Raximova Dilnoza Sanjarbek qizi")
                .role("Ingliz tili mentor")
                .phone("+998 91 987 65 43")
                .email("dilnoza.eng@gmail.com")
                .branchLocation("IT Park Yangiariq")
                .branch(branchYangiariq)
                .bio("IT English va xalqaro muloqot ko'nikmalari mentori.")
                .build());

        // 3. Mentor Profiles (Module 06)
        MentorProfile profileIzzatbek = mentorProfileRepository.save(MentorProfile.builder()
                .mentor(mentorIzzatbek)
                .displayName("Abdusharipov Izzatbek")
                .headline("Al-Xorazmiy Vorislari IT Mentori (Web Full-stack & Frontend)")
                .bio("Web Full-Stack, React, TypeScript va Zamonaviy Veb Texnologiyalari bo'yicha amaliyotchi mentor.")
                .yearsOfExperience(4)
                .branchLocation("IT Park Yangiariq")
                .phone("+998 90 123 45 67")
                .email("abdusharipovizzat03@gmail.com")
                .isContactPublic(true)
                .githubUrl("https://github.com/izzatbek-dev")
                .linkedinUrl("https://linkedin.com/in/izzatbek-abdurasharipov")
                .portfolioUrl("https://axm-nexus.uz/mentors/izzatbek")
                .publicationStatus("PUBLISHED")
                .build());

        profileIzzatbek.getSkills().addAll(List.of(
                MentorSkill.builder().profile(profileIzzatbek).skillName("React & TypeScript").proficiencyLevel("EXPERT").category("Frontend").build(),
                MentorSkill.builder().profile(profileIzzatbek).skillName("Spring Boot & Java").proficiencyLevel("EXPERT").category("Backend").build(),
                MentorSkill.builder().profile(profileIzzatbek).skillName("PostgreSQL").proficiencyLevel("ADVANCED").category("Database").build(),
                MentorSkill.builder().profile(profileIzzatbek).skillName("Tailwind CSS").proficiencyLevel("EXPERT").category("Frontend").build()
        ));
        mentorProfileRepository.save(profileIzzatbek);

        // 4. Study Groups (Module 05)
        StudyGroup group8 = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("YA-26I0804")
                .gradeLevel("8-sinf")
                .subject("Web Full-stack dasturlash asoslari")
                .branchLocation("IT Park Yangiariq")
                .branch(branchYangiariq)
                .scheduleDays("Seshanba-Payshanba-Shanba")
                .scheduleTime("15:00-16:30")
                .room("IT-2")
                .mentor(mentorIzzatbek)
                .academicPeriod(period)
                .status("ACTIVE")
                .maxCapacity(16)
                .studentCount(14)
                .build());

        StudyGroup group11 = studyGroupRepository.save(StudyGroup.builder()
                .groupCode("YA-24I1105")
                .gradeLevel("11-sinf")
                .subject("Advanced UX/UI dizayn va Advanced Front-end")
                .branchLocation("IT Park Yangiariq")
                .branch(branchYangiariq)
                .scheduleDays("Dushanba-Chorshanba-Juma")
                .scheduleTime("16:30-18:00")
                .room("IT-2")
                .mentor(mentorIzzatbek)
                .academicPeriod(period)
                .status("ACTIVE")
                .maxCapacity(16)
                .studentCount(15)
                .build());

        // 5. Schedules (Timetable template)
        Schedule sched8 = scheduleRepository.save(Schedule.builder()
                .studyGroup(group8)
                .mentor(mentorIzzatbek)
                .gradeLevel("8-sinf")
                .subject("Web Full-stack dasturlash asoslari")
                .days("Seshanba, Payshanba, Shanba")
                .startTime("15:00")
                .endTime("16:30")
                .room("IT-2")
                .branchLocation("IT Park Yangiariq")
                .branch(branchYangiariq)
                .academicYear("2026-2027")
                .topic("Web Full-stack dasturlash asoslari (HTML, CSS, JS)")
                .durationMinutes(90)
                .build());

        Schedule sched11 = scheduleRepository.save(Schedule.builder()
                .studyGroup(group11)
                .mentor(mentorIzzatbek)
                .gradeLevel("11-sinf")
                .subject("Advanced UX/UI dizayn va Advanced Front-end")
                .days("Dushanba, Chorshanba, Juma")
                .startTime("16:30")
                .endTime("18:00")
                .room("IT-2")
                .branchLocation("IT Park Yangiariq")
                .branch(branchYangiariq)
                .academicYear("2026-2027")
                .topic("Advanced UX/UI dizayn va Advanced Front-end (React & TypeScript)")
                .durationMinutes(90)
                .build());

        // 6. Students (15 in YA-24I1105, 14 in YA-26I0804)
        List<Student> students = List.of(
                // YA-24I1105 (11-sinf)
                Student.builder().fullName("Quvandiqov Asadbek Yarashbek o'g'li").studentIdNumber("I-HR 0220243").pinfl("50711097180010").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Sadaddinov Mirjalol Muxammadjon o'g'li").studentIdNumber("I-HR 0220244").pinfl("50711097180011").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Husainova Charos Baxtiyor qizi").studentIdNumber("I-HR 0220245").pinfl("50711097180012").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Bekchanova Sevinchoy Baxodir qizi").studentIdNumber("I-HR 0220246").pinfl("50711097180013").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Arkayeva Shabnam Temur qizi").studentIdNumber("I-HR 0220247").pinfl("50711097180014").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Ernazarova Safura Faxriddin qizi").studentIdNumber("I-HR 0220248").pinfl("50711097180015").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Farhodova Zebuzar Tohir qizi").studentIdNumber("I-HR 0220249").pinfl("50711097180016").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Shonazarov Dilshodbek Oybek o'g'li").studentIdNumber("I-HR 0220250").pinfl("50711097180017").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Jonibekova Diana Ruslon qizi").studentIdNumber("I-HR 0220251").pinfl("50711097180018").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Ibodullayeva Hilola Kamolladin qizi").studentIdNumber("I-HR 0220252").pinfl("50711097180019").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Olimboyeva Sabina Jo'rabek qizi").studentIdNumber("I-HR 0220253").pinfl("50711097180020").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Boltayeva Farangiz Bekzod qizi").studentIdNumber("I-HR 0220254").pinfl("50711097180021").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Ro'ziboyev Anvarbek Sanjarbek o'g'li").studentIdNumber("I-HR 0220255").pinfl("50711097180022").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Matyoqubov Sulaymon Murodjon o'g'li").studentIdNumber("I-HR 0220256").pinfl("50711097180023").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Bozorov Shohruhxon Qudrat o'g'li").studentIdNumber("I-HR 0220257").pinfl("50711097180024").district("Yangiariq tumani").gradeLevel("11-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group11).mentor(mentorIzzatbek).build(),

                // YA-26I0804 (8-sinf)
                Student.builder().fullName("Komiljonov Kamronbek Doniyor Ogli").studentIdNumber("I-HR 0220201").pinfl("50711097180025").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Rustamova Zarina Dilshod qizi").studentIdNumber("I-HR 0220202").pinfl("50711097180026").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Shermatov Shermatjon Davronbekovich").studentIdNumber("I-HR 0220203").pinfl("50711097180027").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Samandarov Behruzbek Sherzod O'g'il").studentIdNumber("I-HR 0220204").pinfl("50711097180028").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Olimboyev Ziyodulla Muhiddin").studentIdNumber("I-HR 0220205").pinfl("50711097180029").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Sobirov Akbarbek Anvarbek o'g'li").studentIdNumber("I-HR 0220206").pinfl("50711097180030").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Rajabov Diyorbek Doniyor O'g'li").studentIdNumber("I-HR 0220207").pinfl("50711097180031").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Tajiboyev Adhambek O'lmas O'g'li").studentIdNumber("I-HR 0220208").pinfl("50711097180032").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Yusupova Shabnam Matyoqub Qizi").studentIdNumber("I-HR 0220209").pinfl("50711097180033").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Komiljonov Sanjarbek Dilmurod O'g'li").studentIdNumber("I-HR 0220210").pinfl("50711097180034").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Ismoilov Elmurod Dilmurod O'g'li").studentIdNumber("I-HR 0220211").pinfl("50711097180035").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Qadamboyev Otabek Dilshod").studentIdNumber("I-HR 0220212").pinfl("50711097180036").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Rozmetov Rozmatbek Beksod").studentIdNumber("I-HR 0220213").pinfl("50711097180037").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build(),
                Student.builder().fullName("Ozodova E'zoza El'brus").studentIdNumber("I-HR 0220214").pinfl("50711097180038").district("Yangiariq tumani").gradeLevel("8-sinf").branchLocation("IT Park Yangiariq").status("Faol").studyGroup(group8).mentor(mentorIzzatbek).build()
        );
        List<Student> savedStudents = studentRepository.saveAll(students);

        // 7. Group Memberships (Module 05)
        for (Student s : savedStudents) {
            s.setBranch(branchYangiariq);
            studentRepository.save(s);
            if (s.getStudyGroup() != null) {
                groupMembershipRepository.save(GroupMembership.builder()
                        .student(s)
                        .group(s.getStudyGroup())
                        .status("ACTIVE")
                        .enrolledAt(LocalDateTime.now().minusWeeks(2))
                        .build());
            }
        }

        // 8. Sample Lesson Sessions & Attendance (Module 07)
        LocalDate today = LocalDate.now();
        LessonSession todaySession = lessonSessionRepository.save(LessonSession.builder()
                .schedule(sched8)
                .group(group8)
                .mentor(mentorIzzatbek)
                .room("IT Lab 1")
                .subject("Web Full-Stack Development")
                .topic("CSS Flexbox va Grid bilan zamonaviy maketlash")
                .lessonDate(today)
                .startTime("15:00")
                .endTime("16:30")
                .status("COMPLETED")
                .build());

        // Attendance records for today's session
        List<GroupMembership> g8Members = groupMembershipRepository.findByGroupIdAndStatus(group8.getId(), "ACTIVE");
        int count = 0;
        for (GroupMembership gm : g8Members) {
            String status = (count % 4 == 3) ? "ABSENT" : ((count % 4 == 2) ? "LATE" : "PRESENT");
            attendanceRecordRepository.save(AttendanceRecord.builder()
                    .lessonSession(todaySession)
                    .student(gm.getStudent())
                    .status(status)
                    .recordedBy("admin")
                    .recordedAt(LocalDateTime.now())
                    .notes(status.equals("LATE") ? "10 daqiqa kechikib keldi" : null)
                    .build());
            count++;
        }

        log.info("AXV Hub initial data successfully seeded!");
    }

    private void seedMentorProfileDetails() {
        mentorProfileRepository.findByMentorId(1L).ifPresent(profile -> {
            if (mentorSkillRepository.findByProfileId(profile.getId()).isEmpty()) {
                mentorSkillRepository.saveAll(List.of(
                        MentorSkill.builder().profile(profile).skillName("React & TypeScript").proficiencyLevel("EXPERT").category("Frontend").build(),
                        MentorSkill.builder().profile(profile).skillName("Spring Boot & Java").proficiencyLevel("ADVANCED").category("Backend").build(),
                        MentorSkill.builder().profile(profile).skillName("PostgreSQL").proficiencyLevel("ADVANCED").category("Database").build(),
                        MentorSkill.builder().profile(profile).skillName("Tailwind CSS & UI/UX").proficiencyLevel("EXPERT").category("Frontend").build(),
                        MentorSkill.builder().profile(profile).skillName("REST API & Full-Stack").proficiencyLevel("EXPERT").category("Full-Stack").build()
                ));
            }
            if (mentorExperienceRepository.findByProfileId(profile.getId()).isEmpty()) {
                mentorExperienceRepository.saveAll(List.of(
                        MentorExperience.builder()
                                .profile(profile)
                                .companyName("Al-Xorazmiy Vorislari ta'lim loyihasi")
                                .roleTitle("Bosh IT Mentori & Web Dasturchi")
                                .description("8 va 11-sinf iqtidorli o'quvchilariga Web Full-stack va zamonaviy Frontend texnologiyalaridan amaliy dars berish, o'quv dasturlarini ishlab chiqish va loyihalar mentorligi.")
                                .startDate(LocalDate.of(2023, 9, 1))
                                .isCurrent(true)
                                .build(),
                        MentorExperience.builder()
                                .profile(profile)
                                .companyName("IT Park Yangiariq / Freelance")
                                .roleTitle("Full-Stack Web Dasturchi")
                                .description("React, Next.js, Node.js va Spring Boot asosida tijoriy veb-ilovalarni yaratish va integratsiyalash.")
                                .startDate(LocalDate.of(2021, 2, 1))
                                .endDate(LocalDate.of(2023, 8, 31))
                                .isCurrent(false)
                                .build()
                ));
            }
            if (mentorEducationRepository.findByProfileId(profile.getId()).isEmpty()) {
                mentorEducationRepository.saveAll(List.of(
                        MentorEducation.builder()
                                .profile(profile)
                                .institution("Muhammad al-Xorazmiy nomidagi TATU Urganch filiali")
                                .degreeOrCertificate("Bakalavr")
                                .fieldOfStudy("Dasturiy injiniring va IT")
                                .issueYear(2024)
                                .verificationStatus("VERIFIED")
                                .build()
                ));
            }
            log.info("Mentor 1 (Abdusharipov Izzatbek) profili ko'nikma, tajriba va ta'lim ma'lumotlari bilan boyitildi.");
        });
    }

    private void seedOperationalLearningData() {
        log.info("Seeding operational learning data (Modules 08-11: Lessons, Assessments, Assignments, Grades)...");

        StudyGroup group8 = studyGroupRepository.findAll().stream()
                .filter(g -> "8-sinf".equalsIgnoreCase(g.getGradeLevel()) || g.getGroupCode().contains("YA-26I0804"))
                .findFirst()
                .orElse(null);

        Mentor mentor = mentorRepository.findAll().stream().findFirst().orElse(null);
        if (group8 == null || mentor == null) {
            log.warn("Cannot seed operational learning data: Group or Mentor not found.");
            return;
        }

        AcademicPeriod period = academicPeriodRepository.findAll().stream().findFirst().orElse(null);
        List<Student> students = studentRepository.findByGroupId(group8.getId());
        if (students.isEmpty()) {
            students = studentRepository.findAll();
        }

        // 1. Lessons
        Lesson lesson1 = lessonRepository.save(Lesson.builder()
                .title("Kompyuter arxitekturasi va apparat ta'minoti")
                .subject("Web Full-Stack Development")
                .gradeLevel("8-sinf")
                .topic("Fon Neyman arxitekturasi va zamonaviy CPU tuzilishi")
                .learningObjectives("Kompyuterning asosiy funksional qismlari, protsessor, xotira va ma'lumot shinasining o'zaro aloqasini tushunish.")
                .expectedOutcomes("O'quvchilar buyruqlar sikli (fetch-decode-execute) hamda registrlar va kesh iyerarxiyasini tushuntirib bera oladi.")
                .requiredMaterials("Protsessor sxemasi, mantiqiy elementlar simulyatori, slaydar.")
                .theoryContent("Fon Neyman arxitekturasining 4 ta asosiy tamoyili: xotira bir xilligi, manzillanuvchanlik, ketma-ket ijro va dasturiy boshqaruv.")
                .theoryDurationMinutes(20)
                .practicalContent("Simulyatorda oddiy assambler buyruqlari yordamida registrlarda qo'shish va ko'paytirish amallarini kuzatish.")
                .practicalDurationMinutes(25)
                .exercises("1. ALU va CU o'rtasidagi farqni yozing.\n2. 32-bit va 64-bit registrlar o'tkazuvchanligini solishtiring.")
                .homework("O'z shaxsiy kompyuteringiz yoki smartfoningizning apparat konfiguratsiyasini jadvalga tushiring.")
                .durationMinutes(80)
                .groupId(group8.getId())
                .mentorId(mentor.getId())
                .status("PUBLISHED")
                .build());

        Lesson lesson2 = lessonRepository.save(Lesson.builder()
                .title("HTML5 Semantik teglari va formalar")
                .subject("Web Full-Stack Development")
                .gradeLevel("8-sinf")
                .topic("Header, nav, main, section, footer va form elementlari")
                .theoryContent("Veb sahifaning semantik tuzilishi va qulay foydalanish (accessibility) tamoyillari.")
                .theoryDurationMinutes(20)
                .practicalContent("O'quv markazi uchun semantik ro'yxatdan o'tish formasini yaratish.")
                .practicalDurationMinutes(25)
                .exercises("Formada talab qilinadigan validatsiya qoidalarini yozing.")
                .homework("Shaxsiy veb-sayt uchun bosh sahifa semantik maketini tuzish.")
                .durationMinutes(80)
                .groupId(group8.getId())
                .mentorId(mentor.getId())
                .status("PUBLISHED")
                .build());

        Lesson lesson3 = lessonRepository.save(Lesson.builder()
                .title("CSS Flexbox bilan zamonaviy moslashuvchan maketlash")
                .subject("Web Full-Stack Development")
                .gradeLevel("8-sinf")
                .topic("Flex container, direction, justify-content, align-items")
                .theoryContent("Flexbox yordamida bir o'lchovli elementlarni boshqarish.")
                .theoryDurationMinutes(20)
                .practicalContent("Navigatsiya paneli va mahsulot kartalarini joylashtirish.")
                .practicalDurationMinutes(25)
                .durationMinutes(80)
                .groupId(group8.getId())
                .mentorId(mentor.getId())
                .status("PUBLISHED")
                .build());

        // 2. Student Lesson Progress
        for (Student s : students) {
            studentLessonProgressRepository.save(StudentLessonProgress.builder()
                    .lessonId(lesson1.getId())
                    .studentId(s.getId())
                    .status("COMPLETED")
                    .score(90)
                    .mentorFeedback("Nazariy va amaliy topshiriqlarni to'liq bajardi.")
                    .build());

            studentLessonProgressRepository.save(StudentLessonProgress.builder()
                    .lessonId(lesson2.getId())
                    .studentId(s.getId())
                    .status("COMPLETED")
                    .score(88)
                    .mentorFeedback("Semantik teglar to'g'ri ishlatilgan.")
                    .build());
        }

        // 3. Assessment
        Assessment quiz = assessmentRepository.save(Assessment.builder()
                .title("Kompyuter arxitekturasi va apparat ta'minoti oraliq nazorati")
                .description("8-sinf o'quvchilari uchun Von Neumann arxitekturasi, CPU va xotira bo'yicha oraliq test.")
                .subject("Web Full-Stack Development")
                .gradeLevel("8-sinf")
                .topic("Kompyuter arxitekturasi")
                .assessmentType("QUIZ")
                .totalPoints(100)
                .passingScore(60)
                .durationMinutes(45)
                .maxAttempts(1)
                .isPublished(true)
                .groupId(group8.getId())
                .createdByMentorId(mentor.getId())
                .build());

        assessmentQuestionRepository.save(AssessmentQuestion.builder()
                .assessmentId(quiz.getId())
                .questionText("Fon Neyman arxitekturasida barcha hisoblash va mantiqiy amallarni bajaruvchi asosiy qism qaysi?")
                .questionType("MULTIPLE_CHOICE")
                .points(30)
                .orderIndex(1)
                .optionsJson("[\"A) Arifmetik-mantiqiy qurilma (ALU)\", \"B) Qattiq disk (HDD)\", \"C) Tizim shinalari\", \"D) Kiritish qurilmalari\"]")
                .correctAnswersJson("[\"A) Arifmetik-mantiqiy qurilma (ALU)\"]")
                .explanation("ALU (Arithmetic Logic Unit) protsessor tarkibida bo'lib, matematik va mantiqiy amallarni bajaradi.")
                .build());

        assessmentQuestionRepository.save(AssessmentQuestion.builder()
                .assessmentId(quiz.getId())
                .questionText("Tezkor xotira (RAM) qanday asosiy xususiyatga ega?")
                .questionType("MULTIPLE_CHOICE")
                .points(35)
                .orderIndex(2)
                .optionsJson("[\"A) Elektr ta'minoti uzilganda ma'lumotlar o'chadi (volatillik)\", \"B) Faqat o'qish uchun mo'ljallangan\", \"C) Eng sekin xotira turi\", \"D) Magnit disklarda saqlanadi\"]")
                .correctAnswersJson("[\"A) Elektr ta'minoti uzilganda ma'lumotlar o'chadi (volatillik)\"]")
                .explanation("RAM operativ xotirasi elektr quvvati bor vaqtda ishlaydi va o'chganda tozalanadi.")
                .build());

        assessmentQuestionRepository.save(AssessmentQuestion.builder()
                .assessmentId(quiz.getId())
                .questionText("Buyruqlar siklining (Instruction Cycle) to'g'ri ketma-ketligi qaysi?")
                .questionType("MULTIPLE_CHOICE")
                .points(35)
                .orderIndex(3)
                .optionsJson("[\"A) Fetch (qabul qilish) -> Decode (dekodlash) -> Execute (bajarish)\", \"B) Execute -> Fetch -> Store\", \"C) Decode -> Execute -> Print\", \"D) Compile -> Link -> Run\"]")
                .correctAnswersJson("[\"A) Fetch (qabul qilish) -> Decode (dekodlash) -> Execute (bajarish)\"]")
                .explanation("Protsessor avval xotiradan buyruqni oladi (Fetch), uni tushunadi (Decode) va so'ngra ijro etadi (Execute).")
                .build());

        // Assessment Attempts
        int[] scores = {95, 90, 88, 82, 78, 85, 74, 92, 86};
        int sIdx = 0;
        for (Student s : students) {
            int score = scores[sIdx % scores.length];
            studentAssessmentAttemptRepository.save(StudentAssessmentAttempt.builder()
                    .assessmentId(quiz.getId())
                    .studentId(s.getId())
                    .attemptNumber(1)
                    .startedAt(LocalDateTime.now().minusDays(3))
                    .submittedAt(LocalDateTime.now().minusDays(3).plusMinutes(28))
                    .timeSpentSeconds(1680)
                    .totalScore(score)
                    .maxPossibleScore(100)
                    .percentage((double) score)
                    .status("EVALUATED")
                    .mentorFeedback("Yaxshi tahliliy bilim namoyon qilindi.")
                    .gradedByMentorId(mentor.getId())
                    .gradedAt(LocalDateTime.now().minusDays(3).plusMinutes(35))
                    .build());

            // Grade Records
            gradeRecordRepository.save(GradeRecord.builder()
                    .studentId(s.getId())
                    .subject("Web Full-Stack Development")
                    .gradeLevel("8-sinf")
                    .academicPeriodId(period != null ? period.getId() : null)
                    .evaluationType("QUIZ")
                    .score(score)
                    .maxScore(100)
                    .letterGrade(score >= 90 ? "A" : (score >= 80 ? "B" : (score >= 70 ? "C" : "D")))
                    .isPassing(score >= 60)
                    .comments("Oraliq test natijasi")
                    .mentorId(mentor.getId())
                    .build());

            sIdx++;
        }

        // 4. Assignment & Submissions
        Assignment assignment = assignmentRepository.save(Assignment.builder()
                .title("HTML & CSS: Shaxsiy portfolio veb-saytini tuzish")
                .description("Semantik teglar va Flexbox yordamida o'z portfoliosini yaratish hamda GitHub repository havolasini yuborish.")
                .subject("Web Full-Stack Development")
                .gradeLevel("8-sinf")
                .groupId(group8.getId())
                .mentorId(mentor.getId())
                .deadline(LocalDateTime.now().plusDays(6))
                .maxPoints(100)
                .isActive(true)
                .build());

        int aIdx = 0;
        for (Student s : students) {
            int aScore = (aIdx % 3 == 0) ? 95 : ((aIdx % 3 == 1) ? 88 : 82);
            assignmentSubmissionRepository.save(AssignmentSubmission.builder()
                    .assignmentId(assignment.getId())
                    .studentId(s.getId())
                    .submissionText("GitHub repository: https://github.com/student-" + s.getId() + "/portfolio")
                    .submittedAt(LocalDateTime.now().minusDays(2))
                    .status("GRADED")
                    .score(aScore)
                    .feedback("Kodni strukturalash va dizayn talabga javob beradi.")
                    .gradedByMentorId(mentor.getId())
                    .gradedAt(LocalDateTime.now().minusDays(1))
                    .build());
            aIdx++;
        }

        // 5. Past Lesson Sessions with attendance for trend analysis
        LocalDate pastWeek1 = LocalDate.now().minusWeeks(1);
        LessonSession pastSession1 = lessonSessionRepository.save(LessonSession.builder()
                .group(group8)
                .mentor(mentor)
                .room("IT Lab 1")
                .subject("Web Full-Stack Development")
                .topic("Kompyuter arxitekturasi va apparat ta'minoti")
                .lessonDate(pastWeek1)
                .startTime("15:00")
                .endTime("16:30")
                .status("COMPLETED")
                .build());

        for (Student s : students) {
            attendanceRecordRepository.save(AttendanceRecord.builder()
                    .lessonSession(pastSession1)
                    .student(s)
                    .status(s.getId() % 5 == 0 ? "EXCUSED" : (s.getId() % 6 == 0 ? "LATE" : "PRESENT"))
                    .recordedBy("admin")
                    .recordedAt(pastWeek1.atTime(16, 30))
                    .notes(s.getId() % 5 == 0 ? "Kasal bo'lganligi sababli ma'lumotnoma berilgan" : null)
                    .build());
        }

        LocalDate pastWeek2 = LocalDate.now().minusWeeks(2);
        LessonSession pastSession2 = lessonSessionRepository.save(LessonSession.builder()
                .group(group8)
                .mentor(mentor)
                .room("IT Lab 1")
                .subject("Web Full-Stack Development")
                .topic("HTML5 Semantik teglari va formalar")
                .lessonDate(pastWeek2)
                .startTime("15:00")
                .endTime("16:30")
                .status("COMPLETED")
                .build());

        for (Student s : students) {
            attendanceRecordRepository.save(AttendanceRecord.builder()
                    .lessonSession(pastSession2)
                    .student(s)
                    .status(s.getId() % 7 == 0 ? "ABSENT" : "PRESENT")
                    .recordedBy("admin")
                    .recordedAt(pastWeek2.atTime(16, 30))
                    .build());
        }

        log.info("Operational learning data seeding complete!");
    }

    private void seedRbacSystem() {
        // Permissions catalog
        Map<String, String> perms = new LinkedHashMap<>();
        // User & Role
        perms.put("users.read", "User Management: Foydalanuvchilar ro'yxatini ko'rish");
        perms.put("users.create", "User Management: Yangi foydalanuvchi yaratish");
        perms.put("users.update", "User Management: Foydalanuvchilarni tahrirlash");
        perms.put("users.disable", "User Management: Hisobni to'xtatish (suspend)");
        perms.put("roles.read", "RBAC: Rollar va ruxsatlarni ko'rish");
        perms.put("roles.assign", "RBAC: Rollarni foydalanuvchilarga biriktirish");
        perms.put("roles.manage", "RBAC: Rollar va ruxsatlar matritsasini tahrirlash");
        // Lessons & Scheduling
        perms.put("lessons.read", "Scheduling: Dars mashg'ulotlari va jadvalni ko'rish");
        perms.put("lessons.create", "Scheduling: Dars mashg'ulotini rejalashtirish");
        perms.put("lessons.update", "Scheduling: Darsni ko'chirish yoki tahrirlash");
        perms.put("lessons.delete", "Scheduling: Darsni bekor qilish yoki o'chirish");
        perms.put("lessons.publish", "Scheduling: Dars jadvalini e'lon qilish");
        // Attendance
        perms.put("attendance.read", "Attendance: Davomatni ko'rish");
        perms.put("attendance.record", "Attendance: Davomatni qayd etish");
        perms.put("attendance.edit", "Attendance: Davomatga tuzatish kiritish");
        // Assessments & Grading
        perms.put("assessments.read", "Assessments: Baholash mezonlari va topshiriqlarni ko'rish");
        perms.put("assessments.create", "Assessments: Baholash mezonlarini yaratish");
        perms.put("assessments.grade", "Assessments: Baholash va natijalarni kiritish");
        // Reports & Analytics
        perms.put("reports.read", "Reports: Hisobotlarni ko'rish");
        perms.put("reports.export", "Reports: Hisobotlarni PDF/Excel yuklab olish");
        perms.put("analytics.read", "Analytics: Platforma tahliliy ko'rsatkichlarini ko'rish");
        // Groups & Mentors & Materials & Curriculum
        perms.put("curriculum.read", "Curriculum: O'quv rejasini ko'rish");
        perms.put("curriculum.manage", "Curriculum: O'quv rejalarini boshqarish");
        perms.put("materials.read", "Materials: O'quv materiallarini ko'rish");
        perms.put("materials.manage", "Materials: O'quv materiallarini boshqarish");
        perms.put("groups.read", "Groups: Guruhlar va ta'lim tuzilmasini ko'rish");
        perms.put("groups.manage", "Groups: Guruhlar va ta'lim tuzilmasini boshqarish");
        perms.put("branches.read", "Branches: Filiallar va hududiy tuzilmani ko'rish");
        perms.put("branches.manage", "Branches: Filiallar va infratuzilmani boshqarish");
        perms.put("mentors.read", "Mentors: Mentor profillarini ko'rish");
        perms.put("mentors.manage", "Mentors: Mentor profillarini tasdiqlash va boshqarish");
        // System & Audit
        perms.put("audit.read", "Audit: Tizim audit jurnallarini ko'rish va eksport qilish");
        perms.put("system.configure", "System: Tizim sozlamalarini konfiguratsiya qilish");

        Map<String, Permission> savedPerms = new HashMap<>();
        for (Map.Entry<String, String> entry : perms.entrySet()) {
            String name = entry.getKey();
            String desc = entry.getValue();
            String category = name.split("\\.")[0].toUpperCase();

            Permission p = permissionRepository.findByName(name)
                    .orElseGet(() -> permissionRepository.save(Permission.builder()
                            .name(name)
                            .category(category)
                            .description(desc)
                            .build()));
            savedPerms.put(name, p);
        }

        // Roles catalog
        createRoleIfMissing("SUPER_ADMIN", "Tizimning to'liq cheklovlarsiz boshqaruvchisi", true, new HashSet<>(savedPerms.values()));
        createRoleIfMissing("ADMIN", "Tizim ma'muri (Legacy moslik)", true, new HashSet<>(savedPerms.values()));
        createRoleIfMissing("PROGRAM_ADMIN", "Ta'lim dasturi va jarayonlari koordinatori", true,
                getPermSet(savedPerms, "users.read", "users.create", "users.update", "roles.read", "lessons.read", "lessons.create", "lessons.update", "lessons.publish", "attendance.read", "attendance.record", "attendance.edit", "assessments.read", "assessments.create", "assessments.grade", "reports.read", "reports.export", "analytics.read", "curriculum.read", "curriculum.manage", "materials.read", "materials.manage", "groups.read", "groups.manage", "branches.read", "branches.manage", "mentors.read", "mentors.manage"));
        createRoleIfMissing("REGIONAL_COORDINATOR", "Hududiy filial va ta'lim markazlari koordinatori", true,
                getPermSet(savedPerms, "users.read", "groups.read", "groups.manage", "branches.read", "branches.manage", "reports.read", "reports.export", "analytics.read", "lessons.read", "lessons.create", "lessons.update", "attendance.read"));
        createRoleIfMissing("COORDINATOR", "Koordinator (Legacy moslik)", true,
                getPermSet(savedPerms, "users.read", "groups.read", "groups.manage", "branches.read", "branches.manage", "reports.read", "reports.export", "analytics.read", "lessons.read", "lessons.create", "lessons.update", "attendance.read"));
        createRoleIfMissing("MENTOR", "IT va fan mentori, dars va davomat o'tkazuvchi", true,
                getPermSet(savedPerms, "lessons.read", "lessons.create", "lessons.update", "attendance.read", "attendance.record", "attendance.edit", "assessments.read", "assessments.create", "assessments.grade", "materials.read", "materials.manage", "curriculum.read", "reports.read", "groups.read", "branches.read"));
        createRoleIfMissing("ENGLISH_MENTOR", "Ingliz tili fani mentori, dars va davomat o'tkazuvchi", true,
                getPermSet(savedPerms, "lessons.read", "lessons.create", "lessons.update", "attendance.read", "attendance.record", "attendance.edit", "assessments.read", "assessments.create", "assessments.grade", "materials.read", "materials.manage", "curriculum.read", "reports.read", "groups.read", "branches.read"));
        createRoleIfMissing("STUDENT", "Ta'lim oluvchi o'quvchi", true,
                getPermSet(savedPerms, "lessons.read", "materials.read", "curriculum.read", "assessments.read", "reports.read", "groups.read", "branches.read"));
        createRoleIfMissing("CONTENT_MANAGER", "O'quv rejalari va materiallar muharriri", true,
                getPermSet(savedPerms, "materials.read", "materials.manage", "curriculum.read", "curriculum.manage", "lessons.read", "lessons.create", "lessons.update", "lessons.publish", "branches.read"));
        createRoleIfMissing("OBSERVER", "Kuzatuvchi va tahlilchi", true,
                getPermSet(savedPerms, "reports.read", "analytics.read", "users.read", "roles.read", "lessons.read", "curriculum.read", "materials.read", "groups.read", "branches.read"));
    }

    private Set<Permission> getPermSet(Map<String, Permission> map, String... names) {
        Set<Permission> set = new HashSet<>();
        for (String n : names) {
            if (map.containsKey(n)) set.add(map.get(n));
        }
        return set;
    }

    private void createRoleIfMissing(String name, String description, boolean isSystem, Set<Permission> permissions) {
        Role role = roleRepository.findByName(name).orElse(null);
        if (role == null) {
            roleRepository.save(Role.builder()
                    .name(name)
                    .description(description)
                    .isSystem(isSystem)
                    .permissions(permissions)
                    .build());
        } else if (role.getPermissions() == null || role.getPermissions().isEmpty()) {
            role.setPermissions(permissions);
            roleRepository.save(role);
        }
    }

    private void seedDefaultAdmin() {
        if (superAdminBootstrapService.isBootstrapEnabled()) {
            superAdminBootstrapService.bootstrapInitialSuperAdmin();
            return;
        }

        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        Role superAdminRole = roleRepository.findByName("SUPER_ADMIN").orElse(null);

        // 1. Admin
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            if (isProd) {
                log.warn("[SECURITY] Running in production profile without active SUPER_ADMIN. Bootstrap is disabled (SUPER_ADMIN_BOOTSTRAP_ENABLED=false).");
                return;
            }
            Set<Role> roles = new HashSet<>();
            if (superAdminRole != null) roles.add(superAdminRole);

            userRepository.save(User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("admin123"))
                    .fullName("Tizim Administratori")
                    .email("admin@axm-nexus.uz")
                    .phone("+998 90 000 00 00")
                    .role("ROLE_SUPER_ADMIN")
                    .roles(roles)
                    .enabled(true)
                    .emailVerified(true)
                    .build());
            log.info("Default development admin user verified: admin (local/test only)");
        } else if (superAdminRole != null && (admin.getRoles() == null || admin.getRoles().isEmpty())) {
            admin.getRoles().add(superAdminRole);
            admin.setRole("ROLE_SUPER_ADMIN");
            userRepository.save(admin);
        }

        // Clean up legacy mock data accounts (mentor/student) if present
        userRepository.findByUsername("mentor").ifPresent(userRepository::delete);
        userRepository.findByUsername("student").ifPresent(userRepository::delete);
        userRepository.findByEmailIgnoreCase("mentor@axm-nexus.uz").ifPresent(userRepository::delete);
        userRepository.findByEmailIgnoreCase("student@axm-nexus.uz").ifPresent(userRepository::delete);

        Role mentorRole = roleRepository.findByName("MENTOR").orElse(null);
        Role studentRole = roleRepository.findByName("STUDENT").orElse(null);

        // 2. Real Mentor accounts with HEMIS ID (e.g. 32600001, 32600002)
        Set<Role> mentorRoles = new HashSet<>();
        if (mentorRole != null) mentorRoles.add(mentorRole);

        User mentor1 = userRepository.findByUsername("32600001")
                .or(() -> userRepository.findByEmailIgnoreCase("abdusharipovizzat03@gmail.com"))
                .orElse(null);

        if (mentor1 == null) {
            userRepository.save(User.builder()
                    .username("32600001")
                    .password(passwordEncoder.encode("AxmMentor2026!"))
                    .fullName("Abdusharipov Izzatbek quranboy o'g'li")
                    .email("abdusharipovizzat03@gmail.com")
                    .phone("+998 90 123 45 67")
                    .role("ROLE_MENTOR")
                    .roles(mentorRoles)
                    .enabled(true)
                    .emailVerified(true)
                    .build());
            log.info("Real Mentor user created with HEMIS ID: 32600001 / AxmMentor2026!");
        } else {
            mentor1.setUsername("32600001");
            mentor1.setEmail("abdusharipovizzat03@gmail.com");
            mentor1.setPassword(passwordEncoder.encode("AxmMentor2026!"));
            mentor1.setFullName("Abdusharipov Izzatbek quranboy o'g'li");
            mentor1.setRole("ROLE_MENTOR");
            mentor1.setRoles(mentorRoles);
            mentor1.setEnabled(true);
            mentor1.setEmailVerified(true);
            mentor1 = userRepository.save(mentor1);
            log.info("Existing Mentor user updated to HEMIS ID: 32600001");
        }
        User finalMentor1 = mentor1;
        mentorRepository.findByFullNameContainingIgnoreCase("Izzatbek").ifPresent(m -> {
            if (m.getUser() == null) {
                m.setUser(finalMentor1);
                mentorRepository.save(m);
            }
        });

        User mentor2 = userRepository.findByUsername("32600002")
                .or(() -> userRepository.findByEmailIgnoreCase("dilnoza.eng@gmail.com"))
                .orElse(null);

        if (mentor2 == null) {
            userRepository.save(User.builder()
                    .username("32600002")
                    .password(passwordEncoder.encode("AxmEnglish2026!"))
                    .fullName("Raximova Dilnoza Sanjarbek qizi")
                    .email("dilnoza.eng@gmail.com")
                    .phone("+998 91 987 65 43")
                    .role("ROLE_ENGLISH_MENTOR")
                    .roles(mentorRoles)
                    .enabled(true)
                    .emailVerified(true)
                    .build());
            log.info("Real English Mentor user created with HEMIS ID: 32600002 / AxmEnglish2026!");
        } else {
            mentor2.setUsername("32600002");
            mentor2.setEmail("dilnoza.eng@gmail.com");
            mentor2.setPassword(passwordEncoder.encode("AxmEnglish2026!"));
            mentor2.setFullName("Raximova Dilnoza Sanjarbek qizi");
            mentor2.setRole("ROLE_ENGLISH_MENTOR");
            mentor2.setRoles(mentorRoles);
            mentor2.setEnabled(true);
            mentor2.setEmailVerified(true);
            mentor2 = userRepository.save(mentor2);
            log.info("Existing English Mentor user updated to HEMIS ID: 32600002");
        }
        User finalMentor2 = mentor2;
        mentorRepository.findByFullNameContainingIgnoreCase("Dilnoza").ifPresent(m -> {
            if (m.getUser() == null) {
                m.setUser(finalMentor2);
                mentorRepository.save(m);
            }
        });

        // 3. Real Student accounts with HEMIS ID (42600001+)
        List<Student> allStudents = studentRepository.findAll();
        int seq = 1;
        for (Student s : allStudents) {
            String studentHemisId = String.format("426%05d", seq);
            if (s.getStudentIdNumber() == null || s.getStudentIdNumber().startsWith("I-HR")) {
                s.setStudentIdNumber(studentHemisId);
                studentRepository.save(s);
            } else {
                studentHemisId = s.getStudentIdNumber();
            }

            final String hemisIdToSearch = studentHemisId;
            User studentUser = userRepository.findByUsername(hemisIdToSearch)
                    .or(() -> userRepository.findByEmailIgnoreCase(hemisIdToSearch + "@student.axm-nexus.uz"))
                    .orElse(null);

            Set<Role> roles = new HashSet<>();
            if (studentRole != null) roles.add(studentRole);

            if (studentUser == null) {
                userRepository.save(User.builder()
                        .username(hemisIdToSearch)
                        .password(passwordEncoder.encode("Student2026!"))
                        .fullName(s.getFullName())
                        .phone(s.getPhone())
                        .email(hemisIdToSearch + "@student.axm-nexus.uz")
                        .role("ROLE_STUDENT")
                        .roles(roles)
                        .enabled(true)
                        .emailVerified(true)
                        .build());
            } else {
                studentUser.setUsername(hemisIdToSearch);
                studentUser.setFullName(s.getFullName());
                studentUser.setRoles(roles);
                studentUser.setEnabled(true);
                studentUser.setEmailVerified(true);
                userRepository.save(studentUser);
            }
            User finalStudentUser = studentUser;
            if (finalStudentUser != null && s.getUser() == null) {
                s.setUser(finalStudentUser);
                studentRepository.save(s);
            }
            seq++;
        }
    }

    private void seedModule14To16Data() {
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) return;

        // 1. Foydalanuvchi sozlamalari (Modul 15)
        if (userPreferenceRepository.findByUserId(admin.getId()).isEmpty()) {
            userPreferenceRepository.save(uz.axm.nexus.users.domain.UserPreference.builder()
                    .userId(admin.getId())
                    .locale("uz")
                    .theme("system")
                    .reducedMotion(false)
                    .dateFormat("YYYY-MM-DD")
                    .build());
        }

        // 2. Bildirishnoma sozlamalari (Modul 14)
        if (notificationPreferenceRepository.findByUserId(admin.getId()).isEmpty()) {
            notificationPreferenceRepository.save(uz.axm.nexus.notifications.domain.NotificationPreference.builder()
                    .userId(admin.getId())
                    .inAppEnabled(true)
                    .emailEnabled(true)
                    .lessonAlerts(true)
                    .assignmentAlerts(true)
                    .assessmentAlerts(true)
                    .announcementAlerts(true)
                    .digestFrequency("INSTANT")
                    .build());
        }

        // 3. Namunaviy bildirishnomalar (Modul 14)
        if (notificationRepository.count() == 0) {
            notificationRepository.save(uz.axm.nexus.notifications.domain.Notification.builder()
                    .recipientUserId(admin.getId())
                    .title("AXM Nexus v2.0 tizimiga xush kelibsiz!")
                    .message("Muhammad Al-Xorazmiy Vorislari ta'lim ekotizimi boshqaruv markaziga muvaffaqiyatli ulandingiz.")
                    .type(uz.axm.nexus.notifications.domain.NotificationType.ADMIN_ANNOUNCEMENT.name())
                    .read(false)
                    .actionUrl("/dashboard")
                    .deduplicationKey("WELCOME_SYSTEM_" + admin.getId())
                    .build());

            notificationRepository.save(uz.axm.nexus.notifications.domain.Notification.builder()
                    .recipientUserId(admin.getId())
                    .title("Yangi dars rejasi tasdiqlandi")
                    .message("9-sinf informatika fani bo'yicha «Algoritmlar murakkabligi» darsi tasdiqlash uchun tayyor.")
                    .type(uz.axm.nexus.notifications.domain.NotificationType.LESSON_PUBLISHED.name())
                    .read(false)
                    .actionUrl("/lessons")
                    .deduplicationKey("LESSON_PUB_SAMPLE_" + admin.getId())
                    .build());

            notificationRepository.save(uz.axm.nexus.notifications.domain.Notification.builder()
                    .recipientUserId(admin.getId())
                    .title("Topshiriq muddati yaqinlashmoqda")
                    .message("Guruh 9-A o'quvchilari uchun Python dasturlash amaliy topshirig'i topshirish muddati: bugun 23:59.")
                    .type(uz.axm.nexus.notifications.domain.NotificationType.ASSIGNMENT_DEADLINE.name())
                    .read(true)
                    .readAt(LocalDateTime.now().minusHours(3))
                    .actionUrl("/assessments")
                    .deduplicationKey("ASSIGN_DEADLINE_SAMPLE_" + admin.getId())
                    .build());
        }

        // 4. Namunaviy audit yozuvlari (Modul 16)
        if (auditLogRepository.count() == 0) {
            auditLogRepository.save(uz.axm.nexus.audit.domain.AuditLog.builder()
                    .action("ROLE_ASSIGN")
                    .entityName("User")
                    .entityId(String.valueOf(admin.getId()))
                    .performedBy("SYSTEM")
                    .outcome("SUCCESS")
                    .ipAddress("127.0.0.1")
                    .details("Admin foydalanuvchisiga SUPER_ADMIN roli biriktirildi")
                    .metadata("{\"role\":\"ROLE_SUPER_ADMIN\"}")
                    .build());

            auditLogRepository.save(uz.axm.nexus.audit.domain.AuditLog.builder()
                    .action("CONFIG_UPDATE")
                    .entityName("SystemConfig")
                    .entityId("platform.registration_open")
                    .performedBy("admin")
                    .outcome("SUCCESS")
                    .ipAddress("127.0.0.1")
                    .details("Foydalanuvchilar ochiq ro'yxatdan o'tishi parametrlari tasdiqlandi")
                    .metadata("{\"value\":\"true\"}")
                    .build());
        }

        // 5. Tizim konfiguratsiyalari (Modul 16)
        if (systemConfigRepository.count() == 0) {
            systemConfigRepository.save(uz.axm.nexus.audit.domain.SystemConfig.builder()
                    .configKey("platform.maintenance_mode")
                    .configValue("false")
                    .category("GENERAL")
                    .secret(false)
                    .description("Tizimda profilaktika rejimi yoqilganligi")
                    .updatedBy("SYSTEM")
                    .build());

            systemConfigRepository.save(uz.axm.nexus.audit.domain.SystemConfig.builder()
                    .configKey("features.ai_assistant")
                    .configValue("true")
                    .category("FEATURES")
                    .secret(false)
                    .description("AI Teaching Assistant moduli faolligi")
                    .updatedBy("SYSTEM")
                    .build());

            systemConfigRepository.save(uz.axm.nexus.audit.domain.SystemConfig.builder()
                    .configKey("features.email_notifications")
                    .configValue("true")
                    .category("NOTIFICATIONS")
                    .secret(false)
                    .description("Email bildirishnomalar yuborish holati")
                    .updatedBy("SYSTEM")
                    .build());

            systemConfigRepository.save(uz.axm.nexus.audit.domain.SystemConfig.builder()
                    .configKey("enrollment.max_group_capacity")
                    .configValue("24")
                    .category("GENERAL")
                    .secret(false)
                    .description("O'quv guruhidagi maksimal o'quvchilar soni")
                    .updatedBy("SYSTEM")
                    .build());
        }
    }

    private void seedRealAssessmentsAndGamificationData() {
        log.info("Seeding Real Assessments, Daily Streaks, and Gamification Data...");

        Mentor mentor = mentorRepository.findAll().stream().findFirst().orElse(null);
        StudyGroup group = studyGroupRepository.findAll().stream().findFirst().orElse(null);
        List<Student> students = studentRepository.findAll();

        if (mentor == null || students.isEmpty()) {
            return;
        }

        Long mentorId = mentor.getId();
        Long groupId = group != null ? group.getId() : null;

        // =========================================================================
        // 1. REAL ASSESSMENTS (Haqiqiy testlar to'plami)
        // =========================================================================
        boolean jsQuizExists = assessmentRepository.findAll().stream()
                .anyMatch(a -> a.getTitle().contains("JavaScript Asoslari va DOM Manipulation"));

        if (!jsQuizExists) {
            // Assessment 1: 8-sinf JavaScript Asoslari va DOM Manipulation
            Assessment jsAssessment = assessmentRepository.save(Assessment.builder()
                    .title("JavaScript Asoslari va DOM Manipulation Nazorati")
                    .description("8-sinf o'quvchilari uchun zamonaviy JavaScript (ES6+), DOM elementlarini boshqarish va hodisalar bo'yicha real amaliy test.")
                    .subject("Web Full-Stack Development")
                    .gradeLevel("8-sinf")
                    .topic("JavaScript & DOM API")
                    .assessmentType("QUIZ")
                    .totalPoints(100)
                    .passingScore(60)
                    .durationMinutes(30)
                    .maxAttempts(2)
                    .randomizeQuestions(true)
                    .showCorrectAnswers(true)
                    .isPublished(true)
                    .groupId(groupId)
                    .createdByMentorId(mentorId)
                    .build());

            List<AssessmentQuestion> jsQuestions = List.of(
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("Qaysi kalit so'z bilan e'lon qilingan o'zgaruvchiga qayta qiymat biriktirishga (reassign) yo'l qo'yilmaydi va block-scope ga ega?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(1)
                            .optionsJson("[\"var\", \"let\", \"const\", \"static\"]")
                            .correctAnswersJson("2")
                            .explanation("const kalit so'zi o'zgarmas identifikator yaratadi va faqat o'zi e'lon qilingan blok doirasida amal qiladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("const add = (a, b) => a + b; ifodasida natija qaytarish (return) qanday amalga oshiriladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(2)
                            .optionsJson("[\"return so'zi majburiy, aks holda undefined qaytadi\", \"Bitta ifoda figurali qavssiz yozilganda natija avtomatik qaytariladi (implicit return)\", \"Natijani console.log orqali chiqarish lozim\", \"Funksiya qiymat qaytara olmaydi\"]")
                            .correctAnswersJson("1")
                            .explanation("Arrow funksiyada figurali qavslar `{}` ishlatilmasa, yagona ifoda qiymati avtomatik ravishda qaytariladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("HTML dagi <button class=\"submit-btn\">Yuborish</button> elementini JavaScript da tanlab olish uchun qaysi metod eng zamonaviy va to'g'ri?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(3)
                            .optionsJson("[\"document.getElementById('submit-btn')\", \"document.querySelector('.submit-btn')\", \"document.find('.submit-btn')\", \"document.getElementsByName('submit-btn')\"]")
                            .correctAnswersJson("1")
                            .explanation("document.querySelector CSS selektorlari (masalan sinf uchun . belgisi) orqali yagona elementni topish uchun standart zamonaviy metoddir.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("Tugma bosilganda yoki forma yuborilganda sahifaning yangilanib ketishini to'xtatish uchun hodisa (event) obyektining qaysi metodi chaqiriladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(4)
                            .optionsJson("[\"event.stopPropagation()\", \"event.preventDefault()\", \"event.cancel()\", \"event.freeze()\"]")
                            .correctAnswersJson("1")
                            .explanation("event.preventDefault() brauzerning standart harakatini (masalan, formaning sahifani qayta yuklashini) bekor qiladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("[1, 2, 3].map(x => x * 2) ifodasining natijasi qanday bo'ladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(5)
                            .optionsJson("[\"[2, 4, 6]\", \"[1, 2, 3]\", \"6\", \"undefined\"]")
                            .correctAnswersJson("0")
                            .explanation("map metodi massivning har bir elementiga berilgan funksiyani qo'llab, yangi massiv hosil qiladi: [2, 4, 6].")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("[10, 15, 20, 25].filter(n => n > 18) amali natijasida qaysi elementlar qoladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(6)
                            .optionsJson("[\"[10, 15]\", \"[20, 25]\", \"[15, 20, 25]\", \"25\"]")
                            .correctAnswersJson("1")
                            .explanation("filter metodi shartga mos kelgan (18 dan katta) elementlardan iborat yangi massiv qaytaradi: [20, 25].")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("JavaScript da asinxron operatsiya natijasini kutish uchun await kalit so'zi qayerda ishlatilishi shart?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(7)
                            .optionsJson("[\"Ixtiyoriy funksiya ichida\", \"Faqat async kalit so'zi bilan e'lon qilingan funksiya ichida\", \"Faqat loop (for/while) sikllari ichida\", \"Faqat try-catch blokida\"]")
                            .correctAnswersJson("1")
                            .explanation("await faqat async funksiyalar tanasida asinxron Promiselarni to'xtatib kutish uchun ishlatiladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("Serverdan kelgan JSON formatidagi matnni JavaScript obyektiga aylantirish uchun qaysi metod ishlatiladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(8)
                            .optionsJson("[\"JSON.stringify()\", \"JSON.parse()\", \"JSON.toObject()\", \"JSON.convert()\"]")
                            .correctAnswersJson("1")
                            .explanation("JSON.parse() JSON matnini JavaScript ma'lumotlar tuzilmasiga o'giradi. JSON.stringify() esa aksincha obyektni matnga aylantiradi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("5 === '5' ifodasi qanday natija beradi va nima sababdan?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(9)
                            .optionsJson("[\"true, chunki qiymatlari bir xil\", \"false, chunki qattiq tenglik (===) turlarni taqqoslaydi va number stringga teng emas\", \"undefined, chunki taqqoslash noto'g'ri\", \"Xatolik yuz beradi\"]")
                            .correctAnswersJson("1")
                            .explanation("=== operatori turlarni avtomatik o'zgartirmaydi (type coercion yo'q). 5 (number) va '5' (string) tur jihatidan farq qiladi, shuning uchun false.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(jsAssessment.getId())
                            .questionText("Foydalanuvchi ma'lumotini brauzerning LocalStorage xotirasiga saqlash uchun qaysi buyruq to'g'ri?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(10)
                            .optionsJson("[\"localStorage.save('name', 'Ali')\", \"localStorage.setItem('name', 'Ali')\", \"localStorage.add('name', 'Ali')\", \"localStorage.write('name', 'Ali')\"]")
                            .correctAnswersJson("1")
                            .explanation("Web Storage API da ma'lumot saqlash uchun setItem(key, value) metodi qo'llaniladi.")
                            .build()
            );
            assessmentQuestionRepository.saveAll(jsQuestions);

            // Assessment 2: 8-sinf HTML5 Semantik Veb va Moslashuvchan CSS Flexbox/Grid
            Assessment htmlCssAssessment = assessmentRepository.save(Assessment.builder()
                    .title("HTML5 Semantik Veb va Moslashuvchan CSS Flexbox/Grid")
                    .description("8-sinf o'quvchilari uchun veb sahifa tuzilishi, semantik teglar, zamonaviy CSS Flexbox va CSS Grid maketlash bilimlari testi.")
                    .subject("Web Full-Stack Development")
                    .gradeLevel("8-sinf")
                    .topic("HTML5 & Responsive CSS")
                    .assessmentType("QUIZ")
                    .totalPoints(100)
                    .passingScore(60)
                    .durationMinutes(25)
                    .maxAttempts(2)
                    .randomizeQuestions(true)
                    .showCorrectAnswers(true)
                    .isPublished(true)
                    .groupId(groupId)
                    .createdByMentorId(mentorId)
                    .build());

            List<AssessmentQuestion> htmlQuestions = List.of(
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("Veb sahifaning asosiy, unikal mazmunini ifodalovchi yagona semantik teg qaysi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(1)
                            .optionsJson("[\"<section>\", \"<article>\", \"<main>\", \"<div>\"]")
                            .correctAnswersJson("2")
                            .explanation("<main> tegi sahifaning bosh mazmunini o'rab turadi va har bir sahifada faqat bir marta ishlatilishi tavsiya etiladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("Yangi oynada ochiluvchi <a target=\"_blank\"> havolalarida xavfsizlik va xotira sizib chiqishini oldini olish uchun qaysi atribut qo'shiladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(2)
                            .optionsJson("[\"rel=\\\"noopener noreferrer\\\"\", \"secure=\\\"true\\\"\", \"crossorigin=\\\"anonymous\\\"\", \"type=\\\"external\\\"\"]")
                            .correctAnswersJson("0")
                            .explanation("rel=\"noopener noreferrer\" yangi ochilgan sahifaning window.opener obyektiga kirishini to'sib, xavfsizlikni kafolatlaydi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("Foydalanuvchi maydonni to'ldirmasdan formani yubora olmasligi uchun input ga qaysi atribut yoziladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(3)
                            .optionsJson("[\"validate\", \"required\", \"disabled\", \"important\"]")
                            .correctAnswersJson("1")
                            .explanation("required atributi brauzer darajasida bo'sh qoldirilgan maydonlar yuborilishini to'xtatadi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("<img> tegida rasm yuklanmay qolganda va ko'zi ojizlar dasturlari (screen reader) uchun qaysi atribut majburiydir?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(4)
                            .optionsJson("[\"title\", \"alt\", \"caption\", \"description\"]")
                            .correctAnswersJson("1")
                            .explanation("alt (alternative text) atributi veb qulaylik (Accessibility) va SEO talablariga ko'ra rasmni tavsiflaydi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("Flex container ichidagi elementlarni ham gorizontal, ham vertikal to'liq markazga keltirish uchun qaysi CSS kombinatsiyasi to'g'ri?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(5)
                            .optionsJson("[\"display: flex; justify-content: center; align-items: center;\", \"display: flex; text-align: center; margin: auto;\", \"display: flex; float: center; vertical-align: middle;\", \"display: flex; content-align: center;\"]")
                            .correctAnswersJson("0")
                            .explanation("justify-content asosiy o'q (main axis) bo'yicha, align-items esa kesishuvchi o'q (cross axis) bo'yicha markazlashtiradi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("flex-direction: column berilganda elementlar qanday tartibda joylashadi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(6)
                            .optionsJson("[\"Gorizontal chapdan o'ngga\", \"Vertikal yuqoridan pastga\", \"Gorizontal o'ngdan chapga\", \"To'r (grid) shaklida\"]")
                            .correctAnswersJson("1")
                            .explanation("flex-direction: column asosiy o'qni vertikal holatga keltiradi va elementlar ustun shaklida teriladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("CSS Grid da grid-template-columns: repeat(3, 1fr); qoidasi nima ma'noni anglatadi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(7)
                            .optionsJson("[\"3 qator yaratadi\", \"3 ta teng o'lchamli ustun yaratadi\", \"Elementlarni 3 pikselga suradi\", \"3 ta qavat (layer) hosil qiladi\"]")
                            .correctAnswersJson("1")
                            .explanation("repeat(3, 1fr) mavjud bo'sh joyni 3 ta teng fraksiyaga (1fr) ajratib, 3 ta ustun hosil qiladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("box-sizing: border-box qoidasining asosiy qulayligi nimada?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(8)
                            .optionsJson("[\"Element chegarasini yo'qotadi\", \"Padding va border berilgan width/height o'lchamining ichiga kiritiladi\", \"Elementni avtomatik markazga suradi\", \"Shrift o'lchamini kattalashtiradi\"]")
                            .correctAnswersJson("1")
                            .explanation("border-box bilan elementga padding yoki border qo'shganda umumiy kenglik o'zgarmaydi va dizayn buzilmaydi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("Kengligi 768px gacha bo'lgan mobil qurilmalar uchun moslashuvchan uslub yozishda media query qanday boshlanadi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(9)
                            .optionsJson("[\"@media (min-width: 768px)\", \"@media (max-width: 768px)\", \"@screen 768px\", \"@responsive mobile\"]")
                            .correctAnswersJson("1")
                            .explanation("max-width: 768px ekranning maksimal eni 768px gacha bo'lgan qurilmalar (smartfon va kichik planshetlar) uchun qoidalarni belgilaydi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(htmlCssAssessment.getId())
                            .questionText("CSS Custom Properties (O'zgaruvchilar) ni :root da e'lon qilish va elementda ishlatish sintaksisi qaysi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(10)
                            .optionsJson("[\":root { --brand-color: #3b82f6; } va color: var(--brand-color);\", \":root { $brand-color: #3b82f6; } va color: $brand-color;\", \":root { @brand-color: #3b82f6; } va color: @brand-color;\", \":root { brand-color = #3b82f6; } va color: get(brand-color);\"]")
                            .correctAnswersJson("0")
                            .explanation("Standart CSS o'zgaruvchilari ikkita chiziqcha `--` bilan nomlanadi va var(--nomi) orqali chaqiriladi.")
                            .build()
            );
            assessmentQuestionRepository.saveAll(htmlQuestions);

            // Assessment 3: 9-sinf Python Dasturlash va Algoritmik Fikrlash Asoslari
            Assessment pythonAssessment = assessmentRepository.save(Assessment.builder()
                    .title("Python Dasturlash va Algoritmik Fikrlash Asoslari")
                    .description("9-sinf o'quvchilari uchun Python ma'lumot tuzilmalari, funksiyalar, Big-O murakkabligi va saralash algoritmlari bo'yicha mustahkamlovchi test.")
                    .subject("Computer Science & Python")
                    .gradeLevel("9-sinf")
                    .topic("Data Structures & Algorithms")
                    .assessmentType("QUIZ")
                    .totalPoints(100)
                    .passingScore(60)
                    .durationMinutes(35)
                    .maxAttempts(2)
                    .randomizeQuestions(true)
                    .showCorrectAnswers(true)
                    .isPublished(true)
                    .groupId(groupId)
                    .createdByMentorId(mentorId)
                    .build());

            List<AssessmentQuestion> pyQuestions = List.of(
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("Python dasturlash tilida list va tuple tuzilmalarining asosiy tub farqi nimada?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(1)
                            .optionsJson("[\"List faqat raqam saqlaydi, tuple matn saqlaydi\", \"List elementlarini o'zgartirish mumkin (mutable), tuple esa o'zgarmasdir (immutable)\", \"Tuple tezroq qidiradi, lekin xotiradan ko'proq joy oladi\", \"Hech qanday farqi yo'q\"]")
                            .correctAnswersJson("1")
                            .explanation("List o'zgaruvchan (mutable) bo'lib, unga append/remove qilish mumkin. Tuple esa yaratilgach elementlari o'zgarmaydi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("user = {'name': 'Aziz', 'age': 15} lug'atidan mavjud bo'lmagan kalitni (masalan 'city') xatoliksiz xavfsiz olish uchun qaysi metod ishlatiladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(2)
                            .optionsJson("[\"user['city']\", \"user.get('city', 'Noma\\'lum')\", \"user.find('city')\", \"user.fetch('city')\"]")
                            .correctAnswersJson("1")
                            .explanation("user['city'] KeyError chiqaradi. user.get('city', default) esa xatolik chiqarmasdan ikkinchi parametrni qaytaradi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("[x**2 for x in range(5) if x % 2 == 0] ro'yxat ifodasining (list comprehension) natijasi nima bo'ladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(3)
                            .optionsJson("[\"[0, 4, 16]\", \"[1, 9]\", \"[0, 1, 4, 9, 16]\", \"[4, 16]\"]")
                            .correctAnswersJson("0")
                            .explanation("range(5) dan 0, 1, 2, 3, 4 olinadi. Juftlari: 0, 2, 4. Ularning kvadrati: 0**2=0, 2**2=4, 4**2=16 -> [0, 4, 16].")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("Saralangan (sorted) massivdan elementni qidirishda Ikkilik qidiruv (Binary Search) algoritmining vaqt murakkabligi qanday?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(4)
                            .optionsJson("[\"O(n)\", \"O(log n)\", \"O(n^2)\", \"O(1)\"]")
                            .correctAnswersJson("1")
                            .explanation("Binary Search har bir qadamda qidiruv sohasini 2 barobar qisqartiradi, shuning uchun uning murakkabligi logarifmik O(log n) ga teng.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("Python funksiyasida ixtiyoriy sondagi nomlangan argumentlarni (keyword arguments) qabul qilish uchun nima yoziladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(5)
                            .optionsJson("[\"*args\", \"**kwargs\", \"&params\", \"...options\"]")
                            .correctAnswersJson("1")
                            .explanation("**kwargs nomlangan argumentlarni lug'at (dictionary) sifatida funksiyaga uzatish imkonini beradi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("set([1, 2, 2, 3, 3, 3]) to'plamida qanday elementlar saqlanib qoladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(6)
                            .optionsJson("[\"{1, 2, 2, 3, 3, 3}\", \"{1, 2, 3}\", \"[1, 2, 3]\", \"{6}\"]")
                            .correctAnswersJson("1")
                            .explanation("Python set to'plami faqat unikal elementlarni saqlaydi, barcha dublikatlar avtomatik tozalanadi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("Rekursiv funksiyada cheksiz sikl va xotira to'lib ketishining (RecursionError) oldini olish uchun nima bo'lishi shart?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(7)
                            .optionsJson("[\"Global o'zgaruvchi\", \"Asosiy to'xtash sharti (Base case)\", \"While sikli\", \"Try-except bloki\"]")
                            .correctAnswersJson("1")
                            .explanation("Har qanday rekursiv funksiyada o'zini chaqirishni to'xtatuvchi asosiy shart (Base case) bo'lishi majburiy.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("try...except...finally konstruksiyasida finally bloki qachon ishga tushadi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(8)
                            .optionsJson("[\"Faqat xatolik yuz berganda\", \"Faqat xatolik yuz bermaganda\", \"Xatolik yuz berish yoki bermasligidan qat'i nazar har doim\", \"Hech qachon bajarilmaydi\"]")
                            .correctAnswersJson("2")
                            .explanation("finally bloki resurslarni tozalash yoki faylni yopish uchun har qanday holatda ham (xato bo'lsa ham, bo'lmasa ham) ishlaydi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("with open('hisobot.txt', 'r') as f: kontekst menejerining asosiy afzalligi nimada?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(9)
                            .optionsJson("[\"Faylni tezroq o'qiydi\", \"Fayl bilan ishlash tugagach, uni avtomatik xavfsiz yopadi (f.close)\", \"Faylni shifrlaydi\", \"Faylni avtomatik o'chiradi\"]")
                            .correctAnswersJson("1")
                            .explanation("with operatori kontekst menejeri bo'lib, blok yakunlanganda yoki istisno yuz berganda f.close() ni avtomatik chaqiradi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(pythonAssessment.getId())
                            .questionText("Ikki massivni solishtiradigan Bubble Sort algoritmining o'rtacha va eng yomon holatdagi vaqt murakkabligi qanday?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(10)
                            .optionsJson("[\"O(1)\", \"O(log n)\", \"O(n)\", \"O(n^2)\"]")
                            .correctAnswersJson("3")
                            .explanation("Bubble Sort ichma-ich ikkita sikl orqali barcha juftliklarni taqqoslagani uchun uning murakkabligi O(n^2) kvadratik bo'ladi.")
                            .build()
            );
            assessmentQuestionRepository.saveAll(pyQuestions);

            // Assessment 4: 10-sinf Backend Arxitekturasi, REST API va SQL Ma'lumotlar Bazasi
            Assessment backendAssessment = assessmentRepository.save(Assessment.builder()
                    .title("Full-Stack Backend, REST API va SQL Ma'lumotlar Bazasi")
                    .description("10-sinf va yuqori bosqich o'quvchilari uchun HTTP protokoli, REST tamoyillari, SQL so'rovlari va ma'lumotlar xavfsizligi bo'yicha oraliq nazorat.")
                    .subject("Backend & Database Engineering")
                    .gradeLevel("10-sinf")
                    .topic("REST API & Databases")
                    .assessmentType("EXAM")
                    .totalPoints(100)
                    .passingScore(60)
                    .durationMinutes(35)
                    .maxAttempts(2)
                    .randomizeQuestions(true)
                    .showCorrectAnswers(true)
                    .isPublished(true)
                    .groupId(groupId)
                    .createdByMentorId(mentorId)
                    .build());

            List<AssessmentQuestion> backendQuestions = List.of(
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("Quyidagi HTTP metodlaridan qaysi biri idempotent EMAS (bir xil so'rov takror yuborilganda serverda yangi ma'lumot hosil qiladi)?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(1)
                            .optionsJson("[\"GET\", \"PUT\", \"DELETE\", \"POST\"]")
                            .correctAnswersJson("3")
                            .explanation("GET, PUT va DELETE bir necha marta bajarilsa ham yakuniy holat bir xil bo'ladi (idempotent). POST esa yangi resurs yaratadi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("Yangi foydalanuvchi yoki resurs serverda muvaffaqiyatli yaratilganda qaysi HTTP status kodi qaytariladi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(2)
                            .optionsJson("[\"200 OK\", \"201 Created\", \"204 No Content\", \"301 Moved\"]")
                            .correctAnswersJson("1")
                            .explanation("201 Created yangi resurs muvaffaqiyatli barpo etilganini bildiradi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("RESTful konvensiyasi bo'yicha ID si 10 bo'lgan o'quvchining baholarini olish uchun eng to'g'ri URI manzili qaysi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(3)
                            .optionsJson("[\"GET /getStudentGrades?id=10\", \"GET /api/v1/students/10/grades\", \"POST /api/v1/fetch/grades/10\", \"GET /api/v1/grades_for_student_10\"]")
                            .correctAnswersJson("1")
                            .explanation("REST resurslar iyerarxiyasiga asoslanadi: /students/{id}/grades eng toza va tavsiya etilgan standartdir.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("SQL da INNER JOIN va LEFT JOIN o'rtasidagi asosiy farq nimada?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(4)
                            .optionsJson("[\"INNER JOIN tezroq, boshqa farqi yo'q\", \"INNER JOIN faqat ikkala jadvalda ham mos kelgan qatorlarni oladi, LEFT JOIN esa chap jadvalning barcha qatorlarini saqlaydi\", \"LEFT JOIN faqat NULL qiymatlarni oladi\", \"Farqi yo'q\"]")
                            .correctAnswersJson("1")
                            .explanation("LEFT JOIN chap tomondagi barcha yozuvlarni olib chiqadi, hatto o'ng jadvalda moslik bo'lmasa ham (NULL qilib).")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("Tranzaksiyalarning ACID tamoyillarida A (Atomicity) nimani kafolatlaydi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(5)
                            .optionsJson("[\"Tranzaksiya ichidagi barcha operatsiyalar yo to'liq bajariladi, yoki birontasi ham saqlanmay bekor qilinadi (all or nothing)\", \"Tranzaksiya ma'lumotlarni shifrlaydi\", \"Bir vaqtda faqat bitta foydalanuvchi ulanadi\", \"Tezkor xotirada bajariladi\"]")
                            .correctAnswersJson("0")
                            .explanation("Atomlilik barcha qadamlar muvaffaqiyatli bo'lsa tasdiqlanishini (commit), xatolik bo'lsa avvalgi holatga qaytishini (rollback) ta'minlaydi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("Ma'lumotlar bazasi jadvali ustuniga Indeks (Index) qo'yishning asosiy ta'siri qanday?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(6)
                            .optionsJson("[\"Qidiruvni (SELECT) keskin tezlashtiradi, ammo yozish (INSERT/UPDATE) vaqtini biroz sekinlashtiradi\", \"Bazada joyni kamaytiradi\", \"SELECT ni sekinlashtiradi\", \"Xavfsizlikni kuchaytiradi\"]")
                            .correctAnswersJson("0")
                            .explanation("Indeks B-Tree tuzilmasi orqali qidiruvni O(1) yoki O(log n) ga tezlashtiradi, biroq har bir yozishda indeks yangilanishi sababli yozish tezligi ozroq tushadi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("JWT (JSON Web Token) qanday uchta asosiy qismdan nuqta bilan ajratilgan holda tashkil topgan?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(7)
                            .optionsJson("[\"Header, Body, Footer\", \"Header, Payload, Signature\", \"Prefix, Token, Suffix\", \"Public, Private, Secret\"]")
                            .correctAnswersJson("1")
                            .explanation("JWT uch qismdan iborat: Header (algoritm), Payload (claims/ma'lumot), Signature (raqamli imzo).")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("SQL Injection hujumidan himoyalanishning dasturiy ta'minotdagi eng ishonchli usuli qaysi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(8)
                            .optionsJson("[\"Foydalanuvchi parolini ko'p marta so'rash\", \"Parametrlangan so'rovlar (Prepared Statements) ishlatish\", \"Faqat GET so'rovlarini qabul qilish\", \"Baza portini yashirish\"]")
                            .correctAnswersJson("1")
                            .explanation("Prepared Statements orqali kiritilgan ma'lumotlar buyruq sifatida emas, faqat qiymat (literal value) sifatida qabul qilinadi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("Brauzerda boshqa domenga so'rov yuborishdan oldin serverning ruxsatini aniqlash uchun yuboriladigan 'Preflight' so'rovi qaysi?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(9)
                            .optionsJson("[\"CONNECT\", \"OPTIONS\", \"HEAD\", \"TRACE\"]")
                            .correctAnswersJson("1")
                            .explanation("CORS siyosatiga ko'ra brauzer murakkab so'rovlardan oldin avtomatik OPTIONS so'rovini yuborib ruxsat oladi.")
                            .build(),
                    AssessmentQuestion.builder()
                            .assessmentId(backendAssessment.getId())
                            .questionText("401 Unauthorized va 403 Forbidden status kodlari o'rtasidagi asosiy farq nima?")
                            .questionType("SINGLE_CHOICE")
                            .points(10)
                            .orderIndex(10)
                            .optionsJson("[\"Farqi yo'q\", \"401 foydalanuvchi tizimga kirmaganligini bildiradi, 403 esa tizimga kirgan bo'lsa-da kerakli huquq (permission) yo'qligini bildiradi\", \"403 xatolik server buzilganini bildiradi\", \"401 faqat parollar noto'g'riligida chiqadi\"]")
                            .correctAnswersJson("1")
                            .explanation("401 (Authentication failure) — tizim shaxsingizni tanimadi; 403 (Authorization failure) — tizim shaxsingizni tanidi, ammo bu amalni bajarishga huquqingiz yo'q.")
                            .build()
            );
            assessmentQuestionRepository.saveAll(backendQuestions);

            log.info("4 ta Real Assessments va 40 ta savollar muvaffaqiyatli yaratildi!");
        }

        // =========================================================================
        // 2. STUDENT STREAKS (Kunlik uzluksiz intizom ko'rsatkichlari)
        // =========================================================================
        LocalDate today = LocalDate.now();
        if (studentStreakRepository.count() == 0) {
            int sCount = 0;
            int[] currentStreaks = {7, 5, 4, 3, 6, 2, 8, 1, 3, 5, 2};
            int[] longestStreaks = {14, 10, 8, 6, 9, 4, 12, 3, 5, 9, 4};

            for (Student s : students) {
                int cur = currentStreaks[sCount % currentStreaks.length];
                int lng = longestStreaks[sCount % longestStreaks.length];
                LocalDate lastAct = (sCount % 3 == 0) ? today : (sCount % 3 == 1 ? today : today.minusDays(1));

                studentStreakRepository.save(StudentStreak.builder()
                        .studentId(s.getId())
                        .currentStreak(cur)
                        .longestStreak(Math.max(cur, lng))
                        .lastActivityDate(lastAct)
                        .streakFreezeCount(1)
                        .totalActiveDays(cur * 2 + 5)
                        .createdAt(LocalDateTime.now().minusDays(30))
                        .updatedAt(LocalDateTime.now())
                        .build());

                sCount++;
            }
            log.info("O'quvchilar uchun kunlik streaklar bazaga biriktirildi.");
        }

        // =========================================================================
        // 3. GAMIFICATION POINTS & AUDIT TRANSACTIONS
        // =========================================================================
        if (pointTransactionRepository.count() == 0) {
            int pIdx = 0;
            for (Student s : students) {
                Long sid = s.getId();
                // 1. Daily streak awards
                pointTransactionRepository.save(PointTransaction.builder()
                        .studentId(sid)
                        .amount(15)
                        .pointSource("DAILY_STREAK")
                        .referenceId(today.toString())
                        .referenceType("DailyStreak")
                        .idempotencyKey("seed_streak_base_" + sid)
                        .reason("Kunlik streak faolligi (Uzluksiz intizom) 🔥")
                        .createdAt(LocalDateTime.now().minusHours(2))
                        .build());

                // 2. Streak milestones
                if (pIdx < 4) {
                    pointTransactionRepository.save(PointTransaction.builder()
                            .studentId(sid)
                            .amount(100)
                            .pointSource("ACHIEVEMENT_UNLOCKED")
                            .referenceId("7_DAYS")
                            .referenceType("Milestone")
                            .idempotencyKey("seed_streak_7d_" + sid)
                            .reason("7 kunlik haftalik streak marrasi bonusi! 🏆")
                            .createdAt(LocalDateTime.now().minusDays(1))
                            .build());
                }

                // 3. Assessment attempts XP
                int testScore = 80 + (pIdx % 3) * 10;
                pointTransactionRepository.save(PointTransaction.builder()
                        .studentId(sid)
                        .amount(testScore)
                        .pointSource("ASSESSMENT")
                        .referenceId("attempt_" + sid)
                        .referenceType("StudentAssessmentAttempt")
                        .idempotencyKey("seed_test_xp_" + sid)
                        .reason("Oraliq nazorat test natijasi: " + testScore + " XP")
                        .createdAt(LocalDateTime.now().minusDays(3))
                        .build());

                if (testScore >= 100) {
                    pointTransactionRepository.save(PointTransaction.builder()
                            .studentId(sid)
                            .amount(50)
                            .pointSource("ACHIEVEMENT_UNLOCKED")
                            .referenceId("perfect_" + sid)
                            .referenceType("StudentAssessmentAttempt")
                            .idempotencyKey("seed_test_perfect_" + sid)
                            .reason("Mukammal 100% test natijasi bonusi! 🥇")
                            .createdAt(LocalDateTime.now().minusDays(3))
                            .build());
                }

                // 4. Practical assignment XP
                int projScore = 85 + (pIdx % 2) * 10;
                pointTransactionRepository.save(PointTransaction.builder()
                        .studentId(sid)
                        .amount(projScore)
                        .pointSource("PRACTICAL_ASSIGNMENT")
                        .referenceId("assignment_" + sid)
                        .referenceType("AssignmentSubmission")
                        .idempotencyKey("seed_assign_xp_" + sid)
                        .reason("Shaxsiy veb-portfolio amaliy topshirig'i: " + projScore + " XP")
                        .createdAt(LocalDateTime.now().minusDays(2))
                        .build());

                // 5. Mentor bonus for top active students
                if (pIdx < 3) {
                    pointTransactionRepository.save(PointTransaction.builder()
                            .studentId(sid)
                            .amount(50)
                            .pointSource("MENTOR_BONUS")
                            .referenceId("bonus_" + sid)
                            .referenceType("MentorBonus")
                            .idempotencyKey("seed_mentor_bonus_" + sid)
                            .reason("Darsdagi namunali faollik va toza kod uchun mentor rag'bati")
                            .awardedByUserId(1L)
                            .createdAt(LocalDateTime.now().minusDays(1))
                            .build());
                }

                pIdx++;
            }
            log.info("O'quvchilar uchun shaffof XP ballar tranzaksiyalari yuklandi.");
        }

        // =========================================================================
        // 4. UNLOCKED ACHIEVEMENTS (Nishonlar va unvonlar)
        // =========================================================================
        if (studentAchievementRepository.count() == 0) {
            achievementRepository.findByCode("FIRST_PERFECT_TEST").ifPresent(ach -> {
                for (int i = 0; i < Math.min(3, students.size()); i++) {
                    studentAchievementRepository.save(StudentAchievement.builder()
                            .studentId(students.get(i).getId())
                            .achievementId(ach.getId())
                            .unlockedAt(LocalDateTime.now().minusDays(3))
                            .progressValue(100)
                            .build());
                }
            });

            achievementRepository.findByCode("STREAK_7_DAYS").ifPresent(ach -> {
                for (int i = 0; i < Math.min(4, students.size()); i++) {
                    studentAchievementRepository.save(StudentAchievement.builder()
                            .studentId(students.get(i).getId())
                            .achievementId(ach.getId())
                            .unlockedAt(LocalDateTime.now().minusDays(1))
                            .progressValue(7)
                            .build());
                }
            });

            achievementRepository.findByCode("PRACTICAL_HERO").ifPresent(ach -> {
                for (int i = 0; i < Math.min(2, students.size()); i++) {
                    studentAchievementRepository.save(StudentAchievement.builder()
                            .studentId(students.get(i).getId())
                            .achievementId(ach.getId())
                            .unlockedAt(LocalDateTime.now().minusDays(2))
                            .progressValue(3)
                            .build());
                }
            });
            log.info("O'quvchilar uchun nishonlar (achievements) biriktirildi.");
        }
    }

    private void seedAlXorazmiyRoadmapLessonsAndPresentations() {
        log.info("Seeding Al-Xorazmiy Vorislari roadmap lesson sessions, real assessments links and AI rich-text presentations...");

        StudyGroup group8 = studyGroupRepository.findAll().stream()
                .filter(g -> "8-sinf".equalsIgnoreCase(g.getGradeLevel()) || g.getGroupCode().contains("YA-26I0804"))
                .findFirst()
                .orElse(null);

        StudyGroup group11 = studyGroupRepository.findAll().stream()
                .filter(g -> "11-sinf".equalsIgnoreCase(g.getGradeLevel()) || g.getGroupCode().contains("YA-24I1105"))
                .findFirst()
                .orElse(group8);

        Mentor mentor = mentorRepository.findAll().stream().findFirst().orElse(null);
        if (group8 == null || mentor == null) {
            return;
        }

        // 1. Update existing 8-sinf lessons with rich-text presentation slides
        List<Lesson> existingLessons = lessonRepository.findAll();
        for (Lesson l : existingLessons) {
            if (l.getTitle().contains("Kompyuter arxitekturasi") && (l.getPresentationSlides() == null || l.getPresentationSlides().isBlank())) {
                l.setPresentationSlides("""
                        # 🚀 1. Fon Neyman Kompyuter Arxitekturasi va CPU Tuzilishi
                        **Muhammad Al-Xorazmiy Vorislari • 8-Sinf Ta'lim Standarti**
                        - **Dars turi:** 80 daqiqalik intensiv ma'ruza va amaliyot (PQ-3274)
                        - **Fan:** Computer Science Foundation & Web Full-Stack
                        - **O'qituvchi:** Malakali IT Mentor

                        > [!NOTE]
                        > Ushbu darsda zamonaviy kompyuterlarning yuragi bo'lgan protsessor va xotira o'zaro qanday ishlashini o'rganamiz.

                        > 🎙️ **Spiker izohi:** Darsni o'quvchilardan "Kompyuter tugmasini bosganingizda ichkarida nima ro'y beradi?" degan qiziqarli savol bilan boshlang.
                        ---
                        # 🧠 2. Fon Neyman Arxitekturasining 4 Ta Asosiy Qoidasi
                        1. **Xotira bir xilligi:** Dastur kodlari va ma'lumotlar bitta umumiy xotirada (RAM) saqlanadi.
                        2. **Manzillanuvchanlik:** Xotiraning har bir katagi o'zining noyob raqamli manziliga ega.
                        3. **Ketma-ket ijro:** Buyruqlar hisoblagich (Program Counter) orqali navbatma-navbat bajariladi.
                        4. **Dasturiy boshqaruv:** Protsessor inson aralashuvisiz buyruqlarni avtomatik tarzda qayta ishlaydi.

                        > [!TIP]
                        > 💡 *Analogiya:* Xotirani katta pochta qutilari devoriga o'xshatish mumkin — har bir quti o'z raqamiga ega!

                        > 🎙️ **Spiker izohi:** Doskaga pochta qutilari yoki shkaf tortmalari chizmasini keltirib o'tish tushunishni 80% ga oshiradi.
                        ---
                        # ⚡ 3. CPU Tuzilishi: ALU, CU va Registrlar
                        - **ALU (Arithmetic Logic Unit):** Matematik amallar (+, -, *, /) va mantiqiy solishtirishlar (AND, OR, NOT).
                        - **CU (Control Unit):** Boshqaruvchi marshrutizator — buyruqlarni o'qiydi va qolgan qurilmalarga uzatadi.
                        - **Registrlar (Registers):** CPU ichidagi eng tezkor, nano-sekundlarda ishlovchi mini-xotiralar.

                        ```text
                        +-------------------------------------------------------+
                        |                   CENTRAL PROCESSING UNIT             |
                        |  +--------------------+       +--------------------+  |
                        |  | Control Unit (CU)  |<----->| Registrlar (AX, BX)|  |
                        |  +--------------------+       +--------------------+  |
                        |            ^                            ^             |
                        |            |                            |             |
                        |  +--------------------+                 |             |
                        |  |     ALU Unit       |<----------------+             |
                        |  +--------------------+                               |
                        +-------------------------------------------------------+
                        ```

                        > 🎙️ **Spiker izohi:** O'quvchilarga CU — bu orkestr dirijyori, ALU — sozandalar, registrlar esa dirijyorning qo'lidagi notalar deb ta'rif bering.
                        ---
                        # 🔄 4. Buyruqlar Sikli (Instruction Cycle)
                        Protsessor sekundiga milliardlab marta quyidagi 3 bosqichli siklni takrorlaydi:
                        1. **Fetch (O'qish):** Xotiradan navbatdagi buyruq o'qib olinadi.
                        2. **Decode (Dekodlash):** CU buyruq qanday amal ekanligini aniqlaydi.
                        3. **Execute (Ijro etish):** ALU amalni hisoblaydi va natijani registrga yozadi.

                        ```python
                        # Soddalashtirilgan buyruqlar sikli:
                        def cpu_step(pc, memory, reg):
                            cmd = memory[pc]             # 1. FETCH
                            opcode, arg = decode(cmd)    # 2. DECODE
                            reg['AX'] = execute(opcode)  # 3. EXECUTE
                            return pc + 1
                        ```

                        > 🎙️ **Spiker izohi:** Bu sikl har bir o'yinda, har bir brauzer sahifasida millionlab marta aylanadi.
                        ---
                        # 📊 5. Xotira Iyerarxiyasi: Tezlik va Narx Balansi
                        - **Registrlar:** ~0.5 ns (Juda kichik hajmli, o'ta tez)
                        - **L1 / L2 / L3 Kesh (Cache):** ~1-10 ns (SRAM texnologiyasi)
                        - **RAM (Operativ xotira):** ~50-100 ns (DRAM texnologiyasi, uchuvchan)
                        - **SSD / NVMe disk:** ~10-50 mks (Flesh xotira, doimiy saqlash)

                        > [!IMPORTANT]
                        > Nega doimiy xotira sekin? Chunki narx, hajm va tezlik balansi talab etiladi. Barcha xotirani keshdan qilib bo'lmaydi!

                        > 🎙️ **Spiker izohi:** Masala: Agar RAM elektr uzilganda o'chmasa nima bo'lardi? O'quvchilar bilan 2 daqiqa buni muhokama qiling.
                        ---
                        # 💻 6. Amaliy Laboratoriya Topshirig'i (25 daqiqa)
                        **Vazifa:** CPU simulyatori yoki Python skripti yordamida ikkita sonni qo'shish va natijani xotiraga yozish:
                        1. `LOAD R1, 15` (15 sonini 1-registrga yuklash)
                        2. `LOAD R2, 27` (27 sonini 2-registrga yuklash)
                        3. `ADD R1, R2` (ALU da qo'shish)
                        4. `STORE R1, [0x100]` (Natijani RAM ning 0x100 manziliga yozish)

                        > 🎙️ **Spiker izohi:** Juftliklarda (Pair Programming) ishlashga ruxsat bering.
                        ---
                        # 🎯 7. Dars Xulosasi va Mustaqil Vazifa
                        - **O'rganildi:** Fon Neyman tizimi, CPU bloklari, xotira piramidasi va buyruqlar sikli.
                        - **Nazorat testi:** Mavzu bo'yicha platformada 4 ta savoldan iborat oraliq testni yechish.
                        - **Uyga vazifa:** O'z shaxsiy kompyuteringiz texnik parametrlarini (CPU chastotasi, yadrolar soni, RAM hajmi, Kesh L3) aniqlab keling.
                        """);
                lessonRepository.save(l);
            } else if (l.getTitle().contains("HTML5 Semantik") && (l.getPresentationSlides() == null || l.getPresentationSlides().isBlank())) {
                l.setPresentationSlides("""
                        # 🌐 1. HTML5 Semantik Teglari va Veb Tuzilishi
                        **Muhammad Al-Xorazmiy Vorislari • 8-Sinf Ta'lim Standarti**
                        - **Fan:** Web Full-Stack Development
                        - **Format:** 80 daqiqalik dars (Nazariya 20m, Amaliyot 25m, Loyiha 20m, Natija 15m)

                        > [!NOTE]
                        > Semantik teglar qidiruv tizimlari (SEO) va ko'zi ojizlar uchun ovozli dasturlar (Screen Readers) veb-sahifani to'g'ri o'qishi uchun shart!

                        > 🎙️ **Spiker izohi:** O'quvchilarga gazetani ko'rsatib, uning sarlavhasi, maqolasi va pastki qismi qanday ajralganini solishtiring.
                        ---
                        # 📐 2. Asosiy Semantik Teglar Strukturasi
                        - `<header>`: Sayt bosh qismi, logotip va navigatsiya.
                        - `<nav>`: Asosiy menyu havolalari.
                        - `<main>`: Sahifaning yagona, takrorlanmas asosiy mazmuni.
                        - `<section>`: Mantiqiy bo'limlar.
                        - `<article>`: Mustaqil, alohida o'qilishi mumkin bo'lgan maqola yoki post.
                        - `<footer>`: Mualliflik huquqi, ijtimoiy tarmoqlar va qo'shimcha havolalar.

                        ```html
                        <header>
                          <h1>Al-Xorazmiy Ta'lim Portali</h1>
                          <nav><a href="#courses">Kurslar</a></nav>
                        </header>
                        <main>
                          <article>
                            <h2>8-Sinf Dasturlash Asoslari</h2>
                            <p>Amaliy laboratoriya mashg'ulotlari.</p>
                          </article>
                        </main>
                        <footer><p>&copy; 2026 AXV Hub</p></footer>
                        ```

                        > 🎙️ **Spiker izohi:** Nega `<div>` o'rniga `<section>` yoki `<article>` ishlatish qoidasini brauzer inspektori (F12) orqali ko'rsating.
                        ---
                        # 📝 3. Zamonaviy Formalar va Validatsiya
                        - `<form action="/api/submit" method="POST">`
                        - Turli `type` atributlari: `email`, `password`, `number`, `tel`, `date`.
                        - Atributlar: `required`, `placeholder`, `pattern`, `minlength`.

                        ```html
                        <form class="student-form">
                          <label for="name">To'liq ismingiz:</label>
                          <input type="text" id="name" required placeholder="Aziz Rahimov">

                          <label for="email">Elektron pochta:</label>
                          <input type="email" id="email" required placeholder="aziz@al-xorazmiy.uz">

                          <button type="submit">Ro'yxatdan o'tish</button>
                        </form>
                        ```

                        > [!TIP]
                        > HTML5 da kiritilgan avtomatik validatsiya foydalanuvchining xato ma'lumot kiritishini JavaScriptsiz ham oldini oladi.

                        > 🎙️ **Spiker izohi:** Noto'g'ri email kiritib submit bosilganda brauzer ko'rsatadigan qizil ogohlantirishni o'quvchilarga ko'rsating.
                        ---
                        # 💻 4. Amaliy Topshiriq: IT Markaz Ro'yxatdan O'tish Formasi (25 daqiqa)
                        - VS Code oching va `index.html` faylini yarating.
                        - Kamida 6 ta har xil input turlaridan iborat semantik forma yozing.
                        - Barcha inputlar uchun `<label>` tegi va `required` atributini unutmang!

                        > 🎙️ **Spiker izohi:** Barcha o'quvchilar VS Code da `Emmet` qisqartmalaridan (`form>div*3>input`) foydalanishlarini rag'batlantiring.
                        ---
                        # 🎯 5. Dars Xulosasi va Baholash
                        - **Tekshiruv:** Formaning semantik to'g'riligi va validatsiyasi.
                        - **Oraliq test:** HTML5 & CSS3 bo'yicha platformadagi oraliq testni ishlang.
                        - **Uyga vazifa:** Shaxsiy portfoliongiz uchun "Bog'lanish" (Contact) sahifasi maketini yaratish.
                        """);
                lessonRepository.save(l);
            }
        }

        // 2. Seed JavaScript Fundamentals (8-sinf Roadmap)
        boolean hasJsLesson = existingLessons.stream().anyMatch(l -> l.getTitle().contains("JavaScript Asoslari"));
        if (!hasJsLesson) {
            Lesson jsLesson = lessonRepository.save(Lesson.builder()
                    .title("JavaScript Asoslari & Algoritmik Mantiq")
                    .subject("Web Full-Stack Development")
                    .gradeLevel("8-sinf")
                    .topic("O'zgaruvchilar (let, const), Funksiyalar, Shartlar va Massivlar")
                    .learningObjectives("JavaScript dasturlash tilining sintaksisi, o'zgaruvchilar ko'lami va amaliy funksiyalarni o'rganish.")
                    .expectedOutcomes("O'quvchilar veb sahifadagi dinamik o'zgarishlar va interaktiv hodisalarni boshqara oladi.")
                    .requiredMaterials("Brauzer Developer Tools (F12), VS Code, Node.js muhiti.")
                    .theoryContent("JavaScript — vebning jonlantiruvchi tili. Dinamik tiplash, let vs const, funksiyalar va shart operatorlari.")
                    .theoryDurationMinutes(20)
                    .practicalContent("Oddiy interaktiv kalkulyator va massivlar ustida amallar bajaruvchi skript yozish.")
                    .practicalDurationMinutes(25)
                    .exercises("1. Berilgan massivdan juft sonlarni ajratib oluvchi funksiya yozing.\n2. Foydalanuvchi yoshiga qarab ruxsat beruvchi shartli ifoda tuzing.")
                    .homework("Do'kon savatchasi (Shopping Cart) hisob-kitobini chiqaruvchi JS skriptini yozish.")
                    .durationMinutes(80)
                    .groupId(group8.getId())
                    .mentorId(mentor.getId())
                    .status("PUBLISHED")
                    .presentationSlides("""
                            # 🚀 1. JavaScript Asoslari & Dasturlash Mantiqi
                            **Muhammad Al-Xorazmiy Vorislari • 8-Sinf Ta'lim Standarti**
                            - **Fan:** Web Full-Stack Development
                            - **Dars formati:** 80 daqiqalik interaktiv ma'ruza va live-coding

                            > [!NOTE]
                            > JavaScript har qanday zamonaviy veb-ilova va interaktiv interfeyslarning yuragidir.

                            > 🎙️ **Spiker izohi:** Brauzer konsolini (Console) ochib, `alert('Salom Al-Xorazmiy!')` buyrug'ini kiritib ko'rsating.
                            ---
                            # 💡 2. O'zgaruvchilar va Ko'lam (Scope)
                            - `const`: O'zgarmas qiymatlar (birlamchi tanlov).
                            - `let`: O'zgarishi mumkin bo'lgan o'zgaruvchilar (blokli ko'lam).
                            - `var`: Eski uslub (funksional ko'lam, zamonaviy kodda tavsiya etilmaydi).

                            ```javascript
                            const schoolName = "Muhammad Al-Xorazmiy";
                            let currentStreak = 5;
                            currentStreak += 1; // 6
                            console.log(`${schoolName}: Kunlik streak - ${currentStreak}`);
                            ```

                            > 🎙️ **Spiker izohi:** Nega `const` ko'proq ishlatilishi kerakligini koddagi tasodifiy xatoliklarni oldini olish misolida tushuntiring.
                            ---
                            # ⚡ 3. Funksiyalar va Arrow Functions
                            - Funksiyalar — qayta ishlatiluvchi kod bloklari.
                            - Zamonaviy strelka funksiyalari (Arrow Syntax).

                            ```javascript
                            // Standart funksiya:
                            function calculateXP(score, streak) {
                                return score * 10 + streak * 50;
                            }

                            // Zamonaviy Arrow Function:
                            const calculateLevel = (xp) => Math.floor(xp / 1000) + 1;

                            console.log(`Ball: ${calculateXP(90, 7)} XP, Daraja: ${calculateLevel(3500)}`);
                            ```

                            > 🎙️ **Spiker izohi:** Arrow funksiyaning qulayligi va qisqaligini o'quvchilarga doskada ko'rsating.
                            ---
                            # 💻 4. Amaliy Laboratoriya: Interaktiv Baholash Skripti (25 daqiqa)
                            - 5 ta o'quvchining ballari ro'yxatini e'lon qiling.
                            - Eng yuqori ball to'plagan o'quvchini aniqlovchi funksiya yozing.
                            - Natijani brauzer konsolida chiroyli tarzda formatlab chiqaring.

                            ```javascript
                            const scores = [85, 92, 78, 96, 88];
                            const maxScore = Math.max(...scores);
                            console.log(`Eng yuqori ball: ${maxScore}`);
                            ```

                            > 🎙️ **Spiker izohi:** O'quvchilarga Spread operatori `...` qanday qilib massivni ochib berishini tushuntiring.
                            ---
                            # 🎯 5. Dars Xulosasi, Test & Uy Vazifasi
                            - **O'rganildi:** O'zgaruvchilar, funksiyalar va massiv amallari.
                            - **Oraliq test:** "8-sinf: JavaScript Asoslari & Algoritmik Mantiq" testini topshiring.
                            - **Uyga vazifa:** O'z kalkulyatoringizning hisoblash mantiqini yozib keling.
                            """)
                    .build());
            log.info("Seeded 8-sinf JavaScript Roadmap Lesson: ID={}", jsLesson.getId());
        }

        // 3. Seed Python & Data Structures (9-sinf Roadmap)
        boolean hasPythonLesson = existingLessons.stream().anyMatch(l -> l.getTitle().contains("Python"));
        if (!hasPythonLesson) {
            Lesson pyLesson = lessonRepository.save(Lesson.builder()
                    .title("Python Asoslari & Ma'lumotlar Tuzilmalari (Ro'yxatlar va Lug'atlar)")
                    .subject("Python, Algoritmlar va Data Structures")
                    .gradeLevel("9-sinf")
                    .topic("List, Tuple, Set, Dict va Ikkilik Qidiruv (Binary Search)")
                    .learningObjectives("Python tili yordamida algoritmik mantiq, murakkablik (Big-O) va ma'lumotlar tuzilmalarini tushunish.")
                    .expectedOutcomes("O'quvchilar O(log N) va O(N) murakkablikdagi algoritmlarni mustaqil kodlay oladilar.")
                    .requiredMaterials("Python 3.12+, VS Code, Jupyter Notebook.")
                    .theoryContent("Chiziqli ma'lumotlar tuzilmalari, indeksatsiya, lug'atlar xesh-jadvali va algoritmik samaradorlik.")
                    .theoryDurationMinutes(20)
                    .practicalContent("Ikkilik qidiruv (Binary Search) algoritmini Python tilida implementatsiya qilish va testlash.")
                    .practicalDurationMinutes(25)
                    .exercises("1. Berilgan tartiblangan ro'yxatda sonni binary search bilan toping.\n2. Matndagi har bir so'zning uchrashlar sonini dict orqali hisoblang.")
                    .homework("LeetCode 'Two Sum' masalasini lug'at yordamida O(N) vaqtda yechish.")
                    .durationMinutes(80)
                    .groupId(group8.getId())
                    .mentorId(mentor.getId())
                    .status("PUBLISHED")
                    .presentationSlides("""
                            # 🚀 1. Python Asoslari & Ma'lumotlar Tuzilmalari
                            **Muhammad Al-Xorazmiy Vorislari • 9-Sinf O'quv Dasturi**
                            - **Fan:** Python, Algoritmlar va Data Structures
                            - **Format:** 80 daqiqalik intensiv algoritmik ma'ruza va amaliyot

                            > [!NOTE]
                            > Python — sun'iy intellekt, ma'lumotlar tahlili va olimpiada dasturlashida dunyoning yetakchi tili.

                            > 🎙️ **Spiker izohi:** Darsni o'quvchilardan "1 millionta elementdan sonni qanday qilib 20 ta qadamda topish mumkin?" degan savol bilan boshlang.
                            ---
                            # 💡 2. Asosiy Tuzilmalar: List vs Dict
                            - **List (Ro'yxat):** O'zgaruvchan, tartiblangan elementlar to'plami. Indeks bo'yicha kirish: `O(1)`. Qidirish: `O(N)`.
                            - **Dictionary (Lug'at):** Kalit-qiymat (Key-Value) juftliklari. Xesh-jadval asosida ishlaydi, qidirish o'rtacha: `O(1)`!

                            ```python
                            # O'quvchilar va ularning ballari:
                            students = ["Ali", "Vali", "Zuhra"]
                            xp_ratings = {"Ali": 4200, "Vali": 3800, "Zuhra": 4900}

                            top_student = max(xp_ratings, key=xp_ratings.get)
                            print(f"Top o'quvchi: {top_student} ({xp_ratings[top_student]} XP)")
                            ```

                            > 🎙️ **Spiker izohi:** Telefon kitobidan odamning raqamini qidirish bilan lug'atdan qiymat olish orasidagi o'xshashlikni tushuntiring.
                            ---
                            # ⚡ 3. Algoritmik Fikrlash: Big-O va Binary Search
                            - **Chiziqli qidiruv (Linear Search):** Boshidan oxirigacha birma-bir tekshirish — `O(N)`.
                            - **Ikkilik qidiruv (Binary Search):** Tartiblangan massivni ikkiga bo'lib qidirish — `O(log N)`.

                            ```python
                            def binary_search(arr, target):
                                left, right = 0, len(arr) - 1
                                while left <= right:
                                    mid = (left + right) // 2
                                    if arr[mid] == target:
                                        return mid
                                    elif arr[mid] < target:
                                        left = mid + 1
                                    else:
                                        right = mid - 1
                                return -1
                            ```

                            > 🎙️ **Spiker izohi:** Qog'oz varag'ini har safar o'rtasidan buklash tajribasini sinfda ko'rsating.
                            ---
                            # 💻 4. Amaliy Laboratoriya Topshirig'i (25 daqiqa)
                            - 1 dan 100 gacha bo'lgan tasodifiy sonni topish o'yinini yozing.
                            - Kompyuter har bir urinishda "Kattaroq" yoki "Kichikroq" deb yordam beradi.
                            - Binary search orqali kompyuterni maksimal 7 ta qadamda yutish strategiyasini isbotlang!

                            > 🎙️ **Spiker izohi:** Har bir o'quvchining yechimini tekshirib, qadamlar sonini hisoblashga e'tibor bering.
                            ---
                            # 🎯 5. Dars Xulosasi, Oraliq Test & Uy Vazifasi
                            - **O'rganildi:** List, Dict, Big-O murakkabligi va Ikkilik qidiruv.
                            - **Oraliq test:** "9-sinf: Python & Ma'lumotlar Tuzilmalari" testini ishlang (Streak va XP oling).
                            - **Uyga vazifa:** 1000 ta so'zdan iborat matndagi eng ko'p takrorlangan 5 ta so'zni aniqlovchi Python dasturini tuzish.
                            """)
                    .build());
            log.info("Seeded 9-sinf Python Roadmap Lesson: ID={}", pyLesson.getId());
        }

        // 4. Seed Backend & SQL (10-sinf Roadmap)
        boolean hasBackendLesson = existingLessons.stream().anyMatch(l -> l.getTitle().contains("Backend"));
        if (!hasBackendLesson) {
            Lesson beLesson = lessonRepository.save(Lesson.builder()
                    .title("Backend Dasturlash, REST API va SQL Ma'lumotlar Bazasi")
                    .subject("Backend Engineering & Databases")
                    .gradeLevel("10-sinf")
                    .topic("RESTful Tamoyillari, Spring Boot / FastAPI, PostgreSQL Relyatsion Jadvallari")
                    .learningObjectives("Mijoz-server me'morchiligi, HTTP status kodlari va SQL relyatsion ma'lumotlar bazasini o'zaro integratsiya qilish.")
                    .expectedOutcomes("O'quvchilar xavfsiz REST endpointlar va ma'lumotlar bazasi so'rovlarini yoza oladilar.")
                    .requiredMaterials("PostgreSQL, Spring Boot / FastAPI, Postman / Thunder Client.")
                    .theoryContent("REST arxitekturasi, HTTP GET/POST/PUT/DELETE metodlari, Relyatsion jadvallar, Primary va Foreign Key bog'lanishlari.")
                    .theoryDurationMinutes(20)
                    .practicalContent("Talabalar ro'yxatini qaytaruvchi va yangi talaba qo'shuvchi REST API endpoint yaratish.")
                    .practicalDurationMinutes(25)
                    .exercises("1. 1:N va N:M bog'lanishlarga ikkitadan hayotiy misol keltiring.\n2. SQL JOIN so'rovi yordamida 2 ta jadvaldan umumiy hisobot oling.")
                    .homework("Kitoblar kutubxonasi uchun 3 ta jadvalli DB sxemasi va REST CRUD endpointlarini tuzish.")
                    .durationMinutes(80)
                    .groupId(group11.getId())
                    .mentorId(mentor.getId())
                    .status("PUBLISHED")
                    .presentationSlides("""
                            # 🚀 1. Backend Dasturlash, REST API va SQL Relyatsion Baza
                            **Muhammad Al-Xorazmiy Vorislari • 10-Sinf O'quv Dasturi**
                            - **Fan:** Backend Engineering & Databases
                            - **Format:** 80 daqiqalik intensiv muhandislik ma'ruzasi

                            > [!NOTE]
                            > Dunyodagi har qanday yirik platforma (YouTube, Instagram, Telegram) kuchli backend va relyatsion ma'lumotlar bazasiga tayanadi.

                            > 🎙️ **Spiker izohi:** Foydalanuvchi "Yuborish" tugmasini bosganda backend serverda qanday jarayonlar kechishini tasvirlang.
                            ---
                            # 🌐 2. RESTful API Me'morchiligi va HTTP Metodlari
                            - **Client-Server:** Frontend va Backend to'liq mustaqil ishlaydi.
                            - **Stateless:** Har bir so'rov o'zida barcha kerakli ma'lumotni olib yuradi.
                            - **HTTP Metodlar:**
                              - `GET`: Resurslarni o'qish (Idempotent)
                              - `POST`: Yangi resurs yaratish
                              - `PUT / PATCH`: Resursni o'zgartirish
                              - `DELETE`: Resursni o'chirish

                            ```json
                            // POST /api/students HTTP/1.1
                            {
                              "fullName": "Sardor Aliyev",
                              "gradeLevel": "10-sinf",
                              "email": "sardor@axm.uz"
                            }
                            ```

                            > 🎙️ **Spiker izohi:** Status kodlari: 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Server Error haqida tushuntiring.
                            ---
                            # 🗄️ 3. SQL Relyatsion Baza & Primary / Foreign Key
                            - **Primary Key (Birlamchi kalit):** Har bir yozuvning yagona ID raqami.
                            - **Foreign Key (Tashqi kalit):** Boshqa jadvalga havola qiluvchi bog'lanish ustuni.
                            - **JOIN amali:** Jadvallarni o'zaro birlashtirib, yaxlit ma'lumot olish.

                            ```sql
                            SELECT s.full_name, a.title, g.score
                            FROM grades g
                            JOIN students s ON g.student_id = s.id
                            JOIN assessments a ON g.assessment_id = a.id
                            WHERE g.score >= 90
                            ORDER BY g.score DESC;
                            ```

                            > 🎙️ **Spiker izohi:** Nega barcha ma'lumotni bitta ulkan jadvalga yozmaslik kerakligini (normalizatsiya) tushuntiring.
                            ---
                            # 🛡️ 4. Xavfsizlik: SQL Injection va Validatsiya
                            - **SQL Injection:** Foydalanuvchi yomon niyatda kiritgan SQL buyrug'i bazani buzishi mumkin.
                            - **Himoya:** Parametrlangan so'rovlar (PreparedStatement / ORM) va DTO validatsiyasi.

                            ```java
                            @PostMapping
                            public ResponseEntity<StudentDto> createStudent(@Valid @RequestBody CreateStudentRequest req) {
                                return ResponseEntity.status(HttpStatus.CREATED).body(studentService.save(req));
                            }
                            ```

                            > [!IMPORTANT]
                            > Hech qachon foydalanuvchi kiritgan matnni to'g'ridan-to'g'ri SQL so'roviga birlashtirmang!

                            > 🎙️ **Spiker izohi:** Prepared Statement qanday qilib matnni faqat ma'lumot sifatida qabul qilishini ko'rsating.
                            ---
                            # 💻 5. Amaliy Laboratoriya Topshirig'i (25 daqiqa)
                            - PostgreSQL bazasida `courses` va `enrollments` jadvallarini yarating.
                            - Kamida 3 ta test yozuvini kiriting.
                            - REST endpoint orqali ma'lumotlarni JSON formatida qaytaring va Postman da tekshiring.

                            > 🎙️ **Spiker izohi:** Postman yoki Swagger orqali API testlash jarayonini proyektorda ko'rsating.
                            ---
                            # 🎯 6. Dars Xulosasi, Test & Uy Vazifasi
                            - **O'rganildi:** REST API tamoyillari, SQL JOIN va xavfsiz endpointlar.
                            - **Oraliq test:** "10-sinf: Backend Dasturlash & SQL" nazorat testini topshiring.
                            - **Uyga vazifa:** O'z tanlagan mavzuingiz bo'yicha 3 ta jadvaldan iborat relyatsion diagramma chizib kelish.
                            """)
                    .build());
            log.info("Seeded 10-sinf Backend Roadmap Lesson: ID={}", beLesson.getId());
        }

        // 5. Seed 11-sinf Portfolio & International Market Lesson
        boolean hasGrade11Lesson = existingLessons.stream().anyMatch(l -> l.getTitle().contains("Portfolio") || l.getTitle().contains("Freelance"));
        if (!hasGrade11Lesson) {
            Lesson pLesson = lessonRepository.save(Lesson.builder()
                    .title("Real-world Loyiha Arxitekturasi, CI/CD va Xalqaro Freelance")
                    .subject("Professional IT & International Careers")
                    .gradeLevel("11-sinf")
                    .topic("GitHub Actions CI/CD, Production Deploy, Upwork/Freelance va Texnik Intervyular")
                    .learningObjectives("Bitiruvchi o'quvchilarni real IT bozoriga, xalqaro masofaviy ishlarga va kuchli loyihalar portfeliga tayyorlash.")
                    .expectedOutcomes("O'quvchilar o'zlarining shaxsiy portfolio loyihasini ishlab chiqarish (production) serveriga muvaffaqiyatli joylay oladilar.")
                    .requiredMaterials("GitHub Actions, Docker, Cloud Server, Upwork/LinkedIn profili.")
                    .theoryContent("Zamonaviy dasturiy injiniring sikli (SDLC), avtomatlashtirilgan CI/CD sinovlari, Docker konteynerlari va xalqaro frilans bozorining talablari.")
                    .theoryDurationMinutes(20)
                    .practicalContent("GitHub Actions orqali loyihani avtomatik sinovdan o'tkazish (Test pipeline) skriptini sozlash.")
                    .practicalDurationMinutes(25)
                    .exercises("1. Professional CV va GitHub README profilingizni mukammallashtiring.\n2. Upwork platformasida mijoz taklifiga (Cover Letter) professional javob yozing.")
                    .homework("O'z Full-Stack loyihangizni Vercel/Render yoki bulutli serverga deploy qilib, havolasini taqdim etish.")
                    .durationMinutes(80)
                    .groupId(group11.getId())
                    .mentorId(mentor.getId())
                    .status("PUBLISHED")
                    .presentationSlides("""
                            # 🚀 1. Real-world Loyiha Arxitekturasi, CI/CD va Xalqaro Bozor
                            **Muhammad Al-Xorazmiy Vorislari • 11-Sinf Bitiruvchi Bosqichi**
                            - **Fan:** Professional IT & International Careers
                            - **Format:** 80 daqiqalik master-klass va amaliy portfolio tahlili

                            > [!NOTE]
                            > 11-sinfning asosiy maqsadi — to'plangan 4 yillik bilimlarni xalqaro darajadagi portfolio, sertifikatlar va real IT daromadiga aylantirishdir.

                            > 🎙️ **Spiker izohi:** O'quvchilarga dunyo bo'ylab dasturchilar qanday qilib o'z uyidan turib global loyihalarda ishlashlari haqida ilhomlantiruvchi misollar keltiring.
                            ---
                            # ⚙️ 2. Zamonaviy CI/CD Pipeline (GitHub Actions)
                            - **Continuous Integration (Uzluksiz integratsiya):** Har bir git push qilinganda avtomatik testlar ishga tushadi.
                            - **Continuous Delivery / Deployment (Uzluksiz joylashtirish):** Muvaffaqiyatli kod avtomatik ishlab chiqarish serveriga yuklanadi.

                            ```yaml
                            # .github/workflows/deploy.yml
                            name: Production Pipeline
                            on:
                              push:
                                branches: [ main ]
                            jobs:
                              test-and-build:
                                runs-on: ubuntu-latest
                                steps:
                                  - uses: actions/checkout@v4
                                  - name: Run Backend Tests
                                    run: ./gradlew test
                                  - name: Build Frontend
                                    run: npm run build
                            ```

                            > 🎙️ **Spiker izohi:** GitHub dagi yashil belgi (Passing test) mijozlar va ish beruvchilar uchun eng asosiy ishonch belgisi ekanini uqtiring.
                            ---
                            # 💼 3. Xalqaro Frilans (Upwork) va Kuchli Portfel
                            1. **Natijaga yo'naltirilgan tavsif:** "Men dasturchiman" emas, "Men biznesingiz uchun tezkor va xavfsiz veb-tizimlar yaratib beraman".
                            2. **Jonli havolalar (Live Demo):** Har bir loyihangizning ishlayotgan havolasi va toza GitHub kodi bo'lishi shart.
                            3. **Birinchi buyurtma strategiyasi:** Professional cover letter yozish va mijoz muammosiga tayyor yechim taklif qilish.

                            > [!TIP]
                            > Yaxshi bitta to'liq va mukammal loyiha — chala qolgan 10 ta loyihadan 100 barobar qadrlidir!

                            > 🎙️ **Spiker izohi:** Muvaffaqiyatli Cover Letter namunasini ekranda ko'rsatib, mijoz bilan qanday muzokara olib borishni tahlil qiling.
                            ---
                            # 💻 4. Amaliy Laboratoriya: Pipeline Sozlash (25 daqiqa)
                            - O'z GitHub repositoriyangizda `.github/workflows/main.yml` faylini yarating.
                            - Kod formatlash va testlarni tekshiruvchi avtomatlashtirilgan pipeline yozing.
                            - Git commit va push qilib, GitHub interfeysida pipeline muvaffaqiyatli yashil rangga kirishini kuzating!

                            > 🎙️ **Spiker izohi:** Pipeline da xatolik (Red build) chiqqanda loglarni o'qib tuzatishni o'rgating.
                            ---
                            # 🎯 5. Dars Xulosasi va Karyera Rejasi
                            - **O'rganildi:** CI/CD me'morchiligi, deploy jarayoni va xalqaro frilans asoslari.
                            - **Loyiha himoyasi:** O'quvchilar o'zlarining yakuniy loyihalarini taqdim etishga tayyorgarlik ko'radilar.
                            - **Uyga vazifa:** Shaxsiy portfolioni jonli serverga joylab, havolani platformaga kiritish.
                            """)
                    .build());
            log.info("Seeded 11-sinf Portfolio & International Market Lesson: ID={}", pLesson.getId());
        }
    }

}
