'use client';

import { useState, useEffect } from 'react';
import styles from '../styles/components/EventCard.module.css';
import { calculateTimeEngine, formatEventDate, formatEventTime } from '../lib/time';

export default function EventCard({ 
  event, 
  onDelete, 
  onShare, 
  defaultFormat = 'DAYS',
  timeFormat = '12H',
  dateFormat = 'MMMM_DD_YYYY',
  viewMode = 'CARD'
}) {
  const [formatMode, setFormatMode] = useState(defaultFormat);
  const [timeDetails, setTimeDetails] = useState(null);

  // Sync formatMode if defaultFormat changes
  useEffect(() => {
    setFormatMode(defaultFormat);
  }, [defaultFormat]);

  // Re-run time engine calculations on mount and every minute (to keep hours/days fresh)
  useEffect(() => {
    const updateTime = () => {
      const details = calculateTimeEngine(
        event.eventDate, 
        event.eventTime, 
        event.mode, 
        event.repeatType
      );
      setTimeDetails(details);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [event]);

  if (!timeDetails) return null;

  const cycleFormat = (e) => {
    // Prevent cycling if user clicked on action buttons
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }

    const modes = ['DAYS', 'MONTHS_DAYS', 'YEARS_MONTHS_DAYS', 'HOURS'];
    const currentIndex = modes.indexOf(formatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFormatMode(modes[nextIndex]);
  };

  const getCounterText = () => {
    switch (formatMode) {
      case 'MONTHS_DAYS':
        return timeDetails.monthsDays;
      case 'YEARS_MONTHS_DAYS':
        return timeDetails.yearsMonthsDays;
      case 'HOURS':
        return timeDetails.hours;
      case 'DAYS':
      default:
        return timeDetails.days;
    }
  };

  // Format local display date using configured preferences
  const dateFormatted = formatEventDate(timeDetails.displayDate, dateFormat);
  const timeFormatted = event.eventTime ? formatEventTime(event.eventTime, timeFormat) : '';
  const displayDateStr = dateFormatted + (timeFormatted ? ` at ${timeFormatted}` : '');

  // Determine background styling if custom image exists
  const cardStyle = event.backgroundImage
    ? { backgroundImage: `url(${event.backgroundImage})` }
    : {};

  // Get category styling
  const catColor = event.category?.color || 'var(--cat-other)';
  const catStyle = {
    backgroundColor: `${catColor}20`, // 12% opacity background
    borderColor: `${catColor}50`,
    color: catColor
  };

  if (viewMode === 'POSTER') {
    const posterClasses = [
      styles.posterCard,
      event.backgroundImage ? styles.posterCardWithBg : styles.posterCardNoBg
    ].join(' ');

    return (
      <div className={posterClasses} style={cardStyle} onClick={cycleFormat}>
        <div className={styles.posterVignette} />
        <div className={styles.posterContent}>
          {/* Header */}
          <div className={styles.posterHeader}>
            <div className={styles.posterIcon}>
              {event.iconType === 'EMOJI' ? event.iconValue : '📅'}
            </div>
            {event.keepOnTop && (
              <span className={styles.posterPinIcon} title="Pinned to top">📌</span>
            )}
          </div>

          {/* Large Countdown */}
          <div className={styles.posterCounterWrapper}>
            <div className={`${styles.posterCounterText} ${timeDetails.isPast ? styles.countup : styles.countdown}`}>
              {getCounterText()}
            </div>
          </div>

          {/* Footer Info & Badges */}
          <div className={styles.posterFooter}>
            <div className={styles.posterInfo}>
              <h3 className={styles.posterTitle}>{event.name}</h3>
              <span className={styles.posterDate}>{displayDateStr}</span>
            </div>

            <div className={styles.posterMetaRow}>
              <div className={styles.posterBadges}>
                {event.category && (
                  <span className={`${styles.badge} ${styles.categoryBadge}`} style={catStyle}>
                    {event.category.icon} {event.category.name}
                  </span>
                )}

                {event.reminders && event.reminders.length > 0 && (
                  <span className={`${styles.badge} ${styles.reminderBadge}`}>
                    🔔 {event.reminders.filter(r => r.enabled).length} reminder(s)
                  </span>
                )}

                {event.repeatType && event.repeatType !== 'NONE' && (
                  <span className={`${styles.badge} ${styles.repeatBadge}`}>
                    🔁 {event.repeatType.toLowerCase()}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className={styles.posterActions}>

                <button 
                  className={styles.actionBtn} 
                  onClick={(e) => { e.stopPropagation(); onShare(event); }} 
                  title="Share event"
                >
                  📤
                </button>
                <a 
                  className={styles.actionBtn} 
                  href={`/events/${event.id}`} 
                  title="Edit event"
                >
                  ✏️
                </a>
                <button 
                  className={styles.actionBtn} 
                  onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} 
                  title="Delete event"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'LIST') {
    return (
      <div className={styles.listCard} onClick={cycleFormat}>
        {/* Left: Icon/Emoji */}
        <div className={styles.listIconWrapper}>
          {event.iconType === 'EMOJI' ? event.iconValue : '📅'}
        </div>

        {/* Middle: Title, Date, and Badges */}
        <div className={styles.listInfoWrapper}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 className={styles.listTitle}>{event.name}</h3>
            
            {event.keepOnTop && (
              <span className={styles.listPinIcon} title="Pinned to top">📌</span>
            )}

            {event.category && (
              <span className={`${styles.badge} ${styles.categoryBadge}`} style={catStyle}>
                {event.category.icon} {event.category.name}
              </span>
            )}
            
            {event.repeatType && event.repeatType !== 'NONE' && (
              <span className={`${styles.badge} ${styles.repeatBadge}`} style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>
                🔁 {event.repeatType.toLowerCase()}
              </span>
            )}
          </div>
          <span className={styles.listDateText}>{displayDateStr}</span>
        </div>

        {/* Right: Counter */}
        <div className={styles.listCounterWrapper}>
          <span className={`${styles.listCounterText} ${timeDetails.isPast ? styles.countup : styles.countdown}`}>
            {getCounterText()}
          </span>
        </div>

        {/* Right-most: Actions */}
        <div className={styles.listActions}>

          <button 
            className={styles.actionBtn} 
            onClick={(e) => { e.stopPropagation(); onShare(event); }} 
            title="Share event"
          >
            📤
          </button>
          <a 
            className={styles.actionBtn} 
            href={`/events/${event.id}`} 
            title="Edit event"
          >
            ✏️
          </a>
          <button 
            className={styles.actionBtn} 
            onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} 
            title="Delete event"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  }

  const cardClasses = [
    styles.card,
    event.backgroundImage ? styles.cardWithBg : ''
  ].join(' ');


  return (
    <div className={cardClasses} style={cardStyle} onClick={cycleFormat}>
      <div className={styles.cardContent}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            {event.iconType === 'EMOJI' ? event.iconValue : '📅'}
          </div>
          
          <div className={styles.titleWrapper}>
            <h3 className={styles.title}>{event.name}</h3>
            <span className={styles.dateText}>{displayDateStr}</span>
          </div>

          {event.keepOnTop && (
            <div className={styles.pinIcon} title="Pinned to top">
              📌
            </div>
          )}
        </div>

        {/* Counter Display (Tapping cycles formats) */}
        <div className={styles.counterSection}>
          <div className={`${styles.counterText} ${timeDetails.isPast ? styles.countup : styles.countdown}`}>
            {getCounterText()}
          </div>
        </div>

        {/* Badges / Footer Section */}
        <div className={styles.footer}>
          {event.category && (
            <span className={`${styles.badge} ${styles.categoryBadge}`} style={catStyle}>
              {event.category.icon} {event.category.name}
            </span>
          )}

          {event.reminders && event.reminders.length > 0 && (
            <span className={`${styles.badge} ${styles.reminderBadge}`}>
              🔔 {event.reminders.filter(r => r.enabled).length} reminder(s)
            </span>
          )}

          {event.repeatType && event.repeatType !== 'NONE' && (
            <span className={`${styles.badge} ${styles.repeatBadge}`}>
              🔁 {event.repeatType.toLowerCase()}
            </span>
          )}

          {/* Actions */}
          <div className={styles.actions}>

            <button 
              className={styles.actionBtn} 
              onClick={(e) => { e.stopPropagation(); onShare(event); }} 
              title="Share event"
            >
              📤
            </button>
            <a 
              className={styles.actionBtn} 
              href={`/events/${event.id}`} 
              title="Edit event"
            >
              ✏️
            </a>
            <button 
              className={styles.actionBtn} 
              onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} 
              title="Delete event"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
