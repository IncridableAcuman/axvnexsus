# AXM Nexus — Database Entity Relationship (ER) Diagram
**Platform:** AXM Nexus — Muhammad al-Xorazmiy Vorislari Digital Education Management Platform  
**Target Branch:** IT Park Yangiariq  
**Milestone:** 03 — Data Architecture & Liquibase Migration 014  

---

```mermaid
erDiagram
    %% =========================================================================
    %% 1. IDENTITY & RBAC DOMAIN
    %% =========================================================================
    USERS {
        bigint id PK
        varchar username UK
        varchar password
        varchar full_name
        varchar email
        varchar phone
        varchar role
        boolean enabled
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }

    ROLES {
        bigint id PK
        varchar name UK
        varchar description
        boolean is_system
        timestamp created_at
        timestamp updated_at
    }

    PERMISSIONS {
        bigint id PK
        varchar name UK
        varchar category
        varchar description
        timestamp created_at
        timestamp updated_at
    }

    USER_ROLES {
        bigint user_id PK,FK
        bigint role_id PK,FK
        timestamp assigned_at
        varchar assigned_by
    }

    ROLE_PERMISSIONS {
        bigint role_id PK,FK
        bigint permission_id PK,FK
    }

    USER_PREFERENCES {
        bigint id PK
        bigint user_id UK,FK
        varchar locale
        varchar theme
        boolean reduced_motion
        varchar date_format
        timestamp created_at
        timestamp updated_at
    }

    EMAIL_VERIFICATION_TOKENS {
        bigint id PK
        varchar token UK
        varchar code
        bigint user_id FK
        timestamp expiry_date
        boolean used
        timestamp created_at
    }

    PASSWORD_RESET_TOKENS {
        bigint id PK
        varchar token UK
        bigint user_id FK
        timestamp expiry_date
        boolean used
        timestamp created_at
    }

    USERS ||--o{ USER_ROLES : has
    ROLES ||--o{ USER_ROLES : assigned_to
    ROLES ||--o{ ROLE_PERMISSIONS : contains
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : grants
    USERS ||--o| USER_PREFERENCES : configures
    USERS ||--o{ EMAIL_VERIFICATION_TOKENS : verifies
    USERS ||--o{ PASSWORD_RESET_TOKENS : resets

    %% =========================================================================
    %% 2. EDUCATION STRUCTURE & MENTORS
    %% =========================================================================
    ACADEMIC_PERIODS {
        bigint id PK
        varchar name
        varchar code UK
        date start_date
        date end_date
        boolean is_active
        timestamp created_at
    }

    ROOMS {
        bigint id PK
        varchar name
        varchar branch_location
        int capacity
        timestamp created_at
    }

    MENTORS {
        bigint id PK
        bigint user_id FK
        varchar full_name
        varchar role
        varchar phone
        varchar email
        varchar branch_location
        text bio
        timestamp created_at
        timestamp updated_at
    }

    MENTOR_PROFILES {
        bigint id PK
        bigint mentor_id UK,FK
        bigint user_id FK
        varchar display_name
        varchar headline
        text bio
        int years_of_experience
        varchar branch_location
        varchar phone
        varchar email
        boolean is_contact_public
        varchar publication_status
        timestamp created_at
    }

    MENTOR_SKILLS {
        bigint id PK
        bigint profile_id FK
        varchar skill_name
        varchar proficiency_level
        varchar category
    }

    MENTOR_EXPERIENCES {
        bigint id PK
        bigint profile_id FK
        varchar company_name
        varchar role_title
        text description
        date start_date
        date end_date
        boolean is_current
    }

    MENTOR_EDUCATIONS {
        bigint id PK
        bigint profile_id FK
        varchar institution
        varchar degree_or_certificate
        varchar field_of_study
        int issue_year
        varchar verification_status
    }

    STUDY_GROUPS {
        bigint id PK
        varchar group_code UK
        varchar grade_level
        varchar subject
        varchar branch_location
        varchar schedule_days
        varchar schedule_time
        varchar room
        bigint mentor_id FK
        bigint academic_period_id FK
        int student_count
        int max_capacity
        varchar status
        timestamp created_at
    }

    STUDENTS {
        bigint id PK
        bigint user_id FK
        varchar full_name
        varchar pinfl
        varchar student_id_number
        varchar district
        varchar grade_level
        varchar branch_location
        varchar phone
        varchar direction
        varchar status
        bigint group_id FK
        bigint mentor_id FK
        timestamp created_at
        timestamp updated_at
    }

    GROUP_MEMBERSHIPS {
        bigint id PK
        bigint student_id FK
        bigint group_id FK
        varchar status
        timestamp enrolled_at
        timestamp left_at
        text transfer_reason
        bigint previous_group_id FK
    }

    USERS ||--o| MENTORS : authenticated_as
    USERS ||--o| STUDENTS : authenticated_as
    MENTORS ||--o| MENTOR_PROFILES : profile
    MENTOR_PROFILES ||--o{ MENTOR_SKILLS : possesses
    MENTOR_PROFILES ||--o{ MENTOR_EXPERIENCES : experienced_in
    MENTOR_PROFILES ||--o{ MENTOR_EDUCATIONS : educated_at
    ACADEMIC_PERIODS ||--o{ STUDY_GROUPS : defines
    MENTORS ||--o{ STUDY_GROUPS : leads
    STUDY_GROUPS ||--o{ STUDENTS : contains
    MENTORS ||--o{ STUDENTS : supervises
    STUDENTS ||--o{ GROUP_MEMBERSHIPS : enrolled_in
    STUDY_GROUPS ||--o{ GROUP_MEMBERSHIPS : receives

    %% =========================================================================
    %% 3. SCHEDULING & ATTENDANCE
    %% =========================================================================
    SCHEDULES {
        bigint id PK
        bigint group_id FK
        bigint mentor_id FK
        varchar grade_level
        varchar subject
        varchar days
        varchar start_time
        varchar end_time
        varchar room
        varchar branch_location
        int duration_minutes
        timestamp created_at
    }

    LESSON_SESSIONS {
        bigint id PK
        bigint schedule_id FK
        bigint group_id FK
        bigint mentor_id FK
        varchar room
        varchar subject
        varchar topic
        date lesson_date
        varchar start_time
        varchar end_time
        varchar status
        text notes
        timestamp created_at
    }

    ATTENDANCE_RECORDS {
        bigint id PK
        bigint lesson_session_id FK
        bigint student_id FK
        varchar status
        text notes
        varchar recorded_by
        timestamp recorded_at
    }

    STUDY_GROUPS ||--o{ SCHEDULES : scheduled_for
    MENTORS ||--o{ SCHEDULES : assigned_to
    SCHEDULES ||--o{ LESSON_SESSIONS : generates
    STUDY_GROUPS ||--o{ LESSON_SESSIONS : hosts
    MENTORS ||--o{ LESSON_SESSIONS : delivers
    LESSON_SESSIONS ||--o{ ATTENDANCE_RECORDS : logs
    STUDENTS ||--o{ ATTENDANCE_RECORDS : records_for

    %% =========================================================================
    %% 4. LESSON MANAGEMENT & QUALITY
    %% =========================================================================
    LESSONS {
        bigint id PK
        varchar title
        varchar subject
        varchar grade_level
        varchar topic
        text learning_objectives
        text expected_outcomes
        text required_materials
        text theory_content
        text practical_content
        text exercises
        text homework
        int duration_minutes
        bigint group_id FK
        bigint mentor_id FK
        bigint schedule_id FK
        varchar status
        text presentation_slides
        boolean is_template
        timestamp created_at
    }

    LESSON_REVISIONS {
        bigint id PK
        bigint lesson_id FK
        int revision_number
        varchar title
        text content_snapshot
        varchar changed_by
        timestamp created_at
    }

    STUDENT_LESSON_PROGRESS {
        bigint id PK
        bigint lesson_id FK
        bigint student_id FK
        varchar status
        int score
        text mentor_feedback
        timestamp updated_at
    }

    LEARNING_RESOURCES {
        bigint id PK
        varchar title
        text description
        varchar resource_type
        varchar file_name
        bigint file_size
        varchar storage_key
        varchar mime_type
        text external_url
        varchar subject
        varchar grade_level
        bigint lesson_id FK
        bigint mentor_id FK
        varchar publication_status
        boolean is_public
        int download_count
        timestamp created_at
    }

    LESSON_QUALITY_PLANS {
        bigint id PK
        bigint lesson_id UK,FK
        text learning_objectives
        text expected_competencies
        text required_prior_knowledge
        int theory_duration_minutes
        int practical_duration_minutes
        text teaching_methods
        text assessment_criteria
        timestamp created_at
    }

    LESSON_DELIVERY_RECORDS {
        bigint id PK
        bigint lesson_id FK
        bigint mentor_id FK
        int actual_duration_minutes
        text topics_covered
        int practical_exercises_completed
        text common_difficulties
        decimal student_participation_rate
        text what_worked_well
        varchar exercise_difficulty
        timestamp recorded_at
    }

    STUDENT_LEARNING_OUTCOME_EVALUATIONS {
        bigint id PK
        bigint lesson_id FK
        bigint student_id FK
        varchar objective_id
        varchar objective_title
        varchar status
        varchar evidence_source
        decimal evidence_score
        varchar evaluated_by
        timestamp evaluated_at
    }

    STUDY_GROUPS ||--o{ LESONS : taught_in
    MENTORS ||--o{ LESSONS : prepares
    LESSONS ||--o{ LESSON_REVISIONS : tracked_by
    LESSONS ||--o{ STUDENT_LESSON_PROGRESS : tracked_per_student
    STUDENTS ||--o{ STUDENT_LESSON_PROGRESS : achieves
    LESSONS ||--o{ LEARNING_RESOURCES : attaches
    LESSONS ||--o| LESSON_QUALITY_PLANS : evaluated_by
    LESSONS ||--o{ LESSON_DELIVERY_RECORDS : monitored_by
    LESSONS ||--o{ STUDENT_LEARNING_OUTCOME_EVALUATIONS : yields

    %% =========================================================================
    %% 5. ASSESSMENTS & ASSIGNMENTS
    %% =========================================================================
    ASSESSMENTS {
        bigint id PK
        varchar title
        text description
        varchar subject
        varchar grade_level
        varchar assessment_type
        int total_points
        int passing_score
        int duration_minutes
        int max_attempts
        boolean is_published
        bigint group_id FK
        bigint created_by_mentor_id FK
        timestamp created_at
    }

    ASSESSMENT_QUESTIONS {
        bigint id PK
        bigint assessment_id FK
        text question_text
        varchar question_type
        int points
        int order_index
        text options_json
        text correct_answers_json
        text explanation
    }

    STUDENT_ASSESSMENT_ATTEMPTS {
        bigint id PK
        bigint assessment_id FK
        bigint student_id FK
        int attempt_number
        timestamp started_at
        timestamp submitted_at
        int total_score
        int max_possible_score
        float percentage
        varchar status
        bigint graded_by_mentor_id FK
    }

    STUDENT_ANSWERS {
        bigint id PK
        bigint attempt_id FK
        bigint question_id FK
        text student_answer_text
        text selected_options_json
        int earned_points
        boolean is_correct
    }

    ASSIGNMENTS {
        bigint id PK
        varchar title
        text description
        varchar subject
        varchar grade_level
        bigint group_id FK
        bigint mentor_id FK
        timestamp deadline
        int max_points
        boolean is_active
        timestamp created_at
    }

    ASSIGNMENT_SUBMISSIONS {
        bigint id PK
        bigint assignment_id FK
        bigint student_id FK
        text submission_text
        text file_url
        timestamp submitted_at
        varchar status
        int score
        text feedback
        bigint graded_by_mentor_id FK
    }

    STUDY_GROUPS ||--o{ ASSESSMENTS : assigned_to
    ASSESSMENTS ||--o{ ASSESSMENT_QUESTIONS : contains
    ASSESSMENTS ||--o{ STUDENT_ASSESSMENT_ATTEMPTS : taken_as
    STUDENTS ||--o{ STUDENT_ASSESSMENT_ATTEMPTS : submits
    STUDENT_ASSESSMENT_ATTEMPTS ||--o{ STUDENT_ANSWERS : includes
    ASSESSMENT_QUESTIONS ||--o{ STUDENT_ANSWERS : answered_in
    STUDY_GROUPS ||--o{ ASSIGNMENTS : tasks
    ASSIGNMENTS ||--o{ ASSIGNMENT_SUBMISSIONS : received
    STUDENTS ||--o{ ASSIGNMENT_SUBMISSIONS : turns_in

    %% =========================================================================
    %% 6. GRADING, GAMIFICATION & PLATFORM OPERATIONS
    %% =========================================================================
    GRADE_RECORDS {
        bigint id PK
        bigint student_id FK
        varchar subject
        varchar grade_level
        bigint academic_period_id FK
        varchar evaluation_type
        int score
        int max_score
        varchar letter_grade
        boolean is_passing
        bigint mentor_id FK
        timestamp created_at
    }

    POINT_TRANSACTIONS {
        bigint id PK
        bigint student_id FK
        int amount
        varchar point_source
        varchar reference_id
        varchar idempotency_key UK
        varchar reason
        bigint awarded_by_user_id FK
        timestamp created_at
    }

    ACHIEVEMENTS {
        bigint id PK
        varchar code UK
        varchar title
        text description
        varchar icon
        varchar badge_color
        varchar category
        int xp_reward
        int criteria_threshold
        boolean is_active
        timestamp created_at
    }

    STUDENT_ACHIEVEMENTS {
        bigint id PK
        bigint student_id FK
        bigint achievement_id FK
        timestamp unlocked_at
        int progress_value
    }

    STUDENT_STREAKS {
        bigint id PK
        bigint student_id UK,FK
        int current_streak
        int longest_streak
        date last_activity_date
        int streak_freeze_count
        int total_active_days
        timestamp created_at
    }

    NOTIFICATIONS {
        bigint id PK
        bigint recipient_user_id FK
        varchar title
        text message
        varchar type
        boolean is_read
        timestamp read_at
        varchar deduplication_key
        timestamp created_at
    }

    NOTIFICATION_PREFERENCES {
        bigint id PK
        bigint user_id UK,FK
        boolean in_app_enabled
        boolean email_enabled
        boolean lesson_alerts
        boolean assignment_alerts
        boolean assessment_alerts
        varchar digest_frequency
        timestamp created_at
    }

    NOTIFICATION_OUTBOX {
        bigint id PK
        bigint notification_id FK
        varchar channel
        varchar recipient
        varchar subject
        text payload
        varchar status
        int attempts
        timestamp created_at
    }

    AUDIT_LOGS {
        bigint id PK
        varchar action
        varchar entity_name
        varchar entity_id
        varchar performed_by
        varchar outcome
        varchar ip_address
        text metadata
        timestamp created_at
    }

    AI_INTERACTION_LOGS {
        bigint id PK
        bigint user_id FK
        varchar provider
        varchar model
        varchar intent
        int prompt_length
        int response_length
        bigint duration_ms
        varchar status
        timestamp created_at
    }

    SYSTEM_CONFIGS {
        bigint id PK
        varchar config_key UK
        text config_value
        varchar category
        boolean is_secret
        timestamp created_at
    }

    STUDENTS ||--o{ GRADE_RECORDS : earned_by
    STUDENTS ||--o{ POINT_TRANSACTIONS : credited_to
    STUDENTS ||--o{ STUDENT_ACHIEVEMENTS : unlocked_by
    ACHIEVEMENTS ||--o{ STUDENT_ACHIEVEMENTS : awarded_in
    STUDENTS ||--o| STUDENT_STREAKS : tracks
    USERS ||--o{ NOTIFICATIONS : delivered_to
    USERS ||--o| NOTIFICATION_PREFERENCES : configures
    NOTIFICATIONS ||--o{ NOTIFICATION_OUTBOX : dispatches
    USERS ||--o{ AI_INTERACTION_LOGS : initiated_by
```
