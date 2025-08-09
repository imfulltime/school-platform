/**
 * StorageAdapter - Intercepts legacy localStorage calls and mirrors to Supabase
 * This allows existing pages to continue calling localStorage while we migrate UI code.
 * Only keys prefixed with 'schoolPlatform_' are handled.
 */
(function() {
  const ORIGINAL_SET = window.localStorage.setItem.bind(window.localStorage);
  const ORIGINAL_GET = window.localStorage.getItem.bind(window.localStorage);
  const ORIGINAL_REMOVE = window.localStorage.removeItem.bind(window.localStorage);

  function isManagedKey(key) {
    return typeof key === 'string' && key.startsWith('schoolPlatform_');
  }

  async function syncToSupabase(key, value) {
    try {
      if (!window.dataService || !window.authService || !window.authService.isAuthenticated()) return;
      await window.dataService.initialize();

      // Route by key
      if (key === 'schoolPlatform_studentProfiles') {
        const map = value ? JSON.parse(value) : {};
        await window.dataService.setStudentProfiles(map);
      } else if (key === 'schoolPlatform_classRecords') {
        const map = value ? JSON.parse(value) : {};
        await window.dataService.setClassRecords(map);
      } else if (key.startsWith('schoolPlatform_assessmentConfig_')) {
        const className = key.replace('schoolPlatform_assessmentConfig_', '');
        const cfg = value ? JSON.parse(value) : {};
        await window.dataService.setAssessmentConfig(className, cfg);
      } else if (key === 'schoolPlatform_attendance') {
        const map = value ? JSON.parse(value) : {};
        await window.dataService.setAttendance(map);
      } else if (key === 'schoolPlatform_teacherProfile') {
        const obj = value ? JSON.parse(value) : {};
        await window.dataService.setTeacherProfile(obj);
      }
    } catch (e) {
      console.warn('StorageAdapter syncToSupabase error:', e.message);
    }
  }

  window.localStorage.setItem = function(key, value) {
    const result = ORIGINAL_SET(key, value);
    if (isManagedKey(key)) {
      // Fire and forget
      syncToSupabase(key, value);
    }
    return result;
  };

  // Reads will return what’s in localStorage; pages should be migrated to DataService for true source of truth
  window.localStorage.getItem = function(key) {
    return ORIGINAL_GET(key);
  };

  window.localStorage.removeItem = function(key) {
    const result = ORIGINAL_REMOVE(key);
    // Optional: Could also delete from Supabase, but leave to explicit UI actions
    return result;
  };
})();


