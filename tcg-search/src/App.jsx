import React, { useEffect, useState } from 'react';
import { Navigate, Routes, Route, useParams } from 'react-router-dom';
import { EventProvider } from './context/EventContext';
import { fetchCurrentEvent } from './utilities/events';
import Search from './components/Search';

import './App.css';

function CurrentEventRedirect() {
  const [eventId, setEventId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentEvent()
      .then(event => setEventId(event?.event_id ?? null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="event-loading">Loading event…</div>;
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
        <Route path="/:eventId" element={<EventLayout />} />
      </Routes>
    </div>
  );
}

export default App;
