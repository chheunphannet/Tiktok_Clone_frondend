import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { UploadProvider } from "./upload/UploadContext.jsx";
import { FeedProvider } from './scroll-content/FeedContext.jsx'
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <FeedProvider>
        <UploadProvider>
          <App />
        </UploadProvider>
      </FeedProvider>
    </BrowserRouter>
  </StrictMode>,
);
