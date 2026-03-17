import { useEffect, useRef, useState } from 'react';

export default function CardScanner() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError('Camera access denied or unavailable.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
    setOcrText('');
    setError(null);
    stopCamera();
  }

  function retake() {
    setCapturedImage(null);
    setOcrText('');
    setError(null);
    startCamera();
  }

  async function scanCard() {
    if (!capturedImage) return;

    setLoading(true);
    setError(null);
    setOcrText('');

    try {
      // Strip the data URL prefix to get raw base64
      const base64 = capturedImage.split(',')[1];
      const response = await fetch('/api/ocr/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'OCR failed');
      }

      setOcrText(data.text || '(No text detected)');
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
          <video ref={videoRef} autoPlay playsInline style={styles.video} />
          <button onClick={capture} disabled={!!cameraError} style={styles.button}>
            Capture
          </button>
        </>
      ) : (
        <>
          <img src={capturedImage} alt="Captured card" style={styles.video} />
          <div style={styles.buttonRow}>
            <button onClick={retake} style={styles.button}>Retake</button>
            <button onClick={scanCard} disabled={loading} style={styles.button}>
              {loading ? 'Scanning…' : 'Scan Card'}
            </button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {error && <p style={styles.error}>Error: {error}</p>}

      {ocrText && (
        <div style={styles.results}>
          <h2 style={styles.resultsTitle}>Extracted Text</h2>
          <pre style={styles.ocrText}>{ocrText}</pre>
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
  video: {
    width: '100%',
    borderRadius: 8,
    background: '#000',
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
  ocrText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '0.875rem',
    margin: 0,
  },
};
