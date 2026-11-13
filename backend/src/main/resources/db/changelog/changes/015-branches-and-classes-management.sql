--liquibase formatted sql
--changeset izzatbek:015-branches-and-classes-management
--validCheckSum: ANY

-- ==============================================================================
-- MILESTONE 11: Multi-Branch & Educational Classes Management Structure
-- ==============================================================================

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    region VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    address VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 2. Seed Default Operational Branch (IT Park Yangiariq) if not present
INSERT INTO branches (name, code, description, region, district, address, phone, email, status, created_at, updated_at)
SELECT 'IT Park Yangiariq filiali', 'ITP-YANGIARIQ', 'Al-Xorazmiy Vorislari tizimidagi tayanch IT markazi va inkubatsiya filiali', 'Xorazm viloyati', 'Yangiariq tumani', 'Mustaqillik ko‘chasi, 24-uy', '+998 62 227 12 34', 'yangiariq@axm.uz', 'ACTIVE', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE code = 'ITP-YANGIARIQ');

-- 3. Add branch_id Foreign Keys to Related Tables
ALTER TABLE study_groups ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE mentors ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS branch_id BIGINT REFERENCES branches(id) ON DELETE SET NULL;

-- 4. Backfill branch_id from Existing branch_location Data
UPDATE study_groups
SET branch_id = (SELECT id FROM branches WHERE code = 'ITP-YANGIARIQ')
WHERE branch_id IS NULL AND (branch_location IS NULL OR branch_location LIKE '%Yangiariq%');

UPDATE rooms
SET branch_id = (SELECT id FROM branches WHERE code = 'ITP-YANGIARIQ')
WHERE branch_id IS NULL AND (branch_location IS NULL OR branch_location LIKE '%Yangiariq%');

UPDATE students
SET branch_id = (SELECT id FROM branches WHERE code = 'ITP-YANGIARIQ')
WHERE branch_id IS NULL AND (branch_location IS NULL OR branch_location LIKE '%Yangiariq%');

UPDATE mentors
SET branch_id = (SELECT id FROM branches WHERE code = 'ITP-YANGIARIQ')
WHERE branch_id IS NULL AND (branch_location IS NULL OR branch_location LIKE '%Yangiariq%');

UPDATE schedules
SET branch_id = (SELECT id FROM branches WHERE code = 'ITP-YANGIARIQ')
WHERE branch_id IS NULL AND (branch_location IS NULL OR branch_location LIKE '%Yangiariq%');

-- 5. Performance Indexes for Multi-Branch Queries
CREATE INDEX IF NOT EXISTS idx_branches_code ON branches (code);
CREATE INDEX IF NOT EXISTS idx_branches_status ON branches (status);
CREATE INDEX IF NOT EXISTS idx_branches_region ON branches (region);

CREATE INDEX IF NOT EXISTS idx_study_groups_branch_id ON study_groups (branch_id);
CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON rooms (branch_id);
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students (branch_id);
CREATE INDEX IF NOT EXISTS idx_mentors_branch_id ON mentors (branch_id);
CREATE INDEX IF NOT EXISTS idx_schedules_branch_id ON schedules (branch_id);
