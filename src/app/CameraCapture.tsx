'use client'
import React, { useEffect, useRef, useState } from "react";
import './CameraCapture.css'; // For custom animation styles (will create if not exists)


interface CameraCaptureProps {
  webhook: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ webhook }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [successCount, setSuccessCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState(false);


  useEffect(() => {
    // Check if browser supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera access is not supported in this browser. Please use a modern browser (Chrome, Safari, Firefox) and ensure the page is served over HTTPS.");
      return;
    }
    // Request camera access
    const getCamera = async () => {
      try {
        // Try environment-facing camera (best for phones)
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (e) {
        // If environment-facing camera not found, try default camera
        console.log(e);
        
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: true });
          setStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        } catch (err) {
          if (
            err &&
            typeof err === "object" &&
            "name" in err &&
            err.name === "NotFoundError"
          ) {
            setError(
              "No camera device found. Please ensure your camera is connected and not being used by another application."
            );
          } else {
            setError(
              "Unable to access camera: " + (err instanceof Error ? err.message : "Unknown error")
            );
          }
        }
      }
    };
    getCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    setIsCapturing(true);
    setFlash(true); // trigger overlay flash
    setTimeout(() => setFlash(false), 120); // flash for 120ms
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Set canvas to 9:16 portrait size (e.g., 360x640)
    const targetWidth = 360;
    const targetHeight = 640;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsCapturing(false);
      return;
    }
    // Calculate cropping from the video stream to fit 9:16
    const videoAspect = video.videoWidth / video.videoHeight;
    const targetAspect = targetWidth / targetHeight;
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    if (videoAspect > targetAspect) {
      // Video is wider than 9:16, crop sides
      sw = video.videoHeight * targetAspect;
      sx = (video.videoWidth - sw) / 2;
    } else if (videoAspect < targetAspect) {
      // Video is taller than 9:16, crop top/bottom
      sh = video.videoWidth / targetAspect;
      sy = (video.videoHeight - sh) / 2;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const formData = new FormData();
        formData.append("image", blob, "capture.jpg");
        const response = await fetch(webhook, {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          setSuccessCount((count) => count + 1);
        } else {
          setError("Failed to upload: " + response.statusText);
        }
      } catch (err) {
        setError("Error uploading: " + (err instanceof Error ? err.message : "Unknown error"));
      }
      setIsCapturing(false);
    }, "image/jpeg");
  };


  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          aspectRatio: "9/16",
          background: "#222",
          position: "relative",
          overflow: "hidden",
          borderRadius: 16,
          border: "2px solid #333",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            top: 0,
            left: 0,
          }}
        />
        {/* Flash overlay */}
        {flash && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(255,255,255,0.4)",
              pointerEvents: "none",
              animation: "flash-fade 0.15s linear forwards"
            }}
          />
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <button
        onClick={handleCapture}
        className={isCapturing ? "capture-btn capturing" : "capture-btn"}
        disabled={isCapturing}
        style={{
          padding: "12px 24px",
          fontSize: 18,
          borderRadius: 8,
          background: isCapturing ? "#005bb5" : "#0070f3",
          color: "white",
          border: "none",
          cursor: isCapturing ? "not-allowed" : "pointer",
          transition: "background 0.2s"
        }}
      >
        Capture
      </button>
      <div style={{ marginTop: 8, fontSize: 16 }}>
        Successful Captures: <strong>{successCount}</strong>
      </div>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
};

export default CameraCapture;
