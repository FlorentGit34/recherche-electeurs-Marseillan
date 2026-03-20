import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, AlertTriangle } from "lucide-react";

function stripLeadingZeros(str) {
  const stripped = str.replace(/^0+/, "");
  return stripped || "0";
}

export default function VoterCard({ results, currentIndex, setCurrentIndex, onBack }) {
  const [animKey, setAnimKey] = useState(0);
  const total = results.length;
  const voter = results[currentIndex];
  const isAlert = voter?.carte_a_donner === true;

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [currentIndex]);

  const goPrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goNext = () => {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!voter) return null;

  const bgColor = isAlert ? "#B91C1C" : "#003E7E";
  const fieldBg = isAlert ? "rgba(255,255,255,0.2)" : "#003E7E";
  const fieldText = "#FFFFFF";
  const numeroText = "#FFFFFF";

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full px-4 transition-colors duration-300"
      style={{ backgroundColor: bgColor }}
      data-testid="voter-card-page"
    >
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-white/70 hover:text-white flex items-center gap-2 transition-colors text-sm"
        data-testid="back-button"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour a la recherche
      </button>

      <div className="h-14 mb-6 w-full max-w-xl flex items-center justify-center">
        {isAlert && (
          <div
            className="flex items-center justify-center gap-3 rounded-xl px-6 py-3 w-full"
            style={{ backgroundColor: "rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
            data-testid="carte-a-donner-alert"
          >
            <AlertTriangle className="w-6 h-6 text-yellow-300" />
            <span className="text-white font-bold text-lg">Carte electorale a donner</span>
          </div>
        )}
      </div>

      <div className="mb-8 text-center" data-testid="result-counter">
        <p className="text-white/70 text-base">
          {total} electeur(s) trouve(s)
        </p>
        {total > 1 && (
          <p className="text-white/50 text-sm mt-1">
            Resultat {currentIndex + 1} sur {total}
          </p>
        )}
      </div>

      <div
        key={animKey}
        className="voter-card-animate w-full max-w-xl rounded-2xl p-8"
        style={{ backgroundColor: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)" }}
        data-testid="voter-card"
      >
        <div className="flex items-center gap-4 mb-5">
          <label className="text-white font-bold text-lg w-28 text-right shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            NOM :
          </label>
          <div
            className="flex-1 rounded-xl px-6 h-14 flex items-center text-lg font-semibold shadow-sm"
            style={{ backgroundColor: fieldBg, backdropFilter: "blur(8px)", color: fieldText }}
            data-testid="voter-nom"
          >
            {voter.nom}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <label className="text-white font-bold text-lg w-28 text-right shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Prenom :
          </label>
          <div
            className="flex-1 rounded-xl px-6 h-14 flex items-center text-lg font-semibold shadow-sm"
            style={{ backgroundColor: fieldBg, backdropFilter: "blur(8px)", color: fieldText }}
            data-testid="voter-prenom"
          >
            {voter.prenom}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <label className="text-white font-bold text-lg w-28 text-right shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Ne(e) le :
          </label>
          <div
            className="flex-1 rounded-xl px-6 h-14 flex items-center text-lg font-semibold shadow-sm"
            style={{ backgroundColor: fieldBg, backdropFilter: "blur(8px)", color: fieldText }}
            data-testid="voter-date-naissance"
          >
            {voter.date_naissance || "\u2014"}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <label className="text-white font-bold text-lg w-28 text-right shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Bureau :
          </label>
          <div
            className="flex-1 rounded-xl px-6 h-14 flex items-center text-lg font-semibold shadow-sm"
            style={{ backgroundColor: fieldBg, backdropFilter: "blur(8px)", color: fieldText }}
            data-testid="voter-bureau"
          >
            {voter.bureau}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-white font-bold text-lg w-28 text-right shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            N&deg; :
          </label>
          <div
            className="flex-1 rounded-xl px-6 h-32 flex items-center justify-center text-5xl font-extrabold tracking-wider text-center shadow-sm"
            style={{ backgroundColor: isAlert ? fieldBg : "#003E7E", backdropFilter: "blur(8px)", color: numeroText }}
            data-testid="voter-numero"
          >
            {stripLeadingZeros(voter.numero_electeur)}
          </div>
        </div>
      </div>

      {total > 1 && (
        <div className="flex items-center justify-center gap-12 mt-10" data-testid="navigation-controls">
          <button
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={`rounded-full p-4 transition-all ${currentIndex === 0 ? "nav-btn-disabled" : "text-white cursor-pointer"}`}
            style={currentIndex > 0 ? { backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" } : {}}
            data-testid="prev-button"
            aria-label="Resultat precedent"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={goNext}
            disabled={currentIndex === total - 1}
            className={`rounded-full p-4 transition-all ${currentIndex === total - 1 ? "nav-btn-disabled" : "text-white cursor-pointer"}`}
            style={currentIndex < total - 1 ? { backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" } : {}}
            data-testid="next-button"
            aria-label="Resultat suivant"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </div>
  );
}
