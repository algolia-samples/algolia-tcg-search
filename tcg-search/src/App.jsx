import { useEffect, useState } from 'react';
import { Navigate, Routes, Route, useParams } from 'react-router-dom';
import { EventProvider } from './context/EventContext';
import { fetchCurrentEvent } from './utilities/events';
import Search from './components/Search';
import CardScanner from './components/CardScanner';

import './App.css';

function CurrentEventRedirect() {
  const [eventId, setEventId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCurrentEvent()
      .then(event => setEventId(event?.event_id ?? null))
      .catch(err => {
        console.error('Error fetching current event:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="event-loading">Loading event…</div>;
  if (error) return <div className="event-error">Error loading event. Please try again later.</div>;
  if (!eventId) return <div className="event-error">No active event found.</div>;
  return <Navigate to={`/${eventId}`} replace />;
}

function EventLayout() {
  const { eventId } = useParams();
  return (
    <EventProvider eventId={eventId}>
      <Search />
    </EventProvider>
  );
}

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<CurrentEventRedirect />} />
        <Route path="/scan" element={<CardScanner />} />
        <Route path="/:eventId" element={<EventLayout />} />
      </Routes>
    </div>
  );
}

export default App;
