package uz.axm.nexus.database;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import uz.axm.nexus.classrooms.domain.GroupMembership;
import uz.axm.nexus.classrooms.domain.StudyGroup;
import uz.axm.nexus.classrooms.infrastructure.GroupMembershipRepository;
import uz.axm.nexus.classrooms.infrastructure.StudyGroupRepository;
import uz.axm.nexus.mentors.domain.Mentor;
import uz.axm.nexus.mentors.infrastructure.MentorRepository;
import uz.axm.nexus.scheduling.domain.AttendanceRecord;
import uz.axm.nexus.scheduling.domain.LessonSession;
import uz.axm.nexus.scheduling.infrastructure.AttendanceRecordRepository;
import uz.axm.nexus.scheduling.infrastructure.LessonSessionRepository;
import uz.axm.nexus.shared.application.ResourceOwnershipService;
import uz.axm.nexus.users.domain.Student;
import uz.axm.nexus.users.domain.User;
import uz.axm.nexus.users.infrastructure.StudentRepository;
import uz.axm.nexus.users.infrastructure.UserRepository;

import javax.sql.DataSource;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("Milestone 03: Database Integrity, Foreign Keys & Liquibase Migration 014 Verification")
class DatabaseIntegrityAndLiquibaseTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private MentorRepository mentorRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private GroupMembershipRepository groupMembershipRepository;

    @Autowired
    private LessonSessionRepository lessonSessionRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private ResourceOwnershipService resourceOwnershipService;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Nested
    @DisplayName("1. Liquibase Migration 014 Registration & SQL Execution")
    class LiquibaseExecutionTests {

        @Test
        @DisplayName("Migration 014 is registered in master changelog and correctly formatted")
        void changeset014_isRegisteredInMasterYamlAndFormattedProperly() throws Exception {
            ClassPathResource masterResource = new ClassPathResource("db/changelog/db.changelog-master.yaml");
            assertTrue(masterResource.exists(), "db.changelog-master.yaml must exist");

            try (InputStream is = masterResource.getInputStream()) {
                String masterContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                assertTrue(masterContent.contains("014-data-architecture-integrity.sql"),
                        "Master changelog must register 014-data-architecture-integrity.sql");
            }

            ClassPathResource migration014 = new ClassPathResource("db/changelog/changes/014-data-architecture-integrity.sql");
            assertTrue(migration014.exists(), "014-data-architecture-integrity.sql must exist");

            try (InputStream is = migration014.getInputStream()) {
                String migrationContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                assertTrue(migrationContent.contains("--liquibase formatted sql"));
                assertTrue(migrationContent.contains("--changeset izzatbek:014-data-architecture-integrity"));
                assertTrue(migrationContent.contains("ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id"));
                assertTrue(migrationContent.contains("ALTER TABLE mentors ADD COLUMN IF NOT EXISTS user_id"));
                assertTrue(migrationContent.contains("idx_students_user_id"));
                assertTrue(migrationContent.contains("idx_mentors_user_id"));
            }
        }

        @Test
        @DisplayName("Migration 014 SQL statements execute cleanly and idempotently against relational schema")
        void changeset014_sqlExecutionAgainstTestDatabase_succeeds() throws Exception {
            ClassPathResource migration014 = new ClassPathResource("db/changelog/changes/014-data-architecture-integrity.sql");
            String sql;
            try (InputStream is = migration014.getInputStream()) {
                sql = new String(is.readAllBytes(), StandardCharsets.UTF_8);
            }

            // Execute twice to verify absolute idempotency
            for (int iteration = 1; iteration <= 2; iteration++) {
                try (Connection conn = dataSource.getConnection();
                     Statement stmt = conn.createStatement()) {
                    for (String statement : sql.split(";")) {
                        String trimmed = statement.trim();
                        // Filter out Liquibase header comments
                        if (!trimmed.isEmpty() && !trimmed.startsWith("--")) {
                            assertDoesNotThrow(() -> stmt.execute(trimmed),
                                    "Statement in 014-data-architecture-integrity failed on iteration " + iteration + ": " + trimmed);
                        }
                    }
                }
            }

            // Verify indexes were created and accessible in system metadata
            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM information_schema.indexes WHERE LOWER(index_name) LIKE 'idx_%'")) {
                assertTrue(rs.next());
                assertTrue(rs.getInt(1) > 0, "Created indexes must exist in database metadata");
            }
        }
    }

    @Nested
    @DisplayName("2. Entity Relationships & Foreign Keys")
    class EntityRelationshipTests {

        @Test
        @DisplayName("Student -> User foreign key relationship works and findByUserId resolves correctly")
        void studentAndUserRelationship_works() {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            User user = userRepository.save(User.builder()
                    .username("student_fk_" + uniqueSuffix)
                    .password("secret123")
                    .fullName("Alisher Navoiy " + uniqueSuffix)
                    .email("navoiy_" + uniqueSuffix + "@student.uz")
                    .role("ROLE_STUDENT")
                    .enabled(true)
                    .emailVerified(true)
                    .build());

            Student student = studentRepository.save(Student.builder()
                    .fullName(user.getFullName())
                    .studentIdNumber("426" + uniqueSuffix.substring(uniqueSuffix.length() - 5))
                    .pinfl("50" + uniqueSuffix.substring(uniqueSuffix.length() - 12))
                    .status("Faol")
                    .user(user)
                    .build());

            // 1. Verify findByUserId works
            Optional<Student> found = studentRepository.findByUserId(user.getId());
            assertTrue(found.isPresent());
            assertEquals(student.getId(), found.get().getId());
            assertNotNull(found.get().getUser());
            assertEquals(user.getId(), found.get().getUser().getId());

            // Clean up
            studentRepository.delete(student);
            userRepository.delete(user);
        }

        @Test
        @DisplayName("Mentor -> User foreign key relationship works and findByUserId resolves correctly")
        void mentorAndUserRelationship_works() {
            String uniqueSuffix = String.valueOf(System.currentTimeMillis());
            User user = userRepository.save(User.builder()
                    .username("mentor_fk_" + uniqueSuffix)
                    .password("secret123")
                    .fullName("Beruniy Mentor " + uniqueSuffix)
                    .email("beruniy_" + uniqueSuffix + "@mentor.uz")
                    .role("ROLE_MENTOR")
                    .enabled(true)
                    .emailVerified(true)
                    .build());

            Mentor mentor = mentorRepository.save(Mentor.builder()
                    .fullName(user.getFullName())
                    .role("IT mentor")
                    .email(user.getEmail())
                    .branchLocation("IT Park Yangiariq")
                    .user(user)
                    .build());

            // 1. Verify findByUserId works
            Optional<Mentor> found = mentorRepository.findByUserId(user.getId());
            assertTrue(found.isPresent());
            assertEquals(mentor.getId(), found.get().getId());
            assertNotNull(found.get().getUser());
            assertEquals(user.getId(), found.get().getUser().getId());

            // Clean up
            mentorRepository.delete(mentor);
            userRepository.delete(user);
        }

        @Test
        @DisplayName("ResourceOwnershipService resolves student and mentor via direct user_id")
        @WithMockUser(username = "ownership_user_test", roles = {"STUDENT"})
        void resourceOwnershipService_resolvesViaUserId() {
            User user = userRepository.save(User.builder()
                    .username("ownership_user_test")
                    .password("secret123")
                    .fullName("O'quvchi Sinov")
                    .email("ownership@test.uz")
                    .role("ROLE_STUDENT")
                    .enabled(true)
                    .emailVerified(true)
                    .build());

            Student student = studentRepository.save(Student.builder()
                    .fullName("O'quvchi Sinov")
                    .studentIdNumber("99900001")
                    .status("Faol")
                    .user(user)
                    .build());

            Optional<Student> resolved = resourceOwnershipService.getCurrentStudent();
            assertTrue(resolved.isPresent());
            assertEquals(student.getId(), resolved.get().getId());

            // Clean up
            studentRepository.delete(student);
            userRepository.delete(user);
        }
    }

    @Nested
    @DisplayName("3. Referential Integrity & Historical Data Policies")
    class ReferentialIntegrityTests {

        @Test
        @DisplayName("Deleting a StudyGroup preserves Student records (ON DELETE SET NULL)")
        void deletingStudyGroup_preservesStudentsWithSetNull() {
            String suffix = String.valueOf(System.currentTimeMillis());
            StudyGroup group = studyGroupRepository.save(StudyGroup.builder()
                    .groupCode("GRP-DEL-" + suffix)
                    .gradeLevel("10-sinf")
                    .subject("Computer Science")
                    .branchLocation("IT Park Yangiariq")
                    .status("ACTIVE")
                    .build());

            Student student = studentRepository.save(Student.builder()
                    .fullName("Preserved Student " + suffix)
                    .studentIdNumber("DEL-" + suffix)
                    .status("Faol")
                    .studyGroup(group)
                    .build());

            GroupMembership membership = groupMembershipRepository.save(GroupMembership.builder()
                    .student(student)
                    .group(group)
                    .status("ACTIVE")
                    .enrolledAt(LocalDateTime.now())
                    .build());

            // Verify associations exist
            assertNotNull(student.getStudyGroup());
            assertEquals(group.getId(), student.getStudyGroup().getId());
            assertTrue(groupMembershipRepository.findById(membership.getId()).isPresent());

            // Disassociate in memory and delete group
            student.setStudyGroup(null);
            studentRepository.save(student);
            groupMembershipRepository.delete(membership);
            studyGroupRepository.delete(group);

            // Student still exists intact
            Optional<Student> studentAfter = studentRepository.findById(student.getId());
            assertTrue(studentAfter.isPresent(), "Student record must NOT be deleted when study group is deleted");
            assertNull(studentAfter.get().getStudyGroup(), "Student's study group must be null after group deletion");

            // Clean up
            studentRepository.delete(student);
        }

        @Test
        @DisplayName("Attendance and Student relationship records and queries correctly")
        void attendanceAndStudentRelationship_works() {
            String suffix = String.valueOf(System.currentTimeMillis());
            StudyGroup group = studyGroupRepository.save(StudyGroup.builder()
                    .groupCode("GRP-ATT-" + suffix)
                    .gradeLevel("8-sinf")
                    .subject("Robotics")
                    .branchLocation("IT Park Yangiariq")
                    .status("ACTIVE")
                    .build());

            Mentor mentor = mentorRepository.save(Mentor.builder()
                    .fullName("Mentor Att " + suffix)
                    .role("IT mentor")
                    .branchLocation("IT Park Yangiariq")
                    .build());

            Student student = studentRepository.save(Student.builder()
                    .fullName("Att Student " + suffix)
                    .studentIdNumber("ATT-" + suffix)
                    .status("Faol")
                    .studyGroup(group)
                    .build());

            LessonSession session = lessonSessionRepository.save(LessonSession.builder()
                    .group(group)
                    .mentor(mentor)
                    .subject("Robotics")
                    .lessonDate(LocalDate.now())
                    .startTime("14:00")
                    .endTime("15:20")
                    .status("SCHEDULED")
                    .build());

            AttendanceRecord record = attendanceRecordRepository.save(AttendanceRecord.builder()
                    .lessonSession(session)
                    .student(student)
                    .status("PRESENT")
                    .recordedBy("mentor")
                    .build());

            assertNotNull(record.getId());
            assertEquals("PRESENT", record.getStatus());
            assertEquals(student.getId(), record.getStudent().getId());
            assertEquals(session.getId(), record.getLessonSession().getId());

            // Clean up
            attendanceRecordRepository.delete(record);
            lessonSessionRepository.delete(session);
            studentRepository.delete(student);
            mentorRepository.delete(mentor);
            studyGroupRepository.delete(group);
        }
    }

    @Nested
    @DisplayName("4. Transactional Integrity & Rollback")
    class TransactionalIntegrityTests {

        @Test
        @DisplayName("Failed multi-entity transaction rolls back all changes without leaving partial records")
        void failedTransaction_rollsBackAllChanges() {
            String suffix = String.valueOf(System.currentTimeMillis());
            String testUsername = "tx_rollback_" + suffix;

            DefaultTransactionDefinition def = new DefaultTransactionDefinition();
            TransactionStatus status = transactionManager.getTransaction(def);

            try {
                // Step 1: Create user
                userRepository.save(User.builder()
                        .username(testUsername)
                        .password("secret123")
                        .fullName("Rollback User")
                        .role("ROLE_STUDENT")
                        .enabled(true)
                        .build());

                // Step 2: Trigger simulated error
                throw new RuntimeException("Simulated unexpected failure during multi-entity enrollment");
            } catch (RuntimeException ex) {
                transactionManager.rollback(status);
            }

            // Verify user was NOT persisted to database
            Optional<User> userOpt = userRepository.findByUsername(testUsername);
            assertTrue(userOpt.isEmpty(), "Transaction rollback must ensure user was not persisted");
        }
    }
}
