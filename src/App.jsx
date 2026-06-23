import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const t = {
  navy: "#0B1628", navyLight: "#0F1D32", navyMid: "#132440",
  teal: "#0D2E3F", tealGlow: "#1A4D5E",
  gold: "#C9A96E", goldLight: "#D4B87A", goldDim: "#C9A96E22", goldGlow: "0 0 40px #C9A96E22",
  cream: "#F0EDE5", creamDim: "#B8B0A0", muted: "#5A6A7A",
  border: "#1C2D42", borderGold: "#C9A96E33",
  danger: "#C05050", dangerDim: "#C0505022", success: "#5BA88C",
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

const S = {
  WELCOME: 0, PHONE: 1, OTP: 2, PROFILE: 3, HOME: 4,
  APPLY: 5, REPAY: 6, HISTORY: 7, PAY: 8, SEND: 9, YIELD: 10, DEPOSIT: 11,
  ROLE: 12, MERCH_ONBOARD: 13, MERCH_DASH: 14,
};

const fmt = (n) => Number(n ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const DEBIT = new Set(["LOAN_REPAYMENT", "WITHDRAWAL", "FEE", "P2P_SENT", "MERCHANT_PAYMENT"]);

// ─── Module-level styles (depend only on `t`) ───
const shell = { minHeight: "100vh", background: t.navy, color: t.cream, fontFamily: "'EB Garamond', 'Cormorant Garamond', Georgia, serif", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden" };
const page = { padding: "0 28px 56px", position: "relative", zIndex: 1 };
const btn = { width: "100%", padding: "17px", border: "none", borderRadius: 8, background: `linear-gradient(135deg, ${t.gold}, ${t.goldLight})`, color: t.navy, fontWeight: 700, fontSize: 16, cursor: "pointer", letterSpacing: "0.06em", fontFamily: "'EB Garamond', serif", transition: "all 0.3s", boxShadow: t.goldGlow };
const btnOutline = { ...btn, background: "transparent", border: `1px solid ${t.gold}`, color: t.gold, boxShadow: "none" };
const inp = { width: "100%", padding: "16px 18px", border: `1px solid ${t.border}`, borderRadius: 8, background: t.navyLight, color: t.cream, fontSize: 18, outline: "none", boxSizing: "border-box", fontFamily: "'EB Garamond', serif", transition: "border-color 0.3s" };
const card = { background: `linear-gradient(160deg, ${t.navyLight}, ${t.navyMid})`, borderRadius: 16, border: `1px solid ${t.border}`, padding: 24 };
const tag = (color) => ({ display: "inline-block", padding: "3px 12px", borderRadius: 4, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", background: `${color}18`, color, border: `1px solid ${color}33` });
const divider = { height: 1, background: `linear-gradient(90deg, transparent, ${t.border}, transparent)`, margin: "16px 0" };
const label = { color: t.muted, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "system-ui, sans-serif", marginBottom: 8 };
const sans = { fontFamily: "system-ui, sans-serif" };
const miniLabel = { ...sans, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: t.muted, marginBottom: 2 };
const miniVal = { fontSize: 14, fontWeight: 600 };

// Desglose Bruto / Comisión Atlantis / Neto — visibilidad total en 3 columnas.
const Breakdown = ({ gross, commission, net, netLabel = "Neto" }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}` }}>
    <div><p style={miniLabel}>Bruto</p><p style={miniVal}>${fmt(gross)}</p></div>
    <div style={{ textAlign: "center" }}><p style={miniLabel}>Comisión Atlantis</p><p style={{ ...miniVal, color: commission > 0 ? t.danger : t.muted }}>{commission > 0 ? "−" : ""}${fmt(commission)}</p></div>
    <div style={{ textAlign: "right" }}><p style={miniLabel}>{netLabel}</p><p style={{ ...miniVal, color: t.success }}>${fmt(net)}</p></div>
  </div>
);

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700;800&family=Cormorant+Garamond:wght@300;400;600;700&display=swap');
  @keyframes fadeSlide { from { opacity:0; transform:translate(-50%,-16px); } to { opacity:1; transform:translate(-50%,0); } }
  @keyframes breathe { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
  @keyframes floatUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes popIn { 0% { opacity:0; transform:scale(0.6); } 60% { transform:scale(1.08); } 100% { opacity:1; transform:scale(1); } }
  @keyframes ring { 0% { transform:scale(0.7); opacity:0.8; } 100% { transform:scale(2.4); opacity:0; } }
  @keyframes coinRise { 0% { opacity:0; transform:translateY(30px) scale(0.8);} 25%{opacity:1;} 100% { opacity:0; transform:translateY(-120px) scale(1.1);} }
  @keyframes sheetUp { from { transform:translateY(100%);} to { transform:translateY(0);} }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input:focus { border-color: ${t.gold} !important; }
  button:active { transform: scale(0.98); }
  body { background: ${t.navy}; }
  /* Contener el lector de QR: que el <video> nunca se tome la pantalla en negro */
  #qr-reader { width: 100% !important; border: 0 !important; line-height: 0; background: ${t.navyLight}; border-radius: 16px; overflow: hidden; }
  #qr-reader video { position: static !important; width: 100% !important; height: auto !important; display: block; border-radius: 16px; }
  #qr-reader img[alt="Info icon"], #qr-reader__dashboard_section_csr span { display: none !important; }
`;

// ─── Feedback "llegó plata": vibración (Android) + sonido (iOS/todos) ───
let audioCtx = null;
const getAudioCtx = () => {
  if (audioCtx) return audioCtx;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; }
  return audioCtx;
};
// iOS exige un gesto del usuario para habilitar audio: lo reanudamos al primer toque.
const unlockAudio = () => { const c = getAudioCtx(); if (c && c.state === "suspended") c.resume().catch(() => {}); };
const chime = () => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  [[880, 0], [1318.5, 0.11]].forEach(([freq, dt]) => { // dos notas, tipo "cha-ching"
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = freq;
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now + dt);
    gain.gain.exponentialRampToValueAtTime(0.3, now + dt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dt + 0.22);
    osc.start(now + dt); osc.stop(now + dt + 0.24);
  });
};
const vibrate = () => { try { navigator.vibrate?.([0, 60, 40, 110]); } catch { /* no soportado */ } };

// ─── Module-level presentational components ───
const TopoPattern = ({ opacity = 0.05, color = t.gold }) => (
  <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity, pointerEvents: "none", zIndex: 0 }} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
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

const LogoMark = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <circle cx="24" cy="24" r="22" stroke={t.gold} strokeWidth="1.5" />
    <path d="M24 8L34 36H28L24 24L20 36H14L24 8Z" stroke={t.gold} strokeWidth="1.5" fill="none" />
    <path d="M18 28H30" stroke={t.gold} strokeWidth="1" />
  </svg>
);

