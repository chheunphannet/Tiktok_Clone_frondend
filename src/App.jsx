import { lazy, Suspense } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";

const ScrollContent = lazy(() => import("./scroll-content/ScrollContent"));
const Upload = lazy(() => import("./upload/Upload"));

const routeFallback = (
  <div style={{ color: "#e5e7eb", padding: "24px" }}>Loading...</div>
);

function App() {
  return (
    <div className="app">
      <main className="content">
        <Suspense fallback={routeFallback}>
          <Routes>
            <Route path="/" element={<Navigate to="/news" replace />} />
            <Route path="/news" element={<ScrollContent />} />
            <Route path="/upload" element={<Upload />} />
          </Routes>
        </Suspense>
      </main>

      <nav className="bottom-nav">
        <NavLink to="/news">Iran War News</NavLink>
        <NavLink to="/upload">Upload</NavLink>
      </nav>
    </div>
  );
}

export default App;
