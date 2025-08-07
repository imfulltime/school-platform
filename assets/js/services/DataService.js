/**
 * Data Service - Centralized data management
 * Handles localStorage operations and data validation
 */

class DataService {
  constructor() {
    this.storageKeys = {
      classRecords: 'schoolPlatform_classRecords',
      studentProfiles: 'schoolPlatform_studentProfiles',
      teacherProfile: 'schoolPlatform_teacherProfile',
      attendance: 'schoolPlatform_attendance',
      assessmentConfigs: 'schoolPlatform_assessmentConfig'
    };
    
    this.cache = new Map();
    this.listeners = new Map();
  }

  /**
   * Get data from localStorage with caching
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Parsed data or default value
   */
  get(key, defaultValue = null) {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultValue;
      
      const parsed = JSON.parse(stored);
      this.cache.set(key, parsed);
      return parsed;
    } catch (error) {
      console.error(`Error parsing data for key ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Save data to localStorage and update cache
   * @param {string} key - Storage key
   * @param {*} data - Data to save
   * @returns {boolean} Success status
   */
  set(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      this.cache.set(key, data);
      
      // Notify listeners
      this.notifyListeners(key, data);
      
      return true;
    } catch (error) {
      console.error(`Error saving data for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Remove data from localStorage and cache
   * @param {string} key - Storage key
   */
  remove(key) {
    localStorage.removeItem(key);
    this.cache.delete(key);
    this.notifyListeners(key, null);
  }

  /**
   * Clear all data
   */
  clear() {
    Object.values(this.storageKeys).forEach(key => {
      this.remove(key);
    });
  }

  /**
   * Get class records
   * @returns {Object} Class records data
   */
  getClassRecords() {
    return this.get(this.storageKeys.classRecords, {});
  }

  /**
   * Save class records
   * @param {Object} data - Class records data
   */
  setClassRecords(data) {
    return this.set(this.storageKeys.classRecords, data);
  }

  /**
   * Get student profiles
   * @returns {Object} Student profiles data
   */
  getStudentProfiles() {
    return this.get(this.storageKeys.studentProfiles, {});
  }

  /**
   * Save student profiles
   * @param {Object} data - Student profiles data
   */
  setStudentProfiles(data) {
    return this.set(this.storageKeys.studentProfiles, data);
  }

  /**
   * Get teacher profile
   * @returns {Object} Teacher profile data
   */
  getTeacherProfile() {
    return this.get(this.storageKeys.teacherProfile, {});
  }

  /**
   * Save teacher profile
   * @param {Object} data - Teacher profile data
   */
  setTeacherProfile(data) {
    return this.set(this.storageKeys.teacherProfile, data);
  }

  /**
   * Get attendance data
   * @returns {Object} Attendance data
   */
  getAttendance() {
    return this.get(this.storageKeys.attendance, {});
  }

  /**
   * Save attendance data
   * @param {Object} data - Attendance data
   */
  setAttendance(data) {
    return this.set(this.storageKeys.attendance, data);
  }

  /**
   * Get assessment configuration for a specific class
   * @param {string} className - Name of the class
   * @returns {Object} Assessment configuration
   */
  getAssessmentConfig(className) {
    const key = `${this.storageKeys.assessmentConfigs}_${className}`;
    return this.get(key, {
      Quiz: { weight: 20, label: '🧠 Quizzes', isCustom: false },
      Exam: { weight: 40, label: '📝 Exams', isCustom: false },
      Project: { weight: 25, label: '💼 Projects', isCustom: false },
      Assignment: { weight: 15, label: '📋 Assignments', isCustom: false }
    });
  }

  /**
   * Save assessment configuration for a specific class
   * @param {string} className - Name of the class
   * @param {Object} config - Assessment configuration
   */
  setAssessmentConfig(className, config) {
    const key = `${this.storageKeys.assessmentConfigs}_${className}`;
    return this.set(key, config);
  }

  /**
   * Add event listener for data changes
   * @param {string} key - Storage key to listen to
   * @param {Function} callback - Callback function
   */
  addListener(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
  }

  /**
   * Remove event listener
   * @param {string} key - Storage key
   * @param {Function} callback - Callback function
   */
  removeListener(key, callback) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).delete(callback);
    }
  }

  /**
   * Notify listeners of data changes
   * @param {string} key - Storage key
   * @param {*} data - New data
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
   * Export all data for backup
   * @returns {Object} All stored data
   */
  exportData() {
    const data = {};
    Object.entries(this.storageKeys).forEach(([name, key]) => {
      data[name] = this.get(key);
    });
    return data;
  }

  /**
   * Import data from backup
   * @param {Object} data - Data to import
   */
  importData(data) {
    Object.entries(data).forEach(([name, value]) => {
      if (this.storageKeys[name]) {
        this.set(this.storageKeys[name], value);
      }
    });
  }

  /**
   * Get storage usage statistics
   * @returns {Object} Storage statistics
   */
  getStorageStats() {
    let totalSize = 0;
    const itemSizes = {};

    Object.entries(this.storageKeys).forEach(([name, key]) => {
      const item = localStorage.getItem(key);
      const size = item ? new Blob([item]).size : 0;
      itemSizes[name] = size;
      totalSize += size;
    });

    return {
      totalSize,
      itemSizes,
      totalSizeFormatted: this.formatBytes(totalSize)
    };
  }

  /**
   * Format bytes to human readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
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
   * @param {string} type - Data type to validate
   * @param {*} data - Data to validate
   * @returns {boolean} Validation result
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
   * @param {Object} data - Student profile data
   * @returns {boolean} Validation result
   */
  validateStudentProfile(data) {
    const required = ['id', 'firstName', 'lastName'];
    return required.every(field => data && data[field]);
  }

  /**
   * Validate class record data
   * @param {Object} data - Class record data
   * @returns {boolean} Validation result
   */
  validateClassRecord(data) {
    return data && data.students && Array.isArray(data.students);
  }

  /**
   * Validate teacher profile data
   * @param {Object} data - Teacher profile data
   * @returns {boolean} Validation result
   */
  validateTeacherProfile(data) {
    return data && typeof data === 'object';
  }
}

// Create singleton instance
const dataService = new DataService();

export default dataService;
