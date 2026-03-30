import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const t = {
  navy: "#0B1628",
  navyLight: "#0F1D32",
  navyMid: "#132440",
  teal: "#0D2E3F",
  tealGlow: "#1A4D5E",
  gold: "#C9A96E",
  goldLight: "#D4B87A",
  goldDim: "#C9A96E22",
  goldGlow: "0 0 40px #C9A96E22",
  cream: "#F0EDE5",
  creamDim: "#B8B0A0",
  muted: "#5A6A7A",
  border: "#1C2D42",
  borderGold: "#C9A96E33",
  danger: "#C05050",
  dangerDim: "#C0505022",
  success: "#5BA88C",
};

const api = async (path, options = {}) => {
  const token = localStorage.getItem("atlantis_token");
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Error");
  return data;
};

const S = { WELCOME: 0, PHONE: 1, OTP: 2, PROFILE: 3, HOME: 4, APPLY: 5, REPAY: 6, HISTORY: 7 };

// SVG topographic pattern for backgrounds
const TopoPattern = ({ opacity = 0.06, color = t.gold }) => (
  <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity, pointerEvents: "none" }} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="topo" x="0" y="0" width="400" height="400" patternUnits="userSpaceOnUse">
        {[40, 80, 120, 160, 200, 240, 280, 320, 360].map((r, i) => (
          <ellipse key={i} cx={200 + Math.sin(i * 0.7) * 40} cy={200 + Math.cos(i * 0.5) * 30}
            rx={r} ry={r * 0.7 + Math.sin(i) * 20} fill="none" stroke={color} strokeWidth="0.8" />
        ))}
      </pattern>
    </defs>
    <rect width="400" height="800" fill="url(#topo)" />
  </svg>
);

// Atlantis logo mark
const LogoMark = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" stroke={t.gold} strokeWidth="1.5" />
    <path d="M24 8L34 36H28L24 24L20 36H14L24 8Z" stroke={t.gold} strokeWidth="1.5" fill="none" />
    <path d="M18 28H30" stroke={t.gold} strokeWidth="1" />
  </svg>
);

