'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import EventCard from '../components/EventCard';
import Link from 'next/link';
import { getNextOccurrence } from '../lib/time';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState('CARD'); // 'CARD' or 'LIST'

  // Share Modal states
  const [sharedEvent, setSharedEvent] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const storedViewMode = localStorage.getItem('daymark_view_mode');
    if (storedViewMode === 'CARD' || storedViewMode === 'LIST' || storedViewMode === 'POSTER') {
      setViewMode(storedViewMode);
    }

    const loadDashboardData = async () => {
      try {
        // Fetch current user details
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const userData = await meRes.json();
          setUser(userData);
        }

        // Fetch categories
        const catRes = await fetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }

        // Fetch events
        await fetchEvents();
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEvents(prev => prev.filter(e => e.id !== id));
      } else {
        alert('Failed to delete event');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('daymark_view_mode', mode);
  };

  const handleShareEvent = (event) => {
    setSharedEvent(event);
    setCopied(false);
  };

  const copyShareText = () => {
    if (!sharedEvent) return;
    
    // Simple text preview calculation (Days format)
    const eventDateObj = new Date(sharedEvent.eventDate);
    const now = new Date();
    const diffMs = Math.abs(eventDateObj.getTime() - now.getTime());
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    const prefix = eventDateObj.getTime() >= now.getTime() ? 'in ' : '';
    const suffix = eventDateObj.getTime() < now.getTime() ? ' ago' : '';
    const emoji = sharedEvent.iconType === 'EMOJI' ? sharedEvent.iconValue : '📅';
    
    let timeText = `${totalDays} day${totalDays === 1 ? '' : 's'}`;
    if (totalDays === 0) timeText = 'today';
    
    const text = `${emoji} ${sharedEvent.name} — ${prefix}${timeText}${suffix}`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadICS = () => {
    if (!sharedEvent) return;

    const dateObj = new Date(sharedEvent.eventDate);
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');

    // Format start time
    let startTimeStr = `${year}${month}${day}`;
    let endTimeStr = `${year}${month}${day}`;
    
    if (sharedEvent.eventTime) {
      const [hours, minutes] = sharedEvent.eventTime.split(':');
      startTimeStr += `T${hours}${minutes}00Z`;
      // End time is 1 hour later
      const endHrs = String((Number(hours) + 1) % 24).padStart(2, '0');
      endTimeStr += `T${endHrs}${minutes}00Z`;
    }

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Daymark//Event Tracker//EN',
      'BEGIN:VEVENT',
      `UID:${sharedEvent.id}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startTimeStr}`,
      `DTEND:${endTimeStr}`,
      `SUMMARY:${sharedEvent.name}`,
      `DESCRIPTION:${sharedEvent.description || 'Event tracked via Daymark'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${sharedEvent.name.toLowerCase().replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter logic
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || event.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const now = new Date();

  // Helper to determine the calculated target date for sorting and classification
  const getEventDisplayDate = (event) => {
    const originalDate = new Date(event.eventDate);
    if (event.eventTime) {
      const [hours, minutes] = event.eventTime.split(':').map(Number);
      originalDate.setHours(hours, minutes, 0, 0);
    } else {
      originalDate.setHours(0, 0, 0, 0);
    }
    return event.repeatType !== 'NONE'
      ? getNextOccurrence(originalDate, event.repeatType, now)
      : originalDate;
  };

  // Split, sort, and filter events
  const pinnedEvents = filteredEvents
    .filter(e => e.keepOnTop)
    .sort((a, b) => getEventDisplayDate(a).getTime() - getEventDisplayDate(b).getTime());
  
  const normalEvents = filteredEvents.filter(e => !e.keepOnTop);
  
  const upcomingEvents = normalEvents
    .filter(e => {
      const d = getEventDisplayDate(e);
      return d.getTime() >= now.getTime();
    })
    .sort((a, b) => getEventDisplayDate(a).getTime() - getEventDisplayDate(b).getTime());

  const pastEvents = normalEvents
    .filter(e => {
      const d = getEventDisplayDate(e);
      return d.getTime() < now.getTime();
    })
    .sort((a, b) => getEventDisplayDate(b).getTime() - getEventDisplayDate(a).getTime());

  // Only display categories associated with at least one event
  const associatedCategoryIds = new Set(events.map(e => e.categoryId).filter(Boolean));
  const filteredCategories = categories.filter(cat => associatedCategoryIds.has(cat.id));

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading your Daymark board...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      
      <main className="fade-in">
        {/* Aesthetic Dashboard Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              Your events, {user?.displayName || 'User'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Tracking {events.length} important milestones and reminders
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* View Mode Toggle Buttons */}
            <div className="glass" style={{ display: 'flex', padding: '2px', borderRadius: 'var(--border-radius-sm)' }}>
              <button
                onClick={() => toggleViewMode('LIST')}
                style={{
                  background: viewMode === 'LIST' ? 'var(--accent)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'var(--transition-smooth)'
                }}
                title="List View"
              >
                List
              </button>
              <button
                onClick={() => toggleViewMode('CARD')}
                style={{
                  background: viewMode === 'CARD' ? 'var(--accent)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'var(--transition-smooth)'
                }}
                title="Card View"
              >
                Cards
              </button>
              <button
                onClick={() => toggleViewMode('POSTER')}
                style={{
                  background: viewMode === 'POSTER' ? 'var(--accent)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  transition: 'var(--transition-smooth)'
                }}
                title="Poster View"
              >
                Posters
              </button>
            </div>
            
            {/* Discrete Search and Filter Toggle Button */}
            <button
              onClick={() => setIsSearchExpanded(!isSearchExpanded)}
              style={{
                background: (isSearchExpanded || searchQuery || selectedCategory) ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--border-radius-sm)',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.1rem',
                color: 'var(--text-primary)',
                transition: 'var(--transition-smooth)',
                flexShrink: 0
              }}
              title="Search and filter events"
            >
              🔍
            </button>

            <Link href="/events/new" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.9rem', flexShrink: 0 }}>
              ➕ Add Event
            </Link>
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {(isSearchExpanded || searchQuery || selectedCategory) && (
          <div className="glass fade-in" style={{ 
            padding: '1rem', 
            marginBottom: '2rem', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
            animation: 'slideDown 0.2s ease-out'
          }}>
            {/* Search Input */}
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', padding: '0.25rem 0.75rem', width: '100%', boxSizing: 'border-box' }}>
              <span style={{ marginRight: '0.5rem', opacity: 0.6 }}>🔍</span>
              <input
                type="text"
                className="form-control"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '0.25rem 0',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  width: '100%',
                  outline: 'none',
                  boxShadow: 'none'
                }}
              />
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    paddingLeft: '0.5rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Categories filter tags */}
            {filteredCategories.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', whiteSpace: 'nowrap' }}>
                <button
                  onClick={() => setSelectedCategory('')}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    borderRadius: 'var(--border-radius-full)',
                    border: '1px solid var(--glass-border)',
                    background: selectedCategory === '' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.04)',
                    color: selectedCategory === '' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  All
                </button>
                {filteredCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      borderRadius: 'var(--border-radius-full)',
                      border: `1px solid ${selectedCategory === cat.id ? cat.color : 'var(--glass-border)'}`,
                      background: selectedCategory === cat.id ? `${cat.color}30` : 'rgba(255, 255, 255, 0.04)',
                      color: selectedCategory === cat.id ? cat.color : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List Sections */}
        {filteredEvents.length === 0 ? (
          <div className="glass" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <img 
              src="/logo/daymark_logo.png" 
              alt="Daymark Logo" 
              style={{ height: '95px', width: 'auto', display: 'block', margin: '0 auto 1rem', objectFit: 'contain' }} 
            />
            <h4 style={{ color: '#fff', marginTop: '1rem', fontWeight: 600 }}>No Events Tracked Yet</h4>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 1.5rem' }}>Start recording your milestones and deadline countdowns.</p>
            <Link href="/events/new" className="btn btn-primary">
              Create Your First Event
            </Link>
          </div>
        ) : (
          <>
            {/* Pinned Events */}
            {pinnedEvents.length > 0 && (
              <div style={{ marginBottom: '2.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  📌 Keep On Top
                </h4>
                <div style={viewMode === 'POSTER' ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1.5rem',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                } : {}}>
                  {pinnedEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={handleDeleteEvent}
                      onShare={handleShareEvent}
                      defaultFormat={user?.settings?.defaultViewFormat}
                      timeFormat={user?.settings?.timeFormat}
                      dateFormat={user?.settings?.dateFormat}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div style={{ marginBottom: '2.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>
                  🗓️ Upcoming Events
                </h4>
                <div style={viewMode === 'POSTER' ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1.5rem',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                } : {}}>
                  {upcomingEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={handleDeleteEvent}
                      onShare={handleShareEvent}
                      defaultFormat={user?.settings?.defaultViewFormat}
                      timeFormat={user?.settings?.timeFormat}
                      dateFormat={user?.settings?.dateFormat}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div style={{ marginBottom: '2.25rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>
                  ⏳ Past Milestones
                </h4>
                <div style={viewMode === 'POSTER' ? {
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1.5rem',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                } : {}}>
                  {pastEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={handleDeleteEvent}
                      onShare={handleShareEvent}
                      defaultFormat={user?.settings?.defaultViewFormat}
                      timeFormat={user?.settings?.timeFormat}
                      dateFormat={user?.settings?.dateFormat}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Share Modal Dialog */}
      {sharedEvent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div className="glass fade-in" style={{ padding: '2rem 1.5rem', maxWidth: '400px', width: '100%', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 600 }}>Share Event</h3>
              <button 
                onClick={() => setSharedEvent(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Share the event details, download a calendar event, or export it to other calendar applications.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={copyShareText} className="btn btn-secondary" style={{ width: '100%' }}>
                {copied ? '✅ Copied to Clipboard!' : '📋 Copy Share Text'}
              </button>
              
              <button onClick={downloadICS} className="btn btn-secondary" style={{ width: '100%' }}>
                📅 Download Calendar Event (.ICS)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
