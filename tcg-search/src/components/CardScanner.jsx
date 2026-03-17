import { useEffect, useRef, useState } from 'react';

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
  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null); // guide rectangle drawn here
  const captureCanvasRef = useRef(null); // full-res capture
  const compareCanvasRef = useRef(null); // small canvas for diff
  const streamRef = useRef(null);
  const prevFrameDataRef = useRef(null);
  const stableCountRef = useRef(0);
  const samplingRef = useRef(null);
  const capturedRef = useRef(false); // prevent double-capture

  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [parsedName, setParsedName] = useState(null);
  const [parsedNumber, setParsedNumber] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [stableProgress, setStableProgress] = useState(0); // 0-100 for indicator

  useEffect(() => {
    startCamera();
    return () => stopEverything();
  }, []);

  useEffect(() => {
    if (capturedImage) scanCard();
  }, [capturedImage]);

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
    // Only sample every 4th pixel (R channel) for speed
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
    const r = guideW * 0.04; // rounded corners matching card ~4% of width

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, vw, vh);

    // Dim everything outside the guide using rounded clip
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.roundRect(x, y, guideW, guideH, r);
    ctx.fill();
    ctx.restore();

    // Outer gold border (Pokemon card outer rim)
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(x, y, guideW, guideH, r);
    ctx.stroke();

    // Inner black border
    const inset = 8;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + inset, y + inset, guideW - inset * 2, guideH - inset * 2, Math.max(r - inset, 2));
    ctx.stroke();

    // Inner gold accent line
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
    setOcrText('');
    setError(null);
    stopEverything();
  }

  function retake() {
    setCapturedImage(null);
    setOcrText('');
    setParsedName(null);
    setParsedNumber(null);
    setError(null);
    startCamera();
  }

  async function scanCard() {
    if (!capturedImage) return;

    setLoading(true);
    setError(null);
    setOcrText('');

    try {
      const base64 = capturedImage.split(',')[1];
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'OCR failed');
      setOcrText(data.text || '(No text detected)');
      setParsedName(data.parsed_name);
      setParsedNumber(data.parsed_number);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Card Scanner</h1>

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
          <img src={capturedImage} alt="Captured card" style={styles.video} />
          <div style={styles.buttonRow}>
            <button onClick={retake} disabled={loading} style={styles.button}>Retake</button>
            {loading && <p style={styles.hint}>Scanning…</p>}
          </div>
        </>
      )}

      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      <canvas ref={compareCanvasRef} width={SAMPLE_W} height={SAMPLE_H} style={{ display: 'none' }} />

      {error && <p style={styles.error}>Error: {error}</p>}

      {ocrText && (
        <div style={styles.results}>
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
          <details style={styles.details}>
            <summary style={styles.summary}>Raw OCR text</summary>
            <pre style={styles.ocrText}>{ocrText}</pre>
          </details>
        </div>
      )}
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
  title: {
    fontSize: '1.5rem',
    marginBottom: '1rem',
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
  },
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  error: {
    color: '#ef4444',
    marginTop: '0.5rem',
  },
  results: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: '#f1f5f9',
    borderRadius: 8,
  },
  resultsTitle: {
    fontSize: '1rem',
    marginBottom: '0.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '0.75rem',
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
    fontSize: '1rem',
    paddingBottom: '0.25rem',
  },
  details: {
    marginTop: '0.5rem',
  },
  summary: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    cursor: 'pointer',
  },
  ocrText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '0.75rem',
    margin: '0.5rem 0 0',
    color: '#475569',
  },
};
