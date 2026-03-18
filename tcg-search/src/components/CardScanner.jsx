import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from './Header';
import { cascadeSearch } from '../utilities/searchCard';

// Pokemon card aspect ratio: 2.5" x 3.5"
const CARD_RATIO = 2.5 / 3.5;
// Guide frame takes up 80% of the viewport width
const GUIDE_SCALE = 0.80;
// Stability detection: sample canvas size (small = fast diff)
const SAMPLE_W = 80;
const SAMPLE_H = Math.round(SAMPLE_W / CARD_RATIO);
// Mean pixel diff threshold (0-255) below which we consider the image stable
const STABLE_THRESHOLD = 15;
// Number of consecutive stable samples before auto-capture
const STABLE_COUNT_NEEDED = 3;
// Sampling interval in ms
const SAMPLE_INTERVAL = 200;

export default function CardScanner() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const isMobile = useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const compareCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const prevFrameDataRef = useRef(null);
  const stableCountRef = useRef(0);
  const samplingRef = useRef(null);
  const capturedRef = useRef(false);

  const [capturedImage, setCapturedImage] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | scanning | searching
  const [stableProgress, setStableProgress] = useState(0);
  const [cameraError, setCameraError] = useState(null);

  // Only used for debug display on failure
  const [parsedName, setParsedName] = useState(null);
  const [parsedNumber, setParsedNumber] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [searchFailed, setSearchFailed] = useState(false);

  useEffect(() => {
    if (!isMobile) return;
    startCamera();
    return () => stopEverything();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (capturedImage) runScanAndSearch(capturedImage);
  }, [capturedImage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!searchFailed) return;
    setTimeout(() => {
      document.querySelector('[data-scan-apology]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [searchFailed]);

  async function startCamera() {
    setCameraError(null);
    capturedRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          drawGuide();
          startSampling();
          // Redraw guide on resize/orientation change
          const observer = new ResizeObserver(drawGuide);
          observer.observe(videoRef.current);
          videoRef.current._resizeObserver = observer;
        };
      }
    } catch {
      setCameraError('Camera access denied or unavailable.');
    }
  }

  function stopEverything() {
    stopSampling();
    if (videoRef.current?._resizeObserver) {
      videoRef.current._resizeObserver.disconnect();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function startSampling() {
    stopSampling();
    prevFrameDataRef.current = null;
    stableCountRef.current = 0;
    samplingRef.current = setInterval(sampleFrame, SAMPLE_INTERVAL);
  }

  function stopSampling() {
    if (samplingRef.current) {
      clearInterval(samplingRef.current);
      samplingRef.current = null;
    }
  }

  function sampleFrame() {
    const video = videoRef.current;
    const canvas = compareCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
    const current = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;

    if (prevFrameDataRef.current) {
      const diff = meanAbsDiff(prevFrameDataRef.current, current);
      if (diff < STABLE_THRESHOLD) {
        stableCountRef.current += 1;
        const next = Math.min(100, (stableCountRef.current / STABLE_COUNT_NEEDED) * 100);
        setStableProgress(prev => prev === next ? prev : next);
        if (stableCountRef.current >= STABLE_COUNT_NEEDED && !capturedRef.current) {
          capturedRef.current = true;
          capture();
        }
      } else {
        stableCountRef.current = 0;
        setStableProgress(prev => prev === 0 ? prev : 0);
      }
    }

    prevFrameDataRef.current = current;
  }

  function meanAbsDiff(a, b) {
    let sum = 0;
    // Sample every 4th pixel (R channel only) for performance
    for (let i = 0; i < a.length; i += 16) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum / (a.length / 16);
  }

  function drawGuide() {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const vw = video.clientWidth;
    const vh = video.clientHeight;
    if (!vw || !vh) return;
    canvas.width = vw;
    canvas.height = vh;

    const guideW = vw * GUIDE_SCALE;
    const guideH = guideW / CARD_RATIO;
    const x = (vw - guideW) / 2;
    const y = (vh - guideH) / 2;
    const r = guideW * 0.04;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, vw, vh);

    // Dim area outside the guide
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(x, y, guideW, guideH, r);
    ctx.fill();
    ctx.restore();

    // Gold outer border
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, guideW, guideH, r);
    ctx.stroke();

    // Black inner border
    const inset = 8;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, guideW - inset * 2, guideH - inset * 2, Math.max(r - inset, 2));
    ctx.stroke();

    // Gold accent line
    const inset2 = 13;
    ctx.strokeStyle = '#c8991f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + inset2, y + inset2, guideW - inset2 * 2, guideH - inset2 * 2, Math.max(r - inset2, 2));
    ctx.stroke();
  }

  function capture() {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;

    stopSampling();
    setStableProgress(0);

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
    stopEverything();
  }

  async function runScanAndSearch(imageDataUrl) {
    setStatus('scanning');
    setSearchFailed(false);

    let name = null;
    let number = null;

    try {
      const base64 = imageDataUrl.split(',')[1];
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'OCR failed');

      name = data.parsed_name;
      number = data.parsed_number;
      setParsedName(name);
      setParsedNumber(number);
      setOcrText(data.text ?? '');
    } catch {
      setStatus('idle');
      setSearchFailed(true);
      return;
    }

    setStatus('searching');

    try {
      const result = await cascadeSearch(eventId, { parsedName: name, parsedNumber: number });

      if (result.strategy === 'none') {
        setSearchFailed(true);
        setStatus('idle');
        return;
      }

      navigate(`/${eventId}`, { state: { searchQuery: result.query } });
    } catch {
      setSearchFailed(true);
      setStatus('idle');
    }
  }

  function retake() {
    setCapturedImage(null);
    setParsedName(null);
    setParsedNumber(null);
    setOcrText('');
    setSearchFailed(false);
    setStatus('idle');
    startCamera();
  }

  const isProcessing = status === 'scanning' || status === 'searching';

  return (
    <div>
      <Header />
      <div className="card-scanner">
        {!isMobile && (
          <div className="card-scanner-apology">
            <p className="card-scanner-apology-title">Card scanning is only available on mobile devices.</p>
            <button
              className="card-scanner-btn"
              onClick={() => navigate(`/${eventId}`, { replace: true, state: { scrollToSearch: true } })}
            >
              Go to search
            </button>
          </div>
        )}

        {isMobile && cameraError && <p className="card-scanner-error">{cameraError}</p>}

        {isMobile && !capturedImage && (
          <>
            <div className="card-scanner-video-wrapper">
              <video ref={videoRef} autoPlay playsInline className="card-scanner-video" />
              <canvas ref={overlayCanvasRef} className="card-scanner-overlay" />
            </div>

            {stableProgress > 0 && (
              <div className="card-scanner-progress-bar">
                <div className="card-scanner-progress-fill" style={{ width: `${stableProgress}%` }} />
              </div>
            )}
            <p className="card-scanner-hint">Hold the card steady inside the frame</p>

            <button className="card-scanner-btn" onClick={capture} disabled={!!cameraError}>
              Capture now
            </button>
          </>
        )}

        {isMobile && capturedImage && (
          <>
            <div className="card-scanner-video-wrapper">
              <img src={capturedImage} alt="Captured card" className="card-scanner-video" />
              {isProcessing && (
                <div className="card-scanner-processing-overlay">
                  <p className="card-scanner-processing-text">
                    {status === 'scanning' ? 'Reading card…' : 'Finding card…'}
                  </p>
                </div>
              )}
            </div>

            {!isProcessing && (
              <button className="card-scanner-btn" onClick={retake}>Retake</button>
            )}
          </>
        )}

        <canvas ref={captureCanvasRef} hidden />
        <canvas ref={compareCanvasRef} width={SAMPLE_W} height={SAMPLE_H} hidden />

        {searchFailed && (
          <div className="card-scanner-apology" data-scan-apology>
            <p className="card-scanner-apology-title">
              {parsedName || parsedNumber
                ? `Couldn't find "${parsedName || parsedNumber}" in the inventory.`
                : "Couldn't read this card clearly."}
            </p>
            <p className="card-scanner-apology-hint">Try searching manually:</p>
            <button
              className="card-scanner-btn"
              onClick={() => navigate(`/${eventId}`, { replace: true, state: parsedName ? { searchQuery: parsedName } : { scrollToSearch: true } })}
            >
              Go to search
            </button>

            {isDebug && (parsedName || parsedNumber || ocrText) && (
              <details className="card-scanner-debug">
                <summary>Debug info</summary>
                <table className="card-scanner-debug-table">
                  <tbody>
                    <tr>
                      <td className="card-scanner-debug-label">Name</td>
                      <td className="card-scanner-debug-value">{parsedName ?? '—'}</td>
                    </tr>
                    <tr>
                      <td className="card-scanner-debug-label">Number</td>
                      <td className="card-scanner-debug-value">{parsedNumber ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
                {ocrText && <pre className="card-scanner-ocr-text">{ocrText}</pre>}
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
