import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

  // Debug info — shown on failure
  const [parsedName, setParsedName] = useState(null);
  const [parsedNumber, setParsedNumber] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [searchFailed, setSearchFailed] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopEverything();
  }, []);

  useEffect(() => {
    if (capturedImage) runScanAndSearch(capturedImage);
  }, [capturedImage]);

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
        };
      }
    } catch {
      setCameraError('Camera access denied or unavailable.');
    }
  }

  function stopEverything() {
    stopSampling();
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
        setStableProgress(Math.min(100, (stableCountRef.current / STABLE_COUNT_NEEDED) * 100));
        if (stableCountRef.current >= STABLE_COUNT_NEEDED && !capturedRef.current) {
          capturedRef.current = true;
          capture();
        }
      } else {
        stableCountRef.current = 0;
        setStableProgress(0);
      }
    }

    prevFrameDataRef.current = current;
  }

  function meanAbsDiff(a, b) {
    let sum = 0;
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
    canvas.width = vw;
    canvas.height = vh;

    const guideW = vw * GUIDE_SCALE;
    const guideH = guideW / CARD_RATIO;
    const x = (vw - guideW) / 2;
    const y = (vh - guideH) / 2;
    const r = guideW * 0.04;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, vw, vh);

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(x, y, guideW, guideH, r);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, guideW, guideH, r);
    ctx.stroke();

    const inset = 8;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, guideW - inset * 2, guideH - inset * 2, Math.max(r - inset, 2));
    ctx.stroke();

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

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    stopEverything();
  }

  async function runScanAndSearch(imageDataUrl) {
    setStatus('scanning');
    setSearchFailed(false);

    let name = null;
    let number = null;
    let rawText = '';

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
      rawText = data.text ?? '';
      setParsedName(name);
      setParsedNumber(number);
      setOcrText(rawText);
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
      <div style={styles.container}>
        {cameraError && <p style={styles.error}>{cameraError}</p>}

        {!capturedImage ? (
          <>
            <div style={styles.videoWrapper}>
              <video ref={videoRef} autoPlay playsInline style={styles.video} />
              <canvas ref={overlayCanvasRef} style={styles.overlay} />
            </div>

            {stableProgress > 0 && (
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${stableProgress}%` }} />
              </div>
            )}
            <p style={styles.hint}>Hold the card steady inside the frame</p>

            <button onClick={capture} disabled={!!cameraError} style={styles.button}>
              Capture now
            </button>
          </>
        ) : (
          <>
            <div style={styles.videoWrapper}>
              <img src={capturedImage} alt="Captured card" style={styles.video} />
              {isProcessing && (
                <div style={styles.processingOverlay}>
                  <p style={styles.processingText}>
                    {status === 'scanning' ? 'Reading card…' : 'Finding card…'}
                  </p>
                </div>
              )}
            </div>

            {!isProcessing && (
              <button onClick={retake} style={styles.button}>Retake</button>
            )}
          </>
        )}

        <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
        <canvas ref={compareCanvasRef} width={SAMPLE_W} height={SAMPLE_H} style={{ display: 'none' }} />

        {searchFailed && (
          <div style={styles.apology} data-scan-apology>
            <p style={styles.apologyText}>
              {parsedName || parsedNumber
                ? `Couldn't find "${parsedName || parsedNumber}" in the inventory.`
                : "Couldn't read this card clearly."}
            </p>
            <p style={styles.apologyHint}>Try searching manually:</p>
            <button onClick={() => navigate(`/${eventId}`, { state: { scrollToSearch: true } })} style={styles.button}>
              Go to search
            </button>

            {(parsedName || parsedNumber || ocrText) && (
              <details style={styles.details}>
                <summary style={styles.summary}>Debug info</summary>
                <table style={styles.table}>
                  <tbody>
                    <tr>
                      <td style={styles.label}>Name</td>
                      <td style={styles.value}>{parsedName ?? '—'}</td>
                    </tr>
                    <tr>
                      <td style={styles.label}>Number</td>
                      <td style={styles.value}>{parsedNumber ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
                {ocrText && <pre style={styles.ocrText}>{ocrText}</pre>}
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '1rem',
    fontFamily: 'sans-serif',
  },
  videoWrapper: {
    position: 'relative',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#000',
  },
  video: {
    width: '100%',
    display: 'block',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  processingOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  progressBar: {
    marginTop: '0.5rem',
    height: 4,
    background: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#22c55e',
    borderRadius: 2,
    transition: 'width 0.2s ease',
  },
  hint: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#64748b',
    margin: '0.4rem 0 0',
  },
  button: {
    marginTop: '0.75rem',
    padding: '0.6rem 1.4rem',
    fontSize: '1rem',
    cursor: 'pointer',
    borderRadius: 6,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    display: 'block',
  },
  error: {
    color: '#ef4444',
    marginTop: '0.5rem',
  },
  apology: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: '#fef2f2',
    borderRadius: 8,
    borderLeft: '4px solid #ef4444',
  },
  apologyText: {
    margin: '0 0 0.25rem',
    fontWeight: 600,
    color: '#b91c1c',
  },
  apologyHint: {
    margin: '0 0 0.25rem',
    fontSize: '0.9rem',
    color: '#64748b',
  },
  details: {
    marginTop: '1rem',
  },
  summary: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '0.5rem 0',
  },
  label: {
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#64748b',
    paddingRight: '1rem',
    paddingBottom: '0.25rem',
    whiteSpace: 'nowrap',
  },
  value: {
    fontSize: '0.9rem',
    paddingBottom: '0.25rem',
  },
  ocrText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '0.75rem',
    margin: '0.5rem 0 0',
    color: '#475569',
  },
};
