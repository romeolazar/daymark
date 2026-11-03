import styles from '../styles/components/ProgressRing.module.css';

/**
 * Circular progress around the event icon.
 * `progress` goes from 0 to 1; the ring fills clockwise from the top.
 */
export default function ProgressRing({ progress, size = 52, stroke = 3, color = 'var(--accent)', children }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.round(progress * 100);
  const label = `${percent}% of the wait is behind you`;

  return (
    <div className={styles.ring} style={{ width: size, height: size }} title={label} aria-label={label} role="img">
      <svg className={styles.svg} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          className={styles.track}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
        />
        <circle
          className={styles.value}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
