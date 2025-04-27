'use client'
import dynamic from "next/dynamic";

const CameraCapture = dynamic(() => import("./CameraCapture"), { ssr: false });

export default function Home() {
  const webhook = process.env.NEXT_PUBLIC_WEBHOOK;

  return (
    <div>
      <h1 className="text-center">Book Cover Scanner</h1>
      {webhook ? (
        <CameraCapture webhook={webhook} />
      ) : (
        <div style={{ color: 'red' }}>Webhook not configured. Please set NEXT_PUBLIC_WEBHOOK in your .env file.</div>
      )}
    </div>
  );
}
