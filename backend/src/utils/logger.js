// ============================================================
// FocusTube — Logger
// Structured, leveled logging. Swap this for Winston/Pino
// by changing only this file.
// ============================================================

import { CONFIG } from '../config/constants.js';

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LEVELS[CONFIG.LOG_LEVEL] ?? LEVELS.info;

const timestamp = () => new Date().toISOString();

const format = (level, message, meta = {}) => {
  const base = { timestamp: timestamp(), level, message };
  const hasMeta = Object.keys(meta).length > 0;
  return JSON.stringify(hasMeta ? { ...base, ...meta } : base);
};

export const logger = {
  error: (msg, meta = {}) => {
    if (CURRENT_LEVEL >= LEVELS.error)
      console.error(format('error', msg, meta));
  },
  warn: (msg, meta = {}) => {
    if (CURRENT_LEVEL >= LEVELS.warn)
      console.warn(format('warn', msg, meta));
  },
  info: (msg, meta = {}) => {
    if (CURRENT_LEVEL >= LEVELS.info)
      console.log(format('info', msg, meta));
  },
  debug: (msg, meta = {}) => {
    if (CURRENT_LEVEL >= LEVELS.debug)
      console.log(format('debug', msg, meta));
  },
};
