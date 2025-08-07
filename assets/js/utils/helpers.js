/**
 * Utility Helper Functions
 * Common utility functions used across the application
 */

/**
 * DOM Utilities
 */
export const DOM = {
  /**
   * Safely get element by ID
   * @param {string} id - Element ID
   * @returns {HTMLElement|null} Element or null
   */
  getById(id) {
    return document.getElementById(id);
  },

  /**
   * Safely query selector
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (optional)
   * @returns {HTMLElement|null} Element or null
   */
  query(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Safely query all elements
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (optional)
   * @returns {NodeList} NodeList of elements
   */
  queryAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
  },

  /**
   * Create element with attributes and children
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {Array|string|HTMLElement} children - Children elements or text
   * @returns {HTMLElement} Created element
   */
  create(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.substring(2).toLowerCase(), value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    if (typeof children === 'string') {
      element.textContent = children;
    } else if (children instanceof HTMLElement) {
      element.appendChild(children);
    } else if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
          element.appendChild(child);
        }
      });
    }

    return element;
  },

  /**
   * Remove element safely
   * @param {HTMLElement|string} elementOrId - Element or element ID
   */
  remove(elementOrId) {
    const element = typeof elementOrId === 'string' 
      ? this.getById(elementOrId) 
      : elementOrId;
    
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  },

  /**
   * Toggle class on element
   * @param {HTMLElement|string} elementOrId - Element or element ID
   * @param {string} className - Class name to toggle
   */
  toggleClass(elementOrId, className) {
    const element = typeof elementOrId === 'string' 
      ? this.getById(elementOrId) 
      : elementOrId;
    
    if (element) {
      element.classList.toggle(className);
    }
  },

  /**
   * Show element
   * @param {HTMLElement|string} elementOrId - Element or element ID
   */
  show(elementOrId) {
    const element = typeof elementOrId === 'string' 
      ? this.getById(elementOrId) 
      : elementOrId;
    
    if (element) {
      element.style.display = '';
    }
  },

  /**
   * Hide element
   * @param {HTMLElement|string} elementOrId - Element or element ID
   */
  hide(elementOrId) {
    const element = typeof elementOrId === 'string' 
      ? this.getById(elementOrId) 
      : elementOrId;
    
    if (element) {
      element.style.display = 'none';
    }
  }
};

/**
 * Date Utilities
 */
export const DateUtils = {
  /**
   * Format date to readable string
   * @param {Date|string} date - Date to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted date string
   */
  format(date, options = {}) {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  },

  /**
   * Get relative time string (e.g., "2 days ago")
   * @param {Date|string} date - Date to compare
   * @returns {string} Relative time string
   */
  getRelativeTime(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffInMs = now - dateObj;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    
    return `${Math.floor(diffInDays / 365)} years ago`;
  },

  /**
   * Check if date is today
   * @param {Date|string} date - Date to check
   * @returns {boolean} True if date is today
   */
  isToday(date) {
    const dateObj = date instanceof Date ? date : new Date(date);
    const today = new Date();
    
    return dateObj.toDateString() === today.toDateString();
  },

  /**
   * Get current academic year
   * @returns {string} Academic year (e.g., "2024-2025")
   */
  getCurrentAcademicYear() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based (0 = January)
    
    // Academic year typically starts in August/September
    if (month >= 7) { // August or later
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }
};

/**
 * String Utilities
 */
export const StringUtils = {
  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  /**
   * Convert string to title case
   * @param {string} str - String to convert
   * @returns {string} Title case string
   */
  toTitleCase(str) {
    if (!str) return '';
    return str.split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  },

  /**
   * Generate initials from name
   * @param {string} name - Full name
   * @returns {string} Initials (e.g., "John Doe" -> "JD")
   */
  getInitials(name) {
    if (!name) return '';
    return name.split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('');
  },

  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} length - Maximum length
   * @returns {string} Truncated string
   */
  truncate(str, length = 50) {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + '...';
  },

  /**
   * Generate random ID
   * @param {number} length - ID length
   * @returns {string} Random ID
   */
  generateId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  /**
   * Clean and format student ID
   * @param {string} id - Raw student ID
   * @returns {string} Formatted student ID
   */
  formatStudentId(id) {
    if (!id) return '';
    // Ensure it's a string and pad with zeros if needed
    return id.toString().padStart(2, '0');
  }
};

/**
 * Number Utilities
 */
export const NumberUtils = {
  /**
   * Format number as percentage
   * @param {number} value - Number to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage
   */
  toPercentage(value, decimals = 1) {
    if (typeof value !== 'number' || isNaN(value)) return '0%';
    return `${value.toFixed(decimals)}%`;
  },

  /**
   * Calculate percentage from points
   * @param {number} points - Points earned
   * @param {number} total - Total points possible
   * @returns {number} Percentage value
   */
  calculatePercentage(points, total) {
    if (!total || total === 0) return 0;
    return (points / total) * 100;
  },

  /**
   * Round to specified decimal places
   * @param {number} value - Number to round
   * @param {number} decimals - Number of decimal places
   * @returns {number} Rounded number
   */
  round(value, decimals = 2) {
    if (typeof value !== 'number' || isNaN(value)) return 0;
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  },

  /**
   * Clamp number between min and max
   * @param {number} value - Number to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped number
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Get letter grade from percentage
   * @param {number} percentage - Grade percentage
   * @returns {string} Letter grade
   */
  getLetterGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }
};

/**
 * Array Utilities
 */
