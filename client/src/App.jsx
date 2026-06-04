import { useEffect, useState } from 'react';
import { API_URL } from './config.js';
import { socket } from './socket.js';
import PulseForm from './components/PulseForm.jsx';
import PulseCard from './components/PulseCard.jsx';
import PresenceBadge from './components/PresenceBadge.jsx';

export default function App() {
  const [pulses, setPulses] = useState([]);
  const [online, setOnline] = useState(0);

  // Load history once — the truth, from Mongo via REST.
  useEffect(() => {
    fetch(`${API_URL}/api/pulses`)
      .then((r) => r.json())
      .then(setPulses)
      .catch(() => setPulses([]));
  }, []);

  // Live updates — the news, from the server via WebSocket.
  useEffect(() => {
    function onNew(pulse) {
      setPulses((prev) => [pulse, ...prev]);
    }
    function onPresence(count) {
      setOnline(count);
    }
    socket.on('pulse:new', onNew);
    socket.on('presence:count', onPresence);
    return () => {
      socket.off('pulse:new', onNew);
      socket.off('presence:count', onPresence);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cohort Pulse Board</h1>
            <p className="text-sm text-slate-400">Drop a pulse. Everyone sees it live.</p>
          </div>
          <PresenceBadge count={online} />
        </header>

        <div className="mb-6">
          <PulseForm />
        </div>

        <div className="flex flex-col gap-3">
          {pulses.length === 0 && (
            <p className="text-center text-slate-500">No pulses yet — be the first.</p>
          )}
          {pulses.map((p) => (
            <PulseCard key={p._id ?? `${p.author}-${p.createdAt}`} pulse={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
