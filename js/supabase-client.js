// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase project details
const supabaseUrl = 'https://dbztnbqtkhenfjhaughw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRienRuYnF0a2hlbmZqaGF1Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODc1NzMsImV4cCI6MjA2OTk2MzU3M30.trRjc2khddlb1RXR1CXeONhlEIYlJBlZ0lncvH5RJFs'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Data Access Layer - wraps Supabase calls
export class SchoolPlatformAPI {
  
  // Authentication
  async signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    
    if (error) throw error
    return data
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  // Classes Management
  async createClass(name, section) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('Must be authenticated')

    const { data, error } = await supabase
      .from('classes')
      .insert({
        name,
        section,
        teacher_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getClasses() {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        students(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async updateClassAssignments(classId, assignments) {
    const { data, error } = await supabase
      .from('classes')
      .update({ assignments })
      .eq('id', classId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Students Management
  async addStudent(classId, name, studentId) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name,
        student_id: studentId,
        class_id: classId
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getStudentsInClass(classId) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class_id', classId)
      .order('name')

    if (error) throw error
    return data
  }

  async updateStudentGrades(studentId, grades) {
    const { data, error } = await supabase
      .from('students')
      .update({ grades })
      .eq('id', studentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeStudent(studentId) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)

    if (error) throw error
  }

  // Attendance Management
  async recordAttendance(studentId, classId, date, status) {
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert({
        student_id: studentId,
        class_id: classId,
        date,
        status
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getAttendanceForClass(classId, date) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        students(name, student_id)
      `)
      .eq('class_id', classId)
      .eq('date', date)

    if (error) throw error
    return data
  }

  async getAttendanceHistory(studentId) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false })

    if (error) throw error
    return data
  }

  // Analytics & Reports
  async getClassAnalytics(classId) {
    // Get student grades
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('grades')
      .eq('class_id', classId)

    if (studentsError) throw studentsError

    // Get attendance stats
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('status')
      .eq('class_id', classId)

    if (attendanceError) throw attendanceError

    return {
      students,
      attendance
    }
  }

  // Real-time subscriptions
  subscribeToClassUpdates(classId, callback) {
    return supabase
      .channel(`class-${classId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'students',
          filter: `class_id=eq.${classId}` 
        }, 
        callback
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance_records',
          filter: `class_id=eq.${classId}` 
        }, 
        callback
      )
      .subscribe()
  }

  // Data Migration from localStorage
  async migrateLocalData() {
    try {
      // Get existing localStorage data
      const classRecords = JSON.parse(localStorage.getItem('schoolPlatform_classRecords') || '{}')
      const attendanceData = JSON.parse(localStorage.getItem('schoolPlatform_attendance') || '{}')

      // Migrate classes and students
      for (const [className, classData] of Object.entries(classRecords)) {
        // Create class
        const newClass = await this.createClass(classData.name, classData.section)
        
        // Add students and their grades
        for (const student of classData.students) {
          const newStudent = await this.addStudent(newClass.id, student.name, student.id)
          
          if (Object.keys(student.grades).length > 0) {
            await this.updateStudentGrades(newStudent.id, student.grades)
          }
        }

        // Update assignments
        if (classData.assignments && classData.assignments.length > 0) {
          await this.updateClassAssignments(newClass.id, classData.assignments)
        }
      }

      // Migrate attendance
      for (const [className, attendanceClass] of Object.entries(attendanceData)) {
        if (attendanceClass.students) {
          const date = attendanceClass.date || new Date().toISOString().split('T')[0]
          
          // Find corresponding class
          const classes = await this.getClasses()
          const matchingClass = classes.find(c => `${c.name} - ${c.section}` === className)
          
          if (matchingClass) {
            for (const attendanceRecord of attendanceClass.students) {
              // Find corresponding student
              const students = await this.getStudentsInClass(matchingClass.id)
              const matchingStudent = students.find(s => s.student_id === attendanceRecord.studentId)
              
              if (matchingStudent && attendanceRecord.status) {
                await this.recordAttendance(
                  matchingStudent.id, 
                  matchingClass.id, 
                  date, 
                  attendanceRecord.status
                )
              }
            }
          }
        }
      }

      console.log('✅ Data migration completed successfully!')
      return true
    } catch (error) {
      console.error('❌ Data migration failed:', error)
      throw error
    }
  }
}

// Export singleton instance
export const schoolAPI = new SchoolPlatformAPI()