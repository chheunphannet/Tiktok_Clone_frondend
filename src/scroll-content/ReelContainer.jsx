import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReelPlayer from "./ReelPlayer";

export default function ReelContainer({
  reel,
  videoSrc,
  thumbnailUrl,
  index,
  activeIndex,
  setActiveIndex,
  isMuted,
  onToggleMute,
}) {
  const containerRef = useRef(null);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [renderPlayer, setRenderPlayer] = useState(false);

  const isPlaying = index === activeIndex;
  const isPreload = index === activeIndex + 1;
  const isPrevious = index === activeIndex - 1;

  // === UPDATED: 3000ms delay instead of 1500ms ===
  // This prevents intermediate videos (2,3,4) from ever starting preload during fast scroll
  useEffect(() => {
    let timeout;
    if (isPlaying || isPrevious) {
      setRenderPlayer(true);
    } else if (isPreload) {
      timeout = setTimeout(() => setRenderPlayer(true), 2000); // wait for active card's first chunk
    } else {
      setRenderPlayer(false);
    }
    return () => clearTimeout(timeout);
  }, [isPlaying, isPreload, isPrevious]);

  useEffect(() => {
    if (isPlaying && !hasTrackedView) {
      const apiBase = import.meta.env.VITE_API_BASE_URL;
      axios
        .post(`${apiBase}/api/${reel.id}/view`)
        .catch((err) => console.error("Failed to track view:", err));
      setHasTrackedView(true);
    }
  }, [isPlaying, hasTrackedView, reel.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            setActiveIndex(index);
          }
        });
      },
      { threshold: [0.45] },
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      if (containerRef.current) observer.unobserve(containerRef.current);
    };
  }, [index, setActiveIndex]);

  return (
    <div ref={containerRef} className="reel-container">
      {renderPlayer && videoSrc ? (
        <ReelPlayer
          src={videoSrc}
          poster={thumbnailUrl}
          shouldPlay={isPlaying}
          isPreload={isPreload}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
        />
      ) : thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Video Thumbnail"
          className="reel-thumbnail"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
