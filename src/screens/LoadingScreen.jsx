import BibiFace from '../components/BibiFace'

export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg,#1A2E2A,#0f2535)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16
    }}>
      <div style={{ animation: "bounce 1.5s ease-in-out infinite" }}>
        <BibiFace expr="happy" size={80}/>
      </div>
      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 600 }}>
        Bibi yükleniyor...
      </div>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      `}</style>
    </div>
  )
}
