/**
 * Base Component Class
 * Foundation for all UI components with common functionality
 */

import { DOM, EventUtils } from '../utils/helpers.js';
import dataService from '../services/DataService.js';

export default class BaseComponent {
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? DOM.getById(element) : element;
    this.options = { ...this.defaultOptions, ...options };
    this.listeners = new Map();
    this.state = {};
    this.isInitialized = false;
    
    if (!this.element) {
      throw new Error(`Element not found: ${element}`);
    }
    
    this.init();
  }

  /**
   * Default options for the component
   */
  get defaultOptions() {
    return {};
  }

  /**
   * Initialize the component
   */
  init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    this.render();
    this.isInitialized = true;
    
    this.emit('initialized');
  }

  /**
   * Setup event listeners
   * Override in child classes
   */
  setupEventListeners() {
    // Override in child classes
  }

  /**
   * Render the component
   * Override in child classes
   */
  render() {
    // Override in child classes
  }

  /**
   * Update component state
   * @param {Object} newState - New state to merge
   */
  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    
    this.emit('stateChanged', { oldState, newState: this.state });
    this.onStateChange(oldState, this.state);
  }

  /**
   * Handle state changes
   * Override in child classes
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   */
  onStateChange(oldState, newState) {
    // Override in child classes
  }

  /**
   * Add event listener to the component
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  /**
   * Remove event listener from the component
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data = null) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Add DOM event listener with automatic cleanup
   * @param {HTMLElement|string} target - Target element or selector
   * @param {string} event - Event type
   * @param {Function} callback - Event callback
   * @param {Object} options - Event options
   */
  addDOMListener(target, event, callback, options = {}) {
    const element = typeof target === 'string' ? DOM.query(target, this.element) : target;
    if (!element) return;

    const wrappedCallback = (e) => {
      try {
        callback.call(this, e);
      } catch (error) {
        console.error(`Error in DOM event listener:`, error);
      }
    };

    element.addEventListener(event, wrappedCallback, options);
    
    // Store for cleanup
    if (!this._domListeners) this._domListeners = [];
    this._domListeners.push({ element, event, callback: wrappedCallback, options });
  }

  /**
   * Show the component
   */
  show() {
    DOM.show(this.element);
    this.emit('shown');
  }

  /**
   * Hide the component
   */
  hide() {
    DOM.hide(this.element);
    this.emit('hidden');
  }

  /**
   * Toggle component visibility
   */
  toggle() {
    if (this.element.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Enable the component
   */
  enable() {
    this.element.classList.remove('disabled');
    this.element.removeAttribute('disabled');
    this.setState({ disabled: false });
    this.emit('enabled');
  }

  /**
   * Disable the component
   */
  disable() {
    this.element.classList.add('disabled');
    this.element.setAttribute('disabled', 'true');
    this.setState({ disabled: true });
    this.emit('disabled');
  }

  /**
   * Get data attribute from element
   * @param {string} key - Data key
   * @returns {string} Data value
   */
  getData(key) {
    return this.element.dataset[key];
  }

  /**
   * Set data attribute on element
   * @param {string} key - Data key
   * @param {string} value - Data value
   */
  setData(key, value) {
    this.element.dataset[key] = value;
  }

  /**
   * Find child element
   * @param {string} selector - CSS selector
   * @returns {HTMLElement|null} Found element
   */
  find(selector) {
    return DOM.query(selector, this.element);
  }

  /**
   * Find all child elements
   * @param {string} selector - CSS selector
   * @returns {NodeList} Found elements
   */
  findAll(selector) {
    return DOM.queryAll(selector, this.element);
  }

  /**
   * Create child element
   * @param {string} tag - HTML tag
   * @param {Object} attributes - Element attributes
   * @param {*} children - Element children
   * @returns {HTMLElement} Created element
   */
  createElement(tag, attributes = {}, children = []) {
    return DOM.create(tag, attributes, children);
  }

  /**
   * Append element to component
   * @param {HTMLElement} element - Element to append
   */
  append(element) {
    this.element.appendChild(element);
  }

  /**
   * Prepend element to component
   * @param {HTMLElement} element - Element to prepend
   */
  prepend(element) {
    this.element.insertBefore(element, this.element.firstChild);
  }

  /**
   * Clear component content
   */
  clear() {
    this.element.innerHTML = '';
  }

  /**
   * Set component content
   * @param {string|HTMLElement} content - Content to set
   */
  setContent(content) {
    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      this.clear();
      this.append(content);
    }
  }

  /**
   * Add CSS class
   * @param {string} className - Class name to add
   */
  addClass(className) {
    this.element.classList.add(className);
  }

  /**
   * Remove CSS class
   * @param {string} className - Class name to remove
   */
  removeClass(className) {
    this.element.classList.remove(className);
  }

  /**
   * Toggle CSS class
   * @param {string} className - Class name to toggle
   */
  toggleClass(className) {
    this.element.classList.toggle(className);
  }

  /**
   * Check if has CSS class
   * @param {string} className - Class name to check
   * @returns {boolean} True if has class
   */
  hasClass(className) {
    return this.element.classList.contains(className);
  }

  /**
   * Show loading state
   * @param {string} message - Loading message
   */
  showLoading(message = 'Loading...') {
    this.addClass('loading');
    this.emit('loading', message);
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    this.removeClass('loading');
    this.emit('loaded');
  }

  /**
   * Show error state
   * @param {string} message - Error message
   */
  showError(message) {
    this.addClass('error');
    this.emit('error', message);
  }

  /**
   * Hide error state
   */
  hideError() {
    this.removeClass('error');
    this.emit('errorCleared');
  }

  /**
   * Validate component data
   * Override in child classes
   * @returns {Object} Validation result
   */
  validate() {
    return { isValid: true, errors: [] };
  }

  /**
   * Get component data
   * Override in child classes
   * @returns {*} Component data
   */
  getData() {
    return this.state;
  }

  /**
   * Set component data
   * Override in child classes
   * @param {*} data - Data to set
   */
  setData(data) {
    this.setState(data);
  }

  /**
   * Reset component to initial state
   * Override in child classes
   */
  reset() {
    this.state = {};
    this.emit('reset');
  }

  /**
   * Refresh component
   * Override in child classes
   */
  refresh() {
    this.render();
    this.emit('refreshed');
  }

  /**
   * Destroy the component and cleanup
   */
  destroy() {
    // Remove DOM event listeners
    if (this._domListeners) {
      this._domListeners.forEach(({ element, event, callback, options }) => {
        element.removeEventListener(event, callback, options);
      });
      this._domListeners = [];
    }

    // Clear all component event listeners
    this.listeners.clear();

    // Remove element if it exists
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.emit('destroyed');
    this.isInitialized = false;
  }

  /**
   * Create debounced method
   * @param {Function} method - Method to debounce
   * @param {number} delay - Debounce delay
   * @returns {Function} Debounced method
   */
  debounce(method, delay = 300) {
    return EventUtils.debounce(method.bind(this), delay);
  }

  /**
   * Create throttled method
   * @param {Function} method - Method to throttle
   * @param {number} delay - Throttle delay
   * @returns {Function} Throttled method
   */
  throttle(method, delay = 300) {
    return EventUtils.throttle(method.bind(this), delay);
  }

  /**
   * Subscribe to data service changes
   * @param {string} key - Data key to listen to
   * @param {Function} callback - Callback function
   */
  subscribeToData(key, callback) {
    dataService.addListener(key, callback.bind(this));
  }

  /**
   * Unsubscribe from data service changes
   * @param {string} key - Data key
   * @param {Function} callback - Callback function
   */
  unsubscribeFromData(key, callback) {
    dataService.removeListener(key, callback.bind(this));
  }
}
