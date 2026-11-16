--liquibase formatted sql
--changeset izzatbek:022-branch-and-room-integrity
--validCheckSum: ANY

-- ==============================================================================
-- MODULE: Branches, Classrooms & Capacity Integrity Stabilization
-- ==============================================================================

-- 1. Enhance Rooms table with room_type and status columns
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'IT_LAB';
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'ACTIVE';

-- 2. Performance Indexes for Classrooms
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status);
CREATE INDEX IF NOT EXISTS idx_rooms_branch_status ON rooms (branch_id, status);

-- 3. Safely Backfill Real Classrooms for Branch ITP-YANGIARIQ
-- Preserving historical strings used in StudyGroups and Schedules ("IT-2", "IT Lab 1", "IT Lab 2")
INSERT INTO rooms (name, branch_location, capacity, room_type, status, branch_id, created_at, updated_at)
SELECT 'IT-2', 'IT Park Yangiariq', 16, 'IT_LAB', 'ACTIVE', b.id, NOW(), NOW()
FROM branches b
WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (
      SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND LOWER(r.name) = LOWER('IT-2')
  );

INSERT INTO rooms (name, branch_location, capacity, room_type, status, branch_id, created_at, updated_at)
SELECT 'IT Lab 1', 'IT Park Yangiariq', 16, 'IT_LAB', 'ACTIVE', b.id, NOW(), NOW()
FROM branches b
WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (
      SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND LOWER(r.name) = LOWER('IT Lab 1')
  );

INSERT INTO rooms (name, branch_location, capacity, room_type, status, branch_id, created_at, updated_at)
SELECT 'IT Lab 2', 'IT Park Yangiariq', 16, 'IT_LAB', 'ACTIVE', b.id, NOW(), NOW()
FROM branches b
WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (
      SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND LOWER(r.name) = LOWER('IT Lab 2')
  );

INSERT INTO rooms (name, branch_location, capacity, room_type, status, branch_id, created_at, updated_at)
SELECT 'Nazariy xona 1', 'IT Park Yangiariq', 20, 'THEORY_ROOM', 'ACTIVE', b.id, NOW(), NOW()
FROM branches b
WHERE b.code = 'ITP-YANGIARIQ'
  AND NOT EXISTS (
      SELECT 1 FROM rooms r WHERE r.branch_id = b.id AND LOWER(r.name) = LOWER('Nazariy xona 1')
  );

-- 4. Ensure Student Branch Association Integrity
UPDATE students s
SET branch_id = g.branch_id
FROM study_groups g
WHERE s.group_id = g.id
  AND s.branch_id IS NULL
  AND g.branch_id IS NOT NULL;

-- 5. Synchronize Denormalized Study Group student_count with Active Group Memberships
UPDATE study_groups sg
SET student_count = (
    SELECT COUNT(*)
    FROM group_memberships gm
    WHERE gm.group_id = sg.id AND gm.status = 'ACTIVE'
)
WHERE EXISTS (
    SELECT 1 FROM group_memberships gm WHERE gm.group_id = sg.id
);
