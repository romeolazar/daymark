/**
 * Time Engine for Daymark
 * Handles countdown, count-up, recurrence calculations, and formatting.
 */

/**
 * Calculates the next occurrence of a date based on the repeat type.
 * Returns a Date object representing the next occurrence on or after the reference date.
 * If the event doesn't repeat, returns the original date.
 * 
 * @param {Date} baseDate - The original event date
 * @param {string} repeatType - 'NONE', 'WEEKLY', 'MONTHLY', 'YEARLY'
 * @param {Date} [refDate=new Date()] - Reference date (default is now)
 * @returns {Date}
 */
export function getNextOccurrence(baseDate, repeatType, refDate = new Date()) {
  const base = new Date(baseDate);
  const ref = new Date(refDate);

  if (!repeatType || repeatType === 'NONE') {
    return base;
  }

  // If the base date is in the future, it is the next occurrence
  if (base.getTime() >= ref.getTime()) {
    return base;
  }

  if (!['WEEKLY', 'MONTHLY', 'YEARLY'].includes(repeatType)) {
    return base;
  }

  // Always step from the base date, so a clamped month (Jan 31 -> Feb 28)
  // does not shift every later occurrence
  for (let count = 1; ; count++) {
    const next = addRepeatPeriods(base, repeatType, count);
    if (next.getTime() >= ref.getTime()) {
      return next;
    }
  }
}

/**
 * Adds `count` repeat periods to a date. Monthly and yearly steps keep the
 * original day of month, clamped to the last day of shorter months
 * (Jan 31 -> Feb 28 -> Mar 31, Feb 29 -> Feb 28 in non-leap years).
 *
 * @param {Date} base
 * @param {string} repeatType - 'WEEKLY', 'MONTHLY', 'YEARLY'
 * @param {number} count
 * @returns {Date}
 */
function addRepeatPeriods(base, repeatType, count) {
  const next = new Date(base);

  if (repeatType === 'WEEKLY') {
    next.setDate(base.getDate() + 7 * count);
    return next;
  }

  const targetMonth = base.getMonth() + (repeatType === 'MONTHLY' ? count : count * 12);
  const lastDayOfMonth = new Date(base.getFullYear(), targetMonth + 1, 0).getDate();
  next.setFullYear(base.getFullYear(), targetMonth, Math.min(base.getDate(), lastDayOfMonth));
  return next;
}

/**
 * Returns the timezone if the runtime knows it, otherwise 'UTC'.
 *
 * @param {string} [timeZone]
 * @returns {string}
 */
export function resolveTimeZone(timeZone) {
  if (!timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Wall-clock fields of an instant in an IANA timezone (month is 0-based).
 *
 * @param {Date} date
 * @param {string} timeZone
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }}
 */
export function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  }).formatToParts(date);
  const get = (type) => Number(parts.find(p => p.type === type).value);

  return {
    year: get('year'),
    month: get('month') - 1,
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second')
  };
}

/**
 * Converts a wall-clock time in an IANA timezone to the real instant.
 *
 * @param {number} year
 * @param {number} month - 0-based
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {string} timeZone
 * @returns {Date}
 */
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
  const wall = Date.UTC(year, month, day, hour, minute);
  const offsetAt = (instant) => {
    const p = getZonedParts(new Date(instant), timeZone);
    return Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second) - instant;
  };

  // Second pass picks the right offset when the first guess crosses a DST switch
  const guess = wall - offsetAt(wall);
  return new Date(wall - offsetAt(guess));
}

/**
 * Works out when a reminder is due, in the event's own timezone.
 *
 * Event dates are stored as midnight UTC of the calendar day, while eventTime
 * and reminderTime are wall-clock times in `timeZone`. The result does not
 * depend on the timezone of the server running it.
 *
 * @param {{ eventDate: Date|string, eventTime?: string|null, repeatType?: string }} event
 * @param {{ offsetDays: number, reminderTime?: string }} reminder
 * @param {string} [timeZone]
 * @param {Date} [now=new Date()]
 * @returns {{ occurrence: Date, triggerAt: Date, triggerDayStart: Date }}
 *   occurrence carries the wall-clock date of the event occurrence in its local
 *   fields (for display); triggerAt and triggerDayStart are real instants.
 */
