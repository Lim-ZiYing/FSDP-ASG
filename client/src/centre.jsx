// Owner: Siyu – FSDP-68 (choose hawker centre)
// Remembers which hawker centre the customer picked, so every page shows that centre's stalls.
//   const { centres, centre, setCentreId } = useCentre();
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const CENTRE_KEY = 'hawker-emenu-centre';
const CentreContext = createContext(null);

export function CentreProvider({ children }) {
  const [centres, setCentres] = useState([]);
  const [centreId, setId] = useState(() => {
    try { return Number(localStorage.getItem(CENTRE_KEY)) || 1; } catch { return 1; }
  });

  useEffect(() => {
    api.getCentres().then(setCentres).catch(() => setCentres([]));
  }, []);

  function setCentreId(id) {
    setId(id);
    try { localStorage.setItem(CENTRE_KEY, String(id)); } catch { /* storage blocked */ }
  }

  const centre = centres.find((c) => c.id === centreId) || null;
  return (
    <CentreContext.Provider value={{ centres, centre, centreId, setCentreId }}>
      {children}
    </CentreContext.Provider>
  );
}

export function useCentre() {
  return useContext(CentreContext);
}