'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  Phone,
  Car,
  Search,
  CheckCircle,
  Clock,
  ArrowLeft,
  Delete,
  Loader2,
  Wrench,
  Calendar,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingResult {
  id: string;
  vehiclePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  service: string;
  scheduledTime: string;
  estimatedMinutes: number;
  customerName: string;
}

interface ShopStatus {
  baysOccupied: number;
  baysTotal: number;
  estimatedWaitMinutes: number;
}

type KioskStep = 'welcome' | 'phone' | 'plate' | 'found' | 'success';

// ─── Inactivity timeout ──────────────────────────────────────────────────────

const INACTIVITY_TIMEOUT_MS = 10_000;

// ─── Component ───────────────────────────────────────────────────────────────

export default function KioskPage(): React.ReactElement {
  const [step, setStep] = useState<KioskStep>('welcome');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [shopStatus, setShopStatus] = useState<ShopStatus | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset inactivity timer on any interaction
  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    if (step !== 'welcome') {
      inactivityTimer.current = setTimeout(() => {
        setStep('welcome');
        setPhoneNumber('');
        setPlateNumber('');
        setBooking(null);
        setEstimatedMinutes(0);
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [step]);

  useEffect(() => {
    resetInactivity();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [step, resetInactivity]);

  // Touch/mouse/keyboard resets inactivity
  useEffect(() => {
    const handler = (): void => resetInactivity();
    window.addEventListener('touchstart', handler);
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [resetInactivity]);

  // Fetch shop status
  useEffect(() => {
    const fetchStatus = async (): Promise<void> => {
      try {
        const res = await fetch('/api/bookings?action=shop-status', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = (await res.json()) as { data: ShopStatus };
          setShopStatus(data.data);
        }
      } catch {
        // Silently fail for kiosk
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = useCallback(async () => {
    const query = step === 'phone' ? phoneNumber : plateNumber;
    if (!query.trim()) {
      toast.error(
        step === 'phone'
          ? 'Inserisci il numero di telefono'
          : 'Inserisci la targa del veicolo',
      );
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        type: step === 'phone' ? 'phone' : 'plate',
        query: query.trim(),
      });
      const res = await fetch(`/api/bookings?action=kiosk-lookup&${params}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data = (await res.json()) as { data: BookingResult | null };

      if (data.data) {
        setBooking(data.data);
        setStep('found');
      } else {
        toast.error('Nessuna prenotazione trovata');
      }
    } catch {
      toast.error('Errore nella ricerca. Riprova.');
    } finally {
      setIsSearching(false);
    }
  }, [step, phoneNumber, plateNumber]);

  const handleCheckIn = useCallback(async () => {
    if (!booking) return;
    setIsCheckingIn(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'kiosk-checkin',
          bookingId: booking.id,
        }),
      });

      if (!res.ok) throw new Error(`Errore ${res.status}`);
      const data = (await res.json()) as { data: { estimatedMinutes: number } };
      setEstimatedMinutes(data.data?.estimatedMinutes ?? booking.estimatedMinutes);
      setStep('success');
    } catch {
      toast.error('Errore durante il check-in. Riprova.');
    } finally {
      setIsCheckingIn(false);
    }
  }, [booking]);

  const handleNumpadPress = useCallback(
    (digit: string) => {
      resetInactivity();
      if (digit === 'DEL') {
        setPhoneNumber((prev) => prev.slice(0, -1));
      } else {
        setPhoneNumber((prev) => (prev.length < 15 ? prev + digit : prev));
      }
    },
    [resetInactivity],
  );

  return (
    <div
      className="fixed inset-0 bg-gray-950 text-white flex flex-col overflow-hidden select-none"
      onTouchStart={resetInactivity}
    >
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <div className="text-center space-y-12 max-w-lg w-full">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4">
                Benvenuto!
              </h1>
              <p className="text-xl text-[var(--text-tertiary)]">
                Come vuoi identificarti?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <button
                onClick={() => {
                  setStep('phone');
                  setPhoneNumber('');
                }}
                className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border-2 border-gray-700 hover:border-indigo-500 transition-all min-h-[140px]"
                style={{ minHeight: '140px' }}
              >
                <Phone className="h-12 w-12 text-indigo-400" />
                <span className="text-xl font-semibold">
                  Numero di telefono
                </span>
              </button>

              <button
                onClick={() => {
                  setStep('plate');
                  setPlateNumber('');
                }}
                className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-800 hover:bg-gray-700 active:bg-gray-600 border-2 border-gray-700 hover:border-emerald-500 transition-all min-h-[140px]"
                style={{ minHeight: '140px' }}
              >
                <Car className="h-12 w-12 text-emerald-400" />
                <span className="text-xl font-semibold">Targa veicolo</span>
              </button>
            </div>
          </div>
        )}

        {/* Phone Step */}
        {step === 'phone' && (
          <div className="text-center space-y-6 max-w-sm w-full">
            <button
              onClick={() => setStep('welcome')}
              className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-white transition-colors min-h-[64px] px-4"
            >
              <ArrowLeft className="h-6 w-6" />
              <span className="text-lg">Indietro</span>
            </button>

            <h2 className="text-3xl font-bold">Il tuo numero</h2>

            <div className="bg-gray-800 rounded-2xl px-6 py-4 text-3xl font-mono tracking-wider min-h-[64px] flex items-center justify-center border-2 border-gray-700">
              {phoneNumber || (
                <span className="text-[var(--text-secondary)]">+39 ...</span>
              )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '0', 'DEL'].map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => handleNumpadPress(key)}
                    className={`flex items-center justify-center rounded-xl text-2xl font-semibold transition-all active:scale-95 ${
                      key === 'DEL'
                        ? 'bg-red-900/50 hover:bg-red-800/50 text-red-300'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                    style={{ minHeight: '64px' }}
                  >
                    {key === 'DEL' ? (
                      <Delete className="h-6 w-6" />
                    ) : (
                      key
                    )}
                  </button>
                ),
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={isSearching || phoneNumber.length < 6}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-[var(--text-secondary)] text-xl font-semibold transition-all active:scale-[0.98]"
              style={{ minHeight: '64px' }}
            >
              {isSearching ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Search className="h-6 w-6" />
              )}
              Cerca
            </button>
          </div>
        )}

        {/* Plate Step */}
        {step === 'plate' && (
          <div className="text-center space-y-6 max-w-md w-full">
            <button
              onClick={() => setStep('welcome')}
              className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-white transition-colors min-h-[64px] px-4"
            >
              <ArrowLeft className="h-6 w-6" />
              <span className="text-lg">Indietro</span>
            </button>

            <h2 className="text-3xl font-bold">La tua targa</h2>

            <input
              type="text"
              value={plateNumber}
              onChange={(e) =>
                setPlateNumber(e.target.value.toUpperCase())
              }
              placeholder="ES. AB123CD"
              autoFocus
              className="w-full bg-gray-800 rounded-2xl px-6 py-4 text-3xl font-mono tracking-[0.3em] text-center border-2 border-gray-700 focus:border-emerald-500 focus:outline-none placeholder-gray-600 uppercase"
              style={{ minHeight: '64px' }}
            />

            <button
              onClick={handleSearch}
              disabled={isSearching || plateNumber.length < 4}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-[var(--text-secondary)] text-xl font-semibold transition-all active:scale-[0.98]"
              style={{ minHeight: '64px' }}
            >
              {isSearching ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Search className="h-6 w-6" />
              )}
              Cerca
            </button>
          </div>
        )}

        {/* Booking Found Step */}
        {step === 'found' && booking && (
          <div className="text-center space-y-8 max-w-md w-full">
            <button
              onClick={() => setStep('welcome')}
              className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-white transition-colors min-h-[64px] px-4"
            >
              <ArrowLeft className="h-6 w-6" />
              <span className="text-lg">Indietro</span>
            </button>

            <h2 className="text-3xl font-bold">Prenotazione trovata</h2>

            <div className="bg-gray-800 rounded-2xl p-6 space-y-4 border-2 border-gray-700 text-left">
              <div className="flex items-center gap-3">
                <Car className="h-6 w-6 text-[var(--text-tertiary)]" />
                <div>
                  <p className="text-lg font-semibold">
                    {booking.vehicleMake} {booking.vehicleModel}
                  </p>
                  <p className="text-sm text-[var(--text-tertiary)]">
                    {booking.vehiclePlate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Wrench className="h-6 w-6 text-[var(--text-tertiary)]" />
                <p className="text-lg">{booking.service}</p>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-[var(--text-tertiary)]" />
                <p className="text-lg">
                  {new Date(booking.scheduledTime).toLocaleString('it-IT', {
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-[var(--text-tertiary)]" />
                <p className="text-lg">
                  Durata stimata: {booking.estimatedMinutes} min
                </p>
              </div>
            </div>

            <button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-2xl font-bold transition-all active:scale-[0.98]"
              style={{ minHeight: '80px' }}
            >
              {isCheckingIn ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <CheckCircle className="h-8 w-8" />
              )}
              Check-in
            </button>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center space-y-8 max-w-md w-full">
            <div className="relative">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-green-600/20 animate-pulse">
                <CheckCircle className="h-20 w-20 text-green-400" />
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-bold text-green-400 mb-4">
                Check-in completato!
              </h2>
              <p className="text-2xl text-[var(--text-tertiary)]">
                Tempo stimato:{' '}
                <span className="font-bold text-white">
                  {estimatedMinutes} minuti
                </span>
              </p>
            </div>

            <p className="text-[var(--text-secondary)] text-lg">
              Lo schermo si resetta automaticamente...
            </p>
          </div>
        )}
      </div>

      {/* Shop Status Bar */}
      {shopStatus && (
        <div className="bg-[var(--surface-primary)] border-t border-gray-800 px-6 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-tertiary)]">
              Postazioni occupate:{' '}
              <span className="text-white font-semibold">
                {shopStatus.baysOccupied}/{shopStatus.baysTotal}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-tertiary)]">
              Attesa stimata:{' '}
              <span className="text-white font-semibold">
                {shopStatus.estimatedWaitMinutes} min
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
