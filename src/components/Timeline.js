'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../styles/components/Timeline.module.css';
import { getOccurrencesBetween, formatEventDate } from '../lib/time';

const MONTHS_AHEAD = 12;
const BUBBLE_SIZE = 26;
const LANE_HEIGHT = 32;
const STEM_BASE = 10;
const MAX_LANES = 4;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Same hue as --accent, as hex so an alpha suffix can be appended
const FALLBACK_COLOR = '#7c5cf0';

/**
 * Horizontal strip of the next 12 months with every occurrence as a bubble.
 */
export default function Timeline({ events, dateFormat }) {
  const trackRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + MONTHS_AHEAD);
  const toX = (date) => ((date.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * width;

  const occurrences = events
    .flatMap(event => getOccurrencesBetween(event, start, end).map(date => ({ event, date })))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Stack bubbles that would overlap into lanes above each other
  const laneEnds = [];
  const placed = occurrences.map(item => {
    const x = toX(item.date);
    let lane = laneEnds.findIndex(laneEnd => x - laneEnd >= BUBBLE_SIZE + 2);
    if (lane === -1) {
      lane = laneEnds.length < MAX_LANES ? laneEnds.length : laneEnds.indexOf(Math.min(...laneEnds));
    }
    laneEnds[lane] = x;
    return { ...item, x, lane };
  });
  const laneCount = Math.max(laneEnds.length, 1);

  // Month boundaries; on narrow screens label every other month
  const months = [];
  for (let i = 1; i <= MONTHS_AHEAD; i++) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    if (date.getTime() <= end.getTime()) months.push(date);
  }
  const labelEvery = width / MONTHS_AHEAD < 36 ? 2 : 1;

  return (
    <section className={styles.timeline} aria-label="Next 12 months">
      <div className={styles.header}>
        <h4 className={styles.heading}>📈 Next 12 Months</h4>
        <span className={styles.count}>
          {occurrences.length === 0 ? 'Nothing coming up' : `${occurrences.length} upcoming`}
        </span>
      </div>

      <div className={styles.track} ref={trackRef}>
        <div className={styles.area} style={{ height: STEM_BASE + laneCount * LANE_HEIGHT }}>
          {width > 0 && placed.map(({ event, date, x, lane }) => {
            const color = event.category?.color || FALLBACK_COLOR;
            const lift = STEM_BASE + lane * LANE_HEIGHT;
            const days = Math.round((date.getTime() - start.getTime()) / DAY_MS);
            const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
            const label = `${event.name} · ${formatEventDate(date, dateFormat)} · ${when}`;

            return (
              <div key={`${event.id}-${date.getTime()}`}>
                <span className={styles.stem} style={{ left: x, height: lift, background: `${color}66` }} />
                <span className={styles.dot} style={{ left: x, background: color }} />
                <a
                  href={`/events/${event.id}`}
                  className={styles.bubble}
                  style={{ left: x, bottom: lift, borderColor: color, background: `${color}26`, boxShadow: `0 0 12px ${color}40` }}
                  title={label}
                  aria-label={label}
                >
                  {event.iconType === 'EMOJI' ? event.iconValue : '📅'}
                </a>
              </div>
            );
          })}
        </div>

        <div className={styles.axis}>
          <span className={styles.today} title="Today" />
          {width > 0 && months.map(date => (
            <span key={date.getTime()} className={styles.tick} style={{ left: toX(date) }} />
          ))}
        </div>

        <div className={styles.labels}>
          <span className={`${styles.label} ${styles.todayLabel}`} style={{ left: 0 }}>Today</span>
          {width > 0 && months.map((date, i) => (
            // Skip a month label that would collide with "Today"
            (i + 1) % labelEvery === 0 && toX(date) > 72 && (
              <span key={date.getTime()} className={styles.label} style={{ left: toX(date) }}>
                {MONTH_NAMES[date.getMonth()]}
                {date.getMonth() === 0 && ` '${String(date.getFullYear()).slice(2)}`}
              </span>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
