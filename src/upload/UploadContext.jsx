import { createContext, useState, useRef } from "react";
import axios from "axios";
import imageCompression from "browser-image-compression";
export const UploadContext = createContext();

export const UploadProvider = ({ children }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const abortControllerRef = useRef(null);
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

  const startUpload = async (file, caption) => {
    const fileName = file.name;
    let generatedFileName = "";
    
    if (file.type.startsWith("image/")){

    }
      try {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadStatus("");

        abortControllerRef.current = new AbortController();
        const url = `${apiBase}/api/uploads/get-presigned-url`;
        const response = await axios.post(url, {
          fileName,
          contentType: file.type,
        });

        const presignedUrl = response.data.url;
        generatedFileName = response.data.fileName;

        await axios.put(presignedUrl, file, {
          headers: { "Content-Type": file.type },
          signal: abortControllerRef.current.signal,
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) return;
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(percentCompleted);
          },
        });
        console.log("Upload finished in the background!");
        setUploadStatus("Upload completed successfully.");

        const fileSize = file.size; // bytes
        const durationSeconds = file.type.startsWith("video/")
          ? await getVideoDurationSeconds(file)
          : null;

        await axios.post(`${apiBase}/api/save`, {
          caption,
          fileName: generatedFileName,
          contentType: file.type,
          fileSize,
          durationSeconds,
          active: !file.type.startsWith("video/") ? true : false
        });
        console.log("Metadeta save!");
      } catch (error) {
        const wasCancelled =
          axios.isCancel(error) ||
          error?.code === "ERR_CANCELED" ||
          error?.name === "CanceledError";

        if (wasCancelled) {
          console.log("Upload cancelled by user.");
          setUploadStatus("Upload cancelled.");

          if (generatedFileName) {
            void axios
              .delete(
                `${apiBase}/api/uploads/cancel?fileName=${encodeURIComponent(
                  generatedFileName,
                )}`,
              )
              .then(() => {
                console.log("Partial file cleaned up from MinIO");
              })
              .catch((cleanupError) => {
                console.error("Failed to cleanup MinIO:", cleanupError);
              });
          }
        } else {
          console.error("Upload failed for another reason:", error);
          if (error?.response?.status === 400) {
            setUploadStatus(
              "Invalid file. Please choose a valid file and try again.",
            );
          } else {
            setUploadStatus("Upload failed. Please try again.");
          }
        }
      } finally {
        setIsUploading(false);
        abortControllerRef.current = null;
      }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(0);
  };

  const getVideoDurationSeconds = (file) =>
    new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);

      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(Math.round(video.duration)); // seconds
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to read video duration"));
      };
      video.src = objectUrl;
    });

  return (
    <UploadContext.Provider
      value={{ uploadProgress, isUploading, uploadStatus, startUpload }}
    >
      {children}

      {isUploading && (
        <div
          style={{
            position: "fixed",
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(520px, calc(100% - 24px))",
            background:
              "linear-gradient(180deg, rgba(17, 24, 39, 0.95), rgba(2, 6, 23, 0.92))",
            border: "1px solid rgba(251, 191, 36, 0.5)",
            borderRadius: "14px",
            padding: "12px 14px",
            boxShadow: "0 14px 30px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              color: "#f8fafc",
              fontWeight: 700,
              letterSpacing: "0.3px",
            }}
          >
            Uploading your video... {uploadProgress}%
          </p>
          <button
            type="button"
            onClick={cancelUpload}
            style={{
              margin: "0 0 10px",
              border: "1px solid rgba(248, 113, 113, 0.85)",
              borderRadius: "999px",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.4px",
              textTransform: "uppercase",
              color: "#fee2e2",
              background:
                "linear-gradient(180deg, rgba(153, 27, 27, 0.9), rgba(69, 10, 10, 0.95))",
              boxShadow: "0 8px 16px rgba(127, 29, 29, 0.35)",
              cursor: "pointer",
              transition: "filter 0.2s ease, transform 0.2s ease",
            }}
          >
            Cancel
          </button>
          <div
            style={{
              width: "100%",
              height: "10px",
              borderRadius: "999px",
              background: "rgba(148, 163, 184, 0.28)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: "100%",
                borderRadius: "999px",
                background:
                  "linear-gradient(90deg, #f59e0b 0%, #ef4444 55%, #b91c1c 100%)",
                transition: "width 0.25s ease",
              }}
            />
          </div>
        </div>
      )}
    </UploadContext.Provider>
  );
};
