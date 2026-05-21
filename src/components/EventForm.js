'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DateTimePicker from './DateTimePicker';

const PRESET_EMOJIS = [
  // Scheduling & Celebrations
  '📅', '🎂', '🎉', '🎁', '🎈', '💍', '💎', '👑', '🥂', '🍻', '🍷', '☕', '🍽️',
  // Work & Office
  '💼', '📁', '📎', '✏️', '💻', '🖥️', '🗂️', '📈', '📉', '💡', '🛡️', '🔑', '🔒', '✉️',
  // Money & Wealth
  '💰', '💵', '💸', '💳',
  // Tech & Mobile
  '📱', '📞', '☎️', '🎮',
  // Travel & Holidays
  '✈️', '🚀', '🚗', '🏡', '🏖️', '⛱️', '🏝️', '🎆', '🎃', '🎄', '🎅', '⛰️', '🪴', '🌸',
  // Health & Sports
  '🩺', '💊', '🏋️', '🚴', '🏆', '⚽', '🏀',
  // Entertainment & Hobby
  '🎟️', '🎬', '🎵', '🎨', '📚', '🍕', '🍳', '🧸',
  // Pets & Animals
  '🐾', '🐶', '🐱',
  // Weather & Magic
  '☀️', '🌧️', '❄️', '🔥', '🌈', '⚡', '🌟', '❤️'
];


