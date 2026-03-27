"use client";

import { useEffect, useRef } from "react";

type AutoPauseVideoProps = {
  src: string;
  className?: string;
};

export default function AutoPauseVideo({ src, className }: AutoPauseVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          void video.play().catch(() => {
            // Ignore autoplay errors; controls remain available for manual play.
          });
          return;
        }

        video.pause();
      },
      {
        threshold: [0, 0.6, 1],
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      autoPlay
      loop
      playsInline
      preload="auto"
      controls
    >
      Seu navegador não conseguiu reproduzir este video.
    </video>
  );
}
