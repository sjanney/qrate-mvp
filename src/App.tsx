import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { DJLogin } from './components/DJLogin';
import { HostDashboard } from './components/HostDashboard';
import { EventCreation } from './components/EventCreation';
import { GuestFlow } from './components/GuestFlow';
import { DJDashboard } from './components/DJDashboard';
import { QRCodeDisplay } from './components/QRCodeDisplay';
import { PlaylistConnection } from './components/PlaylistConnection';
import { DJGreeting } from './components/DJGreeting';
import { HostGreeting } from './components/HostGreeting';
import { ErrorBoundary } from './components/ErrorBoundary';
import { apiCall } from './utils/supabase/client';
import type { Event } from './types';

type AppMode = 'landing' | 'host-login' | 'signup' | 'dj-login' | 'host-dashboard' | 'create-event' | 'guest-flow' | 'dj-dashboard' | 'qr-display' | 'playlist-connection' | 'dj-greeting' | 'host-greeting';

// Event type imported from ./types

export default function App() {
  const [mode, setMode] = useState<AppMode>('landing');
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Load userAccounts from localStorage on mount
  const [userAccounts, setUserAccounts] = useState<Array<{username: string, password: string, email: string, events?: Event[]}>>(() => {
    try {
      const stored = localStorage.getItem('synergy_user_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure demo user exists
        if (!parsed.find((acc: any) => acc.username === 'demo')) {
          return [...parsed, { username: 'demo', password: 'demo', email: 'demo@example.com', events: [] }];
        }
        return parsed;
      }
    } catch (err) {
      console.error('Failed to load user accounts from localStorage:', err);
    }
    return [{ username: 'demo', password: 'demo', email: 'demo@example.com', events: [] }];
  });
  
  // Persist userAccounts to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('synergy_user_accounts', JSON.stringify(userAccounts));
    } catch (err) {
      console.error('Failed to save user accounts to localStorage:', err);
    }
  }, [userAccounts]);

  // Centralized path mapping for seamless URLs
  const modeToPath: Record<AppMode, string> = {
    'landing': '/',
    'host-login': '/host',
    'signup': '/signup',
    'dj-login': '/dj',
    'host-dashboard': '/host/dashboard',
    'create-event': '/host/create',
    'guest-flow': '/guest',
    'dj-dashboard': '/dj/dashboard',
    'qr-display': '/qr',
    'playlist-connection': '/dj/connect',
    'dj-greeting': '/dj/greeting',
    'host-greeting': '/host/greeting',
  };

  // --- Minimal URL sync helpers (no external router) ---
  const ensureEventOnce = async (code: string, name?: string) => {
    const key = `event_ensured_${code}`;
    if (sessionStorage.getItem(key)) {
      return;
    }
    try {
      await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify({ code, name: `${name || code} Event`, theme: 'Party Mix' })
      });
      sessionStorage.setItem(key, '1');
    } catch {
      // Ignore network errors here; guest flow can proceed and retry later
    }
  };
  const pushUrl = (path: string, params?: Record<string, string>) => {
    const url = new URL(window.location.href);
    url.pathname = path;
    url.search = '';
    if (params) {
      const sp = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => sp.set(k, v));
      url.search = sp.toString();
    }
    window.history.pushState({}, '', url.toString());
  };

  const goTo = (nextMode: AppMode, params?: Record<string, string>) => {
    const path = modeToPath[nextMode] || '/';
    // For guest-flow we require event code via query param 'event'
    if (nextMode === 'guest-flow') {
      const eventCode = params?.event || currentEvent?.code;
      pushUrl(path, eventCode ? { event: eventCode } : undefined);
    } else {
      pushUrl(path, params);
    }
    setMode(nextMode);
  };

  const applyUrl = () => {
    const { pathname, search } = window.location;
    const params = new URLSearchParams(search);
    if (pathname === '/' || pathname === '') {
      setMode('landing');
      return;
    }
    if (pathname === '/host') {
      setMode('host-login');
      return;
    }
    if (pathname === '/signup') {
      setMode('signup');
      return;
    }
    if (pathname === '/host/dashboard') {
      setMode('host-dashboard');
      return;
    }
    if (pathname === '/host/create') {
      setMode('create-event');
      return;
    }
    if (pathname === '/dj' || pathname === '/dj/greeting') {
      setMode(pathname === '/dj' ? 'dj-login' : 'dj-greeting');
      return;
    }
    if (pathname === '/dj/dashboard') {
      setMode('dj-dashboard');
      return;
    }
    if (pathname === '/qr') {
      setMode('qr-display');
      return;
    }
    if (pathname === '/dj/connect') {
      setMode('playlist-connection');
      return;
    }
    if (pathname === '/guest') {
      // Use 'event' query param for session code; avoid conflict with Spotify OAuth 'code'
      const eventCodeFromUrl = (params.get('event') || '').toUpperCase();
      // Check if this is an OAuth callback (has 'code' param) - use localStorage as fallback
      const isOAuthCallback = params.has('code') || params.has('error');
      const storedCode = (localStorage.getItem('spotify_oauth_event_code') || '').toUpperCase();
      const effectiveCode = eventCodeFromUrl || (isOAuthCallback ? storedCode : '');
      
      if (effectiveCode) {
        // Create/restore event context from code
        const eventDate = new Date();
        eventDate.setHours(eventDate.getHours() + 1);
        const evt: Event = {
          id: `event-${Date.now()}`,
          name: `${effectiveCode} Event`,
          theme: 'Party Mix',
          code: effectiveCode,
          date: eventDate.toISOString().split('T')[0],
          time: eventDate.toTimeString().slice(0, 5),
          location: undefined,
          status: 'upcoming',
          guestCount: 0,
          preferences: []
        } as Event;
        setCurrentEvent(evt);
        try { localStorage.setItem('spotify_oauth_event_code', effectiveCode); } catch {}
        // Ensure backend has event record once
        ensureEventOnce(effectiveCode).catch(() => {});
        setMode('guest-flow');
        return;
      }
      // Missing code → go back to landing
      setMode('landing');
      return;
    }
    if (pathname === '/dj/spotify/callback') {
      // Mode will be resolved by OAuth handling; keep playlist-connection as entry
      setMode('playlist-connection');
      return;
    }
    // Default landing for unknown paths
    setMode('landing');
  };

  // Apply dark mode to html element on component mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Restore mode after OAuth redirects based on pathname
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/guest') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = (params.get('event') || '').toUpperCase();
      // Only use localStorage as fallback if no URL code is present
      const effectiveCode = urlCode || (localStorage.getItem('spotify_oauth_event_code') || '').toUpperCase();
      
      // Only set event if we have a code and currentEvent doesn't match
      if (effectiveCode && (!currentEvent || currentEvent.code !== effectiveCode)) {
        const eventDate = new Date();
        eventDate.setHours(eventDate.getHours() + 1);
        const restoredEvent: Event = {
          id: `event-${Date.now()}`,
          name: `${effectiveCode} Event`,
          theme: 'Party Mix',
          code: effectiveCode,
          date: eventDate.toISOString().split('T')[0],
          time: eventDate.toTimeString().slice(0, 5),
          location: undefined,
          status: 'upcoming',
          guestCount: 0,
          preferences: []
        } as Event;
        setCurrentEvent(restoredEvent);
        ensureEventOnce(effectiveCode).catch(() => {});
        // Only update localStorage if we got code from URL
        if (urlCode) {
          try { localStorage.setItem('spotify_oauth_event_code', effectiveCode); } catch {}
        }
      }
      // Only show guest flow if we have an event context
      if (currentEvent || effectiveCode) {
        setMode('guest-flow');
      } else {
        setMode('landing');
      }
    } else if (path === '/dj/spotify/callback') {
      // Restore event for DJ flow
      if (!currentEvent) {
        const storedCode = localStorage.getItem('spotify_oauth_event_code');
        if (storedCode) {
          const eventDate = new Date();
          eventDate.setHours(eventDate.getHours() + 1);
          const restoredEvent: Event = {
            id: `event-${Date.now()}`,
            name: `${storedCode} Event`,
            theme: 'Party Mix',
            code: storedCode,
            date: eventDate.toISOString().split('T')[0],
            time: eventDate.toTimeString().slice(0, 5),
            location: undefined,
            status: 'upcoming',
            guestCount: 0,
            preferences: []
          } as Event;
          setCurrentEvent(restoredEvent);
        }
      }
      setMode('playlist-connection');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On first load, apply URL to app state; handle back/forward
  useEffect(() => {
    applyUrl();
    const onPop = () => applyUrl();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle host login
  const handleHostLogin = (username: string, password: string): boolean => {
    const account = userAccounts.find(acc => 
      acc.username.toLowerCase() === username.toLowerCase() && 
      acc.password === password
    );
    
    if (account) {
      setCurrentUser(account.username);
      goTo('host-dashboard');
      return true;
    }
    return false;
  };

  // Handle host signup
  const handleHostSignup = (username: string, password: string, email: string): boolean => {
    // Check if username already exists
    const existingUser = userAccounts.find(acc => 
      acc.username.toLowerCase() === username.toLowerCase()
    );
    
    if (existingUser) {
      return false; // Username already exists
    }
    
    // Add new user account
    setUserAccounts([...userAccounts, { username, password, email, events: [] }]);
    setCurrentUser(username);
    goTo('create-event'); // New users go to create event first
    return true;
  };

  // Handle logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentEvent(null);
    goTo('landing');
  };

  // DJ event joining - no API calls, no timeouts
  const handleDJJoinEvent = (eventCode: string) => {
    const upperCode = eventCode.trim().toUpperCase();
    
    // Create event immediately - works for any code
    const eventDate = new Date();
    eventDate.setHours(eventDate.getHours() + 1);
    
    const event = {
      id: `event-${Date.now()}`,
      name: `${upperCode} Event`,
      theme: 'Party Mix',
      code: upperCode,
      date: eventDate.toISOString().split('T')[0],
      time: eventDate.toTimeString().slice(0, 5),
      location: undefined,
      status: 'upcoming' as const,
      guestCount: 0,
      preferences: []
    };
    
    setCurrentEvent(event);
    // Ensure event exists in backend for later guest/DJ flows
    apiCall('/events', {
      method: 'POST',
      body: JSON.stringify({ code: upperCode, name: `${upperCode} Event`, theme: 'Party Mix' })
    }).catch(() => {});
    pushUrl(modeToPath['dj-greeting']);
    setMode('dj-greeting');
  };

  // Guest event joining - no API calls, no timeouts
  const handleGuestJoinEvent = (eventCode: string) => {
    const upperCode = eventCode.trim().toUpperCase();
    
    // Create event immediately - works for any code
    const eventDate = new Date();
    eventDate.setHours(eventDate.getHours() + 1);
    
    const event = {
      id: `event-${Date.now()}`,
      name: `${upperCode} Event`,
      theme: 'Party Mix',
      code: upperCode,
      date: eventDate.toISOString().split('T')[0],
      time: eventDate.toTimeString().slice(0, 5),
      location: undefined,
      status: 'upcoming' as const,
      guestCount: 0,
      preferences: []
    };
    
    setCurrentEvent(event);
    // Ensure event exists in backend for guest flow (deduped)
    ensureEventOnce(upperCode).catch(() => {});
    // Use 'event' to avoid colliding with Spotify OAuth 'code' on /guest
    pushUrl(modeToPath['guest-flow'], { event: upperCode });
    setMode('guest-flow');
  };

  // Completely synchronous event creation - no API calls
  const handleCreateEvent = (eventData: { name: string; theme: string; description: string; date: string; time: string; location?: string; code?: string }) => {
    const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);
    const now = new Date();
    
    let status: 'past' | 'live' | 'upcoming' = 'upcoming';
    if (eventDateTime.getTime() <= now.getTime()) {
      status = 'live';
    }
    
    const event: Event = {
      id: `event-${Date.now()}`,
      name: eventData.name,
      theme: eventData.theme,
      code: eventData.code || Math.random().toString(36).substring(2, 8).toUpperCase(), // Use code from API if provided
      date: eventData.date,
      time: eventData.time,
      location: eventData.location,
      status,
      guestCount: 0,
      preferences: []
    };
    
    // Add event to current user's events
    if (currentUser) {
      setUserAccounts(accounts => 
        accounts.map(acc => 
          acc.username === currentUser 
            ? { ...acc, events: [...(acc.events || []), event] }
            : acc
        )
      );
    }
    
    setCurrentEvent(event);
    goTo('host-greeting');
  };

  // Host views an event from dashboard
  const handleViewEvent = (event: Event) => {
    setCurrentEvent(event);
    setMode('host-greeting');
  };

  const handleShowQRCode = () => {
    goTo('qr-display');
  };

  // Handle playlist connection
  const handleConnectPlaylist = () => {
    goTo('playlist-connection');
  };

  // Handle playlist selection
  const handlePlaylistSelected = (playlist: any) => {
    // Update the current event to include the playlist tracks
    if (currentEvent) {
      const updatedEvent = {
        ...currentEvent,
        connectedPlaylist: playlist
      };
      setCurrentEvent(updatedEvent);
    }
    goTo('dj-dashboard');
  };

  // Synchronous preferences submission - no API calls
  const handlePreferencesSubmitted = async (preferences: any) => {
    if (currentEvent) {
      // Save to Supabase via API
      try {
        await apiCall(`/events/${currentEvent.code}/preferences`, {
          method: 'POST',
          body: JSON.stringify(preferences),
        });
      } catch (error) {
        console.error('Failed to save preferences to Supabase:', error);
        // Continue anyway - preferences are still stored locally
      }
      
      const updatedEvent = {
        ...currentEvent,
        guestCount: currentEvent.guestCount + 1, // Increment guest count
        preferences: [...currentEvent.preferences, preferences]
      };
      setCurrentEvent(updatedEvent);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {mode === 'landing' && (
          <LandingPage
            onCreateEvent={() => setMode('host-login')}
            onJoinEvent={handleGuestJoinEvent}
            onLogin={handleHostLogin}
            onSignUp={() => setMode('signup')}
          />
        )}

        {mode === 'host-login' && (
          <LoginPage
            onLogin={handleHostLogin}
            onBack={() => setMode('landing')}
            onDJMode={() => setMode('dj-login')}
            onSignUp={() => setMode('signup')}
          />
        )}

        {mode === 'signup' && (
          <SignupPage
            onSignup={handleHostSignup}
            onBack={() => setMode('landing')}
            onSignIn={() => setMode('host-login')}
          />
        )}

        {mode === 'dj-login' && (
          <DJLogin
            onJoinEvent={handleDJJoinEvent}
            onBack={() => setMode('host-login')}
          />
        )}

        {mode === 'host-dashboard' && currentUser && (
          <HostDashboard
            currentUser={currentUser}
            userEvents={userAccounts.find(acc => acc.username === currentUser)?.events || []}
            onLogout={handleLogout}
            onCreateEvent={() => setMode('create-event')}
            onViewEvent={handleViewEvent}
          />
        )}
        
        {mode === 'create-event' && (
          <EventCreation
            onEventCreated={handleCreateEvent}
            onBack={() => setMode('host-dashboard')}
          />
        )}
        
        {mode === 'guest-flow' && currentEvent && (
          <GuestFlow
            event={currentEvent}
            onPreferencesSubmitted={handlePreferencesSubmitted}
            onBack={() => setMode('landing')}
          />
        )}
        
        {mode === 'dj-greeting' && currentEvent && (
          <DJGreeting
            event={currentEvent}
            onContinue={() => setMode('dj-dashboard')}
            onBack={() => {
              if (currentUser) {
                setMode('host-dashboard');
              } else {
                setMode('dj-login');
              }
            }}
          />
        )}

        {mode === 'host-greeting' && currentEvent && currentUser && (
          <HostGreeting
            event={currentEvent}
            currentUser={currentUser}
            onContinue={() => setMode('dj-dashboard')}
            onBack={() => setMode('host-dashboard')}
          />
        )}

        {mode === 'dj-dashboard' && currentEvent && (
          <DJDashboard
            event={currentEvent}
            onBack={() => {
              if (currentUser) {
                setMode('host-dashboard');
              } else {
                setMode('dj-login');
              }
            }}
            onShowQRCode={handleShowQRCode}
            onConnectPlaylist={handleConnectPlaylist}
          />
        )}

        {mode === 'playlist-connection' && currentEvent && (
          <PlaylistConnection
            event={currentEvent}
            onPlaylistSelected={handlePlaylistSelected}
            onBack={() => setMode('dj-dashboard')}
          />
        )}
        
        {mode === 'qr-display' && currentEvent && (
          <QRCodeDisplay
            event={currentEvent}
            onBack={() => setMode('dj-dashboard')}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}