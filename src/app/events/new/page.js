'use client';

import Navbar from '../../../components/Navbar';
import EventForm from '../../../components/EventForm';
import { useRouter } from 'next/navigation';

export default function NewEventPage() {
  const router = useRouter();

  const handleCreateEvent = async (eventPayload) => {
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload)
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('An unexpected error occurred.');
    }
  };

  return (
    <>
      <Navbar />
      <main className="fade-in">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>📅📌 Add New Event</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Track an upcoming deadline or record a past milestone.
          </p>
        </div>

        <EventForm onSubmit={handleCreateEvent} />
      </main>
    </>
  );
}
