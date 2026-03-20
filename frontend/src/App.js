import { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import HomePage from "./components/HomePage";
import VoterCard from "./components/VoterCard";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [view, setView] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [voterCount, setVoterCount] = useState(0);

  useEffect(() => {
    fetchVoterCount();
  }, []);

  const fetchVoterCount = async () => {
    try {
      const res = await axios.get(`${API}/voters/count`);
      setVoterCount(res.data.count);
    } catch (e) {
      console.error("Error fetching count:", e);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) return;
    setLoading(true);
    setNoResults(false);
    try {
      const res = await axios.get(`${API}/search`, { params: { q: query.trim() } });
      if (res.data.total === 0) {
        setNoResults(true);
        setResults([]);
      } else {
        setResults(res.data.results);
        setCurrentIndex(0);
        setNoResults(false);
        setView("results");
      }
    } catch (e) {
      console.error("Search error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView("home");
    setResults([]);
    setCurrentIndex(0);
    setNoResults(false);
  };

  const handleUploadSuccess = () => {
    fetchVoterCount();
  };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: "#003E7E" }}>
      {view === "home" && (
        <HomePage
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          loading={loading}
          noResults={noResults}
          voterCount={voterCount}
          onUploadSuccess={handleUploadSuccess}
          api={API}
        />
      )}
      {view === "results" && (
        <VoterCard
          results={results}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          onBack={handleBack}
        />
      )}
    </div>
  );
}

export default App;
