import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import Logo from './Logo1.png';
const delay = ms => new Promise(
  resolve => setTimeout(resolve, ms)
);
//img src
// ─── VIBRANT COLOUR SYSTEM ────────────────────────────────────────────────────
const C = {
  bg: "#ffffff",
  bgAlt: "#ffffff",
  white: "#ffffff",
  coral: "#FF4757",
  orange: "#FF6B35",
  yellow: "#FFD700",
  lime: "#7BC67E",
  teal: "#00C2A8",
  sky: "#43d5f3",
  blue: "#4361EE",
  violet: "#7B2FBE",
  pink: "#9df0ff",
  green: "#2DC653",
  text: "#1A1A2E",
  muted: "#0c42ae",
  subtle: "#9CA3AF",
  border: "#6fd9f6",
  patientColor: "#a3beff",
  familyColor: "rgb(96, 0, 85)",
  caregiverColor: "#00564a",
};

const G = {
  coral: "linear-gradient(135deg, rgb(14, 101, 207) 100%, #3564ff 100%)",
  blue: "linear-gradient(135deg, rgb(165, 205, 204) 54%, #628ef5 100%)",
  teal: "linear-gradient(135deg, #17e4c9 44%, #00a5c6 70%)",
  wbg: "linear-gradient(135deg, #ffffff 0%, #52bdff 100%)",
  wbg: "linear-gradient(135deg, #52bdff 0%, #afe3ff 100%)",
  yellow: "linear-gradient(135deg, #129a7e 0%, #85e5bb 100%)",
  pink: "linear-gradient(135deg, #F72585 0%, #7B2FBE 100%)",
  green: "linear-gradient(135deg, #2DC653 0%, #00C2A8 100%)",
  hero: "linear-gradient(160deg, #84edcd 0%, #18ab78 40%, #047450 100%)",
};

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 18px; }
  body { background: #FAEBD7; color: #1A1A2E; font-family: 'Poppins', sans-serif; min-height: 100vh; }
  ::-webkit-scrollbar { width: 8px; }
  ::-webkit-scrollbar-track { background: #7cfdff; }
  ::-webkit-scrollbar-thumb { background: #91cceb; border-radius: 4px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes popIn { 0%{transform:scale(0.85);opacity:0} 70%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  .ai { animation: fadeUp 0.5s ease both; }
  .ai1 { animation: fadeUp 0.5s 0.1s ease both; }
  .ai2 { animation: fadeUp 0.5s 0.2s ease both; }
  .ai3 { animation: fadeUp 0.5s 0.3s ease both; }
  .ai4 { animation: fadeUp 0.5s 0.4s ease both; }
  .pop { animation: popIn 0.4s ease both; }
  .shake { animation: shake 0.4s ease; }
  .float { animation: float 3s ease-in-out infinite; }
  input:focus, textarea:focus { outline: none; border-color: #4361EE !important; }
  button { transition: transform 0.12s, box-shadow 0.12s; }
  button:hover { transform: translateY(-2px); }
  button:active { transform: scale(0.97) translateY(0); }
`;

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const DB = {
  
  getUsers: () => { try { return JSON.parse(localStorage.getItem("mt_users") || "{}"); } catch { return {}; } },
  saveUsers: (u) => localStorage.setItem("mt_users", JSON.stringify(u)),
  getSession: () => { try { return JSON.parse(localStorage.getItem("mt_session") || "null"); } catch { return null; } },
  saveSession: (s) => localStorage.setItem("mt_session", JSON.stringify(s)),
  register: (email, password, name, role) => {
    const users = DB.getUsers();
    if (users[email]) return { error: "An account with this email already exists." };
    const token = Math.random().toString(36).slice(2, 10).toUpperCase();
    users[email] = { email, password, name, role, verified: false, verifyToken: token };
    DB.saveUsers(users);
    return { ok: true, token };
  },
  verify: (email, token) => {
    const users = DB.getUsers();
    if (!users[email]) return { error: "Account not found." };
    if (users[email].verifyToken !== token.toUpperCase().trim()) return { error: "Invalid code — check the box above." };
    users[email].verified = true;
    DB.saveUsers(users);
    DB.saveSession({ email, name: users[email].name, role: users[email].role });
    return { ok: true, user: users[email] };
  },
  login: (email, password) => {
    const users = DB.getUsers();
    if (!users[email]) return { error: "No account found with this email." };
    if (users[email].password !== password) return { error: "Incorrect password." };
    if (!users[email].verified) return { error: "Please verify your email first.", needsVerify: true };
    DB.saveSession({ email, name: users[email].name, role: users[email].role });
    return { ok: true, user: users[email] };
  },
};

const S = {
  page: { minHeight: "100vh", background: C.bg },
  container: { maxWidth: 1240, margin: "0 auto", padding: "0 48px", width: "100%" },
  card: (accent) => ({
    background: C.white,
    border: `2px solid ${accent ? accent + "30" : C.border}`,
    borderRadius: 24,
    padding: "32px 36px",
    boxShadow: accent ? `0 4px 0 ${accent}22, 0 8px 30px ${accent}08` : `0 2px 0 rgb(250, 235, 215), 0 8px 24px rgba(0,0,0,0.04)`,
  }),
  colourCard: (gradient, textColor = C.white) => ({
    background: gradient,
    borderRadius: 24,
    padding: "32px 36px",
    color: textColor,
    boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
  }),
  btn: (gradient, text = "#ffffff") => ({
    background: gradient, color: text, border: "none", borderRadius: 14,
    padding: "16px 32px", fontSize: "1.05rem", fontWeight: 700,
    fontFamily: "'Poppins', sans-serif", cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
  }),
  btnOutline: (color) => ({
    background: "transparent", color, border: `2px solid ${color}`,
    borderRadius: 14, padding: "14px 28px", fontSize: "1rem", fontWeight: 600,
    fontFamily: "'Poppins', sans-serif", cursor: "pointer",
  }),
  btnGhost: (color) => ({
    background: color + "12", color, border: `2px solid ${color}25`,
    borderRadius: 14, padding: "12px 24px", fontSize: "0.95rem", fontWeight: 700,
    fontFamily: "'Poppins', sans-serif", cursor: "pointer",
  }),
  input: () => ({
    width: "100%", background: "#ffffff", border: `2px solid ${C.border}`,
    borderRadius: 12, padding: "16px 20px", color: C.text,
    fontSize: "1.05rem", fontWeight: 500, fontFamily: "'Poppins', sans-serif",
  }),
  label: { fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 8, display: "block" },
  h1: { fontSize: "3.8rem", fontWeight: 900, color: C.text, lineHeight: 1.1 },
  h2: { fontSize: "2.5rem", fontWeight: 800, color: C.text, lineHeight: 1.2 },
  h3: { fontSize: "1.6rem", fontWeight: 700, color: C.text },
  h4: { fontSize: "1.2rem", fontWeight: 700, color: C.text },
  body: { fontSize: "1.05rem", color: C.text, lineHeight: 1.7 },
  muted: { fontSize: "1rem", color: C.muted, lineHeight: 1.6 },
  error: { background: "#ffffff", border: `2px solid ${C.coral}40`, borderRadius: 12, padding: "14px 18px", fontSize: "1rem", color: C.coral, fontWeight: 600 },
  success: { background: "#ffffff", border: `2px solid ${C.teal}40`, borderRadius: 12, padding: "14px 18px", fontSize: "1rem", color: C.teal, fontWeight: 700 },
};

// ─── DATA ─────────────────────────────────────────────────────────────────────
const MOCK_SCORES = [
  { day: "Mon", score: 72 }, { day: "Tue", score: 68 }, { day: "Wed", score: 75 },
  { day: "Thu", score: 71 }, { day: "Fri", score: 69 }, { day: "Sat", score: 74 }, { day: "Sun", score: 77 },
];
const BASELINE = 72;
const ALL_EMOJIS = ["🌸", "🎯", "🦋", "🌟", "🎨", "🍎", "🐶", "🚀"];
const numbersDone = [];

function randomize({c}){
  return c ;

}

const BRAIN_FOODS = [
  { name: "Breakfast 1", benefit: "Oats+Eggs+Youghurt", icon: "", cat: "breakfast" },
  { name: "Breakfast 2", benefit: "Smoothie+Toastie+Berry", icon: "", cat: "breakfast" },
  { name: "Lunch 1", benefit: "Rice+Lentils+Spinach", icon: "", cat: "lunch" },
  { name: "Lunch 2", benefit: "Tortilla+Hummus+Beans", icon: "", cat: "lunch" },
  { name: "Dinner 1", benefit: "Fish+Broccoli+Bread", icon: "", cat: "dinner" },
  { name: "Dinner 2", benefit: "Tofu+Veggies", icon: "", cat: "dinner" },
  { name: "Don't drink", benefit: "Alcohol", icon: "", cat: "avoid" },
  { name: "Avoid", benefit: "Sugary Snacks", icon: "", cat: "avoid" },
  { name: "Avoid", benefit: "Processed meats", icon: "", cat: "avoid" },
  { name: "Avoid", benefit: "Fried Food", icon: "", cat: "avoid" },
];
const DECADES = ["1950s", "1960s", "1970s", "1980s", "1990s", "2000s"];
const GENRES = ["Pop Classics", "Jazz", "Folk", "Classical", "Rock", "Country"];
const PLAYLISTS = {
  "1980s": ["Take On Me – A-ha", "Don't Stop Believin' – Journey", "Sweet Child O' Mine – GNR", "Like a Prayer – Madonna"],
  "1970s": ["Bohemian Rhapsody – Queen", "Hotel California – Eagles", "Stayin' Alive – Bee Gees", "Go Your Own Way – Fleetwood Mac"],
  "1960s": ["Hey Jude – Beatles", "What a Wonderful World – Armstrong", "Respect – Aretha Franklin", "Brown Eyed Girl – Van Morrison"],
  "1990s": ["Wonderwall – Oasis", "Smells Like Teen Spirit – Nirvana", "Un-Break My Heart – Toni Braxton", "Killing Me Softly – Fugees"],
};

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Badge({ children, color = C.coral }) {
  return (
    <span style={{ background: color + "18", color, border: `1.5px solid ${color}35`, borderRadius: 100, padding: "4px 14px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.06em" }}>
      {children}
    </span>
  );
}

function GBadge({ children, gradient }) {
   
  return (
    <span style={{ background: gradient, color: "#FAEBD7", borderRadius: 100, padding: "5px 16px", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.06em" }}>
      {children}
    </span>
  );
}

function Chip({ label, active, onClick, color, gradient }) {
  return (
    <button onClick={onClick} style={{
      background: active ? (gradient || color) : C.white,
      color: active ? "#FAEBD7" : C.muted,
      border: `2px solid ${active ? "transparent" : C.border}`,
      borderRadius: 100, padding: "8px 20px",
      fontSize: "0.9rem", fontWeight: active ? 700 : 500,
      fontFamily: "'Poppins',sans-serif", cursor: "pointer",
      boxShadow: active ? "0 4px 14px #ffffff26" : "none",
      transition: "all 0.15s",
    }}>{label}</button>
  );
}

function Spinner() {
  return <span style={{ display: "inline-block", width: 20, height: 20, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#FAEBD7", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

function EmojiSlider({ label, value, onChange, icon, color, gradient }) {
  const pct = ((value - 1) / 9) * 100;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: C.white }}>{icon} {label}</span>
        <span style={{ fontSize: "1.4rem", fontWeight: 900, color, background: color + "15", borderRadius: 8, padding: "2px 14px", fontFamily: "'DM Mono', monospace" }}>{value}</span>
      </div>
      <div style={{ position: "relative", height: 10, background: "#F3F4F6", borderRadius: 5 }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: gradient || color, borderRadius: 5, transition: "width 0.15s" }} />
      </div>
      <input type="range" min={1} max={10} value={value} onChange={e => onChange(+e.target.value)} style={{ width: "100%", marginTop: 6, accentColor: color, cursor: "pointer", height: 20 }} />
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={S.label}>{label}</label>
      {children}
    </div>
  );
}

// ─── TOP NAV ──────────────────────────────────────────────────────────────────
function TopNav({ active, onNav, role, user, onLogout }) {
  const roleColor = role === "patient" ? C.patientColor : role === "family" ? C.familyColor : C.caregiverColor;
  const roleGrad = role === "patient" ? G.coral : role === "family" ? G.blue : G.teal;
  const items = role === "patient"
    ? [{ id: "home", icon: "🏠", label: "Home" }, { id: "tasks", icon: "🧠", label: "Brain Tasks" }, { id: "activities", icon: "🏃", label: "Activities" }, { id: "music", icon: "🎵", label: "Music Therapy" }]
    : [{ id: "home", icon: "🏠", label: "Home" }, { id: "tasks", icon: "🧠", label: "Brain Tasks" }, { id: "diet", icon: "🥗", label: "Diet & Wellness" }, { id: "music", icon: "🎵", label: "Music Therapy" }];
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  return (
    <nav style={{ background: C.white, borderBottom: `2px solid ${C.border}`, padding: "0 48px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", height: 76 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 48, cursor: "pointer" }} onClick={() => onNav("home")}>
          {/* {/* <div style={{ width: 40, height: 40, background: G.coral, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", boxShadow: "0 4px 12px rgba(255,71,87,0.3)" }}> */}
            {/* <div style={{ width: 40, height: 40, borderRadius: 12, overflow: "hidden" }}>
            {/* <img src={"./Logo.jpeg"} alt="Intinn Logo" height={20} width={20} /> */}

{/* 
            <img src={Logo} alt="Intinn" width={40} height={40} /> */}
            {/* <img src={Logo} alt="Intinn" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "contain" }} />
  

            
            </div>  */}

            <img src={Logo} alt="Intinn" style={{ height: 50, width: "auto", maxWidth: 120 }} />
          <span style={{ fontSize: "1.4rem", fontWeight: 900, background: G.coral, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Intinn</span>
        </div>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {items.map(item => {
            const isActive = active === item.id;
            return (
              <button key={item.id} onClick={() => onNav(item.id)} style={{
                background: isActive ? roleColor + "12" : "transparent",
                color: isActive ? roleColor : C.muted,
                border: isActive ? `2px solid ${roleColor}25` : "2px solid transparent",
                borderRadius: 12, padding: "10px 20px", cursor: "pointer",
                fontFamily: "'Poppins',sans-serif", fontSize: "0.95rem", fontWeight: isActive ? 700 : 500,
                display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
              }}>
                <span style={{ fontSize: "1.05rem" }}>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, background: roleGrad, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "1rem", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
              {user?.name?.[0]}
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{user?.name}</div>
              <Badge color={roleColor}>{role}</Badge>
            </div>
          </div>
          {logoutConfirm ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onLogout} style={{ ...S.btn(G.coral), padding: "10px 18px", fontSize: "0.9rem" }}>Yes, Log Out</button>
              <button onClick={() => setLogoutConfirm(false)} style={{ ...S.btnGhost(C.muted), padding: "10px 16px", fontSize: "0.9rem" }}>Cancel</button>
            </div>
          ) : (
            <button onClick={() => setLogoutConfirm(true)} style={{ ...S.btnGhost(C.muted), padding: "10px 18px", fontSize: "0.9rem" }}>Log Out</button>
          )}
        </div>
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
    console.log(Logo + "wkfhi"); 
  const [authUser, setAuthUser] = useState(null);
  const [screen, setScreen] = useState("home");
  const [checkIn, setCheckIn] = useState({ mood: 7, energy: 6, sleep: 7, focus: 6 });
  const [todayScore, setTodayScore] = useState(null);
  const [meals, setMeals] = useState([]);
  const [booting, setBooting] = useState(true);

  useEffect(() => { const s = DB.getSession(); if (s) setAuthUser(s); setBooting(false); }, []);
  const logout = () => { localStorage.removeItem("mt_session"); setAuthUser(null); setScreen("home"); };

  if (booting) return (
    <>
      <style>{globalStyles}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: C.bg }}>
        <div className="float" style={{ fontSize: "5rem" }}><img src={Logo} alt="Intinn" style={{ height: 400, width: "auto", maxWidth: 960 }} /></div>
      </div>
    </>
    // await delay(1000);
  );

  if (!authUser) return <AuthFlow onAuth={setAuthUser} />;
  const nav = s => setScreen(s);
  return (
    <>
      <style>{globalStyles}</style>
      <TopNav active={screen} onNav={nav} role={authUser.role} user={authUser} onLogout={logout} />
      {screen === "home" && <HomeScreen user={authUser} checkIn={checkIn} setCheckIn={setCheckIn} onStart={() => nav("tasks")} />}
      {screen === "tasks" && <TasksScreen role={authUser.role} onDone={setTodayScore} todayScore={todayScore} />}
      {screen === "activities" && <ActivitiesScreen user={authUser} />}
      {screen === "diet" && <DietScreen role={authUser.role} meals={meals} setMeals={setMeals} />}
      {screen === "music" && <MusicScreen role={authUser.role} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════════════
function AuthFlow({ onAuth }) {
  const [page, setPage] = useState("welcome");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  return (
    <>
      <style>{globalStyles}</style>
      {page === "welcome" && <WelcomePage onLogin={() => setPage("login")} onRegister={() => setPage("register")} />}
      {page === "login" && <LoginPage onSuccess={onAuth} onRegister={() => setPage("register")} onNeedsVerify={e => { setPendingEmail(e); setPage("verify"); }} />}
      {page === "register" && <RegisterPage onLogin={() => setPage("login")} onVerify={(e, t) => { setPendingEmail(e); setPendingToken(t); setPage("verify"); }} />}
      {page === "verify" && <VerifyPage email={pendingEmail} suggestedToken={pendingToken} onSuccess={onAuth} onBack={() => setPage("login")} />}
    </>
  );
}

function MiniNav({ onLogin, onRegister }) {
  return (
    <div style={{ padding: "0 48px", borderBottom: `2px solid ${C.border}`, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
     {/* <div style={{ width: 38, height: 38, borderRadius: 10, overflow: "hidden" }}> */}
<img src={Logo} alt="Intinn" style={{ height: 50, width: "auto", maxWidth: 120 }} />
          
            {/* <img src={Logo} alt="Intinn image"/> */}
             {/* <img src={Logo} alt="Intinn" width={40} height={40} /> */}
            {/* height={20} width={20} */}
            {/* <img src={Logo} alt="Intinn" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "contain" }} />      
            
            </div> */}
          <span style={{ fontSize: "1.3rem", fontWeight: 900, background: G.coral, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Intinn</span>
        </div>
        {onLogin && onRegister && (
          <div style={{ display: "flex", gap: 12 }}>
            <button style={{ ...S.btnGhost(C.blue), padding: "10px 24px" }} onClick={onLogin}>Sign In</button>
            <button style={{ ...S.btn(G.coral), padding: "10px 24px" }} onClick={onRegister}>Get Started →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function WelcomePage({ onLogin, onRegister }) {
  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <MiniNav onLogin={onLogin} onRegister={onRegister} />
      <div style={{ display: "flex", height: 6 }}>
        {[G.coral, G.yellow, G.teal, G.blue, G.pink, G.green].map((g, i) => <div key={i} style={{ flex: 1, background: g }} />)}
      </div>
      <div style={{ ...S.container, padding: "88px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div className="ai">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.violet + "15", border: `2px solid ${C.violet}30`, borderRadius: 100, padding: "8px 20px", marginBottom: 28 }}>
              <span>✨</span>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: C.violet }}>Cognitive Health Platform</span>
            </div>
            <h1 style={{ ...S.h1, marginBottom: 24 }}>
              Track your{" "}
              <span style={{ background: C.border, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>mind</span>
              {", mood & "}
              <span style={{ background: G.blue, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>memory</span>.
            </h1>
            <p style={{ ...S.body, color: C.muted, marginBottom: 48, fontSize: "1.15rem", maxWidth: 460 }}>
              A daily cognitive health companion for patients, families, and caregivers — built to monitor, support, and celebrate brain health.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <button style={{ ...S.btn(G.coral), padding: "18px 40px", fontSize: "1.1rem", borderRadius: 16, boxShadow: "0 8px 28px rgba(255,71,87,0.3)" }} onClick={onRegister}>Get Started →</button>
              <button style={{ ...S.btnOutline(C.blue), padding: "18px 40px", fontSize: "1.1rem", borderRadius: 16 }} onClick={onLogin}>Sign In →</button>
            </div>
          </div>
          <div className="ai1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { icon: "🧠", title: "Brain Tasks", desc: "Daily cognitive challenges with real-time scoring", gradient: G.coral },
              { icon: "📊", title: "Activity and diet", desc: "Track daily activities and support a healthy diet", gradient: G.yellow },
              { icon: "🎵", title: "Music Therapy", desc: "Memory-triggering playlists for mood support", gradient: G.blue },
              { icon: "👨‍👩‍👧", title: "Family Dashboards", desc: "Role-based views for patients & carers", gradient: G.teal },
            ].map((f, i) => (
              <div key={f.title} className={`ai${i + 1}`} style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 20, padding: "26px 22px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: f.gradient }} />
                <div style={{ width: 52, height: 52, background: f.gradient, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: 14, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>{f.icon}</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: C.text, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: "0.88rem", color: C.muted, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthLayout({ children, title, subtitle, emoji }) {
  return (
    <div style={{ minHeight: "100vh", background: G.wbg, display: "flex", flexDirection: "column" }}>
      <MiniNav />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 40px" }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div className="ai" style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: "4rem", marginBottom: 12 }}>{emoji}</div>
            <h1 style={{ ...S.h2, marginBottom: 8 }}>{title}</h1>
            <p style={{ ...S.muted, fontSize: "1.1rem" }}>{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ onLogin, onVerify }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const roles = [
    { id: "patient", icon: "🧑", label: "Patient", gradient: G.coral, color: C.coral },
    { id: "family", icon: "👨‍👩‍👧", label: "Family", gradient: G.blue, color: C.blue },
    { id: "caregiver", icon: "🏥", label: "Caregiver", gradient: G.teal, color: C.teal },
  ];
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const shake = msg => { setError(msg); setShaking(true); setTimeout(() => setShaking(false), 400); };
  const go = () => {
    if (!form.name.trim()) return shake("Please enter your full name.");
    if (!form.email.includes("@")) return shake("Please enter a valid email.");
    if (form.password.length < 6) return shake("Password must be at least 6 characters.");
    if (form.password !== form.confirm) return shake("Passwords do not match.");
    if (!form.role) return shake("Please pick your role.");
    setLoading(true);
    setTimeout(() => {
      const r = DB.register(form.email.toLowerCase().trim(), form.password, form.name.trim(), form.role);
      setLoading(false);
      if (r.error) return shake(r.error);
      onVerify(form.email.toLowerCase().trim(), r.token);
    }, 900);
  };
  return (
    <AuthLayout title="Create Account" subtitle="Join Intinn today!" emoji="✨">
      <button onClick={onLogin} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: "1rem", fontFamily: "'Poppins',sans-serif", fontWeight: 600, marginBottom: 20, padding: 0 }}>← Back to Sign In</button>
      <div className={`ai1${shaking ? " shake" : ""}`} style={{ ...S.card(C.coral), padding: "36px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FieldGroup label="Full Name"><input style={S.input()} placeholder="e.g. Mary Flanagan" value={form.name} onChange={set("name")} /></FieldGroup>
          <FieldGroup label="Email"><input style={S.input()} type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} /></FieldGroup>
          <FieldGroup label="Password"><input style={S.input()} type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} /></FieldGroup>
          <FieldGroup label="Confirm Password"><input style={S.input()} type="password" placeholder="Repeat password" value={form.confirm} onChange={set("confirm")} /></FieldGroup>
        </div>
        <label style={{ ...S.label, marginTop: 4 }}>Your Role</label>
        <div style={{ display: "flex", gap: 14, marginBottom: 24 }}>
          {roles.map(r => (
            <button key={r.id} onClick={() => setForm(f => ({ ...f, role: r.id }))} style={{
              flex: 1, background: form.role === r.id ? r.gradient : "#F9FAFB",
              border: `2px solid ${form.role === r.id ? "transparent" : C.border}`,
              borderRadius: 16, padding: "22px 12px", cursor: "pointer",
              fontFamily: "'Poppins',sans-serif", color: form.role === r.id ? "#fff" : C.muted,
              boxShadow: form.role === r.id ? "0 6px 20px rgba(0,0,0,0.15)" : "none", transition: "all 0.2s",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 6 }}>{r.icon}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700 }}>{r.label}</div>
            </button>
          ))}
        </div>
        {error && <div style={{ ...S.error, marginBottom: 20 }}>⚠ {error}</div>}
        <button style={{ ...S.btn(G.coral), width: "100%", justifyContent: "center", padding: "18px", fontSize: "1.1rem", borderRadius: 14 }} onClick={go} disabled={loading}>
          {loading ? <><Spinner /> Creating Account…</> : "Create Account & Verify Email →"}
        </button>
      </div>
      <p className="ai2" style={{ textAlign: "center", marginTop: 20, ...S.muted }}>
        Already have an account? <span onClick={onLogin} style={{ color: C.coral, cursor: "pointer", fontWeight: 700 }}>Sign In</span>
      </p>
    </AuthLayout>
  );
}

function LoginPage({ onSuccess, onRegister, onNeedsVerify }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shaking, setShaking] = useState(false);
  const shake = msg => { setError(msg); setShaking(true); setTimeout(() => setShaking(false), 400); };
  const go = () => {
    if (!email || !password) return shake("Please fill in all fields.");
    setLoading(true);
    setTimeout(() => {
      const r = DB.login(email.toLowerCase().trim(), password);
      setLoading(false);
      if (r.error) { shake(r.error); if (r.needsVerify) setTimeout(() => onNeedsVerify(email.toLowerCase().trim()), 700); return; }
      onSuccess(r.user);
    }, 800);
  };
  return (
    <AuthLayout title="Welcome Back!" subtitle="Sign in to continue your journey." emoji="👋">
      <div className={`ai1${shaking ? " shake" : ""}`} style={{ ...S.card(C.blue), padding: "36px 40px" }}>
        <FieldGroup label="Email"><input style={S.input()} type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} /></FieldGroup>
        <FieldGroup label="Password"><input style={S.input()} type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} /></FieldGroup>
        {error && <div style={{ ...S.error, marginBottom: 20 }}>⚠ {error}</div>}
        <button style={{ ...S.btn(G.blue), width: "100%", justifyContent: "center", padding: "18px", fontSize: "1.1rem", borderRadius: 14 }} onClick={go} disabled={loading}>
          {loading ? <><Spinner /> Signing in…</> : "Sign In →"}
        </button>
      </div>
      <div className="ai2" style={{ display: "flex", gap: 24, justifyContent: "center", marginTop: 20 }}>
        <p style={S.muted}>No account? <span onClick={onRegister} style={{ color: C.coral, cursor: "pointer", fontWeight: 700 }}>Create one →</span></p>
        <p style={S.muted}>Have a code? <span onClick={() => onNeedsVerify(email)} style={{ color: C.blue, cursor: "pointer", fontWeight: 700 }}>Verify email →</span></p>
      </div>
    </AuthLayout>
  );
}

function VerifyPage({ email, suggestedToken, onSuccess, onBack }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [shaking, setShaking] = useState(false);
  const users = DB.getUsers();
  const demoToken = users[email]?.verifyToken || suggestedToken;
  const shake = msg => { setError(msg); setShaking(true); setTimeout(() => setShaking(false), 400); };
  const go = () => {
    if (!code.trim()) return shake("Please enter your code.");
    setLoading(true);
    setTimeout(() => {
      const r = DB.verify(email, code);
      setLoading(false);
      if (r.error) return shake(r.error);
      setDone(true);
      setTimeout(() => onSuccess(r.user), 1200);
    }, 900);
  };
  if (done) return (
    <AuthLayout title="Verified!" subtitle="Taking you in…" emoji="✅">
      <div className="pop" style={{ textAlign: "center", fontSize: "6rem" }}>🎉</div>
    </AuthLayout>
  );
  return (
    <AuthLayout title="Check Your Email" subtitle={`Code sent to ${email || "your email"}`} emoji="📧">
      {demoToken && (
        <div className="ai1" style={{ background: "#FFFBEA", border: `2px solid ${C.yellow}60`, borderRadius: 20, padding: "24px 28px", marginBottom: 24 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#B45309", letterSpacing: "0.1em", marginBottom: 10 }}>⚡ DEMO — YOUR CODE</div>
          <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "#92400E", letterSpacing: "0.4em", textAlign: "center", background: "#FEF3C7", borderRadius: 12, padding: "16px 0", fontFamily: "'DM Mono',monospace" }}>
            {demoToken}
          </div>
        </div>
      )}
      <div className={`ai2${shaking ? " shake" : ""}`} style={{ ...S.card(C.teal), padding: "32px 36px" }}>
        <FieldGroup label="Enter Your Code">
          <input style={{ ...S.input(), fontSize: "2rem", fontWeight: 900, letterSpacing: "0.4em", textAlign: "center", fontFamily: "'DM Mono',monospace", textTransform: "uppercase" }}
            placeholder="XXXXXXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={8} onKeyDown={e => e.key === "Enter" && go()} />
        </FieldGroup>
        {error && <div style={{ ...S.error, marginBottom: 20 }}>⚠ {error}</div>}
        <button style={{ ...S.btn(G.teal), width: "100%", justifyContent: "center", padding: "18px", fontSize: "1.1rem", borderRadius: 14 }} onClick={go} disabled={loading}>
          {loading ? <><Spinner /> Verifying…</> : "Verify & Enter Intinn ✓"}
        </button>
      </div>
      <button className="ai3" onClick={onBack} style={{ ...S.btnGhost(C.muted), display: "block", margin: "16px auto 0", padding: "12px 28px" }}>← Back to Sign In</button>
    </AuthLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ user, checkIn, setCheckIn, onStart }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const roleGrad = user.role === "patient" ? C.text : user.role === "family" ? C.text : C.text;
  const roleColor = user.role === "patient" ? C.patientColor : user.role === "family" ? G.blue : G.coral;
  const moodEmojis = [["😔", "Low"], ["😐", "Okay"], ["🙂", "Good"], ["😊", "Great"], ["🤩", "Amazing"]];
  const moodGradients = [G.coral, G.yellow, G.teal, G.blue, G.pink];
  return (
    <div style={S.page}>
      <div style={{ background: `linear-gradient(135deg, #cbe0ed 0%, #3bbff0 50%, #0e84f2 100%)`, borderBottom: `2px solid ${C.border}`, padding: "56px 48px 48px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="ai" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 40 }}>
            <div>
              <p style={{ fontSize: "1rem", fontWeight: 600, color: C.muted, marginBottom: 6 }}>
                {new Date().toLocaleDateString("en-IE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h1 style={{ ...S.h1, fontSize: "3.2rem", marginBottom: 10 }}>
                {greeting},{" "}
                <span style={{ background: roleGrad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{user.name.split(" ")[0]}</span>! 👋
              </h1>
              <p style={{ ...S.muted, fontSize: "1.1rem" }}>How are you feeling today? Let's do a quick check-in.</p>
            </div>
            {user.role === "patient" && (
              <button style={{ ...S.btn(G.coral), padding: "20px 44px", fontSize: "1.1rem", borderRadius: 16, flexShrink: 0, boxShadow: "0 8px 28px rgba(255,71,87,0.3)" }} onClick={onStart}>
                Start Today's Brain Tasks 🧠
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", height: 5 }}>
        {[G.coral, G.yellow, G.teal, G.blue, G.pink, G.green].map((g, i) => <div key={i} style={{ flex: 1, background: g }} />)}
      </div>
      <div style={{ ...S.container, padding: "40px 48px 80px" }}>
        <div className="ai1" style={{ ...S.card(), marginBottom: 28 }}>
          <label style={S.label}>Today's Mood</label>
          <div style={{ display: "flex", gap: 16 }}>
            {moodEmojis.map(([em, lbl], i) => {
              const isActive = checkIn.mood === (i + 1) * 2;
              return (
                <button key={i} onClick={() => setCheckIn(c => ({ ...c, mood: (i + 1) * 2 }))} style={{
                  flex: 1, background: isActive ? moodGradients[i] : "#F9FAFB",
                  border: `2px solid ${isActive ? "transparent" : C.border}`,
                  borderRadius: 20, padding: "20px 8px 16px", cursor: "pointer",
                  color: isActive ? "#fff" : C.muted,
                  boxShadow: isActive ? "0 6px 20px #fff" : "none",
                  transition: "all 0.2s", fontFamily: "'Poppins',sans-serif",
                }}>
                  <div style={{ fontSize: "2.4rem", marginBottom: 8 }}>{em}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: isActive ? 700 : 500 }}>{lbl}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          <div className="ai2" style={S.card()}>
            <label style={S.label}>Daily Check-In Sliders</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 40, marginTop: 12 }}>
              <EmojiSlider label="Energy" value={checkIn.energy} onChange={v => setCheckIn(c => ({ ...c, energy: v }))} icon="⚡" color={C.teal} gradient={G.yellow} />
              <EmojiSlider label="Sleep" value={checkIn.sleep} onChange={v => setCheckIn(c => ({ ...c, sleep: v }))} icon="😴" color={C.sky} gradient={G.teal} />
              <EmojiSlider label="Focus" value={checkIn.focus} onChange={v => setCheckIn(c => ({ ...c, focus: v }))} icon="🎯" color={C.violet} gradient={G.blue} />
            </div>
          </div>
          <div className="ai3" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Energy", value: checkIn.energy, gradient: G.yellow, icon: "⚡" },
              { label: "Sleep", value: checkIn.sleep, gradient: G.teal, icon: "😴" },
              { label: "Focus", value: checkIn.focus, gradient: G.blue, icon: "🎯" },
            ].map(s => (
              <div key={s.label} style={{ ...S.colourCard(s.gradient), display: "flex", alignItems: "center", gap: 16, padding: "18px 24px" }}>
                <span style={{ fontSize: "1.6rem" }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, opacity: 0.8, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.label}</div>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>{s.value}/10</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITIES
// ═══════════════════════════════════════════════════════════════════════════════
function ActivitiesScreen({ user }) {
  const [note, setNote] = useState("");
  const [submittedNote, setSubmittedNote] = useState("");

  return (
    <div style={S.page}>
      <div style={{ background: G.yellow, padding: "48px 48px 40px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="ai">
            <h1 style={{ ...S.h1, fontSize: "2.8rem", color: C.white, marginBottom: 6 }}>Daily Activities 🏃</h1>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>Log what you've been up to today!</p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", height: 5 }}>
        {[G.coral, G.yellow, G.teal, G.blue, G.pink, G.green].map((g, i) => (
          <div key={i} style={{ flex: 1, background: g }} />
        ))}
      </div>

      <div style={{ ...S.container, padding: "40px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>

          {/* How Did Today Feel? */}
          <div className="ai2" style={S.card(C.sky)}>
            <label style={{ ...S.label, color: C.text }}>How Did Today Feel?</label>
            <textarea
              placeholder="Write a few words about your day…"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ ...S.input(), minHeight: 20, resize: "none", marginBottom: 14, lineHeight: 1.7 }}
            />
            <button
              style={{ ...S.btn(G.teal), width: "100%", justifyContent: "center" }}
              onClick={() => { if (note.trim()) { setSubmittedNote(note.trim()); setNote(""); } }}
            >
              Save Note 💾
            </button>
            {submittedNote && (
              <div style={{ ...S.success, marginTop: 14 }}>✅ "{submittedNote}"</div>
            )}
          </div>

          {/* This Week */}
          <div className="ai3" style={{ ...S.colourCard(G.wbg), display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <label style={{ ...S.label, color: "rgba(255,255,255,0.7)", marginBottom: 16 }}>This Week</label>
            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: "auto" }}>
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: i < 5 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    color: i < 5 ? C.blue : "rgba(255,255,255,0.5)",
                    fontWeight: 800,
                  }}>
                    {i < 5 ? "✓" : ""}
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function randomAP({num, arr}){
  const correct = [];
  const numbersDone=[];
  for (let i = 0; i < num; i++) {
    let j = Math.floor(Math.random() * arr.length);
    while (numbersDone.includes(j)) {
      j = Math.floor(Math.random() * arr.length);
    }
    numbersDone[i]=j;
    correct[i]=arr[j];
  }

  return correct;

  // for(let i = 0; i<num)
}
// ═══════════════════════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════════════════════
function TasksScreen({ role, onDone, todayScore }) {
  const trial =  [{scrambled: [..."BREAD"].sort(()=>Math.random()-.5).join(''), answer: "BREAD"},
  {scrambled: [..."MILK"].sort(()=>Math.random()-.5).join(''), answer: "MILK"},
  {scrambled: [..."CLOUD"].sort(()=>Math.random()-.5).join(''), answer: "CLOUD"},
  {scrambled: [..."CHAIR"].sort(()=>Math.random()-.5).join(''), answer: "CHAIR"},
  {scrambled: [..."BRAIN"].sort(()=>Math.random()-.5).join(''), answer: "BRAIN"}, 
  {scrambled: [..."APPLE"].sort(()=>Math.random()-.5).join(''), answer: "APPLE" }, 
  { scrambled: [..."BANANA"].sort(()=>Math.random()-.5).join(''), answer: "BANANA" }, 
  { scrambled:[..."LION"].sort(()=>Math.random()-.5).join(''), answer: "LION" }]; 
  const WORDS = randomAP({num:3, arr:trial}); //{ scrambled:[..."CAT"].sort(()=>Math.random()-.5).join(''), answer: "CAT" }];
  const correctalt =  randomAP({num: 4, arr: [1,2,3,4,5,"A","B","C","D"]});
  const correct =  randomAP({num: 6, arr: [1,2,3,4,5,6]});
  const [phase, setPhase] = useState("intro");
  const [scores, setScores] = useState({ memory: 0, pattern: 0,alternating:0, scramble: 0  });
  const finish = (task, score) => {
    const ns = { ...scores, [task]: score };
    setScores(ns);
    if (task === "memory") setPhase("pattern");
    else if (task === "pattern") setPhase("alternating");
    else if (task === "alternating") setPhase("scramble");
    else { setPhase("results"); onDone(Math.round((ns.memory + ns.pattern + ns.scramble + ns.alternating) / 4 * 10)); }
  };
  const total = Math.round((scores.memory + scores.pattern + scores.scramble + scores.alternating) / 4 * 10);
  const isGood = total > 70;
  if (role === "family") return <FamilyView />;
  return (
    <div style={S.page}>
      <div style={{ background: "linear-gradient(135deg, #7B2FBE 0%, #4361EE 100%)", padding: "48px 48px 40px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="ai">
            <h1 style={{ ...S.h1, fontSize: "2.8rem", color: C.white, marginBottom: 6 }}>Brain Tasks 🧠</h1>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)" }}>Daily cognitive exercises to track your mental performance</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 14, padding: "12px 24px", color: C.white, fontWeight: 700, backdropFilter: "blur(10px)" }}>
            Step {["intro", "memory", "pattern","alternating", "scramble", "results"].indexOf(phase) + 1} of 6
          </div>
        </div>
      </div>
      <div style={{ display: "flex", height: 5 }}>
        {[G.coral, G.yellow, G.teal, G.blue, G.pink, G.green].map((g, i) => <div key={i} style={{ flex: 1, background: g }} />)}
      </div>
      <div style={{ ...S.container, padding: "40px 48px 80px" }}>
        {phase === "intro" && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 28 }}>
            <div className="ai1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: "🌸", title: "Memory Challenge", desc: "Memorise and recall images", time: "~60s", gradient: G.coral },
                { icon: "🔢", title: "Pattern Trail", desc: "Connect the dots in order", time: "~45s", gradient: G.teal },
                { icon: "🔄", title: "Alternating Task", desc: "Switch between different tasks", time: "~45s", gradient: G.yellow },
                { icon: "📝", title: "Word Scramble", desc: "Unscramble brain-health words", time: "~60s", gradient: G.blue },
              ].map(t => (
                <div key={t.title} style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 20, padding: "24px 28px", display: "flex", gap: 20, alignItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.05)", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: t.gradient }} />
                  <div style={{ width: 58, height: 58, background: t.gradient, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}>{t.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: C.text, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ ...S.muted, fontSize: "0.95rem" }}>{t.desc}</div>
                  </div>
                  <GBadge gradient={t.gradient}>{t.time}</GBadge>
                </div>
              ))}
              <button style={{ ...S.btn(G.blue), padding: "20px 40px", fontSize: "1.1rem", borderRadius: 16, alignSelf: "flex-start", boxShadow: "0 8px 28px rgba(67,97,238,0.3)" }} onClick={() => setPhase("memory")}>
                Begin Tasks! 🚀
              </button>
            </div>
            <div className="ai2" style={{ ...S.colourCard(G.pink), textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "5rem", marginBottom: 16 }}>🧠</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>Ready?</div>
              <p style={{ fontSize: "1rem", opacity: 0.85, lineHeight: 1.6 }}>Complete all 4 tasks to get your daily score. Takes about 4 minutes.</p>
              
            </div>
          </div>
        )}
        {phase === "memory" && <MemoryTask onDone={s => finish("memory", s)} />}
        {phase === "pattern" && <PatternTask correct={correct} onDone={s => finish("pattern", s)} />}
        {phase === "alternating" && <AlternatingTask correctalt={correctalt} onDone={s => finish("alternating", s)} />}
        {phase === "scramble" && <ScrambleTask WORDS={WORDS} onDone={s => finish("scramble", s)} />}
        {phase === "results" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }} className="ai">
            <div>
              <div style={{ ...S.colourCard(isGood ? G.green : G.yellow), textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: "7rem", fontWeight: 900, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{total}</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 600, opacity: 0.85, marginTop: 8 }}>Today's Score</div>
                <div style={{ marginTop: 16, fontSize: "1.05rem", fontWeight: 700, background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: "12px 16px" }}>
                  {isGood ? "✅ Memory patterns are stable!" : "⚠ Consider chatting with your caregiver."}
                </div>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                {[["Memory", scores.memory, G.coral], ["Pattern", scores.pattern, G.teal], ["Alternating", scores.alternating, G.pink],["Scramble", scores.scramble, G.blue]].map(([lbl, val, g]) => (
                  <div key={lbl} style={{ ...S.colourCard(g), flex: 1, textAlign: "center", padding: "20px 12px" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>{val * 10}</div>
                    <div style={{ fontSize: "0.85rem", opacity: 0.85, fontWeight: 600, marginTop: 4 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={S.card(C.blue)}>
                <label style={{ ...S.label, color: C.blue }}>7-Day Trend</label>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={MOCK_SCORES}>
                    <XAxis dataKey="day" stroke="#D1D5DB" tick={{ fontSize: 13, fill: C.muted, fontWeight: 600 }} />
                    <YAxis domain={[50, 100]} stroke="#D1D5DB" tick={{ fontSize: 13, fill: C.muted, fontWeight: 600 }} />
                    <Tooltip contentStyle={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontWeight: 600 }} />
                    <ReferenceLine y={BASELINE} stroke={C.orange} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="score" stroke={C.blue} strokeWidth={3} dot={{ fill: C.blue, r: 6, stroke: C.white, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {role === "caregiver" && <CaregiverCard />}
              <button style={{ ...S.btn(G.coral), width: "100%", justifyContent: "center", padding: "18px" }} onClick={() => { setPhase("intro"); setScores({ memory: 0, pattern: 0, alternating: 0, scramble: 0 }); }}>
                Try Again 🔄
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MemoryTask({ onDone }) {
  const [shownData] = useState(() => {
    const allEmojis = ["🌸", "🎯", "🦋", "🌟", "🎨", "🍎", "🐶", "🚀"];
    const numbersDone = [];
    const picked = [];
    for (let i = 0; i < 4; i++) {
      let j = Math.floor(Math.random() * allEmojis.length);
      while (numbersDone.includes(j)) {
        j = Math.floor(Math.random() * allEmojis.length);
      }
      numbersDone.push(j);
      picked.push(allEmojis[j]);
    }
    return { picked, all: allEmojis };
  });

  const { picked, all } = shownData;

  const [stage, setStage] = useState("show");
  const [revealed, setRevealed] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (stage !== "show") return;
    let i = -2;
    const iv = setInterval(() => {
      setRevealed(p => [...p, picked[i]]); i++; //j++; 
      if (true){
         if (i >= picked.length) { clearInterval(iv); setTimeout(() => setStage("recall"), 2000); }
      }
      // }else{
      //    if (j >= shown.length) { clearInterval(iv); setTimeout(() => setStage("recall"), 2000); }
      // }
       
     
    }, 600);
    return () => clearInterval(iv);
  }, [stage]);


  const toggle = em =>
    setSelected(s =>
      s.includes(em) ? s.filter(x => x !== em) : [...s, em]
    );

  const submit = () =>
    onDone(
      Math.round(
        (selected.filter(x => picked.includes(x)).length / picked.length) * 10
      )
    );

  const btnStyle = em => ({
    width: 80,
    height: 80,
    fontSize: "2.5rem",
    background: selected.includes(em) ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)",
    border: `3px solid ${selected.includes(em) ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)"}`,
    borderRadius: 18,
    cursor: "pointer",
    transform: selected.includes(em) ? "scale(1.1)" : "scale(1)",
    transition: "all 0.15s",
  });

  return (
    <div className="ai">
      <div style={{ ...S.colourCard(G.coral), textAlign: "center" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", opacity: 0.8, marginBottom: 16 }}>🧠 MEMORY CHALLENGE</div>
        {stage === "show" ? (
          <>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 28, opacity: 0.9 }}>Memorise these images! 👀</p>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              {revealed.map((em, idx) => (
                <button key={idx} style={btnStyle(em)}>{em}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 24, opacity: 0.9 }}>Which ones did you see? Tap to select! 🎯</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginBottom: 24 }}>
              {all.map(em => (
                <button key={em} onClick={() => toggle(em)} style={btnStyle(em)}>{em}</button>
              ))}
            </div>
            <button style={{ ...S.btn("rgba(255,255,255,0.9)", C.coral), padding: "16px 40px", fontSize: "1.1rem", margin: "0 auto" }} onClick={submit}>
              Submit Answers ✓
            </button>
          </>
        )}
      </div>
    </div>
  );
}


// function DelayedWords({ onDone }) {
//   const [stage, setStage] = useState("show");
//   const [revealed, setRevealed] = useState([]);
//   const [selected, setSelected] = useState([]);
//   const shown = MEMORY_IMAGES.slice(0, 4);
//   const all = ["Lemon", "Mountain", "River", "Table", "Glass", "Mirror"];
//   useEffect(() => {
//     if (stage !== "show") return;
//     let i = 0;
//     const iv = setInterval(() => {
//       setRevealed(p => [...p, shown[i]]); i++;
//       if (i >= shown.length) { clearInterval(iv); setTimeout(() => setStage("recall"), 2000); }
//     }, 600);
//     return () => clearInterval(iv);
//   }, [stage]);
//   const toggle = em => setSelected(s => s.includes(em) ? s.filter(x => x !== em) : [...s, em]);
//   const submit = () => onDone(Math.round((selected.filter(x => shown.includes(x)).length / shown.length) * 10));
//  return (
//     <div className="ai">
//       <div style={{ ...S.colourCard(G.teal), display: "flex", gap: 60, alignItems: "center" }}>
//         <div>
//           <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", opacity: 0.8, marginBottom: 16 }}>🔢 PATTERN TRAIL</div>
//           <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 24, opacity: 0.9 }}>Connect in order: <strong>{correct.join(" → ")}</strong></p>
//           <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxWidth: 280 }}>
//             {["Lemon"].map(n => {
//               const idx = path.indexOf(n);
//               return (
//                 <button key={n} onClick={() => tap(n)} style={{ width: "100%", aspectRatio: "1", background: idx !== -1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)", border: `3px solid ${idx !== -1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"}`, borderRadius: "50%", cursor: "pointer", fontSize: "1.3rem", fontWeight: 900, color: idx !== -1 ? C.teal : C.white, transition: "all 0.15s" }}>
//                   {idx !== -1 ? idx + 1 : n}
//                 </button>
//               );
//             })}
//           </div>
//         </div>
//         <div style={{ flex: 1, textAlign: "center" }}>
//           {done ? (
//             <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, padding: 32 }}>
//               <div style={{ fontSize: "4rem" }}>🎉</div>
//               <p style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: 12 }}>Well done! Computing score…</p>
//             </div>
//           ) : (
//             <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 32 }}>
//               <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>👆</div>
//               <p style={{ opacity: 0.9, fontSize: "1.05rem" }}>{path.length}/{correct.length} tapped</p>
//               <div style={{ marginTop: 16, height: 10, background: "rgba(255,255,255,0.2)", borderRadius: 5 }}>
//                 <div style={{ height: "100%", width: `${(path.length / correct.length) * 100}%`, background: "rgba(255,255,255,0.8)", borderRadius: 5, transition: "width 0.3s" }} />
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

function PatternTask({ correct,onDone }) {  
  // const correct = randomAP({num: 6, arr: [1,2,3,4,5,6]});
  const [path, setPath] = useState([]);
  const [done, setDone] = useState(false);
  const tap = n => {
    if (done || path.includes(n)) return;
    const next = [...path, n]; setPath(next);
    if (next.length === correct.length) {
      setDone(true);
      const m = next.filter((v, i) => v === correct[i]).length;
      setTimeout(() => onDone(Math.round((m / correct.length) * 10)), 800);
    }
  };
  return (
    <div className="ai">
      <div style={{ ...S.colourCard(G.teal), display: "flex", gap: 60, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", opacity: 0.8, marginBottom: 16 }}>🔢 PATTERN TRAIL</div>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 24, opacity: 0.9 }}>Connect in order: <strong>{correct.join(" → ")}</strong></p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxWidth: 280 }}>
            {[1, 2, 3, 4, 5, 6].map(n => {
              const idx = path.indexOf(n);
              return (
                <button key={n} onClick={() => tap(n)} style={{ width: "100%", aspectRatio: "1", background: idx !== -1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)", border: `3px solid ${idx !== -1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"}`, borderRadius: "50%", cursor: "pointer", fontSize: "1.3rem", fontWeight: 900, color: idx !== -1 ? C.teal : C.white, transition: "all 0.15s" }}>
                  {idx !== -1 ? n : n}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          {done ? (
            <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: "4rem" }}>🎉</div>
              <p style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: 12 }}>Well done! Computing score…</p>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>👆</div>
              <p style={{ opacity: 0.9, fontSize: "1.05rem" }}>{path.length}/{correct.length} tapped</p>
              <div style={{ marginTop: 16, height: 10, background: "rgba(255,255,255,0.2)", borderRadius: 5 }}>
                <div style={{ height: "100%", width: `${(path.length / correct.length) * 100}%`, background: "rgba(255,255,255,0.8)", borderRadius: 5, transition: "width 0.3s" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlternatingTask({ correctalt,onDone }) {
  //const correctalt =   randomAP({num: 9, arr: [1,2,3,4,5,"A","B","C","D"]});
  const [path, setPath] = useState([]);
  const [done, setDone] = useState(false);
  const tap = n => {
    if (done || path.includes(n)) return;
    const next = [...path, n]; setPath(next);
    if (next.length === correctalt.length) {
      setDone(true);
      const m = next.filter((v, i) => v === correctalt[i]).length;
      setTimeout(() => onDone(Math.round((m / correctalt.length) * 10)), 800);
    }
  };
  return (
    <div className="ai">
      <div style={{ ...S.colourCard(G.teal), display: "flex", gap: 60, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", opacity: 0.8, marginBottom: 16 }}>🔢 PATTERN TRAIL</div>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 24, opacity: 0.9 }}>Connect in order: <strong>{correctalt.join(" → ")}</strong></p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, maxWidth: 280 }}>
            {[1,"B","A",4,2,3,"D","C",5].map(n => {
              const idx = path.indexOf(n);
              return (
                <button key={n} onClick={() => tap(n)} style={{ width: "100%", aspectRatio: "1", background: idx !== -1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.2)", border: `3px solid ${idx !== -1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)"}`, borderRadius: "50%", cursor: "pointer", fontSize: "1.3rem", fontWeight: 900, color: idx !== -1 ? C.teal : C.white, transition: "all 0.15s" }}>
                  {idx !== -1 ? n : n}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          {done ? (
            <div style={{ background: "rgba(255,255,255,0.25)", borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: "4rem" }}>🎉</div>
              <p style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: 12 }}>Well done! Computing score…</p>
            </div>
          ) : (
            <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: 32 }}>
              <div style={{ fontSize: "3.5rem", marginBottom: 12 }}>👆</div>
              <p style={{ opacity: 0.9, fontSize: "1.05rem" }}>{path.length}/{correctalt.length} tapped</p>
              <div style={{ marginTop: 16, height: 10, background: "rgba(255,255,255,0.2)", borderRadius: 5 }}>
                <div style={{ height: "100%", width: `${(path.length / correctalt.length) * 100}%`, background: "rgba(255,255,255,0.8)", borderRadius: 5, transition: "width 0.3s" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScrambleTask({WORDS, onDone }) {

  // const WORDS = [{ scrambled: [..."MEMORY"].sort(()=>Math.random()-.5).join(''), answer: "MEMORY" }, { scrambled: [..."BRAIN"].sort(()=>Math.random()-.5).join(''), answer: "BRAIN" }, { scrambled:[..."COFNITIVE"].sort(()=>Math.random()-.5).join(''), answer: "COGNITIVE" }];
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [correct, setCorrect] = useState(0);
  const check = () => {
    const ok = input.trim().toUpperCase() === WORDS[idx].answer;
    const nc = ok ? correct + 1 : correct;
    if (idx < WORDS.length - 1) { setCorrect(nc); setIdx(i => i + 1); setInput(""); }
    else onDone(Math.round((nc / WORDS.length) * 10));
  };
  return (
    <div className="ai">
      <div style={{ ...S.colourCard(G.blue), display: "flex", gap: 60, alignItems: "center" }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em", opacity: 0.8, marginBottom: 16 }}>📝 WORD SCRAMBLE — {idx + 1}/{WORDS.length}</div>
          <div style={{ fontSize: "3.5rem", fontWeight: 900, letterSpacing: "0.25em", fontFamily: "'DM Mono',monospace", background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "28px 40px" }}>{WORDS[idx].scrambled}</div>
          <p style={{ marginTop: 14, opacity: 0.8, fontWeight: 600 }}>Unscramble this word!</p>
        </div>
        <div style={{ flex: 1 }}>
          <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && check()}
            placeholder="Type your answer…"
            style={{ ...S.input(), marginBottom: 16, letterSpacing: "0.15em", fontSize: "1.8rem", fontWeight: 900, textAlign: "center", fontFamily: "'DM Mono',monospace", border: "3px solid rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.9)" }} />
          <button style={{ ...S.btn("rgba(255,255,255,0.9)", C.blue), width: "100%", justifyContent: "center", padding: "18px", fontSize: "1.1rem" }} onClick={check}>Next →</button>
        </div>
      </div>
    </div>
  );
}




function CaregiverCard() {
  return (
    <div style={{ ...S.card(C.caregiverColor) }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, background: G.teal, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>📋</div>
        <span style={{ fontSize: "1.1rem", fontWeight: 700, color: C.teal }}>Caregiver Note</span>
        <Badge color={C.teal}>DEMO</Badge>
      </div>
      <textarea placeholder="Add a note here…" style={{ ...S.input(), resize: "none", height: 90 }} />
    </div>
  );
}

function FamilyView() {
  return (
    <div style={S.page}>
      <div style={{ background: G.blue, padding: "48px 48px 40px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="ai">
            <h1 style={{ ...S.h1, fontSize: "2.8rem", color: C.white, marginBottom: 6 }}>Family Dashboard 👨‍👩‍👧</h1>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)" }}>Monitor your loved one's cognitive health</p>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", height: 5 }}>
        {[G.coral, G.yellow, G.teal, G.blue, G.pink, G.green].map((g, i) => <div key={i} style={{ flex: 1, background: g }} />)}
      </div>
      <div style={{ ...S.container, padding: "40px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="ai1" style={S.card(C.blue)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: "1.15rem", fontWeight: 700, color: C.blue }}>Weekly Score Trend</span>
                <Badge color={C.green}>Stable ✓</Badge>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={MOCK_SCORES}>
                  <XAxis dataKey="day" stroke="#D1D5DB" tick={{ fontSize: 13, fill: C.muted, fontWeight: 600 }} />
                  <YAxis domain={[50, 100]} stroke="#D1D5DB" tick={{ fontSize: 13, fill: C.muted, fontWeight: 600 }} />
                  <Tooltip contentStyle={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontWeight: 600 }} />
                  <ReferenceLine y={BASELINE} stroke={C.orange} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="score" stroke={C.blue} strokeWidth={3} dot={{ fill: C.blue, r: 6, stroke: C.white, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="ai2" style={S.card(C.sky)}>
              <label style={{ ...S.label, color: C.sky }}>Caregiver Notes</label>
              <p style={{ ...S.body, fontStyle: "italic", color: C.muted, fontSize: "1.05rem" }}>
                "Patient completed all tasks today. Memory score slightly improved. Sleep noted as 7/10. Consider adding omega-3 rich meals this week."
              </p>
            </div>
          </div>
          <div className="ai2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Week Avg Score", value: "73", gradient: G.blue, icon: "📊" },
              { label: "Tasks Done", value: "5/7", gradient: G.green, icon: "✅" },
              { label: "Sleep Avg", value: "7.2", gradient: G.teal, icon: "😴" },
              { label: "Mood Trend", value: "↗ Up", gradient: G.pink, icon: "😊" },
            ].map(s => (
              <div key={s.label} style={{ ...S.colourCard(s.gradient), textAlign: "center", padding: "22px 20px" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "'DM Mono',monospace" }}>{s.value}</div>
                <div style={{ fontSize: "0.88rem", opacity: 0.85, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIET
// ═══════════════════════════════════════════════════════════════════════════════
function DietScreen({ role, meals, setMeals }) {
  const [mealInput, setMealInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [habits, setHabits] = useState({ water: false, exercise: false, meditation: false, vitamins: false });
  const addMeal = () => {
    if (!mealInput.trim()) return;
    setMeals(m => [...m, { text: mealInput.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    setMealInput("");
  };
  const brainCount = meals.filter(m => BRAIN_FOODS.some(f => m.text.toLowerCase().includes(f.name.toLowerCase().split(" ")[0]))).length;
  const filters = ["all", "breakfast", "lunch", "dinner","avoid"];
  const filtered = filter === "all"
  ? BRAIN_FOODS.filter(f => f.cat !== "avoid")
  : BRAIN_FOODS.filter(f => f.cat === filter);
  const foodGradients = [G.coral, G.teal, G.blue, G.yellow, G.pink, G.green, G.coral, G.teal];
  return (
    <div style={S.page}>
      <div style={{ background: G.green, padding: "48px 48px 40px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="ai">
            <h1 style={{ ...S.h1, fontSize: "2.8rem", color: C.white, marginBottom: 6 }}>Diet & Wellness 🥗</h1>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.85)" }}>Brain-healthy nutrition and daily habits</p>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", height: 5 }}>
        {[G.coral, G.yellow, G.teal, G.blue, G.pink, G.green].map((g, i) => <div key={i} style={{ flex: 1, background: g }} />)}
      </div>
      <div style={{ ...S.container, padding: "40px 48px 80px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="ai1" style={S.card(C.green)}>
              <label style={{ ...S.label, color: C.green }}>Log a Meal</label>
              <div style={{ display: "flex", gap: 12 }}>
                <input value={mealInput} onChange={e => setMealInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addMeal()}
                  placeholder="e.g. Grilled salmon with spinach" style={{ ...S.input(), flex: 1 }} />
                <button onClick={addMeal} style={{ ...S.btn(G.green), padding: "16px 22px", fontSize: "1.4rem", borderRadius: 12, flexShrink: 0 }}>+</button>
              </div>
              {meals.length > 0 && (
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                  {meals.slice(-4).map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", background: "#F9FAFB", border: `2px solid ${C.border}`, borderRadius: 12 }}>
                      <span style={{ fontSize: "1rem", fontWeight: 600 }}>🍽 {m.text}</span>
                      <span style={{ fontSize: "0.9rem", color: C.muted, fontFamily: "'DM Mono',monospace" }}>{m.time}</span>
                    </div>
                  ))}
                </div>
              )}
              {brainCount > 0 && <div style={{ ...S.success, marginTop: 16 }}>🧠 {brainCount} brain-healthy meal{brainCount > 1 ? "s" : ""} logged!</div>}
            </div>
            <div className="ai2" style={S.card(C.teal)}>
              <label style={{ ...S.label, color: C.teal }}>Log your daily activities</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
                {[
                  { key: "water", icon: "💧", label: "Hydration", gradient: G.teal },
                  { key: "exercise", icon: "🏃", label: "30 min Walk", gradient: G.coral },
                  { key: "meditation", icon: "😴", label: "Sleep 7-8 hours", gradient: G.blue },
                  { key: "vitamins", icon: "💊", label: "Medicine", gradient: G.pink },
                ].map(h => (
                  <button key={h.key} onClick={() => setHabits(s => ({ ...s, [h.key]: !s[h.key] }))} style={{
                    background: habits[h.key] ? h.gradient : "#F9FAFB",
                    border: `2px solid ${habits[h.key] ? "transparent" : C.border}`,
                    borderRadius: 16, padding: "20px 16px", cursor: "pointer", textAlign: "left",
                    fontFamily: "'Poppins',sans-serif",
                    color: habits[h.key] ? C.white : C.text,
                    boxShadow: habits[h.key] ? "0 4px 16px rgba(0,0,0,0.12)" : "none",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ fontSize: "2rem" }}>{h.icon}</div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: 8 }}>{h.label}</div>
                    {habits[h.key] && <div style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: 4, opacity: 0.9 }}>✓ Done!</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="ai2" style={S.card(C.orange)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <label style={{ ...S.label, color: C.orange, marginBottom: 0 }}>Brain Foods</label>
              <GBadge gradient={G.yellow}>Dietitian Picks</GBadge>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {filters.map(f => (
                <Chip key={f}
                  label={f === "bvitamin" ? "B Vitamin" : f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  active={filter === f} onClick={() => setFilter(f)}
                  color={C.orange} gradient={G.yellow}
                />
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {filtered.map((food, i) => (
                  <div key={`${food.cat}-${food.benefit}`} style={{ background: C.white, border: `2px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", overflow: "hidden", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: foodGradients[i % foodGradients.length] }} />
                  <span style={{ fontSize: "2rem" }}>{food.icon}</span>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: 10 }}>{food.name}</div>
                  <div style={{ fontSize: "0.88rem", color: C.muted, fontWeight: 600, marginTop: 3 }}>{food.benefit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUSIC
// ═══════════════════════════════════════════════════════════════════════════════
function MusicScreen({ role }) {
  const [country, setCountry] = useState("Ireland");
  const [language, setLanguage] = useState("English");
  const [decade, setDecade] = useState("1980s");
  const [genre, setGenre] = useState("Pop Classics");
  const [playing, setPlaying] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [idx, setIdx] = useState(0);
  const playlist = PLAYLISTS[decade] || PLAYLISTS["1980s"];
  const countries = ["Ireland", "UK", "USA", "France", "Italy", "Spain"];
  const languages = ["English", "Irish (Gaeilge)", "French", "Italian", "Spanish"];
  const songGrads = [G.coral, G.blue, G.teal, G.pink];
  const play = s => { setPlaying(s); setIdx(playlist.indexOf(s)); setShowPlayer(true); };
  const next = () => { const ni = (idx + 1) % playlist.length; setIdx(ni); setPlaying(playlist[ni]); };
  const prev = () => { const ni = (idx - 1 + playlist.length) % playlist.length; setIdx(ni); setPlaying(playlist[ni]); };
  return (
    <div style={S.page}>
      <div style={{ background: G.pink, padding: "48px 48px 40px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="ai">
            <h1 style={{ ...S.h1, fontSize: "2.8rem", color: C.white, marginBottom: 6 }}>🎵 Music Therapy</h1>
            <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.85)" }}>Memory-triggering music for mood and cognitive support</p>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", height: 5 }}>
        {[G.coral, G.yellow, G.teal, G.blue, G.pink, G.green].map((g, i) => <div key={i} style={{ flex: 1, background: g }} />)}
      </div>
      <div style={{ ...S.container, padding: "40px 48px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="ai1" style={S.card(C.pink)}>
              <label style={{ ...S.label, color: C.pink }}>Country</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {countries.map(c => <Chip key={c} label={c} active={country === c} onClick={() => setCountry(c)} color={C.pink} gradient={G.pink} />)}
              </div>
            </div>
            <div className="ai1" style={S.card(C.pink)}>
              <label style={{ ...S.label, color: C.pink }}>Language</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {languages.map(l => <Chip key={l} label={l} active={language === l} onClick={() => setLanguage(l)} color={C.pink} gradient={G.pink} />)}
              </div>
            </div>
            {(role === "caregiver" || role 
            === "family") && (
              <div className="ai2" style={S.card(C.teal)}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16 }}>
                  <label style={{ ...S.label, color: C.teal, marginBottom: 0 }}>Decade & Genre</label>
                  <Badge color={C.teal}>Caregiver</Badge>
                </div>
                <label style={{ ...S.label }}>Decade</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  {DECADES.map(d => <Chip key={d} label={d} active={decade === d} onClick={() => setDecade(d)} color={C.teal} gradient={G.teal} />)}
                </div>
                <label style={S.label}>Genre</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {GENRES.map(g => <Chip key={g} label={g} active={genre === g} onClick={() => setGenre(g)} color={C.sky} gradient={G.teal} />)}
                </div>
              </div>
            )}
          </div>
          <div className="ai2" style={S.card(C.violet)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <label style={{ ...S.label, color: C.violet, marginBottom: 4 }}>Now Playing Playlist</label>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: C.text }}>{decade} {genre}</div>
              </div>
              <GBadge gradient={G.pink}>{country}</GBadge>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {playlist.map((song, i) => {
                const isPlaying = playing === song;
                return (
                  <button key={i} onClick={() => play(song)} style={{
                    display: "flex", alignItems: "center", gap: 18,
                    background: isPlaying ? songGrads[i % 4] : "#F9FAFB",
                    border: `2px solid ${isPlaying ? "transparent" : C.border}`,
                    borderRadius: 16, padding: "18px 22px", cursor: "pointer",
                    fontFamily: "'Poppins',sans-serif",
                    boxShadow: isPlaying ? "0 6px 20px rgba(0,0,0,0.15)" : "0 2px 6px rgba(0,0,0,0.04)",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ width: 46, height: 46, borderRadius: "50%", background: isPlaying ? "rgba(255,255,255,0.25)" : C.white, border: `2px solid ${isPlaying ? "rgba(255,255,255,0.5)" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: isPlaying ? C.white : C.muted, fontWeight: 800, animation: isPlaying ? "pulse 1.5s infinite" : "none", flexShrink: 0 }}>
                      {isPlaying ? "♪" : i + 1}
                    </div>
                    <span style={{ fontSize: "1.05rem", color: isPlaying ? C.white : C.text, fontWeight: isPlaying ? 700 : 500 }}>{song}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <a href="https://open.spotify.com/playlist/37i9dQZF1DXb57FjYWz00c" target="_blank" rel="noreferrer" style={{ ...S.btn("linear-gradient(135deg,#1DB954,#1ED760)"), flex: 1, justifyContent: "center", textDecoration: "none", padding: "16px", fontSize: "1rem" }}>♫ Open in Spotify</a>
              <a href="https://music.youtube.com/playlist?list=RDCLAK5uy_k1Wu8QbZASiGVqr1wmie9NIYo38aBqscQ" target="_blank" rel="noreferrer" style={{ ...S.btn(G.coral), flex: 1, justifyContent: "center", textDecoration: "none", padding: "16px", fontSize: "1rem" }}>♫ Youtube Music</a>
            </div>
             <>
        <br></br>
        <br></br>
        <p style={{ ...S.muted, fontSize: "1.1rem" }}>🏥 Alzheimer's Support Lines</p>
        <p style={{ ...S.muted, fontSize: "1.1rem" }}>📍 Memory Care Ireland — 01 800 1234</p>
        <p style={{ ...S.muted, fontSize: "1.1rem" }}>📍 National Dementia Support — 1800 341 341</p>
        <p style={{ ...S.muted, fontSize: "1.1rem" }}>📍 Alzheimer Society of Ireland — 01 207 3800</p>
        <p style={{ ...S.muted, fontSize: "1.1rem" }}>📍 Dementia Ireland Helpline — 1800 100 500</p></>
          </div>
        </div>
        
       
      </div>
      
      {showPlayer && playing && (
        <div style={{ position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)", background: C.white, border: `2px solid ${C.border}`, borderRadius: 20, padding: "16px 24px", display: "flex", alignItems: "center", gap: 18, boxShadow: "0 16px 48px rgba(0,0,0,0.15)", zIndex: 150, minWidth: 500 }}>
          <div style={{ width: 50, height: 50, background: G.pink, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", animation: "pulse 1.5s infinite", flexShrink: 0 }}>♪</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.text }}>{playing}</div>
            <div style={{ fontSize: "0.85rem", color: C.pink, fontWeight: 700, marginTop: 2 }}>Now Playing</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {[["⏮", prev], ["⏭", next], ["✕", () => { setShowPlayer(false); setPlaying(null); }]].map(([icon, fn], i) => (
              <button key={i} onClick={fn} style={{ background: "#F9FAFB", border: `2px solid ${C.border}`, borderRadius: 10, width: 44, height: 44, cursor: "pointer", fontSize: "1.1rem", fontWeight: 700, color: C.text }}>{icon}</button>
            ))}
          </div>
          
        </div>
      )}
    </div>
  );
}