export function getReminderSchedule(event, reminder, timeZone, now = new Date()) {
  const tz = resolveTimeZone(timeZone);
  const stored = new Date(event.eventDate);
  const [eventHours, eventMinutes] = event.eventTime ? event.eventTime.split(':').map(Number) : [0, 0];

  // Dates in this "wall clock" frame hold the wall-clock fields of `tz` in their local fields
  const base = new Date(stored.getUTCFullYear(), stored.getUTCMonth(), stored.getUTCDate(), eventHours, eventMinutes);
  const today = getZonedParts(now, tz);
  const startOfToday = new Date(today.year, today.month, today.day);

  // An occurrence earlier today still counts, so same-day reminders fire after the event time
  const occurrence = getNextOccurrence(base, event.repeatType, startOfToday);

  const triggerDay = new Date(occurrence.getFullYear(), occurrence.getMonth(), occurrence.getDate() - reminder.offsetDays);
  const [y, m, d] = [triggerDay.getFullYear(), triggerDay.getMonth(), triggerDay.getDate()];
  const [reminderHours, reminderMinutes] = (reminder.reminderTime || '09:00').split(':').map(Number);

  return {
    occurrence,
    triggerAt: zonedTimeToUtc(y, m, d, reminderHours, reminderMinutes, tz),
    triggerDayStart: zonedTimeToUtc(y, m, d, 0, 0, tz)
  };
}

/**
 * Calculate the difference details between two dates.
 * 
 * @param {Date} date1 - Start date (earlier date if count-up, or now if countdown)
 * @param {Date} date2 - End date (later date if count-up, or event date if countdown)
 */
function getDateDifferenceDetails(date1, date2) {
  const start = new Date(date1);
  const end = new Date(date2);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    // Borrow days from the previous month of the end date
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }

  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years, months, days };
}

/**
 * Calculates remaining/elapsed times in different formats.
 * 
 * @param {string|Date} eventDate - The event date
 * @param {string} [eventTime] - Optional time of the event ("HH:mm")
 * @param {string} [mode='AUTO'] - 'COUNTDOWN', 'COUNTUP', or 'AUTO'
 * @param {string} [repeatType='NONE'] - 'NONE', 'WEEKLY', 'MONTHLY', 'YEARLY'
 * @returns {{
 *   isPast: boolean,
 *   days: string,
 *   monthsDays: string,
 *   yearsMonthsDays: string,
 *   hours: string,
 *   displayDate: Date
 * }}
 */
