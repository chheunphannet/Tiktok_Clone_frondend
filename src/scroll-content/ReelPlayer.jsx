// import React, { useEffect, useRef, useState } from "react";
// import Hls from "hls.js";

// export default function ReelPlayer({
//   src,
//   poster,
//   shouldPlay,
//   isPreload,
//   isMuted,
//   onToggleMute,
// }) {
//   const videoRef = useRef(null);
//   const hlsRef = useRef(null);
//   const preloadTimerRef = useRef(null);
//   const [isManuallyPaused, setIsManuallyPaused] = useState(false);

//   // Bodyguard state to count fragments strictly
//   const fragCountRef = useRef(0);
//   const stateRef = useRef({ shouldPlay, isPreload });

//   useEffect(() => {
//     stateRef.current = { shouldPlay, isPreload };
//     // If we transition to playing, reset the bodyguard's counter
//     if (shouldPlay) fragCountRef.current = 0;
//   }, [shouldPlay, isPreload]);

//   // 1. HLS SETUP WITH THE "NETWORK BODYGUARD"
//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video || !src) return;

//     let hls;

//     if (video.canPlayType("application/vnd.apple.mpegurl")) {
//       video.src = src;
//       const onMeta = () => {
//         if (stateRef.current.shouldPlay) video.play().catch(() => {});
//       };
//       video.addEventListener("loadedmetadata", onMeta);
//       return () => video.removeEventListener("loadedmetadata", onMeta);
//     }

//     if (Hls.isSupported()) {
//       hls = new Hls({
//         autoStartLoad: false,
//         startLevel: 0,
//         capLevelToPlayerSize: true,
//         testBandwidth: false, // Stop the greedy bandwidth test
//         maxBufferLength: 2,
//         maxMaxBufferLength: 2,

//         // THE "ANOTHER" SOLUTION: The Custom Bodyguard Loader
//         fLoader: class CustomLoader extends Hls.DefaultConfig.fLoader {
//           constructor(config) {
//             super(config);
//             const originalLoad = this.load.bind(this);

//             this.load = (context, config, callbacks) => {
//               // Only block "main" video chunks (allow .m3u8 manifest files)
//               if (context.type === "main" && !stateRef.current.shouldPlay) {
//                 // If the bodyguard sees more than 1 chunk request, he KILLS it instantly
//                 if (fragCountRef.current >= 1) {
//                   return; // Bodyguard says: "No more downloads for you!"
//                 }
//                 fragCountRef.current++;
//               }
//               originalLoad(context, config, callbacks);
//             };
//           }
//         },
//       });

//       hlsRef.current = hls;
//       hls.loadSource(src);
//       hls.attachMedia(video);

//       hls.on(Hls.Events.MANIFEST_PARSED, () => {
//         if (stateRef.current.shouldPlay) {
//           hls.config.maxBufferLength = 4;
//           hls.config.maxMaxBufferLength = 6;
//           hls.loadLevel = -1; // Active: Auto quality
//           hls.startLoad(-1);
//           video.play().catch(() => {});
//         } else if (stateRef.current.isPreload) {
//           preloadTimerRef.current = setTimeout(() => {
//             if (hlsRef.current && stateRef.current.isPreload) {
//               fragCountRef.current = 0;
//               hlsRef.current.loadLevel = 0; // Preload: Force 480p
//               hlsRef.current.startLoad(-1);
//             }
//           }, 1500);
//         }
//       });

//       // Keep the active video moving after the first chunk
//       const onTimeUpdate = () => {
//         if (!stateRef.current.shouldPlay || !hlsRef.current) return;
//         if (getBufferedAhead(video) < 3) hlsRef.current.startLoad(-1);
//       };
//       video.addEventListener("timeupdate", onTimeUpdate);

//       return () => {
//         clearTimeout(preloadTimerRef.current);
//         video.removeEventListener("timeupdate", onTimeUpdate);
//         video.removeAttribute("src");
//         video.load();
//         if (hls) {
//           hls.stopLoad();
//           hls.destroy();
//         }
//         hlsRef.current = null;
//       };
//     }
//   }, [src]);

//   // 2. PLAY / PAUSE SYNC
//   useEffect(() => {
//     const video = videoRef.current;
//     if (!video) return;

//     video.muted = isMuted;

//     if (shouldPlay) {
//       clearTimeout(preloadTimerRef.current);
//       if (hlsRef.current) {
//         hlsRef.current.config.maxBufferLength = 4;
//         hlsRef.current.config.maxMaxBufferLength = 6;
//         hlsRef.current.loadLevel = -1; // Unlock quality
//         hlsRef.current.startLoad(-1);
//       }
//       if (!isManuallyPaused) video.play().catch(() => {});
//     } else {
//       if (hlsRef.current) hlsRef.current.stopLoad();
//       video.pause();
//       setIsManuallyPaused(false);
//     }
//   }, [shouldPlay, isMuted, isManuallyPaused]);

//   // 3. CLICK TO PAUSE
//   const handleVideoClick = () => {
//     const video = videoRef.current;
//     if (!video) return;
//     if (video.paused) {
//       video.play();
//       setIsManuallyPaused(false);
//     } else {
//       video.pause();
//       setIsManuallyPaused(true);
//     }
//   };

