'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  
  // Settings/Profile state
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [defaultReminderTime, setDefaultReminderTime] = useState('09:00');
  const [defaultViewFormat, setDefaultViewFormat] = useState('DAYS');
  const [timeFormat, setTimeFormat] = useState('12H');
  const [dateFormat, setDateFormat] = useState('MMMM_DD_YYYY');
  const [password, setPassword] = useState('');
  
  // Category state
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Category Modal state
  const [editingCategory, setEditingCategory] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catModalMode, setCatModalMode] = useState('ADD');
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#8b5cf6');
  const [catIcon, setCatIcon] = useState('🏷️');
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

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

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setDisplayName(data.profile?.displayName || '');
        setTimezone(data.profile?.timezone || 'UTC');
        
        if (data.settings) {
          setTelegramEnabled(!!data.settings.telegramEnabled);
          setTelegramBotToken(data.settings.telegramBotToken || '');
          setTelegramChatId(data.settings.telegramChatId || '');
          setDefaultReminderTime(data.settings.defaultReminderTime || '09:00');
          setDefaultViewFormat(data.settings.defaultViewFormat || 'DAYS');
          setTimeFormat(data.settings.timeFormat || '12H');
          setDateFormat(data.settings.dateFormat || 'MMMM_DD_YYYY');
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          timezone,
          telegramEnabled,
          telegramBotToken,
          telegramChatId,
          defaultReminderTime,
          defaultViewFormat,
          timeFormat,
          dateFormat,
          password: password || undefined
        })
      });

      if (response.ok) {
        setMsg({ type: 'success', text: 'Settings saved successfully!' });
        setPassword(''); // clear password field
        router.refresh();
      } else {
        const err = await response.json();
        setMsg({ type: 'error', text: err.error || 'Failed to save settings' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      setMsg({ type: 'error', text: 'Please fill in Bot Token and Chat ID before testing.' });
      return;
    }

    setTestingTelegram(true);
    setMsg({ type: '', text: '' });

    try {
      const response = await fetch('/api/settings/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramBotToken,
          chatId: telegramChatId
        })
      });

      if (response.ok) {
        setMsg({ type: 'success', text: 'Test message sent successfully! Check your Telegram.' });
      } else {
        const err = await response.json();
        setMsg({ type: 'error', text: `Telegram error: ${err.error}` });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'Failed to trigger Telegram test connection.' });
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Importing this file will add the events to your database. Do you want to proceed?')) {
      e.target.value = ''; // clear input
      return;
    }

    setImporting(true);
    setMsg({ type: '', text: '' });

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const response = await fetch('/api/import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });

      const result = await response.json();

      if (response.ok) {
        setMsg({ type: 'success', text: `Successfully imported ${result.imported} events!` });
        fetchSettings(); // reload configurations
      } else {
        setMsg({ type: 'error', text: result.error || 'Failed to import JSON file.' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'Invalid JSON file structure.' });
    } finally {
      setImporting(false);
      e.target.value = ''; // clear input
    }
  };

  const handleAddCategoryClick = () => {
    setCatModalMode('ADD');
    setCatName('');
    setCatColor('#8b5cf6');
    setCatIcon('🏷️');
    setEditingCategory(null);
    setShowCatModal(true);
  };

  const handleEditCategoryClick = (cat) => {
    setCatModalMode('EDIT');
    setCatName(cat.name);
    setCatColor(cat.color || '#8b5cf6');
    setCatIcon(cat.icon || '🏷️');
    setEditingCategory(cat);
    setShowCatModal(true);
  };

  const handleDeleteCategoryClick = async (id) => {
    if (!confirm('Are you sure you want to delete this category? Events under it will have their category set to None.')) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        setMsg({ type: 'success', text: 'Category deleted successfully.' });
      } else {
        const err = await response.json();
        setMsg({ type: 'error', text: err.error || 'Failed to delete category.' });
      }
    } catch (error) {
      setMsg({ type: 'error', text: 'An error occurred while deleting category.' });
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      let response;
      if (catModalMode === 'ADD') {
        response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName,
            color: catColor,
            icon: catIcon
          })
        });
      } else {
        response = await fetch(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catName,
            color: catColor,
            icon: catIcon
          })
        });
      }

      if (response.ok) {
        const savedCat = await response.json();
        if (catModalMode === 'ADD') {
          setCategories(prev => [...prev, savedCat].sort((a, b) => a.name.localeCompare(b.name)));
          setMsg({ type: 'success', text: 'Category added successfully!' });
        } else {
          setCategories(prev => prev.map(c => c.id === savedCat.id ? savedCat : c).sort((a, b) => a.name.localeCompare(b.name)));
          setMsg({ type: 'success', text: 'Category updated successfully!' });
        }
        setShowCatModal(false);
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to save category');
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading settings...
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>⚙️ App Settings</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Configure your notifications, backup data, and customize preferences.
          </p>
        </div>

        {msg.text && (
          <div style={{
            padding: '0.75rem 1rem',
            background: msg.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${msg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            borderRadius: 'var(--border-radius-sm)',
            color: msg.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {msg.type === 'success' ? '✅' : '⚠️'} {msg.text}
          </div>
        )}

        <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Profile Section */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              👤 User Profile
            </h3>
            
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={displayName} 
                onChange={e => setDisplayName(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Update Password (Leave blank to keep current)</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="New Password"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select 
                className="form-control" 
                value={timezone} 
                onChange={e => setTimezone(e.target.value)}
              >
                <option value="UTC">UTC</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
                <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                <option value="Europe/Rome">Rome (CET/CEST)</option>
                <option value="Europe/Madrid">Madrid (CET/CEST)</option>
                <option value="Europe/Bucharest">Bucharest (EET/EEST)</option>
                <option value="Europe/Athens">Athens (EET/EEST)</option>
                <option value="Europe/Warsaw">Warsaw (CET/CEST)</option>
                <option value="Europe/Vienna">Vienna (CET/CEST)</option>
                <option value="Europe/Zurich">Zurich (CET/CEST)</option>
                <option value="Europe/Moscow">Moscow (MSK)</option>
                <option value="Europe/Dublin">Dublin (GMT/IST)</option>
                <option value="Europe/Copenhagen">Copenhagen (CET/CEST)</option>
                <option value="Europe/Stockholm">Stockholm (CET/CEST)</option>
                <option value="Europe/Oslo">Oslo (CET/CEST)</option>
                <option value="Europe/Helsinki">Helsinki (EET/EEST)</option>
                <option value="Europe/Amsterdam">Amsterdam (CET/CEST)</option>
                <option value="Europe/Brussels">Brussels (CET/CEST)</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Jerusalem">Jerusalem (IST)</option>
              </select>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              🎨 Layout Preferences
            </h3>

            <div className="form-group">
              <label className="form-label">Default Countdown Format</label>
              <select 
                className="form-control" 
                value={defaultViewFormat} 
                onChange={e => setDefaultViewFormat(e.target.value)}
              >
                <option value="DAYS">Days (e.g. In 12 days)</option>
                <option value="MONTHS_DAYS">Months & Days (e.g. In 3 months and 18 days)</option>
                <option value="YEARS_MONTHS_DAYS">Years, Months & Days (e.g. In 2 years, 3 months and 18 days)</option>
                <option value="HOURS">Hours (e.g. In 2568 hours)</option>
              </select>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Note: You can still tap individual event cards on the dashboard to cycle formats.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Date Format</label>
              <select 
                className="form-control" 
                value={dateFormat} 
                onChange={e => setDateFormat(e.target.value)}
              >
                <option value="DD_MMMM_YYYY">10 June 2025</option>
                <option value="MMMM_DD_YYYY">June 10, 2025</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Time Format</label>
              <select 
                className="form-control" 
                value={timeFormat} 
                onChange={e => setTimeFormat(e.target.value)}
              >
                <option value="12H">12 Hours (e.g., 10:30 PM)</option>
                <option value="24H">24 Hours (e.g., 22:30)</option>
              </select>
            </div>
          </div>

          {/* Telegram Settings */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                🔔 Telegram Notifications
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="telegramEnabled"
                  checked={telegramEnabled} 
                  onChange={e => setTelegramEnabled(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="telegramEnabled" className="form-label" style={{ cursor: 'pointer', marginBottom: 0, fontWeight: 600 }}>
                  Enabled
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Telegram Bot Token (from @BotFather)</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                value={telegramBotToken} 
                onChange={e => setTelegramBotToken(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Telegram Chat ID (User ID or Channel/Group ID)</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. 987654321 or -100123456789"
                value={telegramChatId} 
                onChange={e => setTelegramChatId(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Notification Dispatch Hour</label>
              <input 
                type="time" 
                className="form-control" 
                value={defaultReminderTime} 
                onChange={e => setDefaultReminderTime(e.target.value)} 
              />
            </div>

            {telegramBotToken && telegramChatId && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem' }}
                onClick={handleTestTelegram}
                disabled={testingTelegram}
              >
                {testingTelegram ? 'Sending Test Message...' : '⚡ Test Telegram Connection'}
              </button>
            )}
          </div>

          {/* Backup & Restore Section */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              💾 Backup & Restore
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Export all your events, categories, and settings to a local JSON file or import a previous backup.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Export */}
              <a 
                href="/api/import-export" 
                download="daymark_backup.json"
                className="btn btn-secondary"
                style={{ textAlign: 'center' }}
              >
                📥 Export JSON
              </a>

              {/* Import */}
              <label 
                className="btn btn-secondary" 
                style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', textAlign: 'center' }}
              >
                📤 {importing ? 'Importing...' : 'Import JSON'}
                <input 
                  type="file" 
                  accept=".json" 
                  style={{ position: 'absolute', top: 0, right: 0, opacity: 0, fontSize: '100px', cursor: 'pointer' }}
                  onChange={handleImportJSON}
                  disabled={importing}
                />
              </label>
            </div>
          </div>

          {/* Categories Management Section */}
          <div className="glass" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
              🏷️ Manage Categories
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {loadingCategories ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading categories...</div>
              ) : categories.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No custom categories yet. Add one here.</div>
              ) : (
                categories.map(cat => (
                  <div key={cat.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--border-radius-sm)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
                      <span style={{ fontWeight: 500, color: cat.color || '#fff' }}>{cat.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px' }}
                        onClick={() => handleEditCategoryClick(cat)}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px' }}
                        onClick={() => handleDeleteCategoryClick(cat.id)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={handleAddCategoryClick}
            >
              ➕ Add Custom Category
            </button>
          </div>

          {/* Save Button */}
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
            disabled={saving}
          >
            {saving ? 'Saving changes...' : 'Save All Settings'}
          </button>
        </form>
      </main>

      {/* Category Edit/Add Modal */}
      {showCatModal && (
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
            <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>
              {catModalMode === 'ADD' ? 'Create New Category' : 'Edit Category'}
            </h4>
            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Health, Subscriptions" 
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
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
                      value={catColor}
                      onChange={e => setCatColor(e.target.value)}
                    />
                    <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{catColor}</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Icon / Emoji</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. 💊, 🔄" 
                    value={catIcon}
                    maxLength="2"
                    onChange={e => setCatIcon(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowCatModal(false)}
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
    </>
  );
}
