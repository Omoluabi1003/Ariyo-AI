/**
 * @module utils
 * @description Utility functions for the application.
 */

/**
 * Formats time in seconds to a mm:ss string.
 * @param {number} seconds - The time in seconds.
 * @returns {string} The formatted time string.
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Basic debounce function.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

/**
 * Basic throttle function.
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The throttle limit in milliseconds.
 * @returns {Function} The throttled function.
 */
export function throttle(func, limit) {
  let inThrottle;
  let lastFunc;
  let lastRan;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastFunc) {
          lastFunc.apply(context, args); // Apply with the latest args if any calls were made during throttle
          lastRan = Date.now();
          lastFunc = null; // Clear lastFunc after execution
        }
      }, limit);
    } else {
      // Store the last function call to execute after throttle period
      lastFunc = () => func.apply(context, args);
    }
  };
}