export default function App() {
  const [screen, setScreen] = useState(S.WELCOME);
  const [phone, setPhone] = useState("+521");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [currentLoan, setCurrentLoan] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loanAmount, setLoanAmount] = useState("175");
  const [depositAmount, setDepositAmount] = useState("");
  const [devCode, setDevCode] = useState("");

  const clear = () => { setError(""); setSuccess(""); };

  const loadDash = useCallback(async () => {
    try {
      const [bal, loan, txs, hist] = await Promise.all([
        api("/api/wallet/balance"), api("/api/credit/current"),
        api("/api/wallet/transactions"), api("/api/credit/history"),
      ]);
      setBalance(bal);
      setCurrentLoan(loan.loan !== undefined ? loan.loan : loan);
      setTransactions(txs);
      setLoanHistory(hist);
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("expired")) {
        localStorage.removeItem("atlantis_token");
        setScreen(S.WELCOME);
      }
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("atlantis_token")) { setScreen(S.HOME); loadDash(); }
  }, [loadDash]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(""); setSuccess(""); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const sendOtp = async () => {
    clear(); setLoading(true);
    try {
      const res = await api("/api/auth/otp/send", { method: "POST", body: JSON.stringify({ phone }) });
      if (res.devCode) { setDevCode(res.devCode); setOtp(res.devCode); }
      setSuccess("Código enviado"); setScreen(S.OTP);
    }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const verifyOtp = async () => {
    clear(); setLoading(true);
    try {
      const res = await api("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code: otp }) });
      localStorage.setItem("atlantis_token", res.accessToken); setUser(res.user);
      if (res.user.isNewUser || !res.user.name) { setScreen(S.PROFILE); } else { setScreen(S.HOME); loadDash(); }
    } catch (e) { setError(e.message); } setLoading(false);
  };
  const updateProfile = async () => {
    clear(); setLoading(true);
    try { const res = await api("/api/auth/profile", { method: "PUT", body: JSON.stringify({ name, acceptTerms: true }) }); setUser(res); setScreen(S.HOME); loadDash(); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const applyCredit = async () => {
    clear(); setLoading(true);
    try { const res = await api("/api/credit/apply", { method: "POST", body: JSON.stringify({ amountMxn: parseFloat(loanAmount) }) }); setSuccess(`Crédito de $${res.amountMxn} MXN aprobado`); setScreen(S.HOME); loadDash(); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const repayCredit = async () => {
    clear(); setLoading(true);
    try { await api("/api/credit/repay", { method: "POST", body: "{}" }); setSuccess("Crédito repagado exitosamente"); setScreen(S.HOME); loadDash(); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const deposit = async () => {
    clear(); setLoading(true);
    try { await api("/api/wallet/deposit", { method: "POST", body: JSON.stringify({ amountMxn: parseFloat(depositAmount) }) }); setSuccess(`Depósito de $${depositAmount} MXN acreditado`); setDepositAmount(""); loadDash(); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const logout = () => { localStorage.removeItem("atlantis_token"); setUser(null); setBalance(null); setCurrentLoan(null); setScreen(S.WELCOME); };

  // ─── Styles ───
  const shell = { minHeight: "100vh", background: t.navy, color: t.cream, fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden" };
  const page = { padding: "0 28px 48px", position: "relative", zIndex: 1 };
  const btn = { width: "100%", padding: "17px", border: "none", borderRadius: 8, background: `linear-gradient(135deg, ${t.gold}, ${t.goldLight})`, color: t.navy, fontWeight: 700, fontSize: 16, cursor: "pointer", letterSpacing: "0.06em", fontFamily: "'EB Garamond', serif", transition: "all 0.3s", boxShadow: t.goldGlow };
  const btnOutline = { ...btn, background: "transparent", border: `1px solid ${t.gold}`, color: t.gold, boxShadow: "none" };
  const inp = { width: "100%", padding: "16px 18px", border: `1px solid ${t.border}`, borderRadius: 8, background: t.navyLight, color: t.cream, fontSize: 18, outline: "none", boxSizing: "border-box", fontFamily: "'EB Garamond', serif", transition: "border-color 0.3s" };
  const card = { background: `linear-gradient(160deg, ${t.navyLight}, ${t.navyMid})`, borderRadius: 16, border: `1px solid ${t.border}`, padding: 24 };
  const tag = (color) => ({ display: "inline-block", padding: "3px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", background: `${color}18`, color, border: `1px solid ${color}33` });
  const divider = { height: 1, background: `linear-gradient(90deg, transparent, ${t.border}, transparent)`, margin: "16px 0" };
  const label = { color: t.muted, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", marginBottom: 8 };

  const Toast = ({ msg, type }) => msg ? (
    <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", padding: "14px 28px", borderRadius: 8, zIndex: 100, maxWidth: 380, background: type === "error" ? t.danger : t.success, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: "system-ui, sans-serif", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", animation: "fadeSlide 0.3s ease" }}>{msg}</div>
  ) : null;

  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@300;400;600;700&display=swap');
    @keyframes fadeSlide { from { opacity:0; transform:translate(-50%,-16px); } to { opacity:1; transform:translate(-50%,0); } }
    @keyframes breathe { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
    @keyframes floatUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    input:focus { border-color: ${t.gold} !important; }
    button:active { transform: scale(0.98); }
  `;

  // ═══════════ WELCOME ═══════════
  if (screen === S.WELCOME) {
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.05} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 28px", textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: 40, animation: "breathe 4s ease infinite" }}>
            <LogoMark size={72} />
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 400, letterSpacing: "0.18em", marginBottom: 16, color: t.cream }}>
            ATLANTIS
          </h1>
          <div style={{ width: 48, height: 1, background: t.gold, marginBottom: 20 }} />
          <p style={{ color: t.creamDim, fontSize: 18, marginBottom: 6, fontWeight: 400, fontStyle: "italic" }}>
            La civilización financiera
          </p>
          <p style={{ color: t.muted, fontSize: 13, marginBottom: 56, fontFamily: "system-ui, sans-serif", letterSpacing: "0.04em" }}>
            Crédito instantáneo · $10–$50 USD · 24-48h
          </p>
          <button style={btn} onClick={() => setScreen(S.PHONE)}>
            Comenzar
          </button>
          <p style={{ color: t.muted, fontSize: 11, marginTop: 40, fontFamily: "system-ui, sans-serif", letterSpacing: "0.06em" }}>
            ATLANTIS 4.3 · DEMO
          </p>
        </div>
      </div>
    );
  }

  // ═══════════ PHONE ═══════════
  if (screen === S.PHONE) {
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.04} />
        <Toast msg={error} type="error" />
        <div style={page}>
          <div style={{ paddingTop: 72, marginBottom: 48 }}>
            <p style={label}>Paso 1 de 3</p>
            <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 10 }}>Tu número de teléfono</h2>
            <p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic" }}>Enviaremos un código de verificación por SMS</p>
          </div>
          <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 15 5999 0001" />
          <p style={{ color: t.muted, fontSize: 12, marginTop: 10, marginBottom: 36, fontFamily: "system-ui, sans-serif" }}>
            Formato internacional: +52 seguido de 10 dígitos
          </p>
          <button style={{ ...btn, opacity: loading ? 0.6 : 1 }} onClick={sendOtp} disabled={loading}>
            {loading ? "Enviando..." : "Enviar código"}
          </button>
          <button style={{ ...btnOutline, marginTop: 14 }} onClick={() => setScreen(S.WELCOME)}>Volver</button>
        </div>
      </div>
    );
  }

  // ═══════════ OTP ═══════════
  if (screen === S.OTP) {
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.04} />
        <Toast msg={error} type="error" />
        <Toast msg={success} type="success" />
        <div style={page}>
          <div style={{ paddingTop: 72, marginBottom: 48 }}>
            <p style={label}>Paso 2 de 3</p>
            <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 10 }}>Ingresá el código</h2>
            <p style={{ color: t.creamDim, fontSize: 16 }}>
              Enviado a <span style={{ color: t.gold }}>{phone}</span>
            </p>
            {devCode && (
              <div style={{ marginTop: 16, padding: "14px 16px", background: `${t.gold}0F`, border: `1px solid ${t.gold}44`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ color: t.goldLight, fontSize: 12, fontFamily: "system-ui, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Dev · OTP</p>
                <p style={{ color: t.gold, fontSize: 28, fontFamily: "monospace", fontWeight: 700, letterSpacing: 6 }}>{devCode}</p>
              </div>
            )}
          </div>
          <input style={{ ...inp, textAlign: "center", fontSize: 36, letterSpacing: 14 }}
            type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="· · · · · ·" />
          <div style={{ height: 36 }} />
          <button style={{ ...btn, opacity: loading || otp.length < 6 ? 0.6 : 1 }} onClick={verifyOtp} disabled={loading || otp.length < 6}>
            {loading ? "Verificando..." : "Verificar"}
          </button>
          <button style={{ ...btnOutline, marginTop: 14 }} onClick={() => { setOtp(""); setScreen(S.PHONE); }}>Cambiar número</button>
        </div>
      </div>
    );
  }

  // ═══════════ PROFILE ═══════════
  if (screen === S.PROFILE) {
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.04} />
        <Toast msg={error} type="error" />
        <div style={page}>
          <div style={{ paddingTop: 72, marginBottom: 48 }}>
            <p style={label}>Paso 3 de 3</p>
            <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 10 }}>¿Cómo te llamás?</h2>
            <p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic" }}>Tu nombre real para verificar tu identidad</p>
          </div>
          <input style={inp} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" />
          <p style={{ color: t.muted, fontSize: 12, marginTop: 14, marginBottom: 40, fontFamily: "system-ui, sans-serif", lineHeight: 1.7 }}>
            Al continuar, aceptás los Términos y Condiciones y la Política de Privacidad de Atlantis.
          </p>
          <button style={{ ...btn, opacity: loading || name.length < 2 ? 0.6 : 1 }} onClick={updateProfile} disabled={loading || name.length < 2}>
            {loading ? "Guardando..." : "Continuar"}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ HOME ═══════════
  if (screen === S.HOME) {
    const hasLoan = currentLoan && currentLoan.status === "DISBURSED";
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.03} />
        <Toast msg={error} type="error" />
        <Toast msg={success} type="success" />
        <div style={page}>
          {/* Header */}
          <div style={{ paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <LogoMark size={32} />
              <div>
                <p style={{ color: t.muted, fontSize: 11, fontFamily: "system-ui, sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>Bienvenido</p>
                <p style={{ fontSize: 20, fontWeight: 600 }}>{user?.name || "Usuario"}</p>
              </div>
            </div>
            <button onClick={logout} style={{ background: "transparent", border: `1px solid ${t.border}`, color: t.muted, padding: "7px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontFamily: "system-ui, sans-serif", letterSpacing: "0.06em" }}>SALIR</button>
          </div>

          {/* Balance */}
          <div style={{ ...card, marginBottom: 20, position: "relative", overflow: "hidden", border: `1px solid ${t.borderGold}` }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: `radial-gradient(circle, ${t.goldDim}, transparent)`, pointerEvents: "none" }} />
            <p style={{ ...label, marginBottom: 6 }}>Balance disponible</p>
            <p style={{ fontSize: 48, fontWeight: 300, color: t.gold, letterSpacing: "-0.02em", lineHeight: 1 }}>
              ${balance?.balanceMxn?.toFixed(2) || "0.00"}
            </p>
            <p style={{ color: t.muted, fontSize: 13, marginTop: 8, fontFamily: "system-ui, sans-serif" }}>
              MXN · {balance?.balanceUsdc?.toFixed(2) || "0.00"} USDC
            </p>
          </div>

          {/* Active Loan */}
          {hasLoan && (
            <div style={{ ...card, marginBottom: 20, border: `1px solid ${t.gold}33` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 17, fontWeight: 600 }}>Crédito activo</p>
                <span style={tag(t.gold)}>Activo</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: t.creamDim, fontSize: 15 }}>Capital</span>
                <span style={{ fontWeight: 600 }}>${currentLoan.amountMxn} MXN</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: t.creamDim, fontSize: 15 }}>Total a pagar</span>
                <span style={{ fontWeight: 600, color: t.gold }}>${currentLoan.totalRepaymentMxn} MXN</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <span style={{ color: t.creamDim, fontSize: 15 }}>Vencimiento</span>
                <span style={{ fontSize: 14, fontFamily: "system-ui, sans-serif" }}>
                  {new Date(currentLoan.dueAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <button style={btn} onClick={() => setScreen(S.REPAY)}>Pagar crédito</button>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
            <button style={{ ...card, cursor: hasLoan ? "default" : "pointer", textAlign: "center", padding: 24, opacity: hasLoan ? 0.5 : 1, transition: "all 0.3s" }}
              onClick={() => !hasLoan && setScreen(S.APPLY)} disabled={hasLoan}>
              <div style={{ fontSize: 14, color: t.gold, marginBottom: 10, fontFamily: "system-ui, sans-serif", letterSpacing: "0.08em" }}>✦</div>
              <p style={{ fontWeight: 600, fontSize: 16 }}>{hasLoan ? "Crédito activo" : "Pedir crédito"}</p>
              <p style={{ color: t.muted, fontSize: 12, marginTop: 4, fontFamily: "system-ui, sans-serif" }}>Atlantis Daily</p>
            </button>
            <button style={{ ...card, cursor: "pointer", textAlign: "center", padding: 24, transition: "all 0.3s" }}
              onClick={() => setScreen(S.HISTORY)}>
              <div style={{ fontSize: 14, color: t.gold, marginBottom: 10, fontFamily: "system-ui, sans-serif", letterSpacing: "0.08em" }}>✦</div>
              <p style={{ fontWeight: 600, fontSize: 16 }}>Historial</p>
              <p style={{ color: t.muted, fontSize: 12, marginTop: 4, fontFamily: "system-ui, sans-serif" }}>Créditos</p>
            </button>
          </div>

          {/* Deposit */}
          <div style={{ ...card, marginBottom: 24 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: t.creamDim }}>Simular depósito en efectivo</p>
            <div style={{ display: "flex", gap: 10 }}>
              <input style={{ ...inp, flex: 1, fontSize: 16 }} type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Monto MXN" />
              <button style={{ padding: "0 22px", border: "none", borderRadius: 8, background: t.gold, color: t.navy, fontWeight: 700, cursor: "pointer", fontSize: 13, fontFamily: "system-ui, sans-serif", letterSpacing: "0.04em", whiteSpace: "nowrap" }}
                onClick={deposit} disabled={!depositAmount || loading}>
                Depositar
              </button>
            </div>
          </div>

          {/* Transactions */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ ...label, marginBottom: 16 }}>Movimientos recientes</p>
            {transactions.length === 0 ? (
              <p style={{ color: t.muted, fontSize: 15, fontStyle: "italic" }}>Sin movimientos aún</p>
            ) : transactions.slice(0, 6).map((tx, i) => (
              <div key={tx.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: `1px solid ${t.border}` }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 500 }}>{tx.description}</p>
                  <p style={{ color: t.muted, fontSize: 12, marginTop: 3, fontFamily: "system-ui, sans-serif" }}>
                    {new Date(tx.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <p style={{ fontWeight: 600, fontSize: 16, color: tx.type === "LOAN_REPAYMENT" || tx.type === "WITHDRAWAL" || tx.type === "FEE" ? t.danger : t.success }}>
                  {tx.type === "LOAN_REPAYMENT" || tx.type === "WITHDRAWAL" || tx.type === "FEE" ? "−" : "+"}${tx.amountMxn?.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════ APPLY ═══════════
  if (screen === S.APPLY) {
    const fee = (parseFloat(loanAmount || 0) * 0.1).toFixed(2);
    const total = (parseFloat(loanAmount || 0) * 1.1).toFixed(2);
    const usd = (parseFloat(loanAmount || 0) / 17.5).toFixed(2);
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.03} />
        <Toast msg={error} type="error" />
        <div style={page}>
          <div style={{ paddingTop: 44 }}>
            <button onClick={() => { clear(); setScreen(S.HOME); }} style={{ background: "transparent", border: "none", color: t.creamDim, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 28, fontFamily: "'EB Garamond', serif" }}>← Volver</button>
            <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Solicitar crédito</h2>
            <p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic", marginBottom: 36 }}>Recibí el dinero al instante en tu wallet</p>
          </div>

          <p style={label}>Monto en pesos mexicanos</p>
          <input style={{ ...inp, fontSize: 32, textAlign: "center", marginBottom: 28 }}
            type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />

          <div style={{ ...card, marginBottom: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: t.creamDim, fontSize: 15 }}>Equivalente USD</span>
              <span>${usd}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: t.creamDim, fontSize: 15 }}>Comisión (10%)</span>
              <span>${fee} MXN</span>
            </div>
            <div style={divider} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Total a devolver</span>
              <span style={{ fontWeight: 700, fontSize: 22, color: t.gold }}>${total} MXN</span>
            </div>
            <p style={{ color: t.muted, fontSize: 12, marginTop: 14, fontFamily: "system-ui, sans-serif" }}>
              Plazo: 48 horas · TC: $17.50 MXN/USD
            </p>
          </div>

          <button style={{ ...btn, opacity: loading ? 0.6 : 1 }} onClick={applyCredit} disabled={loading}>
            {loading ? "Procesando..." : `Solicitar $${loanAmount} MXN`}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ REPAY ═══════════
  if (screen === S.REPAY && currentLoan) {
    const canRepay = balance && balance.balanceMxn >= currentLoan.totalRepaymentMxn;
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.03} />
        <Toast msg={error} type="error" />
        <div style={page}>
          <div style={{ paddingTop: 44 }}>
            <button onClick={() => { clear(); setScreen(S.HOME); }} style={{ background: "transparent", border: "none", color: t.creamDim, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 28, fontFamily: "'EB Garamond', serif" }}>← Volver</button>
            <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 36 }}>Pagar crédito</h2>
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: t.creamDim }}>Capital</span><span>${currentLoan.amountMxn} MXN</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: t.creamDim }}>Comisión</span><span>${currentLoan.feeMxn} MXN</span>
            </div>
            <div style={divider} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: 24, color: t.gold }}>${currentLoan.totalRepaymentMxn} MXN</span>
            </div>
          </div>

          <div style={{ ...card, marginBottom: 36, border: `1px solid ${canRepay ? t.success : t.danger}44` }}>
            <p style={{ ...label, marginBottom: 4 }}>Tu balance actual</p>
            <p style={{ fontSize: 28, fontWeight: 400, color: canRepay ? t.success : t.danger }}>
              ${balance?.balanceMxn?.toFixed(2)} MXN
            </p>
            {!canRepay && (
              <p style={{ color: t.danger, fontSize: 13, marginTop: 10, fontFamily: "system-ui, sans-serif" }}>
                Insuficiente. Faltan ${(currentLoan.totalRepaymentMxn - (balance?.balanceMxn || 0)).toFixed(2)} MXN.
              </p>
            )}
          </div>

          <button style={{ ...btn, opacity: !canRepay || loading ? 0.5 : 1, background: canRepay ? btn.background : t.danger }}
            onClick={repayCredit} disabled={!canRepay || loading}>
            {loading ? "Procesando..." : `Pagar $${currentLoan.totalRepaymentMxn} MXN`}
          </button>
        </div>
      </div>
    );
  }

  // ═══════════ HISTORY ═══════════
  if (screen === S.HISTORY) {
    return (
      <div style={shell}>
        <style>{globalStyles}</style>
        <TopoPattern opacity={0.03} />
        <div style={page}>
          <div style={{ paddingTop: 44 }}>
            <button onClick={() => setScreen(S.HOME)} style={{ background: "transparent", border: "none", color: t.creamDim, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 28, fontFamily: "'EB Garamond', serif" }}>← Volver</button>
            <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 32 }}>Historial de créditos</h2>
          </div>
          {loanHistory.length === 0 ? (
            <p style={{ color: t.muted, fontSize: 16, fontStyle: "italic" }}>Aún no tenés créditos</p>
          ) : loanHistory.map((loan, i) => (
            <div key={loan.id || i} style={{ ...card, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>${loan.amountMxn} MXN</span>
                <span style={tag(
                  loan.status === "REPAID" ? t.success : loan.status === "DISBURSED" ? t.gold : loan.status === "DEFAULTED" ? t.danger : t.muted
                )}>{loan.status === "REPAID" ? "Pagado" : loan.status === "DISBURSED" ? "Activo" : loan.status === "DEFAULTED" ? "Mora" : loan.status}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: t.creamDim }}>
                <span>Total: ${loan.totalRepaymentMxn} MXN</span>
                <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 12 }}>
                  {new Date(loan.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
