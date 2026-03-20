import { useState, useRef } from "react";
import { Search, Upload, Loader2, AlertCircle, Database } from "lucide-react";
import axios from "axios";

export default function HomePage({
  searchQuery,
  setSearchQuery,
  onSearch,
  loading,
  noResults,
  voterCount,
  onUploadSuccess,
  api,
}) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const fileRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSearch(searchQuery);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${api}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadMsg(res.data.message);
      onUploadSuccess();
    } catch (err) {
      setUploadMsg(
        err.response?.data?.detail || "Erreur lors de l'import du fichier"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSeed = async () => {
    try {
      const res = await axios.post(`${api}/seed`);
      setUploadMsg(res.data.message);
      onUploadSuccess();
    } catch (err) {
      setUploadMsg("Erreur lors du chargement des donnees de demo");
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full px-6"
      data-testid="home-page"
    >
      <h1
        className="text-white font-bold text-4xl md:text-5xl lg:text-6xl mb-10 tracking-tight text-center"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        data-testid="home-title"
      >
        Trouver un electeur
      </h1>

      <div className="w-full max-w-2xl relative search-glow rounded-full" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }} data-testid="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Recherchez un nom..."
          className="w-full rounded-full px-8 py-4 pr-14 text-lg outline-none transition-all"
          style={{
            backgroundColor: "rgba(211,216,220,0.8)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "#003E7E",
            fontFamily: "'DM Sans', sans-serif",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
          data-testid="search-input"
          autoFocus
        />
        <button
          onClick={() => onSearch(searchQuery)}
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full transition-colors hover:bg-white/20"
          data-testid="search-button"
          aria-label="Rechercher"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#003E7E" }} />
          ) : (
            <Search className="w-6 h-6" style={{ color: "#003E7E" }} />
          )}
        </button>
      </div>

      {noResults && (
        <div
          className="flex items-center gap-2 mt-6 text-white/80 text-lg"
          data-testid="no-results-message"
        >
          <AlertCircle className="w-5 h-5" />
          <span>Aucun electeur trouve</span>
        </div>
      )}

      <div className="mt-12 mb-4" data-testid="logo-marseillan">
        <img
          src="/logo_marseillan.png"
          alt="Marseillan - Tout simplement"
          className="h-24 md:h-28 object-contain"
        />
      </div>

      <div className="mt-16 flex flex-col items-center gap-4">
        {voterCount > 0 && (
          <p className="text-white/50 text-sm" data-testid="voter-count-display">
            <Database className="w-4 h-4 inline mr-1" />
            {voterCount} electeur(s) en base
          </p>
        )}

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-white/60 hover:text-white text-sm flex items-center gap-2 transition-colors"
          data-testid="toggle-upload-button"
        >
          <Upload className="w-4 h-4" />
          {showUpload ? "Masquer l'import" : "Importer un fichier Excel"}
        </button>

        {showUpload && (
          <div className="flex flex-col items-center gap-3 mt-2" data-testid="upload-section">
            <div
              className="upload-zone rounded-xl p-6 cursor-pointer flex flex-col items-center gap-2"
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-white/60" />
              )}
              <span className="text-white/70 text-sm">
                Cliquez pour selectionner un fichier .xlsx
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                className="hidden"
                data-testid="file-input"
              />
            </div>

            {voterCount === 0 && (
              <button
                onClick={handleSeed}
                className="text-white/50 hover:text-white text-xs underline transition-colors"
                data-testid="seed-demo-button"
              >
                Ou charger des donnees de demonstration
              </button>
            )}

            {uploadMsg && (
              <p className="text-white/80 text-sm text-center" data-testid="upload-message">
                {uploadMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