export default function EventForm({ initialData = null, onSubmit }) {
  const router = useRouter();
  
  // Basic Event details
  const [name, setName] = useState('');

  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [keepOnTop, setKeepOnTop] = useState(false);
  const [repeatType, setRepeatType] = useState('NONE');
  const [iconValue, setIconValue] = useState('📅');
  const [backgroundImage, setBackgroundImage] = useState('');

  // Reminder offsets: offsets is an array of selected days before event
  // e.g. [0, 1, 3] for "Same day", "1 day before", "3 days before"
  const [selectedOffsets, setSelectedOffsets] = useState([0, 1]); // default same day and 1 day before
  const [reminderTime, setReminderTime] = useState('09:00');

  // Categories list
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // New Category Modal states
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#8b5cf6');
  const [newCatIcon, setNewCatIcon] = useState('🏷️');

  useEffect(() => {
    // Fetch categories
    fetchCategories();

    // Load initial data if editing
    if (initialData) {
      setName(initialData.name || '');

      
      // format date YYYY-MM-DD
      const d = new Date(initialData.eventDate);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      setEventDate(`${year}-${month}-${day}`);
      
      setEventTime(initialData.eventTime || '');
      setCategoryId(initialData.categoryId || '');
      setKeepOnTop(!!initialData.keepOnTop);
      setRepeatType(initialData.repeatType || 'NONE');
      setIconValue(initialData.iconValue || '📅');
      setBackgroundImage(initialData.backgroundImage || '');
      
      if (initialData.reminders) {
        const offsets = initialData.reminders.filter(r => r.enabled).map(r => r.offsetDays);
        setSelectedOffsets(offsets);
        if (initialData.reminders.length > 0) {
          setReminderTime(initialData.reminders[0].reminderTime || '09:00');
        }
      }
    }
  }, [initialData]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          color: newCatColor,
          icon: newCatIcon
        })
      });

      if (response.ok) {
        const newCat = await response.json();
        setCategories(prev => [...prev, newCat]);
        setCategoryId(newCat.id);
        setShowNewCatModal(false);
        setNewCatName('');
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to create category');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleOffsetToggle = (offset) => {
    setSelectedOffsets(prev => 
      prev.includes(offset) 
        ? prev.filter(o => o !== offset) 
        : [...prev, offset].sort((a, b) => a - b)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!name || !eventDate) {
      alert('Event name and date are required!');
      return;
    }

    // Build the request payload
    const eventPayload = {
      name,
      description: null,
      categoryId: categoryId || null,
      eventDate,
      eventTime: eventTime || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      mode: 'AUTO',
      repeatType,
      keepOnTop,
      iconType: 'EMOJI',
      iconValue,
      backgroundImage: backgroundImage || null,
      reminders: selectedOffsets.map(offset => ({
        offsetDays: offset,
        reminderTime,
        enabled: true
      }))
    };

    onSubmit(eventPayload);
  };

  return (
    <div className="glass fade-in" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Name */}
        <div className="form-group">
          <label className="form-label">Event Name *</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="e.g. Mom's Birthday, Tesla Delivery" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        </div>

        {/* Custom Date & Time Picker */}
        <div className="form-group">
          <DateTimePicker
            valueDate={eventDate}
            valueTime={eventTime}
            onChange={({ date, time }) => {
              setEventDate(date);
              setEventTime(time);
            }}
            required
          />
        </div>

        {/* Flat Emoji Grid Selector */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <label className="form-label">Add Icon</label>
            {iconValue && (
              <span style={{ 
                fontSize: '0.85rem', 
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                Selected: <span style={{ fontSize: '1.1rem', marginLeft: '0.2rem' }}>{iconValue}</span>
              </span>
            )}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))',
            gap: '0.4rem',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--border-radius-sm)',
            padding: '0.75rem',
            maxHeight: '190px',
            overflowY: 'auto'
          }}>
            {PRESET_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setIconValue(emoji)}
                style={{
                  fontSize: '1.3rem',
                  background: iconValue === emoji ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                  border: iconValue === emoji ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '6px',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition-smooth)',
                  boxShadow: iconValue === emoji ? '0 0 10px rgba(59, 130, 246, 0.4)' : 'none'
                }}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Category selector */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Category</label>
            <button 
              type="button" 
              onClick={() => setShowNewCatModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              + Create Category
            </button>
          </div>
          <select 
            className="form-control" 
            value={categoryId} 
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">None (Default)</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Repeat Type & Pin to top */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', alignItems: 'center' }}>
          <div className="form-group">
            <label className="form-label">Repeat Rule</label>
            <select 
              className="form-control" 
              value={repeatType} 
              onChange={(e) => setRepeatType(e.target.value)}
            >
              <option value="NONE">None</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <input 
              type="checkbox" 
              id="keepOnTop"
              checked={keepOnTop} 
              onChange={(e) => setKeepOnTop(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="keepOnTop" className="form-label" style={{ cursor: 'pointer', marginBottom: 0 }}>
              📌 Pinned to top
            </label>
          </div>
        </div>

        {/* Background Image URL */}
        <div className="form-group">
          <label className="form-label">Background Image URL (Optional)</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="e.g. https://images.unsplash.com/... or /uploads/image.png" 
            value={backgroundImage} 
            onChange={(e) => setBackgroundImage(e.target.value)} 
          />
        </div>



        {/* Reminders section */}
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          padding: '1rem', 
          borderRadius: 'var(--border-radius-md)', 
          border: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <span className="form-label" style={{ color: '#fff', fontSize: '0.95rem' }}>🔔 Telegram Reminders</span>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Same Day', offset: 0 },
              { label: '1 Day Before', offset: 1 },
              { label: '2 Days Before', offset: 2 },
              { label: '3 Days Before', offset: 3 },
            ].map(item => (
              <label 
                key={item.offset} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer', 
                  fontSize: '0.85rem',
                  color: selectedOffsets.includes(item.offset) ? '#fff' : 'var(--text-secondary)'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={selectedOffsets.includes(item.offset)}
                  onChange={() => handleOffsetToggle(item.offset)}
                  style={{ width: '16px', height: '16px' }}
                />
                {item.label}
              </label>
            ))}
          </div>

          {selectedOffsets.length > 0 && (
            <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
              <label className="form-label">Reminder Hour</label>
              <input 
                type="time" 
                className="form-control" 
                value={reminderTime} 
                onChange={(e) => setReminderTime(e.target.value)} 
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ flex: 1 }}
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ flex: 2 }}
          >
            {initialData ? 'Save Changes' : 'Create Event'}
          </button>
        </div>
      </form>

      {/* Quick Add Category Modal */}
      {showNewCatModal && (
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
          <div className="glass fade-in" style={{ padding: '1.5rem', maxWidth: '360px', width: '100%', background: 'var(--bg-app)' }}>
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Create New Category</h4>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Health, Subscriptions" 
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input 
                      type="color" 
                      className="form-control" 
                      style={{ padding: '0.2rem', height: '38px', width: '50px', cursor: 'pointer' }}
                      value={newCatColor}
                      onChange={e => setNewCatColor(e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{newCatColor}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Icon / Emoji</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 💊, 🔄" 
                    value={newCatIcon}
                    maxLength="2"
                    onChange={e => setNewCatIcon(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowNewCatModal(false)}
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '0.5rem' }}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
