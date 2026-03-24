import React, { createContext, useState, useEffect, useRef } from "react";

export const FeedContext = createContext();

export const FeedProvider = ({ children }) => {
  const [reels, setReels] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [likedById, setLikedById] = useState({});

  // Debounced index lives here — one place, consumed everywhere.
  // 350ms: long enough that fast-scrolling through 4 cards in ~1s
  // never commits any intermediate card as "active".
  const [debouncedActiveIndex, setDebouncedActiveIndex] = useState(0);
  const debounceTimer = useRef(null);

  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedActiveIndex(activeIndex);
    }, 350);
    return () => clearTimeout(debounceTimer.current);
  }, [activeIndex]);

  return (
    <FeedContext.Provider
      value={{
        reels,
        setReels,
        activeIndex,
        setActiveIndex,
        debouncedActiveIndex, // ← cards use this, not activeIndex
        nextCursor,
        setNextCursor,
        hasNextPage,
        setHasNextPage,
        isMuted,
        setIsMuted,
        likedById,
        setLikedById,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};
