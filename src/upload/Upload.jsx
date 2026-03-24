import { useEffect, useState, useContext } from "react";
import "./Upload.css";
import mediaUploadIcon from "./media-upload-icon.svg";
import { UploadContext } from "./UploadContext.jsx";
const Upload = () => {
  const [form, setForm] = useState({
    content: "",
    media: null,
  });
  const [isCompressing, setIsCompressing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const { startUpload, isUploading, uploadStatus } = useContext(UploadContext);
  const onTextChange = (event) => {
    setForm((prev) => ({ ...prev, content: event.target.value }));
  };

  const onFileChange = (event) => {
    const { name, files } = event.target;
    setForm((prev) => ({ ...prev, [name]: files?.[0] ?? null }));
  };

  useEffect(() => {
    if (!form.media) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(form.media);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [form.media]);

  const onSubmit = async (event) => {
    event.preventDefault();

    console.log("Upload payload:", {
      content: form.content,
      mediaName: form.media?.name ?? null,
      mediaType: form.media?.type ?? null,
    });
    if (!form.media) return;

    if (form.media.type.startsWith("image/")){
        const imageFile = form.media;
        setIsCompressing(true);
        console.log(
          `Original size: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB`,
        );

        const options = {
          maxSizeMB: 0.5, // Force the image to be under 500KB
          maxWidthOrHeight: 1080, // Perfect size for mobile feeds
          useWebWorker: true, // Uses a background thread so the UI doesn't freeze
          fileType: "image/webp", // Converts PNG/JPEG to the highly efficient WebP format
          exifOrientation: true, // CRITICAL: Strips the hidden GPS/Location data!
        };
      try {
        const { default: imageCompression } = await import(
          "browser-image-compression"
        );
        const finalFile = await imageCompression(imageFile, options);
        console.log(
          `Compressed size: ${(finalFile.size / 1024 / 1024).toFixed(2)} MB`,
        );

        const baseName = imageFile.name.replace(/\.[^/.]+$/, "");
        const webpFile = new File([finalFile], `${baseName}.webp`, {
          type: "image/webp",
          lastModified: finalFile.lastModified ?? Date.now(),
        });

        setPreviewUrl(URL.createObjectURL(webpFile));

        startUpload(webpFile, form.content);
        return;
      } catch (error) {
        console.error("Error compressing image:", error);
      } finally {
        setIsCompressing(false);
      }
      
    }
    
    startUpload(form.media, form.content);
  };

  return (
    <section className="upload-page">
      <div className="upload-card">
        <h1 className="upload-title">Upload Mission Media</h1>
        <p className="upload-subtitle">
          Add content and one media file (image or video).
        </p>

        <form className="upload-form" onSubmit={onSubmit}>
          <label htmlFor="content" className="upload-label">
            Content
          </label>
          <textarea
            id="content"
            name="content"
            value={form.content}
            onChange={onTextChange}
            className="upload-input upload-textarea"
            placeholder="Write the story or update..."
            rows={5}
            required
          />

          <label htmlFor="media" className="upload-label">
            Media (Image or Video)
          </label>
          <input
            id="media"
            name="media"
            type="file"
            accept="image/*,video/*"
            onChange={onFileChange}
            className="media-input-hidden"
            required
          />
          <label htmlFor="media" className="media-picker-btn">
            <img
              src={mediaUploadIcon}
              alt="Select media"
              className="media-picker-icon"
            />
          </label>
          <p className="file-name">{form.media?.name ?? "No media selected"}</p>

          {form.media && previewUrl && (
            <div className="media-preview">
              {form.media.type.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt="Selected media preview"
                  className="preview-image"
                />
              ) : (
                <video src={previewUrl} className="preview-video" controls />
              )}
            </div>
          )}
          {/* {isUploading && (
            <div style={{ marginTop: "20px" }}>
              <p>Uploading to MinIO... {uploadProgress}%</p>
              <progress
                value={uploadProgress}
                max="100"
                style={{ width: "100%" }}
              />
            </div>
          )} */}
          <button
            type="submit"
            className="submit-btn"
            disabled={isUploading || isCompressing}
          >
            {isCompressing
              ? "Compressing..."
              : isUploading
                ? "Uploading..."
                : "Submit Post"}
          </button>
          {(isCompressing || uploadStatus) && (
            <p style={{ marginTop: "12px", color: "#f8fafc", fontWeight: 600 }}>
              {isCompressing ? "Compressing image before upload..." : uploadStatus}
            </p>
          )}
        </form>
      </div>
    </section>
  );
};

export default Upload;
