package uz.axm.nexus.lessons.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.axm.nexus.lessons.domain.Lesson;
import uz.axm.nexus.lessons.domain.LessonRevision;
import uz.axm.nexus.lessons.domain.StudentLessonProgress;
import uz.axm.nexus.lessons.infrastructure.LessonRepository;
import uz.axm.nexus.lessons.infrastructure.LessonRevisionRepository;
import uz.axm.nexus.lessons.infrastructure.StudentLessonProgressRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class LessonService {

    private final LessonRepository lessonRepository;
    private final LessonRevisionRepository revisionRepository;
    private final StudentLessonProgressRepository progressRepository;

    private static final Set<String> VALID_STATUSES = Set.of(
            "DRAFT", "REVIEW", "PUBLISHED", "COMPLETED", "CANCELLED", "ARCHIVED"
    );

    public List<Lesson> getAllLessons() {
        return lessonRepository.findAll();
    }

    public Lesson getLessonById(Long id) {
        return lessonRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dars topilmadi: " + id));
    }

    public List<Lesson> getLessonsByGroup(Long groupId) {
        return lessonRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public List<Lesson> getLessonsByMentor(Long mentorId) {
        return lessonRepository.findByMentorIdOrderByCreatedAtDesc(mentorId);
    }

    public List<Lesson> getTemplates() {
        return lessonRepository.findByIsTemplateTrue();
    }

    @Transactional
    public Lesson createLesson(Lesson lesson) {
        validateRequiredFields(lesson);

        if (lesson.getStatus() == null || lesson.getStatus().isBlank()) {
            lesson.setStatus("DRAFT");
        }
        if (lesson.getDurationMinutes() == null || lesson.getDurationMinutes() <= 0) {
            lesson.setDurationMinutes(80);
        }
        if (lesson.getTheoryDurationMinutes() == null) {
            lesson.setTheoryDurationMinutes(20);
        }
        if (lesson.getPracticalDurationMinutes() == null) {
            lesson.setPracticalDurationMinutes(25);
        }

        lesson.setCreatedAt(LocalDateTime.now());
        Lesson saved = lessonRepository.save(lesson);
        log.info("Yangi dars rejasi yaratildi: ID={}, Title={}, Status={}", saved.getId(), saved.getTitle(), saved.getStatus());
        return saved;
    }

    @Transactional
    public Lesson updateLesson(Long id, Lesson updated, String changedBy, String changeSummary) {
        Lesson existing = getLessonById(id);

        validateRequiredFields(updated);

        // If the lesson was already PUBLISHED or COMPLETED, save revision history
        if ("PUBLISHED".equals(existing.getStatus()) || "COMPLETED".equals(existing.getStatus())) {
            int nextRev = (int) revisionRepository.countByLessonId(id) + 1;
            LessonRevision rev = LessonRevision.builder()
                    .lessonId(id)
                    .revisionNumber(nextRev)
                    .title(existing.getTitle())
                    .contentSnapshot(createSnapshot(existing))
                    .changedBy(changedBy != null ? changedBy : "mentor")
                    .changeSummary(changeSummary != null ? changeSummary : "Dars mazmuni tahrirlandi")
                    .createdAt(LocalDateTime.now())
                    .build();
            revisionRepository.save(rev);
            log.info("Dars tahrirlandi va reviziya saqlandi: LessonID={}, Rev={}", id, nextRev);
        }

        existing.setTitle(updated.getTitle());
        existing.setSubject(updated.getSubject());
        existing.setGradeLevel(updated.getGradeLevel());
        existing.setTopic(updated.getTopic());
        existing.setLearningObjectives(updated.getLearningObjectives());
        existing.setExpectedOutcomes(updated.getExpectedOutcomes());
        existing.setRequiredMaterials(updated.getRequiredMaterials());
        existing.setTheoryContent(updated.getTheoryContent());
        existing.setTheoryDurationMinutes(updated.getTheoryDurationMinutes());
        existing.setPracticalContent(updated.getPracticalContent());
        existing.setPracticalDurationMinutes(updated.getPracticalDurationMinutes());
        existing.setExercises(updated.getExercises());
        existing.setHomework(updated.getHomework());
        existing.setDurationMinutes(updated.getDurationMinutes());
        existing.setGroupId(updated.getGroupId());
        existing.setMentorId(updated.getMentorId());
        existing.setScheduleId(updated.getScheduleId());
        existing.setActualOutcome(updated.getActualOutcome());
        existing.setMentorNotes(updated.getMentorNotes());
        existing.setPresentationSlides(updated.getPresentationSlides());
        existing.setIsTemplate(updated.getIsTemplate());
        existing.setUpdatedAt(LocalDateTime.now());

        return lessonRepository.save(existing);
    }

    @Transactional
    public Lesson updatePresentationSlides(Long id, String presentationSlides) {
        Lesson existing = getLessonById(id);
        existing.setPresentationSlides(presentationSlides);
        existing.setUpdatedAt(LocalDateTime.now());
        log.info("Dars ma'ruza slaydlari yangilandi: LessonID={}", id);
        return lessonRepository.save(existing);
    }

    /**
     * Explicit lifecycle state machine transitions:
     * DRAFT -> REVIEW, PUBLISHED, ARCHIVED
     * REVIEW -> PUBLISHED, DRAFT, ARCHIVED
     * PUBLISHED -> COMPLETED, CANCELLED, ARCHIVED
     * COMPLETED -> ARCHIVED
     * CANCELLED -> ARCHIVED, DRAFT
     * ARCHIVED -> DRAFT (restore)
     */
    @Transactional
    public Lesson transitionStatus(Long id, String targetStatus, String reason) {
        Lesson lesson = getLessonById(id);
        String currentStatus = lesson.getStatus();

        targetStatus = targetStatus.toUpperCase().trim();
        if (!VALID_STATUSES.contains(targetStatus)) {
            throw new IllegalArgumentException("Noto'g'ri status: " + targetStatus);
        }

        if (currentStatus.equals(targetStatus)) {
            return lesson;
        }

        boolean validTransition = switch (currentStatus) {
            case "DRAFT" -> targetStatus.equals("REVIEW") || targetStatus.equals("PUBLISHED") || targetStatus.equals("ARCHIVED");
            case "REVIEW" -> targetStatus.equals("PUBLISHED") || targetStatus.equals("DRAFT") || targetStatus.equals("ARCHIVED");
            case "PUBLISHED" -> targetStatus.equals("COMPLETED") || targetStatus.equals("CANCELLED") || targetStatus.equals("ARCHIVED");
            case "COMPLETED" -> targetStatus.equals("ARCHIVED");
            case "CANCELLED" -> targetStatus.equals("ARCHIVED") || targetStatus.equals("DRAFT");
            case "ARCHIVED" -> targetStatus.equals("DRAFT");
            default -> false;
        };

        if (!validTransition) {
            throw new IllegalStateException(
                    String.format("Statusni '%s' holatidan '%s' holatiga o'tkazish taqiqlangan!", currentStatus, targetStatus)
            );
        }

        // Additional validation when publishing
        if ("PUBLISHED".equals(targetStatus)) {
            if (lesson.getGroupId() == null) {
                throw new IllegalStateException("Darsni chop etish (PUBLISH) uchun biriktirilgan guruh ko'rsatilishi shart!");
            }
        }

        lesson.setStatus(targetStatus);
        lesson.setUpdatedAt(LocalDateTime.now());
        if (reason != null && !reason.isBlank()) {
            String note = (lesson.getMentorNotes() != null ? lesson.getMentorNotes() + "\n" : "") +
                    "[" + LocalDateTime.now() + "] Status o'zgardi (" + targetStatus + "): " + reason;
            lesson.setMentorNotes(note);
        }

        Lesson saved = lessonRepository.save(lesson);
        log.info("Dars statusi yangilandi: ID={}, {} -> {}", id, currentStatus, targetStatus);
        return saved;
    }

    /**
     * Clones an existing lesson as a new reusable template or draft for another group.
     */
    @Transactional
    public Lesson cloneLesson(Long sourceLessonId, Long targetGroupId, Long targetMentorId, String newTitle) {
        Lesson source = getLessonById(sourceLessonId);

        Lesson clone = Lesson.builder()
                .title(newTitle != null && !newTitle.isBlank() ? newTitle : source.getTitle() + " (Nusxa)")
                .subject(source.getSubject())
                .gradeLevel(source.getGradeLevel())
                .topic(source.getTopic())
                .learningObjectives(source.getLearningObjectives())
                .expectedOutcomes(source.getExpectedOutcomes())
                .requiredMaterials(source.getRequiredMaterials())
                .theoryContent(source.getTheoryContent())
                .theoryDurationMinutes(source.getTheoryDurationMinutes())
                .practicalContent(source.getPracticalContent())
                .practicalDurationMinutes(source.getPracticalDurationMinutes())
                .exercises(source.getExercises())
                .homework(source.getHomework())
                .durationMinutes(source.getDurationMinutes())
                .groupId(targetGroupId != null ? targetGroupId : source.getGroupId())
                .mentorId(targetMentorId != null ? targetMentorId : source.getMentorId())
                .status("DRAFT")
                .isTemplate(false)
                .createdAt(LocalDateTime.now())
                .build();

        return lessonRepository.save(clone);
    }

    public List<LessonRevision> getLessonRevisions(Long lessonId) {
        return revisionRepository.findByLessonIdOrderByRevisionNumberDesc(lessonId);
    }

    // Student Lesson Progress
    public List<StudentLessonProgress> getLessonProgress(Long lessonId) {
        return progressRepository.findByLessonId(lessonId);
    }

    @Transactional
    public StudentLessonProgress recordStudentProgress(Long lessonId, Long studentId, String status, Integer score, String feedback) {
        StudentLessonProgress progress = progressRepository.findByLessonIdAndStudentId(lessonId, studentId)
                .orElse(StudentLessonProgress.builder()
                        .lessonId(lessonId)
                        .studentId(studentId)
                        .build());

        if (status != null && !status.isBlank()) {
            progress.setStatus(status.toUpperCase().trim());
        }
        if (score != null) {
            progress.setScore(Math.max(0, Math.min(100, score)));
        }
        if (feedback != null) {
            progress.setMentorFeedback(feedback);
        }

        return progressRepository.save(progress);
    }

    @Transactional
    public void deleteLesson(Long id) {
        Lesson lesson = getLessonById(id);
        if ("PUBLISHED".equals(lesson.getStatus()) || "COMPLETED".equals(lesson.getStatus())) {
            throw new IllegalStateException("Chop etilgan yoki yakunlangan darsni to'g'ridan-to'g'ri o'chirib bo'lmaydi. Statusni ARCHIVED holatiga o'tkazing.");
        }
        lessonRepository.delete(lesson);
    }

    private void validateRequiredFields(Lesson lesson) {
        if (lesson.getTitle() == null || lesson.getTitle().isBlank()) {
            throw new IllegalArgumentException("Dars nomi kiritilishi shart!");
        }
        if (lesson.getSubject() == null || lesson.getSubject().isBlank()) {
            throw new IllegalArgumentException("Dars fani ko'rsatilishi shart!");
        }
        if (lesson.getGradeLevel() == null || lesson.getGradeLevel().isBlank()) {
            throw new IllegalArgumentException("Sinf darajasi (8, 9, 10, 11) ko'rsatilishi shart!");
        }
    }

    private String createSnapshot(Lesson lesson) {
        return String.format(
                "Title: %s | Topic: %s | Theory: %s (%dm) | Practical: %s (%dm) | Exercises: %s | Homework: %s",
                lesson.getTitle(), lesson.getTopic(), lesson.getTheoryContent(),
                lesson.getTheoryDurationMinutes(), lesson.getPracticalContent(),
                lesson.getPracticalDurationMinutes(), lesson.getExercises(), lesson.getHomework()
        );
    }
}
