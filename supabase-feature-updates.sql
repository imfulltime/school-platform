-- ===============================================
-- School Platform - Feature Updates SQL Script
-- Run this entire script in Supabase SQL Editor
-- ===============================================

-- 1. Add profile photo field to teacher_profiles table
ALTER TABLE teacher_profiles 
ADD COLUMN IF NOT EXISTS profile_photo TEXT;

COMMENT ON COLUMN teacher_profiles.profile_photo IS 'Base64 encoded profile photo image data';

-- 2. Ensure academic_year field is properly configured
ALTER TABLE student_profiles 
ALTER COLUMN academic_year TYPE TEXT;

-- 3. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_profiles_academic_year 
ON student_profiles (academic_year);

CREATE INDEX IF NOT EXISTS idx_student_profiles_grade_level 
ON student_profiles (grade_level);

CREATE INDEX IF NOT EXISTS idx_student_profiles_section 
ON student_profiles (section);

-- 4. Update classes table constraints and indexes
ALTER TABLE classes 
DROP CONSTRAINT IF EXISTS classes_name_year_section_teacher_id_key;

ALTER TABLE classes 
ADD CONSTRAINT classes_name_year_section_teacher_id_key 
UNIQUE (name, year, section, teacher_id);

CREATE INDEX IF NOT EXISTS idx_classes_year 
ON classes (year);

CREATE INDEX IF NOT EXISTS idx_classes_section 
ON classes (section);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_year 
ON classes (teacher_id, year);

-- 5. Create helpful views for unassigned students
CREATE OR REPLACE VIEW unassigned_students AS
SELECT sp.*
FROM student_profiles sp
LEFT JOIN student_enrollments se ON sp.id = se.student_id AND se.is_active = true
WHERE se.student_id IS NULL;

-- 6. Create student class details view
CREATE OR REPLACE VIEW student_class_details AS
SELECT 
    sp.id as student_id,
    sp.student_id as student_number,
    sp.first_name,
    sp.last_name,
    sp.grade_level,
    sp.academic_year,
    sp.section as student_section,
    c.id as class_id,
    c.name as class_name,
    c.year as class_year,
    c.section as class_section,
    se.enrollment_date,
    se.is_active
FROM student_profiles sp
LEFT JOIN student_enrollments se ON sp.id = se.student_id
LEFT JOIN classes c ON se.class_id = c.id;

-- 7. Grant access to views for authenticated users
GRANT SELECT ON unassigned_students TO authenticated;
GRANT SELECT ON student_class_details TO authenticated;

-- 8. Update RLS policy for unassigned students view
CREATE POLICY "Teachers can view unassigned students" ON unassigned_students
  FOR SELECT USING (
    auth.uid() IN (
      SELECT teacher_id FROM classes
    )
  );

-- 9. Optional: Data migration for existing records
UPDATE student_profiles 
SET academic_year = '2024' 
WHERE academic_year IS NULL OR academic_year = '';

UPDATE classes 
SET year = 
  CASE 
    WHEN year IS NULL OR year = '' THEN '2024'
    WHEN year NOT SIMILAR TO '[0-9]+' THEN '2024'
    ELSE year
  END;

-- ===============================================
-- Script completed successfully!
-- Your School Platform now supports:
-- ✅ Teacher profile photos
-- ✅ Enhanced academic year tracking
-- ✅ Better class organization
-- ✅ Unassigned student management
-- ✅ Improved performance with indexes
-- ===============================================