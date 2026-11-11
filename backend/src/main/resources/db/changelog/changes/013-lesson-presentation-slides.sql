--liquibase formatted sql
--changeset izzatbek:013-lesson-presentation-slides

-- Add presentation_slides column to lessons table for rich-text AI lecture presentations
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS presentation_slides TEXT;