const Icon = ({ name, size = 22, color = t.gold }) => {
  const s = { fill: "none", stroke: color, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    credit: <><circle cx="12" cy="12" r="9" {...s} /><path d="M12 7.5v9M7.5 12h9" {...s} /></>,
    pay: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.2" {...s} /><rect x="13.5" y="3.5" width="7" height="7" rx="1.2" {...s} /><rect x="3.5" y="13.5" width="7" height="7" rx="1.2" {...s} /><path d="M14 14h3M20 14v3M14 20h3M20 20v.5" {...s} /></>,
    send: <path d="M5 12h13M12 6l6 6-6 6" {...s} />,
    deposit: <path d="M12 4.5v10m0 0l-4-4m4 4l4-4M5 19.5h14" {...s} />,
    yield: <path d="M4 16l5-5 4 4 7-8M20 7v4M20 7h-4" {...s} />,
    chain: <><path d="M10 13.5a3.5 3.5 0 010-5l1.5-1.5a3.5 3.5 0 015 5L15 13" {...s} /><path d="M14 10.5a3.5 3.5 0 010 5L12.5 17a3.5 3.5 0 01-5-5L9 11" {...s} /></>,
    check: <path d="M5 13l4 4L19 7" {...s} strokeWidth="2.2" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24">{paths[name]}</svg>;
};

const Toast = ({ msg, type }) => msg ? (
  <div style={{ position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)", padding: "14px 28px", borderRadius: 8, zIndex: 200, maxWidth: 380, background: type === "error" ? t.danger : t.success, color: "#fff", fontWeight: 600, fontSize: 14, fontFamily: "system-ui, sans-serif", boxShadow: "0 8px 40px rgba(0,0,0,0.5)", animation: "fadeSlide 0.3s ease" }}>{msg}</div>
) : null;

export default function App() {
  const [screen, setScreen] = useState(S.WELCOME);
  const [phone, setPhone] = useState("+521");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [onchain, setOnchain] = useState(null);
  const [yieldInfo, setYieldInfo] = useState(null);
  const [currentLoan, setCurrentLoan] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loanAmount, setLoanAmount] = useState("175");
  const [depositAmount, setDepositAmount] = useState("200");
  const [payAmount, setPayAmount] = useState("180");
  const [merchant, setMerchant] = useState(null);
  const [sendPhone, setSendPhone] = useState("+521");
  const [sendAmount, setSendAmount] = useState("100");
  const [devCode, setDevCode] = useState("");
  const [reveal, setReveal] = useState(false);
  const [revealData, setRevealData] = useState(null); // override on-chain reveal (e.g. merchant wallet)
  const [copied, setCopied] = useState(false);
  const [celebration, setCelebration] = useState(null);
  // Merchant role
  const [role, setRole] = useState("persona");
  const [myMerchant, setMyMerchant] = useState(null);
  const [merchantActivity, setMerchantActivity] = useState(null);
  const [merchantName, setMerchantName] = useState("");
  const [merchantCategory, setMerchantCategory] = useState("Abarrotes");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [merchantCodeInput, setMerchantCodeInput] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");   // comercio: importe a cobrar (vacío = abierto)
  const [chargeRef, setChargeRef] = useState("");         // comercio: N° comprobante/factura
  const [payFixed, setPayFixed] = useState(false);        // pagador: el monto vino fijado en el QR
  const [payRef, setPayRef] = useState("");               // pagador: comprobante leído del QR
  const [expandedTx, setExpandedTx] = useState(null);     // fila de movimiento expandida (desglose)
  const lastBalanceRef = useRef(null);   // para detectar plata entrante (persona)
  const lastPayCountRef = useRef(null);  // para detectar cobros nuevos (comercio)

  // "Llegó plata": vibra (Android) + suena (todos) + cartel opcional.
  const notify = useCallback((title) => { vibrate(); chime(); if (title) setSuccess(title); }, []);

  const clear = () => { setError(""); setSuccess(""); };

  const loadDash = useCallback(async () => {
    try {
      const [bal, loan, txs, hist, oc, yi] = await Promise.all([
        api("/api/wallet/balance"), api("/api/credit/current"),
        api("/api/wallet/transactions"), api("/api/credit/history"),
        api("/api/wallet/onchain").catch(() => null),
        api("/api/wallet/yield").catch(() => null),
      ]);
      setBalance(bal);
      lastBalanceRef.current = bal?.balanceMxn ?? lastBalanceRef.current;
      setCurrentLoan(loan.loan !== undefined ? loan.loan : loan);
      setTransactions(Array.isArray(txs) ? txs : txs.transactions ?? []);
      setLoanHistory(Array.isArray(hist) ? hist : hist.loans ?? []);
      setOnchain(oc);
      setYieldInfo(yi);
    } catch (e) {
      if (e.message.includes("Invalid") || e.message.includes("expired")) {
        localStorage.removeItem("atlantis_token");
        setScreen(S.WELCOME);
      }
    }
  }, []);

  const loadMerchantActivity = useCallback(async () => {
    try {
      const a = await api("/api/merchants/mine/activity");
      const n = a.payments?.length ?? 0;
      if (lastPayCountRef.current !== null && n > lastPayCountRef.current) {
        const p = a.payments[0];
        notify(`Cobraste $${fmt(p?.netMxn)} de ${p?.payerName}`); // vibra + suena
      }
      lastPayCountRef.current = n;
      setMerchantActivity(a);
    } catch { /* ignore */ }
  }, [notify]);

  useEffect(() => {
    if (localStorage.getItem("atlantis_token")) { setScreen(S.HOME); loadDash(); }
  }, [loadDash]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(""); setSuccess(""); }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // iOS: habilitar audio en el primer toque del usuario.
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAudio);
  }, []);

  // Persona en Home: detectar plata entrante (P2P recibido) mientras la app está abierta.
  useEffect(() => {
    if (screen !== S.HOME) return;
    const id = setInterval(async () => {
      try {
        const b = await api("/api/wallet/balance");
        if (lastBalanceRef.current !== null && b.balanceMxn > lastBalanceRef.current + 0.001) {
          notify(`Recibiste $${fmt(b.balanceMxn - lastBalanceRef.current)} MXN`); // vibra + suena
          loadDash();
        }
        lastBalanceRef.current = b.balanceMxn;
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(id);
  }, [screen, notify, loadDash]);

  // Render the merchant's QR image
  useEffect(() => {
    if (screen === S.MERCH_DASH && myMerchant?.qrCode) {
      const amt = Number(chargeAmount);
      const ref = chargeRef.trim();
      // payload: ATL-XXX | <monto> | <comprobante>  (campos vacíos permitidos)
      const payload = (amt > 0 || ref) ? `${myMerchant.qrCode}|${amt > 0 ? amt : ""}${ref ? `|${ref}` : ""}` : myMerchant.qrCode;
      import("qrcode").then((QR) =>
        QR.toDataURL(payload, {
          width: 320, margin: 3, errorCorrectionLevel: "Q",
          color: { dark: "#000000", light: "#FFFFFF" }, // alto contraste = escaneable de pantalla
        }).then(setQrDataUrl).catch(() => {})
      );
    }
  }, [screen, myMerchant, chargeAmount, chargeRef]);

  // Poll the merchant dashboard (live incoming payments)
  useEffect(() => {
    if (screen !== S.MERCH_DASH) return;
    loadMerchantActivity();
    const id = setInterval(loadMerchantActivity, 3000);
    return () => clearInterval(id);
  }, [screen, loadMerchantActivity]);

  // Camera QR scanner on the Pay screen
  useEffect(() => {
    if (screen !== S.PAY || !scanning) return;
    // La cámara requiere contexto seguro (HTTPS) y getUserMedia disponible.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setScanning(false);
      setError("La cámara necesita HTTPS. Abrí el link https… o ingresá el código a mano.");
      return;
    }
    let scanner; let active = false; let done = false;
    // Teardown idempotente: solo frena si está corriendo, y atrapa el throw
    // SINCRÓNICO de html5-qrcode ("Cannot stop, scanner is not running") que
    // antes tumbaba React al frenar dos veces (callback de lectura + cleanup).
    const teardown = async () => {
      if (!scanner || !active) return;
      active = false;
      try { await scanner.stop(); } catch { /* ya detenido */ }
      try { await scanner.clear(); } catch { /* nada que limpiar */ }
    };
    import("html5-qrcode").then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (done) return;
      scanner = new Html5Qrcode("qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }, // detector nativo del SO
      });
      const qrbox = (vw, vh) => { const s = Math.floor(Math.min(vw, vh) * 0.75); return { width: s, height: s }; };
      scanner.start(
        { facingMode: "environment" }, { fps: 12, qrbox },
        async (text) => {
          if (done) return;
          done = true;
          await teardown();
          onScan(text);
        },
        () => {},
      ).then(() => { active = true; }).catch((e) => {
        setScanning(false);
        const why = e?.name === "NotAllowedError" ? "permiso denegado"
          : e?.name === "NotFoundError" ? "no se encontró cámara"
          : (e?.name || e?.message || "error");
        setError(`No se pudo abrir la cámara (${why}). Ingresá el código a mano.`);
      });
    }).catch(() => { setScanning(false); setError("No se pudo cargar el lector de QR. Ingresá el código a mano."); });
    return () => { done = true; teardown(); };
  }, [screen, scanning]);

  const celebrate = (title, amountMxn, subtitle, positive = true, returnTo = S.HOME) => {
    vibrate(); chime();
    setCelebration({ title, amountMxn, subtitle, positive });
    setTimeout(() => { setCelebration(null); setScreen(returnTo); }, 2200);
  };

  // ─── Role routing + merchant ───
  const routeAfterAuth = async () => {
    if (role === "comercio") {
      const m = await api("/api/merchants/mine").catch(() => null);
      if (m && m.qrCode) { setMyMerchant(m); setScreen(S.MERCH_DASH); }
      else setScreen(S.MERCH_ONBOARD);
    } else {
      setScreen(S.HOME); loadDash();
    }
  };
  const createMerchant = async () => {
    clear(); setLoading(true);
    try {
      const m = await api("/api/merchants", { method: "POST", body: JSON.stringify({ name: merchantName, category: merchantCategory }) });
      setMyMerchant(m); setScreen(S.MERCH_DASH);
    } catch (e) { setError(e.message); } setLoading(false);
  };
  const onScan = async (text) => {
    const raw = String(text).trim();
    setScanning(false);
    const m = raw.match(/ATL-[A-Z0-9]+/i);
    if (!m) { setError(`Ese QR no es de un comercio Atlantis (leí: ${raw.slice(0, 24)})`); return; }
    const code = m[0].toUpperCase();
    const parts = raw.split("|"); // ATL-XXX | <monto> | <comprobante>
    const amtVal = Number(parts[1]);
    const refVal = (parts[2] || "").trim();
    try {
      setMerchant(await api(`/api/merchants/${code}`));
      if (amtVal > 0) { setPayAmount(String(amtVal)); setPayFixed(true); } else setPayFixed(false);
      setPayRef(refVal);
      setSuccess("Comercio encontrado");
    } catch { setError(`No encontré el comercio ${code}`); }
  };

  // ─── Actions ───
  const sendOtp = async () => {
    clear(); setLoading(true);
    try {
      const res = await api("/api/auth/otp/send", { method: "POST", body: JSON.stringify({ phone }) });
      if (res.devCode) { setDevCode(res.devCode); setOtp(res.devCode); }
      setSuccess("Código enviado"); setScreen(S.OTP);
    } catch (e) { setError(e.message); } setLoading(false);
  };
  const verifyOtp = async () => {
    clear(); setLoading(true);
    try {
      const res = await api("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, code: otp }) });
      localStorage.setItem("atlantis_token", res.accessToken); setUser(res.user);
      if (res.user.isNewUser || !res.user.name) { setScreen(S.PROFILE); } else { await routeAfterAuth(); }
    } catch (e) { setError(e.message); } setLoading(false);
  };
  const updateProfile = async () => {
    clear(); setLoading(true);
    try { const res = await api("/api/auth/profile", { method: "PUT", body: JSON.stringify({ name, acceptTerms: true }) }); setUser(res); await routeAfterAuth(); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const applyCredit = async () => {
    clear(); setLoading(true);
    try { const r = await api("/api/credit/apply", { method: "POST", body: JSON.stringify({ amountMxn: parseFloat(loanAmount) }) }); await loadDash(); celebrate("Crédito aprobado", r.amountMxn, "Depositado al instante en tu cuenta"); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const repayCredit = async () => {
    clear(); setLoading(true);
    try { const r = await api("/api/credit/repay", { method: "POST", body: "{}" }); await loadDash(); celebrate("Crédito pagado", r.repaidAmountMxn, "¡Tu historial crediticio crece!", false); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const deposit = async () => {
    clear(); setLoading(true);
    try { const r = await api("/api/wallet/deposit", { method: "POST", body: JSON.stringify({ amountMxn: parseFloat(depositAmount) }) }); await loadDash(); celebrate("Depósito acreditado", r.depositedMxn, "Efectivo convertido a saldo digital"); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const openPay = () => {
    clear(); setMerchant(null); setScanning(false); setPayFixed(false); setPayRef(""); setScreen(S.PAY);
    import("html5-qrcode").catch(() => {}); // precargar la lib para que el "Abrir cámara" sea instantáneo
  };
  const pay = async () => {
    clear(); setLoading(true);
    try { const r = await api(`/api/merchants/${merchant.qrCode}/pay`, { method: "POST", body: JSON.stringify({ amountMxn: parseFloat(payAmount), ...(payRef ? { reference: payRef } : {}) }) }); await loadDash(); celebrate(`Pagaste en ${r.merchant.name}`, r.amountMxn, `Comisión ${fmt(r.commissionMxn)} MXN (${r.commissionBps / 100}%) · liquidado en Solana`, false); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const sendP2P = async () => {
    clear(); setLoading(true);
    try {
      const r = await api("/api/wallet/transfer", { method: "POST", body: JSON.stringify({ toPhone: sendPhone, amountMxn: parseFloat(sendAmount) }) });
      await loadDash();
      const sub = r.recipient.isNewUser ? "Le creamos una cuenta — la reclama al registrarse" : "Recibido al instante";
      celebrate(`Enviaste a ${r.recipient.phone}`, r.amountMxn, sub, false);
    } catch (e) { setError(e.message); } setLoading(false);
  };
  const advanceTime = async (days) => {
    clear(); setLoading(true);
    try { const r = await api("/api/wallet/yield/advance", { method: "POST", body: JSON.stringify({ days }) }); await loadDash(); celebrate(`Pasaron ${days} días`, r.earnedMxn, "Tu dinero creció solo, sin que hicieras nada"); }
    catch (e) { setError(e.message); } setLoading(false);
  };
  const copyAddr = () => {
    const pk = revealData?.publicKey ?? onchain?.publicKey;
    if (pk) { navigator.clipboard?.writeText(pk); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };
  const openMerchantReveal = () => {
    if (!myMerchant?.solanaPublicKey) return;
    setRevealData({
      publicKey: myMerchant.solanaPublicKey,
      balanceUsdc: merchantActivity?.balanceUsdc ?? myMerchant.balanceUsdc ?? 0,
      explorerUrl: `https://explorer.solana.com/address/${myMerchant.solanaPublicKey}?cluster=devnet`,
    });
    setReveal(true);
  };
  const logout = () => {
    localStorage.removeItem("atlantis_token");
    setUser(null); setBalance(null); setOnchain(null); setYieldInfo(null); setCurrentLoan(null);
    setMyMerchant(null); setMerchantActivity(null); setScanning(false); setRole("persona");
    setScreen(S.WELCOME);
  };

  const back = (to = S.HOME) => (
    <button onClick={() => { clear(); setScreen(to); }} style={{ background: "transparent", border: "none", color: t.creamDim, fontSize: 15, cursor: "pointer", padding: 0, marginBottom: 24, fontFamily: "'EB Garamond', serif" }}>← Volver</button>
  );

  // ─── Screen content (plain JSX, single return below keeps inputs mounted) ───
  let content = null;
  let topo = 0.04;

  if (screen === S.WELCOME) {
    topo = 0.05;
    content = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 28px", textAlign: "center", position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: 40, animation: "breathe 4s ease infinite" }}><LogoMark size={72} /></div>
        <h1 style={{ fontSize: 44, fontWeight: 400, letterSpacing: "0.18em", marginBottom: 16, color: t.cream }}>ATLANTIS</h1>
        <div style={{ width: 48, height: 1, background: t.gold, marginBottom: 20 }} />
        <p style={{ color: t.creamDim, fontSize: 18, marginBottom: 6, fontStyle: "italic" }}>La civilización financiera</p>
        <p style={{ ...sans, color: t.muted, fontSize: 13, marginBottom: 56, letterSpacing: "0.04em" }}>Crédito · Pagos · Envíos · Rendimiento</p>
        <button style={btn} onClick={() => setScreen(S.ROLE)}>Comenzar</button>
        <p style={{ ...sans, color: t.muted, fontSize: 11, marginTop: 40, letterSpacing: "0.06em" }}>ATLANTIS 4.3 · DEMO</p>
      </div>
    );
  } else if (screen === S.ROLE) {
    topo = 0.05;
    const roleTile = (icon, title, sub, r) => (
      <button onClick={() => { setRole(r); setScreen(S.PHONE); }} style={{ ...card, width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 16, display: "flex", gap: 16, alignItems: "center", border: `1px solid ${t.borderGold}` }}>
        <Icon name={icon} size={28} />
        <div><p style={{ fontSize: 18, fontWeight: 600 }}>{title}</p><p style={{ ...sans, color: t.muted, fontSize: 13, marginTop: 2 }}>{sub}</p></div>
      </button>
    );
    content = (
      <div style={page}>
        <div style={{ paddingTop: 80, marginBottom: 40 }}>
          <h2 style={{ fontSize: 30, fontWeight: 400, marginBottom: 10 }}>¿Cómo vas a usar Atlantis?</h2>
          <p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic" }}>Elegí tu rol para esta sesión</p>
        </div>
        {roleTile("send", "Soy persona", "Crédito, pagos, envíos, rendimiento", "persona")}
        {roleTile("pay", "Soy un comercio", "Cobrá con QR y mirá las ventas en vivo", "comercio")}
        <button style={{ ...btnOutline, marginTop: 28 }} onClick={() => setScreen(S.WELCOME)}>Volver</button>
      </div>
    );
  } else if (screen === S.PHONE) {
    content = (
      <div style={page}>
        <div style={{ paddingTop: 72, marginBottom: 48 }}>
          <p style={label}>Paso 1 de 3</p>
          <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 10 }}>Tu número de teléfono</h2>
          <p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic" }}>Enviaremos un código de verificación por SMS</p>
        </div>
        <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 15 5999 0001" />
        <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 10, marginBottom: 36 }}>Formato internacional: +52 seguido de 10 dígitos</p>
        <button style={{ ...btn, opacity: loading ? 0.6 : 1 }} onClick={sendOtp} disabled={loading}>{loading ? "Enviando..." : "Enviar código"}</button>
        <button style={{ ...btnOutline, marginTop: 14 }} onClick={() => setScreen(S.WELCOME)}>Volver</button>
      </div>
    );
  } else if (screen === S.OTP) {
    content = (
      <div style={page}>
        <div style={{ paddingTop: 72, marginBottom: 48 }}>
          <p style={label}>Paso 2 de 3</p>
          <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 10 }}>Ingresá el código</h2>
          <p style={{ color: t.creamDim, fontSize: 16 }}>Enviado a <span style={{ color: t.gold }}>{phone}</span></p>
          {devCode && (
            <div style={{ marginTop: 16, padding: "14px 16px", background: `${t.gold}0F`, border: `1px solid ${t.gold}44`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ ...sans, color: t.goldLight, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>Dev · OTP</p>
              <p style={{ color: t.gold, fontSize: 28, fontFamily: "monospace", fontWeight: 700, letterSpacing: 6 }}>{devCode}</p>
            </div>
          )}
        </div>
        <input style={{ ...inp, textAlign: "center", fontSize: 36, letterSpacing: 14 }} type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="······" />
        <div style={{ height: 36 }} />
        <button style={{ ...btn, opacity: loading || otp.length < 6 ? 0.6 : 1 }} onClick={verifyOtp} disabled={loading || otp.length < 6}>{loading ? "Verificando..." : "Verificar"}</button>
        <button style={{ ...btnOutline, marginTop: 14 }} onClick={() => { setOtp(""); setScreen(S.PHONE); }}>Cambiar número</button>
      </div>
    );
  } else if (screen === S.PROFILE) {
    content = (
      <div style={page}>
        <div style={{ paddingTop: 72, marginBottom: 48 }}>
          <p style={label}>Paso 3 de 3</p>
          <h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 10 }}>¿Cómo te llamás?</h2>
          <p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic" }}>Tu nombre real para verificar tu identidad</p>
        </div>
        <input style={inp} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" />
        <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 14, marginBottom: 40, lineHeight: 1.7 }}>Al continuar, aceptás los Términos y Condiciones y la Política de Privacidad de Atlantis.</p>
        <button style={{ ...btn, opacity: loading || name.length < 2 ? 0.6 : 1 }} onClick={updateProfile} disabled={loading || name.length < 2}>{loading ? "Guardando..." : "Continuar"}</button>
      </div>
    );
  } else if (screen === S.HOME) {
    topo = 0.03;
    const hasLoan = currentLoan && currentLoan.status === "DISBURSED";
    const tile = (icon, title, sub, onClick, disabled) => (
      <button onClick={onClick} disabled={disabled} style={{ ...card, cursor: disabled ? "default" : "pointer", textAlign: "left", padding: 18, opacity: disabled ? 0.45 : 1, display: "flex", flexDirection: "column", gap: 10 }}>
        <Icon name={icon} size={24} />
        <div><p style={{ fontWeight: 600, fontSize: 16 }}>{title}</p><p style={{ ...sans, color: t.muted, fontSize: 11, marginTop: 2 }}>{sub}</p></div>
      </button>
    );
    content = (
      <div style={page}>
        <div style={{ paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LogoMark size={32} />
            <div><p style={{ ...sans, color: t.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Bienvenido</p><p style={{ fontSize: 20, fontWeight: 600 }}>{user?.name || "Usuario"}</p></div>
          </div>
          <button onClick={logout} style={{ ...sans, background: "transparent", border: `1px solid ${t.border}`, color: t.muted, padding: "7px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer", letterSpacing: "0.06em" }}>SALIR</button>
        </div>

        <div onClick={() => setReveal(true)} style={{ ...card, marginBottom: 14, position: "relative", overflow: "hidden", border: `1px solid ${t.borderGold}`, cursor: "pointer" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, background: `radial-gradient(circle, ${t.goldDim}, transparent)`, pointerEvents: "none" }} />
          <p style={{ ...label, marginBottom: 6 }}>Balance disponible</p>
          <p style={{ fontSize: 48, fontWeight: 300, color: t.gold, letterSpacing: "-0.02em", lineHeight: 1 }}>${fmt(balance?.balanceMxn)}</p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <p style={{ ...sans, color: t.muted, fontSize: 13 }}>MXN</p>
            <p style={{ ...sans, color: t.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}><Icon name="chain" size={13} color={t.muted} /> verificar en blockchain</p>
          </div>
        </div>

        {yieldInfo && (
          <button onClick={() => setScreen(S.YIELD)} style={{ width: "100%", textAlign: "left", background: `${t.success}10`, border: `1px solid ${t.success}33`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: t.success, fontSize: 15 }}>Tu dinero rinde <b>{yieldInfo.apyPct}% al año</b></span>
            <span style={{ ...sans, color: t.creamDim, fontSize: 12 }}>≈ ${fmt(yieldInfo.projectedMxn?.monthly)}/mes →</span>
          </button>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {tile("credit", hasLoan ? "Crédito activo" : "Pedir crédito", "Atlantis Daily", () => !hasLoan && setScreen(S.APPLY), hasLoan)}
          {tile("pay", "Pagar", "Escaneá un QR", openPay, false)}
          {tile("send", "Enviar", "A cualquier teléfono", () => setScreen(S.SEND), false)}
          {tile("deposit", "Depositar", "Cargar efectivo", () => setScreen(S.DEPOSIT), false)}
        </div>

        {hasLoan && (
          <div style={{ ...card, marginBottom: 20, border: `1px solid ${t.gold}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><p style={{ fontSize: 17, fontWeight: 600 }}>Crédito activo</p><span style={tag(t.gold)}>Activo</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span style={{ color: t.creamDim, fontSize: 15 }}>Total a pagar</span><span style={{ fontWeight: 600, color: t.gold }}>${fmt(currentLoan.totalRepaymentMxn)} MXN</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}><span style={{ color: t.creamDim, fontSize: 15 }}>Vencimiento</span><span style={{ ...sans, fontSize: 14 }}>{new Date(currentLoan.dueAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
            <button style={btn} onClick={() => setScreen(S.REPAY)}>Pagar crédito</button>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={label}>Movimientos recientes</p>
            <button onClick={() => setScreen(S.HISTORY)} style={{ ...sans, background: "none", border: "none", color: t.gold, fontSize: 12, cursor: "pointer" }}>créditos →</button>
          </div>
          {transactions.length === 0 ? (
            <p style={{ color: t.muted, fontSize: 15, fontStyle: "italic" }}>Sin movimientos aún</p>
          ) : transactions.slice(0, 7).map((tx, i) => {
            const debit = DEBIT.has(tx.type);
            const id = tx.id || i;
            const open = expandedTx === id;
            const fee = tx.type === "LOAN_REPAYMENT" ? Math.round((tx.amountMxn / 11) * 100) / 100 : 0; // 10% sobre capital
            return (
              <div key={id} onClick={() => setExpandedTx(open ? null : id)} style={{ padding: "14px 0", borderBottom: `1px solid ${t.border}`, cursor: "pointer", animation: i === 0 ? "floatUp 0.5s ease" : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ paddingRight: 12 }}>
                    <p style={{ fontSize: 15, fontWeight: 500 }}>{tx.description}</p>
                    <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 3 }}>{new Date(tx.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {open ? "ocultar" : "ver desglose"}</p>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 16, color: debit ? t.danger : t.success, whiteSpace: "nowrap" }}>{debit ? "−" : "+"}${fmt(tx.amountMxn)}</p>
                </div>
                {open && <Breakdown gross={tx.amountMxn} commission={fee} net={Math.round((tx.amountMxn - fee) * 100) / 100} netLabel={tx.type === "LOAN_REPAYMENT" ? "Capital" : "Neto"} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (screen === S.APPLY) {
    topo = 0.03;
    const kycLimitUsd = user?.kycLevel === "COMPLETE" ? 50 : user?.kycLevel === "VERIFIED" ? 30 : 10;
    const kycLimitMxn = kycLimitUsd * 17.5;
    const amount = Math.min(parseFloat(loanAmount || 0), kycLimitMxn);
    const fee = (amount * 0.1).toFixed(2);
    const total = (amount * 1.1).toFixed(2);
    const usd = (amount / 17.5).toFixed(2);
    const overLimit = parseFloat(loanAmount || 0) > kycLimitMxn;
    content = (
      <div style={page}>
        <div style={{ paddingTop: 44 }}>{back()}<h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Solicitar crédito</h2><p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic", marginBottom: 36 }}>Recibí el dinero al instante en tu cuenta</p></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><p style={label}>Monto en pesos</p><p style={{ ...label, color: overLimit ? t.danger : t.muted }}>Límite: ${kycLimitMxn} (KYC {user?.kycLevel})</p></div>
        <input style={{ ...inp, fontSize: 32, textAlign: "center", marginBottom: 28, borderColor: overLimit ? t.danger : undefined }} type="number" min="1" max={kycLimitMxn} value={loanAmount} onChange={e => setLoanAmount(String(Math.min(parseFloat(e.target.value) || 0, kycLimitMxn)))} />
        <div style={{ ...card, marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: t.creamDim, fontSize: 15 }}>Equivalente USD</span><span>${usd}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: t.creamDim, fontSize: 15 }}>Comisión (10%)</span><span>${fee} MXN</span></div>
          <div style={divider} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontWeight: 700, fontSize: 17 }}>Total a devolver</span><span style={{ fontWeight: 700, fontSize: 22, color: t.gold }}>${total} MXN</span></div>
          <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 14 }}>Plazo: 48 horas · TC: $17.50 MXN/USD</p>
        </div>
        <button style={{ ...btn, opacity: loading ? 0.6 : 1 }} onClick={applyCredit} disabled={loading}>{loading ? "Procesando..." : `Solicitar $${loanAmount} MXN`}</button>
      </div>
    );
  } else if (screen === S.REPAY && currentLoan) {
    topo = 0.03;
    const canRepay = balance && balance.balanceMxn >= currentLoan.totalRepaymentMxn;
    content = (
      <div style={page}>
        <div style={{ paddingTop: 44 }}>{back()}<h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 36 }}>Pagar crédito</h2></div>
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: t.creamDim }}>Capital</span><span>${fmt(currentLoan.amountMxn)} MXN</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: t.creamDim }}>Comisión</span><span>${fmt(currentLoan.feeMxn)} MXN</span></div>
          <div style={divider} />
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontWeight: 700, fontSize: 17 }}>Total</span><span style={{ fontWeight: 700, fontSize: 24, color: t.gold }}>${fmt(currentLoan.totalRepaymentMxn)} MXN</span></div>
        </div>
        <div style={{ ...card, marginBottom: 36, border: `1px solid ${canRepay ? t.success : t.danger}44` }}>
          <p style={{ ...label, marginBottom: 4 }}>Tu balance actual</p>
          <p style={{ fontSize: 28, fontWeight: 400, color: canRepay ? t.success : t.danger }}>${fmt(balance?.balanceMxn)} MXN</p>
          {!canRepay && <p style={{ ...sans, color: t.danger, fontSize: 13, marginTop: 10 }}>Insuficiente. Faltan ${fmt(currentLoan.totalRepaymentMxn - (balance?.balanceMxn || 0))} MXN.</p>}
        </div>
        <button style={{ ...btn, opacity: !canRepay || loading ? 0.5 : 1, background: canRepay ? btn.background : t.danger }} onClick={repayCredit} disabled={!canRepay || loading}>{loading ? "Procesando..." : `Pagar $${fmt(currentLoan.totalRepaymentMxn)} MXN`}</button>
      </div>
    );
  } else if (screen === S.PAY) {
    topo = 0.03;
    content = (
      <div style={page}>
        <div style={{ paddingTop: 44 }}>{back()}<h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Pagar en comercio</h2><p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic", marginBottom: 24 }}>{merchant ? "Confirmá el pago" : "Escaneá el QR del local"}</p></div>
        {!merchant ? (
          <>
            {scanning
              ? <div id="qr-reader" style={{ width: "100%", borderRadius: 16, overflow: "hidden", border: `1px solid ${t.border}`, minHeight: 240 }} />
              : <button style={btn} onClick={() => setScanning(true)}>Abrir cámara</button>}
            <div style={{ marginTop: 24 }}>
              <p style={label}>o ingresá el código del comercio</p>
              <div style={{ display: "flex", gap: 10 }}>
                <input style={{ ...inp, flex: 1, fontFamily: "monospace" }} value={merchantCodeInput} onChange={e => setMerchantCodeInput(e.target.value.toUpperCase())} placeholder="ATL-XXXXXXXX" />
                <button style={{ padding: "0 20px", border: "none", borderRadius: 8, background: t.gold, color: t.navy, fontWeight: 700, cursor: "pointer", ...sans, fontSize: 13 }} onClick={() => onScan(merchantCodeInput)} disabled={!merchantCodeInput}>Buscar</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ fontSize: 20, fontWeight: 600 }}>{merchant.name}</p>
              <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 4 }}>{merchant.category} · {merchant.qrCode}</p>
              {payRef && <p style={{ ...sans, color: t.gold, fontSize: 13, marginTop: 6 }}>Comprobante: {payRef}</p>}
            </div>
            <p style={label}>{payFixed ? "Monto definido por el comercio" : "Monto a pagar"}</p>
            {payFixed ? (
              <div style={{ ...inp, fontSize: 32, textAlign: "center", marginBottom: 10, color: t.gold, borderColor: t.borderGold }}>${fmt(payAmount)}</div>
            ) : (
              <input style={{ ...inp, fontSize: 32, textAlign: "center", marginBottom: 10 }} type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            )}
            <p style={{ ...sans, color: t.muted, fontSize: 12, marginBottom: 24 }}>Comisión al comercio: {(merchant.commissionBps ?? 50) / 100}% (vs 3-4% de las tarjetas)</p>
            <button style={{ ...btn, opacity: loading || !payAmount ? 0.6 : 1 }} onClick={pay} disabled={loading || !payAmount}>{loading ? "Procesando..." : `Pagar $${payAmount} MXN`}</button>
            <button style={{ ...btnOutline, marginTop: 12 }} onClick={() => { setMerchant(null); setScanning(true); }}>Escanear otro</button>
          </>
        )}
      </div>
    );
  } else if (screen === S.MERCH_ONBOARD) {
    content = (
      <div style={page}>
        <div style={{ paddingTop: 60, marginBottom: 36 }}>
          <h2 style={{ fontSize: 30, fontWeight: 400, marginBottom: 10 }}>Dá de alta tu comercio</h2>
          <p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic" }}>Empezá a cobrar en segundos</p>
        </div>
        <p style={label}>Nombre del comercio</p>
        <input style={{ ...inp, marginBottom: 20 }} value={merchantName} onChange={e => setMerchantName(e.target.value)} placeholder="Ej. Kiosco de Juan" />
        <p style={label}>Rubro</p>
        <input style={{ ...inp, marginBottom: 28 }} value={merchantCategory} onChange={e => setMerchantCategory(e.target.value)} placeholder="Ej. Abarrotes" />
        <button style={{ ...btn, opacity: loading || merchantName.length < 2 ? 0.6 : 1 }} onClick={createMerchant} disabled={loading || merchantName.length < 2}>{loading ? "Creando..." : "Crear comercio"}</button>
        <button style={{ ...btnOutline, marginTop: 12 }} onClick={logout}>Salir</button>
      </div>
    );
  } else if (screen === S.MERCH_DASH) {
    topo = 0.03;
    const pays = merchantActivity?.payments ?? [];
    content = (
      <div style={page}>
        <div style={{ paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <LogoMark size={30} />
            <div><p style={{ ...sans, color: t.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Comercio</p><p style={{ fontSize: 18, fontWeight: 600 }}>{myMerchant?.name}</p></div>
          </div>
          <button onClick={logout} style={{ ...sans, background: "transparent", border: `1px solid ${t.border}`, color: t.muted, padding: "7px 14px", borderRadius: 6, fontSize: 11, cursor: "pointer" }}>SALIR</button>
        </div>
        <div onClick={openMerchantReveal} style={{ ...card, marginBottom: 16, border: `1px solid ${t.borderGold}`, cursor: "pointer" }}>
          <p style={{ ...label, marginBottom: 6 }}>Cobrado</p>
          <p style={{ fontSize: 42, fontWeight: 300, color: t.gold, lineHeight: 1 }}>${fmt(merchantActivity?.balanceMxn ?? myMerchant?.balanceMxn ?? 0)}</p>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <p style={{ ...sans, color: t.muted, fontSize: 13 }}>MXN</p>
            <p style={{ ...sans, color: t.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}><Icon name="chain" size={13} color={t.muted} /> verificar en blockchain</p>
          </div>
        </div>
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={label}>Importe a cobrar</p>
            {Number(chargeAmount) > 0 && (
              <button onClick={() => setChargeAmount("")} style={{ ...sans, background: "none", border: "none", color: t.muted, fontSize: 12, cursor: "pointer" }}>cobro abierto ✕</button>
            )}
          </div>
          <input style={{ ...inp, fontSize: 30, textAlign: "center" }} type="number" inputMode="decimal" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} placeholder="$ libre" />
          <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 8 }}>
            {Number(chargeAmount) > 0 ? `El cliente confirma $${fmt(chargeAmount)} al escanear` : "Dejalo vacío y el cliente ingresa el monto"}
          </p>
          <div style={{ ...divider }} />
          <p style={label}>N° comprobante / factura</p>
          <input style={inp} value={chargeRef} onChange={(e) => setChargeRef(e.target.value)} placeholder="Ej. FAC-0012 (opcional)" maxLength={40} />
          <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 8 }}>Queda guardado en el cobro para tu facturación.</p>
        </div>
        <div style={{ ...card, textAlign: "center", marginBottom: 20 }}>
          <p style={label}>{Number(chargeAmount) > 0 ? `Mostrá este QR para cobrar $${fmt(chargeAmount)}` : "Mostrá este QR para cobrar"}</p>
          {qrDataUrl ? <img src={qrDataUrl} alt="QR del comercio" style={{ width: 220, height: 220, borderRadius: 12, margin: "8px auto" }} /> : <div style={{ height: 236 }} />}
          <p style={{ ...sans, color: t.gold, fontSize: 14, letterSpacing: "0.1em" }}>{myMerchant?.qrCode}</p>
        </div>
        <p style={{ ...label, marginBottom: 12 }}>Pagos recibidos {pays.length > 0 && <span style={{ color: t.success }}>· en vivo</span>}</p>
        {pays.length === 0 ? (
          <p style={{ color: t.muted, fontSize: 15, fontStyle: "italic" }}>Esperando el primer pago…</p>
        ) : pays.map((p, i) => (
          <div key={p.id || i} style={{ padding: "14px 0", borderBottom: `1px solid ${t.border}`, animation: i === 0 ? "floatUp 0.5s ease" : "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <p style={{ fontSize: 15, fontWeight: 500 }}>{p.payerName}{p.reference ? <span style={{ ...sans, color: t.gold, fontSize: 12 }}> · #{p.reference}</span> : null}</p>
              <p style={{ ...sans, color: t.muted, fontSize: 11 }}>{new Date(p.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <Breakdown gross={p.amountMxn} commission={p.commissionMxn} net={p.netMxn} />
          </div>
        ))}
      </div>
    );
  } else if (screen === S.SEND) {
    topo = 0.03;
    content = (
      <div style={page}>
        <div style={{ paddingTop: 44 }}>{back()}<h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Enviar dinero</h2><p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic", marginBottom: 32 }}>A cualquier teléfono, al instante</p></div>
        <p style={label}>Teléfono de quien recibe</p>
        <input style={{ ...inp, marginBottom: 24 }} type="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+52 ..." />
        <p style={label}>Monto</p>
        <input style={{ ...inp, fontSize: 32, textAlign: "center", marginBottom: 10 }} type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)} />
        <p style={{ ...sans, color: t.muted, fontSize: 12, marginBottom: 32 }}>Si no tiene cuenta, se la creamos automáticamente — la reclama al registrarse.</p>
        <button style={{ ...btn, opacity: loading || !sendAmount ? 0.6 : 1 }} onClick={sendP2P} disabled={loading || !sendAmount}>{loading ? "Enviando..." : `Enviar $${sendAmount} MXN`}</button>
      </div>
    );
  } else if (screen === S.DEPOSIT) {
    topo = 0.03;
    content = (
      <div style={page}>
        <div style={{ paddingTop: 44 }}>{back()}<h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Depositar efectivo</h2><p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic", marginBottom: 32 }}>Convertí pesos en efectivo a saldo digital</p></div>
        <p style={label}>Monto en pesos</p>
        <input style={{ ...inp, fontSize: 32, textAlign: "center", marginBottom: 32 }} type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
        <button style={{ ...btn, opacity: loading || !depositAmount ? 0.6 : 1 }} onClick={deposit} disabled={loading || !depositAmount}>{loading ? "Procesando..." : `Depositar $${depositAmount} MXN`}</button>
      </div>
    );
  } else if (screen === S.YIELD) {
    topo = 0.03;
    content = (
      <div style={page}>
        <div style={{ paddingTop: 44 }}>{back()}<h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Rendimiento</h2><p style={{ color: t.creamDim, fontSize: 16, fontStyle: "italic", marginBottom: 32 }}>Tu saldo crece solo, sin que hagas nada</p></div>
        <div style={{ ...card, marginBottom: 20, textAlign: "center", border: `1px solid ${t.success}33` }}>
          <p style={label}>Tasa anual</p>
          <p style={{ fontSize: 52, fontWeight: 300, color: t.success }}>{yieldInfo?.apyPct ?? "—"}%</p>
          <p style={{ ...sans, color: t.muted, fontSize: 12 }}>APY sobre tu balance</p>
        </div>
        <div style={{ ...card, marginBottom: 28 }}>
          <p style={{ ...label, marginBottom: 14 }}>Proyección sobre ${fmt(yieldInfo?.balanceMxn)} MXN</p>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><span style={{ color: t.creamDim }}>Por mes</span><span style={{ color: t.success }}>+${fmt(yieldInfo?.projectedMxn?.monthly)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: t.creamDim }}>Por año</span><span style={{ color: t.success }}>+${fmt(yieldInfo?.projectedMxn?.annual)}</span></div>
        </div>
        <div style={{ border: `1px dashed ${t.border}`, borderRadius: 12, padding: 18 }}>
          <p style={{ ...sans, color: t.muted, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Modo demo · adelantar el tiempo</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button style={{ ...btnOutline, padding: 14 }} onClick={() => advanceTime(30)} disabled={loading}>+30 días</button>
            <button style={{ ...btnOutline, padding: 14 }} onClick={() => advanceTime(365)} disabled={loading}>+1 año</button>
          </div>
        </div>
      </div>
    );
  } else if (screen === S.HISTORY) {
    topo = 0.03;
    content = (
      <div style={page}>
        <div style={{ paddingTop: 44 }}>{back()}<h2 style={{ fontSize: 32, fontWeight: 400, marginBottom: 32 }}>Historial de créditos</h2></div>
        {loanHistory.length === 0 ? (
          <p style={{ color: t.muted, fontSize: 16, fontStyle: "italic" }}>Aún no tenés créditos</p>
        ) : loanHistory.map((loan, i) => (
          <div key={loan.id || i} style={{ ...card, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>${fmt(loan.amountMxn)} MXN</span>
              <span style={tag(loan.status === "REPAID" ? t.success : loan.status === "DISBURSED" ? t.gold : loan.status === "DEFAULTED" ? t.danger : t.muted)}>{loan.status === "REPAID" ? "Pagado" : loan.status === "DISBURSED" ? "Activo" : loan.status === "DEFAULTED" ? "Mora" : loan.status}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: t.creamDim }}><span>Total: ${fmt(loan.totalRepaymentMxn)} MXN</span><span style={{ ...sans, fontSize: 12 }}>{new Date(loan.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}</span></div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Single return: stable shell + overlays keep inputs mounted ───
  const rv = revealData ?? onchain;
  return (
    <div style={shell}>
      <style>{globalStyles}</style>
      <TopoPattern opacity={topo} />
      <Toast msg={error} type="error" />
      <Toast msg={success} type="success" />

      {celebration && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(8,16,30,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
          <div style={{ position: "relative", marginBottom: 36 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `2px solid ${t.gold}`, animation: "ring 1.4s ease-out infinite" }} />
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: `radial-gradient(circle, ${t.gold}22, transparent)`, border: `2px solid ${t.gold}`, display: "flex", alignItems: "center", justifyContent: "center", animation: "popIn 0.5s ease" }}><Icon name="check" size={48} /></div>
            {[0, 1, 2].map((i) => (<div key={i} style={{ position: "absolute", left: 30 + i * 12, top: 20, fontSize: 22, color: t.gold, animation: `coinRise 1.6s ease-out ${i * 0.25}s infinite`, fontFamily: "system-ui" }}>✦</div>))}
          </div>
          <p style={{ color: t.creamDim, fontSize: 17, marginBottom: 10, animation: "floatUp 0.6s ease 0.1s both" }}>{celebration.title}</p>
          <p style={{ fontSize: 56, fontWeight: 300, color: celebration.positive ? t.gold : t.cream, letterSpacing: "-0.02em", animation: "popIn 0.6s ease 0.15s both" }}>{celebration.positive ? "+" : "−"}${fmt(celebration.amountMxn)}</p>
          <p style={{ ...sans, color: t.muted, fontSize: 13, marginTop: 6 }}>MXN</p>
          <p style={{ color: t.creamDim, fontSize: 15, fontStyle: "italic", marginTop: 24, maxWidth: 300, lineHeight: 1.6, animation: "floatUp 0.6s ease 0.3s both" }}>{celebration.subtitle}</p>
        </div>
      )}

      {reveal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(5,10,20,0.7)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => { setReveal(false); setRevealData(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 430, background: `linear-gradient(180deg, ${t.navyMid}, ${t.navy})`, borderTop: `1px solid ${t.borderGold}`, borderRadius: "20px 20px 0 0", padding: "28px 28px 40px", animation: "sheetUp 0.35s ease" }}>
            <div style={{ width: 40, height: 4, background: t.border, borderRadius: 2, margin: "0 auto 22px" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><Icon name="chain" size={20} /><p style={{ fontSize: 20, fontWeight: 600 }}>Bajo el capó</p></div>
            <p style={{ color: t.creamDim, fontSize: 15, fontStyle: "italic", marginBottom: 24 }}>Vos ves pesos. Por debajo, cada peso es USDC liquidado en la blockchain de Solana.</p>
            {rv?.publicKey ? (
              <>
                <p style={label}>Wallet en Solana (devnet)</p>
                <button onClick={copyAddr} style={{ width: "100%", textAlign: "left", background: t.navyLight, border: `1px solid ${t.border}`, borderRadius: 8, padding: "12px 14px", color: t.gold, fontFamily: "monospace", fontSize: 13, cursor: "pointer", marginBottom: 18, wordBreak: "break-all" }}>{rv.publicKey} <span style={{ ...sans, color: t.muted, fontSize: 11 }}>{copied ? "· copiado ✓" : "· copiar"}</span></button>
                <div style={{ ...card, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ color: t.creamDim, fontSize: 15 }}>Saldo en la cadena</span><span style={{ fontWeight: 600 }}>{Number(rv.balanceUsdc).toFixed(6)} <span style={{ color: t.gold }}>aUSDC</span></span></div>
                <a href={rv.explorerUrl} target="_blank" rel="noreferrer" style={{ ...btnOutline, display: "block", textAlign: "center", textDecoration: "none" }}>Ver en Solana Explorer ↗</a>
              </>
            ) : (
              <p style={{ color: t.muted, fontSize: 15 }}>Esta cuenta todavía no tiene wallet on-chain.</p>
            )}
            <p style={{ ...sans, color: t.muted, fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>Settlement real en devnet · 1 aUSDC = 1 USD · TC $17.50 MXN/USD</p>
          </div>
        </div>
      )}

      {content}
    </div>
  );
}