export const ArrayUtils = {
  /**
   * Remove duplicates from array
   * @param {Array} arr - Array to deduplicate
   * @param {string} key - Property key for object arrays
   * @returns {Array} Array without duplicates
   */
  unique(arr, key = null) {
    if (!Array.isArray(arr)) return [];
    
    if (key) {
      const seen = new Set();
      return arr.filter(item => {
        const val = item[key];
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });
    }
    
    return [...new Set(arr)];
  },

  /**
   * Sort array of objects by property
   * @param {Array} arr - Array to sort
   * @param {string} key - Property to sort by
   * @param {boolean} ascending - Sort direction
   * @returns {Array} Sorted array
   */
  sortBy(arr, key, ascending = true) {
    if (!Array.isArray(arr)) return [];
    
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
      return 0;
    });
  },

  /**
   * Group array by property
   * @param {Array} arr - Array to group
   * @param {string} key - Property to group by
   * @returns {Object} Grouped object
   */
  groupBy(arr, key) {
    if (!Array.isArray(arr)) return {};
    
    return arr.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {});
  },

  /**
   * Calculate average of array values
   * @param {Array} arr - Array of numbers
   * @param {string} key - Property key for object arrays
   * @returns {number} Average value
   */
  average(arr, key = null) {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    
    const values = key ? arr.map(item => item[key]) : arr;
    const numbers = values.filter(val => typeof val === 'number' && !isNaN(val));
    
    if (numbers.length === 0) return 0;
    
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    return sum / numbers.length;
  }
};

/**
 * Validation Utilities
 */
export const ValidationUtils = {
  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate phone number
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone
   */
  isValidPhone(phone) {
    const phoneRegex = /^[\+]?[\s\-\(\)]?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Check if value is empty
   * @param {*} value - Value to check
   * @returns {boolean} True if empty
   */
  isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },

  /**
   * Validate required fields in object
   * @param {Object} data - Data object to validate
   * @param {Array} requiredFields - Array of required field names
   * @returns {Object} Validation result with errors
   */
  validateRequired(data, requiredFields) {
    const errors = {};
    
    requiredFields.forEach(field => {
      if (this.isEmpty(data[field])) {
        errors[field] = `${field} is required`;
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

/**
 * Export/Import Utilities
 */
export const ExportUtils = {
  /**
   * Download data as JSON file
   * @param {*} data - Data to export
   * @param {string} filename - File name
   */
  downloadJSON(data, filename = 'data.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    this.downloadBlob(blob, filename);
  },

  /**
   * Download data as CSV file
   * @param {Array} data - Array of objects to export
   * @param {string} filename - File name
   */
  downloadCSV(data, filename = 'data.csv') {
    if (!Array.isArray(data) || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(field => {
        const value = row[field];
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    this.downloadBlob(blob, filename);
  },

  /**
   * Download blob as file
   * @param {Blob} blob - Blob to download
   * @param {string} filename - File name
   */
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Event Utilities
 */
export const EventUtils = {
  /**
   * Debounce function execution
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  },

  /**
   * Throttle function execution
   * @param {Function} func - Function to throttle
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Throttled function
   */
  throttle(func, delay = 300) {
    let lastRun = 0;
    return function (...args) {
      if (Date.now() - lastRun >= delay) {
        func.apply(this, args);
        lastRun = Date.now();
      }
    };
  }
};

/**
 * Assessment Utilities
 */
export const AssessmentUtils = {
  /**
   * Array of random icons for custom assessment categories
   */
  icons: [
    '🎯', '📊', '🔬', '🎨', '🏆', '⭐', '💡', '🚀', '🎪', '🎭',
    '🎵', '🎸', '🏃', '🏀', '⚽', '🎲', '🧩', '🔍', '📐', '🧮',
    '🌟', '💫', '⚡', '🔥', '💎', '🎈', '🎉', '🎊', '🏅', '🥇',
    '📈', '📉', '💯', '🎤', '🎬', '📷', '🎪', '🎨', '🖼️', '🗂️'
  ],

  /**
   * Get random icon for assessment category
   * @returns {string} Random emoji icon
   */
  getRandomIcon() {
    return this.icons[Math.floor(Math.random() * this.icons.length)];
  },

  /**
   * Calculate weighted average grade
   * @param {Object} grades - Grades by category
   * @param {Object} weights - Weights by category
   * @returns {number} Weighted average
   */
  calculateWeightedAverage(grades, weights) {
    let totalWeight = 0;
    let weightedSum = 0;

    Object.entries(grades).forEach(([category, average]) => {
      const weight = weights[category]?.weight || 0;
      if (weight > 0 && average > 0) {
        weightedSum += average * (weight / 100);
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  },

  /**
   * Generate next student ID
   * @param {Array} existingIds - Array of existing student IDs
   * @returns {string} Next available student ID
   */
  generateNextStudentId(existingIds = []) {
    const numericIds = existingIds
      .map(id => parseInt(id))
      .filter(id => !isNaN(id))
      .sort((a, b) => a - b);

    let nextId = 0;
    for (const id of numericIds) {
      if (id === nextId) {
        nextId++;
      } else {
        break;
      }
    }

    return StringUtils.formatStudentId(nextId);
  }
};

// Default export with all utilities
export default {
  DOM,
  DateUtils,
  StringUtils,
  NumberUtils,
  ArrayUtils,
  ValidationUtils,
  ExportUtils,
  EventUtils,
  AssessmentUtils
};
