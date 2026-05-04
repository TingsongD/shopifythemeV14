/**
 * Theme Debug Utility
 * Provides conditional logging that respects a debug flag.
 * In production, set ThemeDebug.enabled = false to suppress logs.
 */
(function() {
  'use strict';

  window.ThemeDebug = {
    /**
     * Enable/disable debug mode
     * Set to false for production
     */
    enabled: false,

    /**
     * Log messages (only when debug enabled)
     * @param {...*} args - Arguments to log
     */
    log: function() {
      if (this.enabled && window.console && console.log) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Theme]');
        console.log.apply(console, args);
      }
    },

    /**
     * Log warnings (only when debug enabled)
     * @param {...*} args - Arguments to log
     */
    warn: function() {
      if (this.enabled && window.console && console.warn) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Theme]');
        console.warn.apply(console, args);
      }
    },

    /**
     * Log errors (always logs, even when debug disabled)
     * @param {...*} args - Arguments to log
     */
    error: function() {
      if (window.console && console.error) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Theme Error]');
        console.error.apply(console, args);
      }
    },

    /**
     * Log info messages (only when debug enabled)
     * @param {...*} args - Arguments to log
     */
    info: function() {
      if (this.enabled && window.console && console.info) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Theme]');
        console.info.apply(console, args);
      }
    },

    /**
     * Group console output (only when debug enabled)
     * @param {string} label - Group label
     */
    group: function(label) {
      if (this.enabled && window.console && console.group) {
        console.group('[Theme] ' + label);
      }
    },

    /**
     * End console group (only when debug enabled)
     */
    groupEnd: function() {
      if (this.enabled && window.console && console.groupEnd) {
        console.groupEnd();
      }
    },

    /**
     * Log with timing (only when debug enabled)
     * @param {string} label - Timer label
     */
    time: function(label) {
      if (this.enabled && window.console && console.time) {
        console.time('[Theme] ' + label);
      }
    },

    /**
     * End timing log (only when debug enabled)
     * @param {string} label - Timer label
     */
    timeEnd: function(label) {
      if (this.enabled && window.console && console.timeEnd) {
        console.timeEnd('[Theme] ' + label);
      }
    }
  };

  // Expose for backwards compatibility with existing console.log calls
  // that may be conditionally checking for debug mode
  window.themeDebugLog = function() {
    ThemeDebug.log.apply(ThemeDebug, arguments);
  };

})();
