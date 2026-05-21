'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../styles/components/DateTimePicker.module.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function DateTimePicker({
  valueDate = '',
  valueTime = '',
  onChange,
  required = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // State for navigating the calendar (default to current date or selected date)
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  
  // Local inputs in the custom drawer
  const [localDate, setLocalDate] = useState(valueDate);
  const [localTime, setLocalTime] = useState(valueTime);

  const containerRef = useRef(null);

  // Sync props to local state when props change
  useEffect(() => {
    setLocalDate(valueDate);
    setLocalTime(valueTime);
    if (valueDate) {
      const parts = valueDate.split('-');
      if (parts.length === 3) {
        const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(parsed.getTime())) {
          setCurrentMonthDate(parsed);
        }
      }
    }
  }, [valueDate, valueTime]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Helper to format date for human display
  const getDisplayValue = () => {
    if (!valueDate) return 'Pick Date' + (required ? ' *' : '');
    
    // Parse valueDate (YYYY-MM-DD)
    const parts = valueDate.split('-');
    if (parts.length !== 3) return 'Pick Date';
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    
    const monthName = MONTH_NAMES[monthIndex] || '';
    const dateFormatted = `${day} ${monthName} ${year}`;
    
    return dateFormatted;
  };



  // Calendar generation logic
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Days grid calculation
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const calendarCells = [];
  
  // Previous month filler days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    });
  }
  
  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({
      day: d,
      month,
      year,
      isCurrentMonth: true
    });
  }
  
  // Next month filler days
  const totalSlots = 42; // 6 rows of 7 days
  const remainingSlots = totalSlots - calendarCells.length;
  for (let d = 1; d <= remainingSlots; d++) {
    calendarCells.push({
      day: d,
      month: month === 11 ? 0 : month + 1,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    });
  }

  // Handle day click
  const handleDaySelect = (cell) => {
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
    setLocalDate(dateStr);
    
    // Auto-propagate to parent but let them click 'Done' to finalize
    onChange({ date: dateStr, time: localTime });
  };

  // Check if a cell is currently selected
  const isCellSelected = (cell) => {
    if (!localDate) return false;
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${cell.year}-${pad(cell.month + 1)}-${pad(cell.day)}`;
    return localDate === dateStr;
  };

  // Check if cell is today
  const isCellToday = (cell) => {
    const today = new Date();
    return today.getDate() === cell.day && 
           today.getMonth() === cell.month && 
           today.getFullYear() === cell.year;
  };

  const handleClear = () => {
    setLocalDate('');
    setLocalTime('');
    onChange({ date: '', time: '' });
    setIsOpen(false);
  };

  const handleDone = (e) => {
    e.preventDefault();
    onChange({ date: localDate, time: localTime });
    setIsOpen(false);
  };

  // Manual typing handles
  const handleManualDateChange = (e) => {
    const val = e.target.value;
    setLocalDate(val);
    // If it is a complete valid date YYYY-MM-DD, sync calendar month view
    const parts = val.split('-');
    if (parts.length === 3) {
      const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(parsed.getTime())) {
        setCurrentMonthDate(parsed);
      }
    }
  };

  const handleManualTimeChange = (e) => {
    setLocalTime(e.target.value);
  };

  return (
    <div className={styles.pickerContainer} ref={containerRef}>
      <button
        type="button"
        className={`${styles.inputField} ${isOpen ? styles.inputFieldActive : ''}`}
        onClick={handleToggle}
      >
        <span className={styles.inputIcon}>📅</span>
        <span>{getDisplayValue()}</span>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.calendarSection}>
            {/* Month & Year selector header */}
            <div className={styles.calendarHeader}>
              <button type="button" className={styles.navBtn} onClick={handlePrevMonth}>
                ◀
              </button>
              <div className={styles.monthYearSelectors}>
                <select
                  value={month}
                  onChange={(e) => setCurrentMonthDate(new Date(year, parseInt(e.target.value, 10), 1))}
                  className={styles.headerSelect}
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setCurrentMonthDate(new Date(parseInt(e.target.value, 10), month, 1))}
                  className={styles.headerSelect}
                >
                  {Array.from({ length: 111 }, (_, i) => 1970 + i).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className={styles.navBtn} onClick={handleNextMonth}>
                ▶
              </button>
            </div>

            {/* Weekday titles */}
            <div className={styles.weekdays}>
              {WEEKDAYS.map(w => (
                <span key={w}>{w}</span>
              ))}
            </div>

            {/* Grid of days */}
            <div className={styles.daysGrid}>
              {calendarCells.map((cell, idx) => {
                const isSelected = isCellSelected(cell);
                const isToday = isCellToday(cell);
                
                let cellClass = styles.dayCell;
                if (cell.isCurrentMonth) {
                  cellClass += ` ${styles.currentMonth}`;
                } else {
                  cellClass += ` ${styles.otherMonth}`;
                }
                
                if (isSelected) {
                  cellClass += ` ${styles.selectedDay}`;
                }
                if (isToday) {
                  cellClass += ` ${styles.today}`;
                }

                return (
                  <div
                    key={idx}
                    className={cellClass}
                    onClick={() => handleDaySelect(cell)}
                  >
                    {cell.day}
                  </div>
                );
              })}
            </div>


            {/* Done / Clear buttons */}
            <div className={styles.footer}>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.clearBtn}`}
                onClick={handleClear}
              >
                Clear
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.doneBtn}`}
                onClick={handleDone}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
