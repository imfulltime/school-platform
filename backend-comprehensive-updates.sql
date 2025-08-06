-- ===============================================
-- School Platform - Comprehensive Backend Updates
-- Run this entire script in Supabase SQL Editor
-- Includes all new features and enhancements
-- ===============================================

-- 1. Add enrollment status field to student_profiles table
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS enrollment_status TEXT DEFAULT 'Active';

-- Add check constraint for enrollment status
ALTER TABLE student_profiles 
DROP CONSTRAINT IF EXISTS check_enrollment_status;

ALTER TABLE student_profiles 
ADD CONSTRAINT check_enrollment_status 
CHECK (enrollment_status IN ('Active', 'Inactive', 'Graduated', 'Transferred'));

-- 2. Update teacher_profiles to include profile photo (if not already added)
ALTER TABLE teacher_profiles 
ADD COLUMN IF NOT EXISTS profile_photo TEXT;

COMMENT ON COLUMN teacher_profiles.profile_photo IS 'Base64 encoded profile photo image data';

-- 3. Ensure academic_year field is properly configured in student_profiles
ALTER TABLE student_profiles 
ALTER COLUMN academic_year TYPE TEXT;

-- 4. Make sure section and grade_level are properly indexed
CREATE INDEX IF NOT EXISTS idx_student_profiles_enrollment_status 
ON student_profiles (enrollment_status);

CREATE INDEX IF NOT EXISTS idx_student_profiles_academic_year 
ON student_profiles (academic_year);

CREATE INDEX IF NOT EXISTS idx_student_profiles_grade_level 
ON student_profiles (grade_level);

CREATE INDEX IF NOT EXISTS idx_student_profiles_section 
ON student_profiles (section);

-- 5. Update classes table to ensure proper constraints
ALTER TABLE classes 
DROP CONSTRAINT IF EXISTS classes_name_year_section_teacher_id_key;

ALTER TABLE classes 
ADD CONSTRAINT classes_name_year_section_teacher_id_key 
UNIQUE (name, year, section, teacher_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_year 
ON classes (year);

CREATE INDEX IF NOT EXISTS idx_classes_section 
ON classes (section);

CREATE INDEX IF NOT EXISTS idx_classes_teacher_year 
ON classes (teacher_id, year);

-- 6. Create enhanced views for reporting and management
CREATE OR REPLACE VIEW active_students AS
SELECT sp.*
FROM student_profiles sp
WHERE sp.enrollment_status = 'Active' OR sp.enrollment_status IS NULL;

CREATE OR REPLACE VIEW inactive_students AS
SELECT sp.*
FROM student_profiles sp
WHERE sp.enrollment_status IN ('Inactive', 'Graduated', 'Transferred');

-- 7. Create comprehensive student enrollment view
CREATE OR REPLACE VIEW student_enrollment_details AS
SELECT 
    sp.id as student_id,
    sp.student_id as student_number,
    sp.first_name,
    sp.last_name,
    sp.middle_initial,
    sp.grade_level,
    sp.academic_year,
    sp.section as student_section,
    sp.enrollment_status,
    sp.enrollment_date,
    c.id as class_id,
    c.name as class_name,
    c.year as class_year,
    c.section as class_section,
    se.enrollment_date as class_enrollment_date,
    se.is_active as active_in_class,
    tp.first_name as teacher_first_name,
    tp.last_name as teacher_last_name
FROM student_profiles sp
LEFT JOIN student_enrollments se ON sp.id = se.student_id
LEFT JOIN classes c ON se.class_id = c.id
LEFT JOIN teacher_profiles tp ON c.teacher_id = tp.teacher_id;

-- 8. Create unassigned active students view (updated)
CREATE OR REPLACE VIEW unassigned_active_students AS
SELECT sp.*
FROM student_profiles sp
LEFT JOIN student_enrollments se ON sp.id = se.student_id AND se.is_active = true
WHERE se.student_id IS NULL 
AND (sp.enrollment_status = 'Active' OR sp.enrollment_status IS NULL);

-- 9. Create teacher profile summary view
CREATE OR REPLACE VIEW teacher_profile_summary AS
SELECT 
    tp.*,
    COUNT(DISTINCT c.id) as total_classes,
    COUNT(DISTINCT se.student_id) as total_students,
    COALESCE(AVG(sg.grade), 0) as average_grade_given
FROM teacher_profiles tp
LEFT JOIN classes c ON tp.teacher_id = c.teacher_id
LEFT JOIN student_enrollments se ON c.id = se.class_id AND se.is_active = true
LEFT JOIN student_grades sg ON se.student_id = sg.student_id
GROUP BY tp.teacher_id, tp.first_name, tp.last_name, tp.email, tp.title, 
         tp.employee_id, tp.department, tp.phone_number, tp.date_of_birth, 
         tp.hire_date, tp.school_name, tp.years_experience, tp.qualifications,
         tp.emergency_contact_name, tp.emergency_contact_phone, 
         tp.emergency_contact_relation, tp.additional_info, tp.profile_photo;

-- 10. Grant access to views for authenticated users
GRANT SELECT ON active_students TO authenticated;
GRANT SELECT ON inactive_students TO authenticated;
GRANT SELECT ON student_enrollment_details TO authenticated;
GRANT SELECT ON unassigned_active_students TO authenticated;
GRANT SELECT ON teacher_profile_summary TO authenticated;

-- 11. Update RLS policies for enhanced security
-- Policy for active students view
CREATE POLICY "Teachers can view active students" ON active_students
  FOR SELECT USING (
    auth.uid() IN (
      SELECT teacher_id FROM classes
    )
  );

-- Policy for inactive students view  
CREATE POLICY "Teachers can view inactive students" ON inactive_students
  FOR SELECT USING (
    auth.uid() IN (
      SELECT teacher_id FROM classes
    )
  );

-- 12. Create functions for data integrity
CREATE OR REPLACE FUNCTION update_student_enrollment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Automatically set enrollment_status to 'Active' for new students if not specified
    IF NEW.enrollment_status IS NULL THEN
        NEW.enrollment_status := 'Active';
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for student enrollment status
DROP TRIGGER IF EXISTS trigger_update_student_enrollment_status ON student_profiles;
CREATE TRIGGER trigger_update_student_enrollment_status
    BEFORE INSERT OR UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_student_enrollment_status();

-- 13. Add updated_at column to key tables if not exists
ALTER TABLE student_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE teacher_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 14. Create function to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_student_profiles_updated_at ON student_profiles;
CREATE TRIGGER update_student_profiles_updated_at
    BEFORE UPDATE ON student_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_profiles_updated_at ON teacher_profiles;
CREATE TRIGGER update_teacher_profiles_updated_at
    BEFORE UPDATE ON teacher_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 15. Optional: Data migration for existing records
UPDATE student_profiles 
SET enrollment_status = 'Active' 
WHERE enrollment_status IS NULL;

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

-- Set updated_at for existing records
UPDATE student_profiles SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE teacher_profiles SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE classes SET updated_at = NOW() WHERE updated_at IS NULL;

-- ===============================================
-- Script completed successfully!
-- Your School Platform backend now supports:
-- ✅ Student enrollment status management
-- ✅ Enhanced student profile fields
-- ✅ Teacher profile photos
-- ✅ Improved class organization
-- ✅ Comprehensive reporting views
-- ✅ Data integrity functions
-- ✅ Automatic timestamp tracking
-- ✅ Enhanced security policies
-- ✅ Performance optimizations
-- ===============================================