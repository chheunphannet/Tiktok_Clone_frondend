import {
  useEffect,
  useCallback,
  useRef,
  useContext,
  useState,
  useLayoutEffect,
} from "react";
import ReelContainer from "./ReelContainer";
import "./ScrollContent.css";
import { FeedContext } from "./FeedContext";

const ScrollContent = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  const thumbBase = import.meta.env.VITE_REEL_THUMB_BASE_URL;
  const streamBase = import.meta.env.VITE_REEL_STREAM_BASE_URL;
  const imagesBase = import.meta.env.VITE_REEL_IMAGE_BASE_URL;

  const {
    reels,
    setReels,
    activeIndex,
    setActiveIndex,
    debouncedActiveIndex,
    nextCursor,
    setNextCursor,
    hasNextPage,
    setHasNextPage,
    isMuted,
    setIsMuted,
    likedById,
    setLikedById,
  } = useContext(FeedContext);

  const isFetchingRef = useRef(false);
  const hasRestoredScrollRef = useRef(false);

  // Mirrors of context state in refs so fetchReels never re-creates itself.
  // A new fetchReels reference re-triggers the "initial fetch" useEffect,
  // which was causing double-fetches after every page load.
  const nextCursorRef = useRef(nextCursor);
  const hasNextPageRef = useRef(hasNextPage);
  const [isLoading, setIsLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [likePendingById, setLikePendingById] = useState({});
  const [expandedCaptions, setExpandedCaptions] = useState({});
  const [captionOverflowById, setCaptionOverflowById] = useState({});
  const captionRefs = useRef({});

  // Keep refs in sync when context state changes
  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);
  useEffect(() => {
    hasNextPageRef.current = hasNextPage;
  }, [hasNextPage]);

  useEffect(() => {
    if (hasRestoredScrollRef.current) return;
    if (reels.length > 0 && activeIndex > 0) {
      const element = document.getElementById(`video-${activeIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: "auto" });
        hasRestoredScrollRef.current = true;
        return;
      }
    }
    if (reels.length > 0) {
      hasRestoredScrollRef.current = true;
    }
  }, [reels.length, activeIndex]);

  const generateDeviceId = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.getRandomValues === "function"
    ) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
    }
    return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const getDeviceId = () => {
    let deviceId = localStorage.getItem("guest_device_id");
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem("guest_device_id", deviceId);
    }
    return deviceId;
  };

  const toggleLike = async (id) => {
    const isPending = Boolean(likePendingById[id]);
    if (isPending) return;

    const deviceId = getDeviceId();
    const prevLiked = Boolean(likedById[id]);
    const nextLiked = !prevLiked;
    const delta = nextLiked ? 1 : -1;

    setLikePendingById((prev) => ({ ...prev, [id]: true }));
    setLikedById((prev) => ({ ...prev, [id]: nextLiked }));

    setReels((prev) =>
      prev.map((reel) =>
        reel.id === id
          ? { ...reel, likeCount: Math.max(0, (reel.likeCount || 0) + delta) }
          : reel,
      ),
    );

    try {
      await fetch(
        `${apiBase}/api/${id}/like?deviceId=${encodeURIComponent(deviceId)}`,
        { method: "POST" },
      );
    } catch (error) {
      console.error("Failed to like reel:", error);
      setLikedById((prev) => ({ ...prev, [id]: prevLiked }));
      setReels((prev) =>
        prev.map((reel) =>
          reel.id === id
            ? { ...reel, likeCount: Math.max(0, (reel.likeCount || 0) - delta) }
            : reel,
        ),
      );
    } finally {
      setLikePendingById((prev) => ({ ...prev, [id]: false }));
    }
  };

  const toggleCaption = (id) => {
    setExpandedCaptions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const measureCaptions = useCallback(() => {
    const next = {};
    const lineClamp = 2;
    Object.entries(captionRefs.current).forEach(([id, element]) => {
      if (!element) return;
      const style = window.getComputedStyle(element);
      const lineHeight = parseFloat(style.lineHeight);
      const maxHeight =
        Number.isFinite(lineHeight) && lineHeight > 0
          ? lineHeight * lineClamp + 1
          : null;
      const hasOverflow = maxHeight
        ? element.scrollHeight > maxHeight
        : element.scrollHeight > element.clientHeight + 1;
      next[id] = hasOverflow;
    });
    setCaptionOverflowById(next);
  }, []);

  useLayoutEffect(() => {
    measureCaptions();
  }, [reels, measureCaptions]);

  useEffect(() => {
    window.addEventListener("resize", measureCaptions);
    return () => window.removeEventListener("resize", measureCaptions);
  }, [measureCaptions]);

  useEffect(() => {
    getDeviceId();
  }, []);

  const fetchReels = useCallback(async () => {
    if (isFetchingRef.current || !hasNextPageRef.current) return;
    isFetchingRef.current = true;
    setIsLoading(true);
    setFeedError("");

    try {
      const deviceId = getDeviceId();
      let url = `${apiBase}/api/reels?size=10&deviceId=${encodeURIComponent(deviceId)}`;
      const cursor = nextCursorRef.current;
      if (cursor) {
        url += `&id=${cursor.id}&uploadAt=${cursor.uploadAt}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data = await response.json();

      const hasDataArray = Array.isArray(data?.data);
      const hasContentArray = Array.isArray(data?.content);
      const isArray = Array.isArray(data);
      const content = hasDataArray
        ? data.data
        : hasContentArray
          ? data.content
          : isArray
            ? data
            : [];

      setReels((prev) => [...prev, ...content]);
      setLikedById((prev) => {
        const next = { ...prev };
        content.forEach((reel) => {
          if (typeof reel?.hasLiked === "boolean") {
            next[reel.id] = reel.hasLiked;
          }
        });
        return next;
      });

      const nextPage = Boolean(data?.hasNextPage ?? data?.hasNext ?? false);
      const nextCur = data?.nextCursor ?? null;
      // Update both context state and refs atomically
      hasNextPageRef.current = nextPage;
      nextCursorRef.current = nextCur;
      setHasNextPage(nextPage);
      setNextCursor(nextCur);
    } catch (error) {
      console.error("Failed to fetch reels:", error);
      setFeedError("Failed to load feed from the backend. Please try again.");
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
    // apiBase is stable (env var). No state deps needed — all via refs.
  }, [apiBase]);

  // Initial fetch — runs once on mount (fetchReels is now stable)
  useEffect(() => {
    if (reels.length === 0) {
      fetchReels();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pagination trigger — fetch next page when approaching the end
  useEffect(() => {
    if (reels.length === 0 || !hasNextPageRef.current || isFetchingRef.current)
      return;
    const triggerIndex = reels.length - 4;
    if (activeIndex >= triggerIndex) {
      fetchReels();
    }
  }, [activeIndex, reels.length, fetchReels]);

  if (feedError && reels.length === 0) {
    return (
      <div className="feed" role="region" aria-label="Short video feed">
        <p className="feed-status error" role="status">
          {feedError}
        </p>
      </div>
    );
  }

  return (
    <div className="feed" role="region" aria-label="Short video feed">
      {reels.map((reel, index) => {
        const liked = Boolean(likedById[reel.id]);
        const likePending = Boolean(likePendingById[reel.id]);
        const captionText = reel.caption?.trim() || "No caption yet";
        const hasMeasured = Object.prototype.hasOwnProperty.call(
          captionOverflowById,
          reel.id,
        );
        const isCaptionLong = hasMeasured
          ? captionOverflowById[reel.id]
          : captionText.length > 120;
        const isCaptionExpanded = Boolean(expandedCaptions[reel.id]);

        let thumbnailUrl = null;
        let videoSrc = null;
        if (!reel.contentType.startsWith("image/")) {
          thumbnailUrl = reel.thumbnailName
            ? `${thumbBase}/${reel.thumbnailName}`
            : null;
          videoSrc = reel.videoUrl ? `${streamBase}/${reel.videoUrl}` : null;
        } else {
          thumbnailUrl = `${imagesBase}/${reel.fileName}`;
        }

        return (
          <article
            key={`${reel.id}-${index}`}
            id={`video-${index}`}
            className="video-card"
          >
            <ReelContainer
              reel={reel}
              videoSrc={videoSrc}
              thumbnailUrl={thumbnailUrl}
              index={index}
              activeIndex={debouncedActiveIndex}
              setActiveIndex={setActiveIndex}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted((prev) => !prev)}
            />

            <div className="overlay">
              <div className="meta">
                <p className="author">@user_{reel.id}</p>
                <div className="caption-block">
                  <p
                    className={`caption ${isCaptionExpanded ? "expanded" : ""}`}
                    ref={(node) => {
                      if (node) {
                        captionRefs.current[reel.id] = node;
                      } else {
                        delete captionRefs.current[reel.id];
                      }
                    }}
                  >
                    {captionText}
                  </p>
                  {isCaptionLong && (
                    <button
                      type="button"
                      className="caption-toggle"
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCaption(reel.id);
                      }}
                      aria-expanded={isCaptionExpanded}
                    >
                      {isCaptionExpanded ? "See less" : "See more"}
                    </button>
                  )}
                </div>
              </div>

              <div className="action-stack">
                <p className="boom-count">{reel.likeCount || 0} BOOM</p>
                <button
                  type="button"
                  className={`like-btn ${liked ? "liked" : ""}`}
                  onClick={() => toggleLike(reel.id)}
                  aria-pressed={liked}
                  aria-label={liked ? "Unlike this video" : "Like this video"}
                  aria-busy={likePending}
                  disabled={likePending}
                >
                  💣
                </button>
                <p className="boom-count">{reel.viewCount || 0} VIEWS</p>
              </div>
            </div>
          </article>
        );
      })}

      {feedError && reels.length > 0 && (
        <p className="feed-status error inline" role="status">
          {feedError}
        </p>
      )}

      {isLoading && (
        <div style={{ color: "white", textAlign: "center", padding: "20px" }}>
          Loading more...
        </div>
      )}
    </div>
  );
};

export default ScrollContent;
