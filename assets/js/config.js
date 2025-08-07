/**
 * Application Configuration
 * Central configuration for the School Platform
 */

export const CONFIG = {
  // Application Info
  APP_NAME: 'School Platform',
  APP_VERSION: '2.0.0',
  APP_DESCRIPTION: 'Modern classroom management system',

  // API Configuration
  API: {
    BASE_URL: '',
    TIMEOUT: 10000,
    RETRY_ATTEMPTS: 3
  },

  // Supabase Configuration
  SUPABASE: {
    URL: 'YOUR_SUPABASE_URL',
    KEY: 'YOUR_SUPABASE_ANON_KEY',
    ENABLED: false // Set to true when Supabase is configured
  },

  // Storage Keys
  STORAGE_KEYS: {
    CLASS_RECORDS: 'schoolPlatform_classRecords',
    STUDENT_PROFILES: 'schoolPlatform_studentProfiles',
    TEACHER_PROFILE: 'schoolPlatform_teacherProfile',
    ATTENDANCE: 'schoolPlatform_attendance',
    ASSESSMENT_CONFIGS: 'schoolPlatform_assessmentConfig',
    USER_SESSION: 'schoolPlatform_userSession',
    APP_SETTINGS: 'schoolPlatform_settings'
  },

  // Default Values
  DEFAULTS: {
    ACADEMIC_YEAR: (() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-based
      return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    })(),
    
    GRADE_LEVELS: [
      'K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
    ],
    
    ENROLLMENT_STATUSES: [
      { value: 'Active', label: '✅ Active', color: 'success' },
      { value: 'Inactive', label: '⏸️ Inactive', color: 'warning' },
      { value: 'Graduated', label: '🎓 Graduated', color: 'info' },
      { value: 'Transferred', label: '📤 Transferred', color: 'gray' }
    ],

    ASSESSMENT_TYPES: [
      { value: 'Quiz', label: '🧠 Quiz', weight: 20 },
      { value: 'Exam', label: '📝 Exam', weight: 40 },
      { value: 'Project', label: '💼 Project', weight: 25 },
      { value: 'Assignment', label: '📋 Assignment', weight: 15 }
    ],

    ATTENDANCE_STATUSES: [
      { value: 'present', label: 'Present', icon: '✅', color: 'success' },
      { value: 'absent', label: 'Absent', icon: '❌', color: 'error' },
      { value: 'tardy', label: 'Tardy', icon: '⏰', color: 'warning' }
    ]
  },

  // UI Configuration
  UI: {
    THEME: 'light',
    ANIMATIONS_ENABLED: true,
    AUTO_SAVE_DELAY: 2000,
    NOTIFICATION_DURATION: 5000,
    
    PAGINATION: {
      PAGE_SIZE: 20,
      MAX_PAGES_SHOWN: 5
    },

    MODALS: {
      BACKDROP_CLOSE: true,
      KEYBOARD_CLOSE: true
    },

    TABLES: {
      SORTABLE: true,
      FILTERABLE: true,
      RESIZABLE_COLUMNS: false
    }
  },

  // Validation Rules
  VALIDATION: {
    STUDENT_ID: {
      MIN_LENGTH: 2,
      MAX_LENGTH: 10,
      PATTERN: /^[0-9]+$/,
      AUTO_GENERATE: true
    },

    EMAIL: {
      PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      REQUIRED: false
    },

    PHONE: {
      PATTERN: /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/,
      REQUIRED: false
    },

    GRADES: {
      MIN_SCORE: 0,
      MAX_SCORE: 100,
      DECIMAL_PLACES: 1
    },

    POINTS: {
      MIN_POINTS: 0,
      MAX_POINTS: 1000,
      DEFAULT_TOTAL: 100
    }
  },

  // Feature Flags
  FEATURES: {
    MULTI_TEACHER: true,
    CUSTOM_ASSESSMENT_CATEGORIES: true,
    POINTS_BASED_GRADING: true,
    BULK_OPERATIONS: true,
    DATA_EXPORT: true,
    REAL_TIME_SYNC: false, // Requires backend
    NOTIFICATIONS: true,
    OFFLINE_MODE: true,
    ADVANCED_REPORTING: true
  },

  // Performance Settings
  PERFORMANCE: {
    DEBOUNCE_DELAY: 300,
    THROTTLE_DELAY: 100,
    VIRTUAL_SCROLLING: false,
    LAZY_LOADING: true,
    CACHE_SIZE: 100
  },

  // Security Settings
  SECURITY: {
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    MAX_LOGIN_ATTEMPTS: 5,
    PASSWORD_MIN_LENGTH: 8,
    REQUIRE_PASSWORD_CONFIRMATION: true
  },

  // Accessibility
  ACCESSIBILITY: {
    HIGH_CONTRAST: false,
    REDUCED_MOTION: false,
    LARGE_TEXT: false,
    KEYBOARD_NAVIGATION: true
  },

  // Development Settings
  DEVELOPMENT: {
    DEBUG: false,
    MOCK_DATA: false,
    PERFORMANCE_MONITORING: false,
    ERROR_BOUNDARY: true
  },

  // Export/Import Settings
  EXPORT: {
    FORMATS: ['JSON', 'CSV', 'PDF'],
    MAX_RECORDS: 10000,
    INCLUDE_METADATA: true
  },

  // Backup Settings
  BACKUP: {
    AUTO_BACKUP: true,
    BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
    MAX_BACKUPS: 7,
    INCLUDE_IMAGES: false
  }
};

// Environment-specific overrides
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  CONFIG.DEVELOPMENT.DEBUG = true;
  CONFIG.DEVELOPMENT.MOCK_DATA = true;
}

// Utility functions for configuration
export const ConfigUtils = {
  /**
   * Get configuration value by path
   * @param {string} path - Dot-separated path (e.g., 'UI.THEME')
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  },

  /**
   * Check if feature is enabled
   * @param {string} feature - Feature name
   * @returns {boolean} True if enabled
   */
  isFeatureEnabled(feature) {
    return this.get(`FEATURES.${feature}`, false);
  },

  /**
   * Get storage key
   * @param {string} key - Key name
   * @returns {string} Full storage key
   */
  getStorageKey(key) {
    return this.get(`STORAGE_KEYS.${key}`, key);
  },

  /**
   * Get validation rule
   * @param {string} field - Field name
   * @param {string} rule - Rule name
   * @returns {*} Validation rule value
   */
  getValidationRule(field, rule) {
    return this.get(`VALIDATION.${field}.${rule}`);
  },

  /**
   * Get default value
   * @param {string} key - Default key
   * @returns {*} Default value
   */
  getDefault(key) {
    return this.get(`DEFAULTS.${key}`);
  },

  /**
   * Update configuration (for runtime changes)
   * @param {string} path - Configuration path
   * @param {*} value - New value
   */
  set(path, value) {
    const keys = path.split('.');
    let target = CONFIG;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[keys[keys.length - 1]] = value;
  },

  /**
   * Reset configuration to defaults
   */
  reset() {
    // This would reset to original CONFIG values
    // Implementation depends on requirements
  },

  /**
   * Export configuration as JSON
   * @returns {string} JSON string
   */
  export() {
    return JSON.stringify(CONFIG, null, 2);
  },

  /**
   * Import configuration from JSON
   * @param {string} json - JSON string
   */
  import(json) {
    try {
      const imported = JSON.parse(json);
      Object.assign(CONFIG, imported);
    } catch (error) {
      console.error('Failed to import configuration:', error);
    }
  }
};

export default CONFIG;
