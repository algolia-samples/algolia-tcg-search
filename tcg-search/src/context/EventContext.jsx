import { createContext, useContext, useEffect, useState } from 'react';
import { fetchEventById } from '../utilities/events';

const EventContext = createContext(null);

export function EventProvider({ eventId, children }) {
  const [eventConfig, setEventConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchEventById(eventId)
      .then(setEventConfig)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <EventContext.Provider value={{ eventConfig, loading, error }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (context === null) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
}
