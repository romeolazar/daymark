'use client';

import React, { useState, useEffect, use } from 'react';
import Navbar from '../../../components/Navbar';
import EventForm from '../../../components/EventForm';
import { useRouter } from 'next/navigation';

export default function EditEventPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${id}`);
        if (response.ok) {
          const data = await response.json();
          setEventData(data);
        } else {
          setError('Event not found or access denied.');
        }
      } catch (err) {
        setError('Failed to load event data.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleUpdateEvent = async (eventPayload) => {
    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventPayload)
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      alert('An unexpected error occurred.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading event details...
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <main style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h3 style={{ color: '#fff', marginTop: '1rem' }}>Error Loading Event</h3>
          <p style={{ margin: '0.5rem 0 1.5rem' }}>{error}</p>
          <button onClick={() => router.push('/')} className="btn btn-primary">
            Back to Dashboard
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="fade-in">
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>✏️ Edit Event</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Modify details, schedules, or Telegram reminders.
          </p>
        </div>

        <EventForm initialData={eventData} onSubmit={handleUpdateEvent} />
      </main>
    </>
  );
}
