"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, CheckCircle2, QrCode, RotateCcw, ScanLine, StopCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SessionCountdown } from "@/components/sessions/session-countdown";

type StationOption = {
  id: string;
  name: string;
  type: string;
};

type ValidationSuccess = {
  ok: true;
  station_id: string;
  station_name: string;
  booking_id: string;
  start_at: string;
  end_at: string;
  remaining_seconds: number;
  activated_at: string;
  session_id: string;
  already_active: boolean;
};

type Props = {
  stations: StationOption[];
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function KioskClient({ stations }: Props) {
  const sortedStations = useMemo(() => [...stations].sort((a, b) => a.name.localeCompare(b.name, "it-IT")), [stations]);
  const [selectedStationId, setSelectedStationId] = useState(sortedStations[0]?.id ?? "");
  const [manualQr, setManualQr] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationSuccess | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(false);
  const [barcodeSupported, setBarcodeSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);

  useEffect(() => {
    setCameraSupported(typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
    setBarcodeSupported(typeof BarcodeDetector !== "undefined");
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const validateQr = useCallback(async (rawQr: string) => {
    if (!selectedStationId || scanLocked) return;
    setScanLocked(true);
    setErrorMessage(null);
    setScanMessage("Validazione QR in corso...");

    try {
      const response = await fetch("/api/checkin/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          qr: rawQr,
          station_id: selectedStationId
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResult(null);
        setErrorMessage(typeof payload?.error === "string" ? payload.error : "Validazione non riuscita.");
        setScanMessage(null);
        return;
      }

      setResult(payload as ValidationSuccess);
      setScanMessage((payload as ValidationSuccess).already_active ? "Sessione gia attiva: timer riagganciato." : "QR valido: la postazione puo avviare la sessione.");
    } finally {
      window.setTimeout(() => setScanLocked(false), 1800);
    }
  }, [scanLocked, selectedStationId]);

  async function startCamera() {
    if (!cameraSupported || !barcodeSupported || isScanning) return;
    setIsStartingCamera(true);
    setErrorMessage(null);
    setScanMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const Detector = BarcodeDetector;
      if (!Detector) {
        throw new Error("BarcodeDetector non disponibile su questo browser.");
      }
      detectorRef.current = new Detector({ formats: ["qr_code"] });
      setIsScanning(true);
      setScanMessage("Camera attiva. Inquadra il QR del cliente.");
    } catch (error: any) {
      setErrorMessage(String(error?.message ?? "Impossibile accedere alla webcam."));
    } finally {
      setIsStartingCamera(false);
    }
  }

  function stopCamera() {
    setIsScanning(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    if (!isScanning || !videoRef.current || !detectorRef.current) return;

    const interval = window.setInterval(async () => {
      if (!videoRef.current || !detectorRef.current || scanLocked) return;
      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        const found = barcodes.find((item) => typeof item.rawValue === "string" && item.rawValue.trim().length > 0);
        if (found?.rawValue) {
          void validateQr(found.rawValue);
        }
      } catch {
        // Ignore single frame failures from the browser detector.
      }
    }, 700);

    return () => window.clearInterval(interval);
  }, [isScanning, scanLocked, selectedStationId, validateQr]);

  const selectedStation = sortedStations.find((station) => station.id === selectedStationId) ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Kiosk postazione</h2>
        <p className="text-sm leading-relaxed text-slate-200">
          Pagina operativa per tablet o Raspberry con webcam: legge il QR del cliente, valida la prenotazione e aggancia il timer di sessione.
        </p>
      </header>

      <Card>
        <CardHeader className="space-y-1">
          <p className="text-xs font-medium text-slate-300">Configurazione</p>
          <p className="text-lg font-semibold tracking-tight">Postazione locale</p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="station_id" className="text-sm font-medium text-slate-200">
                Postazione
              </label>
              <select
                id="station_id"
                value={selectedStationId}
                onChange={(event) => setSelectedStationId(event.target.value)}
                className="h-11 w-full rounded-xl bg-slate-950/40 px-3 text-sm text-slate-50 ring-1 ring-inset ring-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {sortedStations.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-3xl bg-slate-950/40 p-4 text-sm text-slate-300 ring-1 ring-inset ring-slate-800">
              <p className="font-medium text-slate-100">{selectedStation?.name ?? "Seleziona una postazione"}</p>
              <p className="mt-1">Tipo: {selectedStation?.type ?? "-"}</p>
              <p className="mt-2 text-xs text-slate-400">Se passi `station_id`, il backend rifiuta QR validi ma destinati ad un&apos;altra postazione.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Button type="button" variant="primary" onClick={startCamera} disabled={!selectedStationId || !cameraSupported || !barcodeSupported || isStartingCamera || isScanning}>
                <Camera className="h-5 w-5" />
                {isStartingCamera ? "Avvio camera..." : "Avvia scanner"}
              </Button>
              <Button type="button" variant="secondary" onClick={stopCamera} disabled={!isScanning}>
                <StopCircle className="h-5 w-5" />
                Ferma scanner
              </Button>
            </div>

            <div className="rounded-3xl bg-slate-950/40 p-4 text-xs text-slate-400 ring-1 ring-inset ring-slate-800">
              <p>Compatibilita camera: {cameraSupported ? "OK" : "non disponibile"}</p>
              <p>Compatibilita lettore QR browser: {barcodeSupported ? "OK" : "non disponibile"}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl bg-slate-950/40 ring-1 ring-inset ring-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <ScanLine className="h-4 w-4" />
                  Scanner QR
                </div>
                <span className="text-xs text-slate-400">{isScanning ? "Attivo" : "In attesa"}</span>
              </div>
              <div className="relative aspect-video bg-slate-950">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
                {!isScanning ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 px-6 text-center text-sm text-slate-400">
                    {barcodeSupported
                      ? "Avvia la webcam per leggere il QR del cliente."
                      : "Il browser non supporta BarcodeDetector. Usa il fallback manuale oppure Chromium aggiornato sul dispositivo."}
                  </div>
                ) : null}
              </div>
            </div>

            <Card>
              <CardHeader className="space-y-1">
                <p className="text-xs font-medium text-slate-300">Fallback</p>
                <p className="text-lg font-semibold tracking-tight">Incolla il QR manualmente</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  value={manualQr}
                  onChange={(event) => setManualQr(event.target.value)}
                  placeholder='Incolla il contenuto del QR o il token {"app":"DogWash24",...}'
                  className="h-12"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="primary" onClick={() => void validateQr(manualQr)} disabled={!manualQr.trim() || !selectedStationId || scanLocked}>
                    <QrCode className="h-5 w-5" />
                    Valida QR
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setManualQr("");
                      setResult(null);
                      setScanMessage(null);
                      setErrorMessage(null);
                    }}
                  >
                    <RotateCcw className="h-5 w-5" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {scanMessage ? (
        <div className="rounded-3xl bg-slate-950/40 p-4 text-sm text-slate-100 ring-1 ring-inset ring-slate-800">{scanMessage}</div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-3xl bg-rose-500/10 p-4 text-sm text-rose-100 ring-1 ring-inset ring-rose-500/30">{errorMessage}</div>
      ) : null}

      {result ? (
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-200">
              <CheckCircle2 className="h-5 w-5" />
              <p className="text-xs font-medium">Sessione autorizzata</p>
            </div>
            <p className="text-lg font-semibold tracking-tight">{result.station_name}</p>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-sm text-slate-300">Prenotazione</p>
              <p className="text-base font-semibold text-slate-50">{result.booking_id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/40 p-4 ring-1 ring-inset ring-slate-800">
              <p className="text-sm text-slate-300">Finestra valida</p>
              <p className="text-base font-semibold text-slate-50">
                {formatDateTime(result.start_at)} - {new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(new Date(result.end_at))}
              </p>
            </div>
            <div className="rounded-3xl bg-emerald-500/10 p-4 ring-1 ring-inset ring-emerald-500/30">
              <p className="text-sm text-emerald-200">Tempo residuo</p>
              <p className="text-xl font-semibold text-slate-50">
                <SessionCountdown activatedAt={result.activated_at} remainingSeconds={result.remaining_seconds} />
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
