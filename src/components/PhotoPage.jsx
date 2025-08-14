
import React, { useState, useRef } from "react";
import Webcam from "react-webcam";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const CLIPDROP_API_KEY =
  "51eca5c745c8c30c8bce40840f1fe410892531e8ef825173a93a7361dfa71c45bcdae2bc7c9154d85af12489f6713448"; // Replace with your actual API key

const DEFAULT_BACKGROUND_PATH = "/bg1.jpg";

const videoConstraints = {
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  facingMode: "user",
  aspectRatio: { ideal: 16 / 9 }
};

function PhotoPage() {
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  
  // Get selected background from Redux store
  const selectedBackground = useSelector((state) => state.app.selectedBackground);

  // Handle change background navigation
  const handleChangeBackground = () => {
    navigate('/');
  };

  // Capture image from webcam
  const handleStartCapture = () => {
    setProcessing(true);
    setProcessingStep("Capturing image...");
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      console.log("Image captured:", imageSrc);
      setProcessingStep("");
      processBackgroundRemoval(imageSrc);
    }
  };

  // Call ClipDrop API to remove background and combine with selected background
  const processBackgroundRemoval = (imageSrc) => {
    setProcessingStep("");
    const blob = dataURLtoBlob(imageSrc);
    const formData = new FormData();
    formData.append("image_file", blob);

    fetch("https://clipdrop-api.co/remove-background/v1", {
      method: "POST",
      headers: {
        "x-api-key": CLIPDROP_API_KEY,
      },
      body: formData,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        const base64Image = arrayBufferToBase64(buffer);
        const processedImageData = `data:image/png;base64,${base64Image}`;
        if (processedImageData) {
          console.log("Processed image:", processedImageData);
          setProcessingStep("Combining with background...");
          combineWithSelectedBackground(processedImageData);
        } else {
          setProcessing(false);
        }
      })
      .catch((error) => {
        console.error("Error during background removal:", error);
        setProcessingStep("Error removing background. Please try again.");
        setProcessing(false);
      });
  };

  // Combine processed image with selected background
  const combineWithSelectedBackground = async (processedImageData) => {
    try {
      // Fallback to default background if no background selected
      const backgroundSrc = selectedBackground?.src || DEFAULT_BACKGROUND_PATH;
      
      // Log warning if using fallback
      if (!selectedBackground) {
        console.warn("No background selected, using default background:", DEFAULT_BACKGROUND_PATH);
      }
      
      const combinedImage = await combineImages(backgroundSrc, processedImageData);
      
      setProcessingStep("Complete! Redirecting...");
      navigate("/result", { state: { combinedImage } });
    } catch (error) {
      console.error("Error combining images:", error);
      setProcessingStep("Error combining images. Please try again.");
      setProcessing(false);
    }
  };

  // Combine background and processed images
  const combineImages = async (backgroundImageSrc, foregroundImageSrc) => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const background = new Image();
      const foreground = new Image();

      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error("Image loading timeout"));
      }, 15000);

      background.crossOrigin = "anonymous";
      foreground.crossOrigin = "anonymous";

      background.onload = () => {
        console.log("Background image loaded successfully", background.width, "x", background.height);

        // Set canvas size to optimal dimensions for portrait images
        const maxWidth = 1080;
        const maxHeight = 1920;

        let canvasWidth = maxWidth;
        let canvasHeight = maxHeight;

        // If background is landscape, adjust to fit within max dimensions
        const backgroundAspectRatio = background.width / background.height;
        if (backgroundAspectRatio > (maxWidth / maxHeight)) {
          canvasHeight = canvasWidth / backgroundAspectRatio;
          if (canvasHeight < 800) {
            canvasHeight = 800;
            canvasWidth = canvasHeight * backgroundAspectRatio;
          }
        } else {
          canvasWidth = canvasHeight * backgroundAspectRatio;
          if (canvasWidth < 600) {
            canvasWidth = 600;
            canvasHeight = canvasWidth / backgroundAspectRatio;
          }
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        foreground.onload = () => {
          console.log("Foreground image loaded successfully", foreground.width, "x", foreground.height);
          clearTimeout(timeout);

          // Calculate scaling to fit the entire user image within canvas while maintaining aspect ratio
          const foregroundAspectRatio = foreground.width / foreground.height;
          const canvasAspectRatio = canvas.width / canvas.height;

          let drawWidth, drawHeight, offsetX, offsetY;

          if (foregroundAspectRatio > canvasAspectRatio) {
            drawWidth = canvas.width;
            drawHeight = canvas.width / foregroundAspectRatio;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
          } else {
            drawHeight = canvas.height;
            drawWidth = canvas.height * foregroundAspectRatio;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
          }

          ctx.drawImage(foreground, offsetX, offsetY, drawWidth, drawHeight);

          const combinedImage = canvas.toDataURL("image/jpeg", 0.8);
          console.log("Combined Image created successfully");
          resolve(combinedImage);
        };

        foreground.onerror = (error) => {
          clearTimeout(timeout);
          console.error("Foreground image failed to load:", error);
          reject(new Error("Failed to load foreground image"));
        };

        foreground.src = foregroundImageSrc;
      };

      background.onerror = (error) => {
        clearTimeout(timeout);
        console.error("Background image failed to load:", error);
        reject(new Error("Failed to load background image"));
      };

      console.log("Loading background image:", backgroundImageSrc);
      background.src = backgroundImageSrc;
    });
  };




  return (
    <div className="photo-page-container">
      <div className="webcam-container">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          style={{
            width: "100%",
            height: "100vh",
            objectFit: "cover",
          }}
        />
      </div>
      <canvas
        ref={canvasRef}
        width={1080}
        height={1920}
        style={{ display: "none" }}
      ></canvas>

      {/* Background preview and change button */}
      {selectedBackground && (
        <div style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "8px"
        }}>
          <div style={{
            width: "60px",
            height: "40px",
            borderRadius: "4px",
            overflow: "hidden"
          }}>
            <img
              src={selectedBackground.src}
              alt={selectedBackground.label}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />
          </div>
          <span style={{ color: "white", fontSize: "12px" }}>
            {selectedBackground.label}
          </span>
          <button
            onClick={handleChangeBackground}
            disabled={processing}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: processing ? "not-allowed" : "pointer"
            }}
          >
            Change
          </button>
        </div>
      )}

      <div className="gg88" style={{ position: "absolute", bottom: "10px" }}>
        <div className="capture-btn-gg">
          <button onClick={handleStartCapture} disabled={processing}>
            {processing ? processingStep || "Processing..." : "Capture"}
          </button>
          {processing && processingStep && (
            <div style={{
              marginTop: "10px",
              color: "white",
              textAlign: "center",
              fontSize: "14px"
            }}>
              {processingStep}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to convert dataURL to Blob
const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

// Helper function to convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export default PhotoPage;
