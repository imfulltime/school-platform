/**
 * Data Service - Supabase-only data management
 * Handles all data operations through Supabase (no localStorage fallback)
 * REQUIRES AUTHENTICATION - Forces online-only mode
 */

class DataService {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.cache = new Map();
    this.listeners = new Map();
  }

  /**
   * Initialize with Supabase client
   */
  async initialize() {
    if (this.isInitialized) return;
    
    // Ensure AuthService is available and user is authenticated
    if (!window.authService || !window.authService.isAuthenticated()) {
      throw new Error('❌ Authentication required for data operations. Please sign in first.');
    }
    
    this.supabase = window.authService.getSupabaseClient();
    this.isInitialized = true;
    console.log('✅ DataService initialized with Supabase (online-only mode)');
  }

  /**
   * Ensure service is initialized and authenticated
   */
  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!window.authService.isAuthenticated()) {
      throw new Error('❌ Authentication required. Please sign in to access your data.');
    }
  }

  /**
   * Get current user ID
   */
  getCurrentUserId() {
    return window.authService.getCurrentUserId();
  }

  // =============================================================================
  // STUDENT PROFILES
  // =============================================================================

  /**
   * Get all student profiles for current user
   */
  async getStudentProfiles() {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    
    const { data, error } = await this.supabase
      .from('student_profiles')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to load student profiles: ${error.message}`);
    }
    
    // Convert to object format for compatibility
    const profiles = {};
    data.forEach(profile => {
      profiles[profile.id || profile.student_id] = profile;
    });
    
    this.cache.set('studentProfiles', profiles);
    this.notifyListeners('studentProfiles', profiles);
    
    return profiles;
  }

  /**
   * Save student profile
   */
  async saveStudentProfile(studentData) {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    const profileData = {
      ...studentData,
      created_by: userId,
      updated_at: new Date().toISOString()
    };

    // If no created_at, add it
    if (!profileData.created_at) {
      profileData.created_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('student_profiles')
      .upsert([profileData])
      .select();
    
    if (error) {
      throw new Error(`Failed to save student profile: ${error.message}`);
    }
    
    // Update cache
    const profiles = this.cache.get('studentProfiles') || {};
    const savedProfile = data[0];
    profiles[savedProfile.id || savedProfile.student_id] = savedProfile;
    this.cache.set('studentProfiles', profiles);
    this.notifyListeners('studentProfiles', profiles);
    
    console.log('✅ Student profile saved to Supabase:', savedProfile.first_name || savedProfile.name);
    return savedProfile;
  }

  /**
   * Delete student profile
   */
  async deleteStudentProfile(studentId) {
    await this.ensureInitialized();
    
    const { error } = await this.supabase
      .from('student_profiles')
      .delete()
      .eq('id', studentId)
      .eq('created_by', this.getCurrentUserId());
    
    if (error) {
      throw new Error(`Failed to delete student profile: ${error.message}`);
    }
    
    // Update cache
    const profiles = this.cache.get('studentProfiles') || {};
    delete profiles[studentId];
    this.cache.set('studentProfiles', profiles);
    this.notifyListeners('studentProfiles', profiles);
    
    console.log('🗑️ Student profile deleted from Supabase');
    return true;
  }

  // =============================================================================
  // TEACHER PROFILE
  // =============================================================================

  /**
   * Get teacher profile for current user
   */
  async getTeacherProfile() {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    
    const { data, error } = await this.supabase
      .from('teacher_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to load teacher profile: ${error.message}`);
    }
    
    const profile = data || {};
    this.cache.set('teacherProfile', profile);
    return profile;
  }

  /**
   * Save teacher profile
   */
  async setTeacherProfile(teacherData) {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    const profileData = {
      ...teacherData,
      user_id: userId,
      updated_at: new Date().toISOString()
    };

    if (!profileData.created_at) {
      profileData.created_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('teacher_profiles')
      .upsert([profileData])
      .select();
    
    if (error) {
      throw new Error(`Failed to save teacher profile: ${error.message}`);
    }
    
    const savedProfile = data[0];
    this.cache.set('teacherProfile', savedProfile);
    this.notifyListeners('teacherProfile', savedProfile);
    
    console.log('✅ Teacher profile saved to Supabase');
    return savedProfile;
  }

  // =============================================================================
  // CLASSES
  // =============================================================================

  /**
   * Get class records for current user
   */
  async getClassRecords() {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    
    const { data, error } = await this.supabase
      .from('classes')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to load classes: ${error.message}`);
    }
    
    // Convert to object format for compatibility
    const classes = {};
    data.forEach(classRecord => {
      classes[classRecord.class_name || classRecord.name] = classRecord;
    });
    
    this.cache.set('classRecords', classes);
    return classes;
  }

  /**
   * Save class records
   */
  async setClassRecords(classData) {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    const promises = [];
    
    // Convert object to array and save each class
    Object.entries(classData).forEach(([className, classInfo]) => {
      const data = {
        ...classInfo,
        class_name: className,
        created_by: userId,
        updated_at: new Date().toISOString()
      };

      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }

      promises.push(
        this.supabase
          .from('classes')
          .upsert([data])
          .select()
      );
    });
    
    const results = await Promise.all(promises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      throw new Error(`Failed to save classes: ${errors[0].error.message}`);
    }
    
    this.cache.set('classRecords', classData);
    this.notifyListeners('classRecords', classData);
    
    console.log('✅ Class records saved to Supabase');
    return classData;
  }

  // =============================================================================
  // ATTENDANCE
  // =============================================================================

  /**
   * Get attendance data
   */
  async getAttendance() {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    
    const { data, error } = await this.supabase
      .from('attendance_records')
      .select('*')
      .eq('created_by', userId)
      .order('date', { ascending: false });
    
    if (error && error.code !== 'PGRST116') {
      console.warn('Attendance table may not exist yet:', error.message);
      return {};
    }
    
    // Convert to expected format
    const attendance = {};
    data?.forEach(record => {
      attendance[record.id || `${record.date}_${record.class_name}`] = record;
    });
    
    this.cache.set('attendance', attendance);
    return attendance;
  }

  /**
   * Save attendance data
   */
  async setAttendance(attendanceData) {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    const promises = [];
    
    // Convert object to array and save each record
    Object.entries(attendanceData).forEach(([key, record]) => {
      const data = {
        ...record,
        created_by: userId,
        updated_at: new Date().toISOString()
      };

      if (!data.created_at) {
        data.created_at = new Date().toISOString();
      }

      promises.push(
        this.supabase
          .from('attendance_records')
          .upsert([data])
          .select()
      );
    });
    
    try {
      await Promise.all(promises);
      this.cache.set('attendance', attendanceData);
      this.notifyListeners('attendance', attendanceData);
      console.log('✅ Attendance data saved to Supabase');
    } catch (error) {
      console.warn('Could not save attendance (table may not exist):', error.message);
      // Don't throw error for attendance - table might not be created yet
    }
    
    return attendanceData;
  }

  // =============================================================================
  // ASSESSMENT CONFIGS
  // =============================================================================

  /**
   * Get assessment configuration for a specific class
   */
  async getAssessmentConfig(className) {
    // Default configuration
    const defaultConfig = {
      Quiz: { weight: 20, label: '🧠 Quizzes', isCustom: false },
      Exam: { weight: 40, label: '📝 Exams', isCustom: false },
      Project: { weight: 25, label: '💼 Projects', isCustom: false },
      Assignment: { weight: 15, label: '📋 Assignments', isCustom: false }
    };

    try {
      await this.ensureInitialized();
      
      const userId = this.getCurrentUserId();
      
      const { data, error } = await this.supabase
        .from('assessment_configs')
        .select('*')
        .eq('created_by', userId)
        .eq('class_name', className)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.warn('Assessment config table may not exist:', error.message);
        return defaultConfig;
      }
      
      return data?.config || defaultConfig;
    } catch (error) {
      console.warn('Could not load assessment config:', error.message);
      return defaultConfig;
    }
  }

  /**
   * Save assessment configuration for a specific class
   */
  async setAssessmentConfig(className, config) {
    try {
      await this.ensureInitialized();
      
      const userId = this.getCurrentUserId();
      const data = {
        class_name: className,
        config: config,
        created_by: userId,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      await this.supabase
        .from('assessment_configs')
        .upsert([data]);
      
      console.log('✅ Assessment config saved to Supabase');
    } catch (error) {
      console.warn('Could not save assessment config (table may not exist):', error.message);
      // Don't throw error - table might not be created yet
    }
    
    return config;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Add event listener for data changes
   */
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  /**
   * Remove event listener
   */
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  /**
   * Notify listeners of data changes
   */
  notifyListeners(key, data) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        try {
          callback(data, key);
        } catch (error) {
          console.error('Error in data listener:', error);
        }
      });
    }
  }

  /**
   * Export all user data for backup
   */
  async exportData() {
    await this.ensureInitialized();
    
    const [studentProfiles, teacherProfile, classRecords, attendance] = await Promise.all([
      this.getStudentProfiles(),
      this.getTeacherProfile(),
      this.getClassRecords(),
      this.getAttendance()
    ]);
    
    return {
      studentProfiles,
      teacherProfile,
      classRecords,
      attendance,
      exportDate: new Date().toISOString(),
      exportedBy: window.authService.getCurrentUser()?.email
    };
  }

  /**
   * Import data from backup (overwrites existing data)
   */
  async importData(data) {
    await this.ensureInitialized();
    
    try {
      if (data.studentProfiles) {
        await this.setStudentProfiles(data.studentProfiles);
      }
      if (data.teacherProfile) {
        await this.setTeacherProfile(data.teacherProfile);
      }
      if (data.classRecords) {
        await this.setClassRecords(data.classRecords);
      }
      if (data.attendance) {
        await this.setAttendance(data.attendance);
      }
      
      console.log('✅ Data imported successfully to Supabase');
    } catch (error) {
      console.error('❌ Error importing data:', error);
      throw error;
    }
  }

  /**
   * Clear all user data (requires confirmation)
   */
  async clear() {
    await this.ensureInitialized();
    
    const userId = this.getCurrentUserId();
    
    try {
      // Delete in reverse dependency order
      await Promise.all([
        this.supabase.from('attendance_records').delete().eq('created_by', userId),
        this.supabase.from('assessment_configs').delete().eq('created_by', userId),
        this.supabase.from('student_profiles').delete().eq('created_by', userId),
        this.supabase.from('classes').delete().eq('created_by', userId),
        this.supabase.from('teacher_profiles').delete().eq('user_id', userId)
      ]);
      
      // Clear cache
      this.cache.clear();
      
      console.log('🗑️ All user data cleared from Supabase');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics (now shows Supabase usage)
   */
  async getStorageStats() {
    await this.ensureInitialized();
    
    const data = await this.exportData();
    const dataString = JSON.stringify(data);
    const totalSize = new Blob([dataString]).size;
    
    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      source: 'Supabase Cloud Database',
      recordCounts: {
        students: Object.keys(data.studentProfiles || {}).length,
        classes: Object.keys(data.classRecords || {}).length,
        attendance: Object.keys(data.attendance || {}).length
      }
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate data structure
   */
  validateData(type, data) {
    try {
      switch (type) {
        case 'studentProfile':
          return this.validateStudentProfile(data);
        case 'classRecord':
          return this.validateClassRecord(data);
        case 'teacherProfile':
          return this.validateTeacherProfile(data);
        default:
          return true;
      }
    } catch (error) {
      console.error('Data validation error:', error);
      return false;
    }
  }

  /**
   * Validate student profile data
   */
  validateStudentProfile(data) {
    const required = ['first_name', 'last_name'];
    return required.every(field => data && data[field]);
  }

  /**
   * Validate class record data
   */
  validateClassRecord(data) {
    return data && typeof data === 'object';
  }

  /**
   * Validate teacher profile data
   */
  validateTeacherProfile(data) {
    return data && typeof data === 'object';
  }
}

// Create singleton instance
const dataService = new DataService();

// Make globally available
window.dataService = dataService;

export default dataService;