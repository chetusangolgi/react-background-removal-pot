import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient'; // Import Supabase client
import { QRCodeCanvas } from 'qrcode.react'; // Import QRCodeCanvas
import { useImageDimensions } from '../hooks/useImageDimensions';
import { useResponsiveImageSize } from '../hooks/useResponsiveImageSize';

function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [uploadStatus, setUploadStatus] = useState('Uploading...');
  const [imageUrl, setImageUrl] = useState(null); // State to store the public URL of the image
  const combinedImage = location.state?.combinedImage;

  // Use the new hooks for flexible image display
  const { dimensions, isLoading: isDimensionsLoading, error: dimensionsError, retry } = useImageDimensions(combinedImage);
  const {
    displayWidth,
    displayHeight,
    containerStyle,
    imageStyle,
    bottomContainerStyle,
    deviceType
  } = useResponsiveImageSize(dimensions);

  useEffect(() => {
    if (!combinedImage) {
      setUploadStatus('No image found to upload.');
      return;
    }

    const uploadImage = async () => {
      const fileName = `combined-image-${Date.now()}.jpeg`;

      try {
        // Convert base64 to Blob for Supabase upload
        const blob = dataURLtoBlob(combinedImage);

        // Upload the image to Supabase storage
        const { data, error } = await supabase.storage
          .from('images') // 'images' is the bucket name
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
          });

        if (error) {
          throw new Error(error.message);
        }

        // Get the public URL for the uploaded image
        const publicURL = `https://crrwcvoimgjghepgrens.supabase.co/storage/v1/object/public/images/${fileName}`


        setImageUrl(publicURL); // Set the public URL of the image
        setUploadStatus('Upload successful!');

      } catch (error) {
        setUploadStatus('Error uploading to Supabase');
        console.error('Error uploading to Supabase:', error);
      }
    };

    uploadImage();
  }, [combinedImage]);

  // Show loading state while dimensions are being calculated
  if (isDimensionsLoading && combinedImage) {
    return (
      <div className="result-page">
        <div className="loading-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          color: 'white'
        }}>
          <div className="loading-spinner" style={{
            width: '50px',
            height: '50px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Preparing your image...</p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (dimensionsError) {
    return (
      <div className="result-page">
        <div className="error-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          color: 'white',
          textAlign: 'center'
        }}>
          <p>Failed to load image dimensions</p>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button
              onClick={retry}
              style={{
                backgroundColor: '#2244A2',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
            <button
              className="home-button"
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="result-page">
      {combinedImage ? (
       <div
       className="result-layout"
       style={{
         display: 'flex',
         flexDirection: deviceType === 'mobile' ? 'column' : 'row',
         alignItems: 'center',
         justifyContent: deviceType === 'mobile' ? 'center' : 'space-evenly',
         gap: deviceType === 'mobile' ? '20px' : '0px',
         width: '80vw',
         height: '100vh',
         padding: deviceType === 'tablet' ? '20px' : '40px',
         boxSizing: 'border-box',
         overflow: 'hidden'
       }}
     >
       {/* Left side - Image */}
       <div
         className="image-container"
         style={{
           ...containerStyle,
           flex: deviceType === 'mobile' ? '0 0 auto' : '1'
         }}
       >
         <img
           src={combinedImage}
           alt="Combined Result"
           className="combined-image"
           style={{
             ...imageStyle,
             border: '5px solid white',
             borderRadius: '20px',
             transition: 'all 0.3s ease'
           }}
         />
       </div>
     
       {/* Right side - QR Code and Home Button */}
       <div
         className="controls-container"
         style={{
           display: 'flex',
           flexDirection: 'column',
           alignItems: 'center',
           justifyContent: 'center',
           gap: deviceType === 'tablet' ? '15px' : '20px',
           boxSizing: 'border-box',
           flex: deviceType === 'mobile' ? '0 0 auto' : '0 0 auto',
           width: deviceType === 'tablet' ? '200px' : '250px',
           height: '100%'
         }}
       >
         {imageUrl && (
           <div
             className="qr-code-container"
             style={{
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               gap: deviceType === 'tablet' ? '10px' : '15px'
             }}
           >
             <QRCodeCanvas
               value={imageUrl}
               size={deviceType === 'tablet' ? 140 : 150}
               level="H"
               className="qrcode"
               style={{
                 border: '2px solid #fff',
                 borderRadius: '8px',
                 backgroundColor: '#fff'
               }}
             />
             <p
               style={{
                 color: 'white',
                 fontSize: deviceType === 'tablet' ? '14px' : '16px',
                 textAlign: 'center',
                 margin: '0',
                 opacity: '0.8'
               }}
             >
               Scan to share
             </p>
           </div>
         )}
     
         <button
           className="home-button"
           onClick={() => navigate('/')}
           style={{
             backgroundColor: '#2244A2',
             color: 'white',
             border: 'none',
             padding: deviceType === 'tablet' ? '16px 32px' : '20px 40px',
             fontSize: deviceType === 'tablet' ? '20px' : '22px',
             borderRadius: '8px',
             cursor: 'pointer',
             minWidth: deviceType === 'tablet' ? '140px' : '160px'
           }}
         >
           Home
         </button>
       </div>
     </div>
     
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          color: 'white'
        }}>
          <p>No image found to display.</p>
          <button
            className="home-button"
            onClick={() => navigate('/')}
          >
            Home
          </button>
        </div>
      )}
    </div>
  );
}

// Helper function to convert dataURL to Blob
const dataURLtoBlob = (dataURL) => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export default ResultPage;