//   return (
//     <div
//       style={{
//         position: "relative",
//         width: "100%",
//         height: "100%",
//         backgroundColor: "black",
//       }}
//     >
//       <video
//         ref={videoRef}
//         poster={poster}
//         loop
//         playsInline
//         preload={shouldPlay || isPreload ? "metadata" : "none"}
//         muted={isMuted}
//         onClick={handleVideoClick}
//         style={{
//           width: "100%",
//           height: "100%",
//           objectFit: "cover",
//           cursor: "pointer",
//         }}
//       />
//       {isManuallyPaused && (
//         <div className="play-icon" style={{ zIndex: 2 }}>
//           <svg
//             className="play-icon-svg"
//             viewBox="0 0 24 24"
//             aria-hidden="true"
//           >
//             <path d="M8 5v14l11-7z" />
//           </svg>
//         </div>
//       )}
//       <button
//         type="button"
//         onClick={(e) => {
//           e.stopPropagation();
//           if (onToggleMute) onToggleMute();
//         }}
//         style={{
//           position: "absolute",
//           right: "14px",
//           top: "14px",
//           zIndex: 3,
//           opacity: 0.7,
//           borderRadius: "999px",
//           border: "1px solid rgba(255,255,255,0.55)",
//           padding: "6px 12px",
//           fontSize: "12px",
//           fontWeight: 700,
//           color: "#f8fafc",
//           background: "rgba(15, 23, 42, 0.7)",
//           backdropFilter: "blur(6px)",
//           cursor: "pointer",
//         }}
//       >
//         {isMuted ? "Unmute" : "Mute"}
//       </button>
//     </div>
//   );
// }

// function getBufferedAhead(video) {
//   const t = video.currentTime;
//   for (let i = 0; i < video.buffered.length; i++) {
//     if (video.buffered.start(i) <= t && t <= video.buffered.end(i)) {
//       return video.buffered.end(i) - t;
//     }
//   }
//   return 0;
// }

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function ReelPlayer({
  src,
  poster,
  shouldPlay,
  isPreload,
  isMuted,
  onToggleMute,
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const preloadTimerRef = useRef(null);
  const [isManuallyPaused, setIsManuallyPaused] = useState(false);

  const stateRef = useRef({ shouldPlay, isPreload, src });

  useEffect(() => {
    // If the video becomes active, we MUST reload the source to
    // "un-blindfold" the manifests and get the full 720p video.
    if (shouldPlay && !stateRef.current.shouldPlay && hlsRef.current) {
      hlsRef.current.loadSource(src);
    }
    stateRef.current = { shouldPlay, isPreload, src };
  }, [shouldPlay, isPreload, src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      const onMeta = () => {
        if (stateRef.current.shouldPlay) video.play().catch(() => {});
      };
      video.addEventListener("loadedmetadata", onMeta);
      return () => video.removeEventListener("loadedmetadata", onMeta);
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        autoStartLoad: false,
        startLevel: 0,
        // DUAL MANIFEST FILTER
        pLoader: class filteredLoader extends Hls.DefaultConfig.pLoader {
          constructor(config) {
            super(config);
            const originalLoad = this.load.bind(this);

            this.load = (context, config, callbacks) => {
              const { shouldPlay, isPreload } = stateRef.current;

              // Only apply filters during Preload (not while Playing)
              if (isPreload && !shouldPlay) {
                const originalOnSuccess = callbacks.onSuccess;

                callbacks.onSuccess = (
                  response,
                  stats,
                  context,
                  networkDetails,
                ) => {
                  let manifestText = response.data;

                  // 1. Filter the MASTER Manifest (Hide 720p)
                  if (context.type === "manifest") {
                    const parts = manifestText.split("#EXT-X-STREAM-INF");
                    if (parts.length > 2) {
                      // Keep only the first rendition (480p) and delete the rest
                      manifestText = parts[0] + "#EXT-X-STREAM-INF" + parts[1];
                    }
                  }
                  // 2. Filter the RENDITION Manifest (Hide chunks 1-10)
                  else if (context.type === "level") {
                    const parts = manifestText.split("#EXTINF");
                    if (parts.length > 2) {
                      // Keep only the Header + Chunk 0 and add the end tag
                      manifestText =
                        parts[0] + "#EXTINF" + parts[1] + "#EXT-X-ENDLIST";
                    }
                  }

                  response.data = manifestText;
                  originalOnSuccess(response, stats, context, networkDetails);
                };
              }
              originalLoad(context, config, callbacks);
            };
          }
        },
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (stateRef.current.shouldPlay) {
          hls.startLoad(-1);
          video.play().catch(() => {});
        } else if (stateRef.current.isPreload) {
          preloadTimerRef.current = setTimeout(() => {
            if (hlsRef.current && stateRef.current.isPreload) {
              hlsRef.current.startLoad(-1);
            }
          }, 1500);
        }
      });

      return () => {
        clearTimeout(preloadTimerRef.current);
        video.removeAttribute("src");
        video.load();
        if (hls) {
          hls.stopLoad();
          hls.destroy();
        }
        hlsRef.current = null;
      };
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;

    if (shouldPlay) {
      clearTimeout(preloadTimerRef.current);
      if (hlsRef.current) hlsRef.current.startLoad(-1);
      if (!isManuallyPaused) video.play().catch(() => {});
    } else {
      if (hlsRef.current) hlsRef.current.stopLoad();
      video.pause();
      setIsManuallyPaused(false);
    }
  }, [shouldPlay, isMuted, isManuallyPaused]);

  const handleVideoClick = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsManuallyPaused(false);
    } else {
      video.pause();
      setIsManuallyPaused(true);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "black",
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        loop
        playsInline
        muted={isMuted}
        onClick={handleVideoClick}
        className="reel-video"
        style={{ cursor: "pointer" }}
      />
      <button
        type="button"
        className="mute-toggle"
        aria-pressed={!isMuted}
        aria-label={isMuted ? "Unmute video" : "Mute video"}
        onClick={(event) => {
          event.stopPropagation();
          if (onToggleMute) onToggleMute();
        }}
      >
        {isMuted ? "Unmute" : "Mute"}
      </button>
      {isManuallyPaused && (
        <div className="play-icon" style={{ zIndex: 2 }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}
    </div>
  );
}