export function calculateTimeEngine(eventDate, eventTime = null, mode = 'AUTO', repeatType = 'NONE') {
  const now = new Date();
  
  // Combine date and time
  const originalDate = new Date(eventDate);
  if (eventTime) {
    const [hours, minutes] = eventTime.split(':').map(Number);
    originalDate.setHours(hours, minutes, 0, 0);
  } else {
    // If no time is specified, default to 00:00:00 for calculations
    originalDate.setHours(0, 0, 0, 0);
  }

  // Calculate next occurrence if recurring
  const displayDate = repeatType !== 'NONE' 
    ? getNextOccurrence(originalDate, repeatType, now)
    : originalDate;

  // Determine direction (past vs future)
  let isPast = false;
  if (mode === 'COUNTUP') {
    isPast = true;
  } else if (mode === 'COUNTDOWN') {
    isPast = false;
  } else {
    // AUTO mode: compare target with now
    isPast = displayDate.getTime() < now.getTime();
  }

  const diffMs = Math.abs(displayDate.getTime() - now.getTime());
  
  // Calculate raw values
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));

  // Calendar breakdown (Y, M, D)
  const d1 = isPast ? displayDate : now;
  const d2 = isPast ? now : displayDate;
  const { years, months, days } = getDateDifferenceDetails(d1, d2);

  // Align totalDays with calendar days to avoid day discrepancy
  const midnight1 = new Date(d1);
  midnight1.setHours(0, 0, 0, 0);
  const midnight2 = new Date(d2);
  midnight2.setHours(0, 0, 0, 0);
  const totalDays = Math.round(Math.abs(midnight2.getTime() - midnight1.getTime()) / (1000 * 60 * 60 * 24));

  // Format templates
  const prefix = isPast ? '' : 'In ';
  const suffix = isPast ? ' ago' : '';

  // 1. Days Format
  let daysText = '';
  if (totalDays === 0) {
    const hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60));
    if (hoursRemaining === 0) {
      daysText = isPast ? 'Just now' : 'Today';
    } else {
      daysText = isPast ? `${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'} ago` : `In ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'}`;
    }
  } else {
    daysText = `${prefix}${totalDays} day${totalDays === 1 ? '' : 's'}${suffix}`;
  }

  // 2. Months and Days Format
  let monthsDaysText = '';
  if (years === 0 && months === 0 && days === 0) {
    monthsDaysText = daysText;
  } else {
    const mVal = years * 12 + months;
    const parts = [];
    if (mVal > 0) {
      parts.push(`${mVal} month${mVal === 1 ? '' : 's'}`);
    }
    if (days > 0) {
      parts.push(`${days} day${days === 1 ? '' : 's'}`);
    }
    
    let text = '';
    if (parts.length === 1) {
      text = parts[0];
    } else {
      text = `${parts[0]} and ${parts[1]}`;
    }
    monthsDaysText = `${prefix}${text}${suffix}`;
  }

  // 3. Years, Months, and Days Format
  let yearsMonthsDaysText = '';
  if (years === 0 && months === 0 && days === 0) {
    yearsMonthsDaysText = daysText;
  } else {
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years === 1 ? '' : 's'}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months === 1 ? '' : 's'}`);
    }
    if (days > 0) {
      parts.push(`${days} day${days === 1 ? '' : 's'}`);
    }

    let text = '';
    if (parts.length === 1) {
      text = parts[0];
    } else if (parts.length === 2) {
      text = `${parts[0]} and ${parts[1]}`;
    } else {
      text = `${parts[0]}, ${parts[1]} and ${parts[2]}`;
    }
    yearsMonthsDaysText = `${prefix}${text}${suffix}`;
  }

  // 4. Hours Format
  let hoursText = '';
  if (totalHours === 0) {
    hoursText = isPast ? 'Just now' : 'Today';
  } else {
    hoursText = `${prefix}${totalHours} hour${totalHours === 1 ? '' : 's'}${suffix}`;
  }

  return {
    isPast,
    days: daysText,
    monthsDays: monthsDaysText,
    yearsMonthsDays: yearsMonthsDaysText,
    hours: hoursText,
    displayDate
  };
}

/**
 * Format date based on setting ('DD_MMMM_YYYY' or 'MMMM_DD_YYYY')
 * 
 * @param {string|Date} dateInput
 * @param {string} dateFormat
 * @returns {string}
 */
export function formatEventDate(dateInput, dateFormat = 'MMMM_DD_YYYY') {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const day = date.getDate();
  const year = date.getFullYear();
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[date.getMonth()];

  if (dateFormat === 'DD_MMMM_YYYY') {
    return `${day} ${month} ${year}`;
  } else {
    return `${month} ${day}, ${year}`;
  }
}

/**
 * Format time based on setting ('12H' or '24H')
 * 
 * @param {string} timeStr - "HH:mm" format
 * @param {string} timeFormat
 * @returns {string}
 */
export function formatEventTime(timeStr, timeFormat = '12H') {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) return timeStr;

  if (timeFormat === '24H') {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  } else {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  }
}

