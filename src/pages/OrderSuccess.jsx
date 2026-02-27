// src/pages/OrderSuccess.jsx - FULL FIXED VERSION

import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { useMemo, useEffect, useState, useCallback } from 'react'
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import logoLight from '../assets/a29dc90a-d036-4010-b33e-82cd29b6a2d5-removebg-preview.png'

pdfMake.vfs = pdfFonts.vfs

// Define available fonts (Roboto is included by default)
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
}

// ─── Detect if a string contains Arabic characters ─────────────────────────────
function hasArabic(str) {
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str || '')
}

// ─── For PDF: if text contains Arabic, append a note rather than garble it ─────
function pdfSafeText(text) {
  if (!text) return ''
  if (hasArabic(text)) {
    const latin = text.replace(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s]+/g, ' ').trim()
    return latin ? `${latin} [AR]` : '[Arabic Text]'
  }
  return text
}

// ─── Convert logo to base64 ─────────────────────────────────────────────────────
async function imageToBase64(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      c.getContext('2d').drawImage(img, 0, 0)
      resolve(c.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = src
  })
}

// ─── English-only date helpers for PDF ────────────────────────────────────────
function dateShortEN(d) {
  return new Date(d || Date.now()).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ─── Security SVG layer (screen) ───────────────────────────────────────────────
function SecurityLayer({ orderId, securityHash, isDark }) {
  const color   = isDark ? '#d4a45e' : '#8b5e2a'
  const opacity = isDark ? 0.03 : 0.036

  const secText  = `LOUABLE FACTORY · SECURE · ${securityHash} · `
  const longText = secText.repeat(16)

  const rows = Array.from({ length: 50 }, (_, i) => ({ y: 20 + i * 32, angle: i % 2 === 0 ? -0.7 : 0.35 }))

  const diagLines = []
  for (let x = -700; x < 1900; x += 26) {
    diagLines.push(`M${x},0 L${x + 1400},1400`)
  }

  const makeRosette = (cx, cy, r1, r2, petals) =>
    Array.from({ length: petals }, (_, i) => {
      const a = (i / petals) * Math.PI * 2
      return `M${cx + Math.cos(a) * r1},${cy + Math.sin(a) * r1} Q${cx},${cy} ${cx + Math.cos(a) * r2},${cy + Math.sin(a) * r2}`
    }).join(' ')

  const rosetteCtr = makeRosette(410, 500, 100, 150, 18)
  const rosetteTR  = makeRosette(730, 100, 36,  56,  14)
  const rosetteBL  = makeRosette(80,  880, 36,  56,  14)
  const rosetteTL  = makeRosette(80,  100, 24,  38,  12)
  const rosetteBR  = makeRosette(730, 880, 24,  38,  12)

  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        userSelect: 'none', WebkitUserSelect: 'none',
        MozUserSelect: 'none', msUserSelect: 'none',
        overflow: 'hidden', zIndex: 0,
      }}
    >
      <g opacity={opacity}>
        <g stroke={color} strokeWidth="0.28" fill="none" opacity="0.55">
          {diagLines.map((d, i) => <path key={i} d={d} />)}
        </g>

        {rows.map(({ y, angle }, i) => (
          <text key={i} x="-30" y={y} fontSize="6.5" fontFamily="monospace"
            fill={color} letterSpacing="1.2"
            transform={`rotate(${angle}, 400, ${y})`}>
            {longText}
          </text>
        ))}

        {Array.from({ length: 56 }, (_, row) =>
          Array.from({ length: 32 }, (_, col) => (
            <circle key={`${row}-${col}`} cx={col * 26 + 13} cy={row * 26 + 13}
              r="0.65" fill={color} opacity="0.55" />
          ))
        )}

        {[65, 105, 148, 192, 238, 284].map(r => (
          <circle key={r} cx="410" cy="500" r={r} fill="none"
            stroke={color} strokeWidth="0.26" strokeDasharray="4 8" />
        ))}
        <path d={rosetteCtr} fill="none" stroke={color} strokeWidth="0.48" />

        {[14, 26, 40, 56].map(r => (
          <circle key={r} cx="730" cy="100" r={r} fill="none" stroke={color} strokeWidth="0.22" strokeDasharray="3 7" />
        ))}
        <path d={rosetteTR} fill="none" stroke={color} strokeWidth="0.42" />

        {[14, 26, 40, 56].map(r => (
          <circle key={r} cx="80" cy="880" r={r} fill="none" stroke={color} strokeWidth="0.22" strokeDasharray="3 7" />
        ))}
        <path d={rosetteBL} fill="none" stroke={color} strokeWidth="0.42" />

        {[10, 20, 30].map(r => (
          <circle key={r} cx="80" cy="100" r={r} fill="none" stroke={color} strokeWidth="0.2" strokeDasharray="2 6" />
        ))}
        <path d={rosetteTL} fill="none" stroke={color} strokeWidth="0.38" />

        {[10, 20, 30].map(r => (
          <circle key={r} cx="730" cy="880" r={r} fill="none" stroke={color} strokeWidth="0.2" strokeDasharray="2 6" />
        ))}
        <path d={rosetteBR} fill="none" stroke={color} strokeWidth="0.38" />

        <rect x="8"  y="8"  width="784" height="964" fill="none" stroke={color} strokeWidth="0.48" />
        <rect x="14" y="14" width="772" height="952" fill="none" stroke={color} strokeWidth="0.2" />

        <path d="M14,36 L14,14 L46,14"    fill="none" stroke={color} strokeWidth="1.0" strokeLinecap="round" />
        <path d="M20,42 L20,20 L40,20"    fill="none" stroke={color} strokeWidth="0.38" strokeLinecap="round" />
        <path d="M786,36 L786,14 L754,14" fill="none" stroke={color} strokeWidth="1.0" strokeLinecap="round" />
        <path d="M780,42 L780,20 L760,20" fill="none" stroke={color} strokeWidth="0.38" strokeLinecap="round" />
        <path d="M14,944 L14,966 L46,966"    fill="none" stroke={color} strokeWidth="1.0" strokeLinecap="round" />
        <path d="M786,944 L786,966 L754,966" fill="none" stroke={color} strokeWidth="1.0" strokeLinecap="round" />

        <text x="11" y="100" fontSize="5" fontFamily="monospace" fill={color}
          transform="rotate(-90, 11, 100)" letterSpacing="1.3">
          {`AUTHENTIC · ${securityHash} · LOUABLE FACTORY · VERIFIED · `.repeat(8)}
        </text>
        <text x="793" y="600" fontSize="5" fontFamily="monospace" fill={color}
          transform="rotate(90, 793, 600)" letterSpacing="1.3">
          {`SECURE · ${orderId || 'DOC'} · NOT FOR REPRODUCTION · `.repeat(8)}
        </text>

        <path d="M0,9 Q60,3 120,9 Q180,15 240,9 Q300,3 360,9 Q420,15 480,9 Q540,3 600,9 Q660,15 720,9 Q780,3 820,9"
          fill="none" stroke={color} strokeWidth="0.52" />
        <path d="M0,15 Q60,9 120,15 Q180,21 240,15 Q300,9 360,15 Q420,21 480,15 Q540,9 600,15 Q660,21 720,15 Q780,9 820,15"
          fill="none" stroke={color} strokeWidth="0.24" opacity="0.65" />

        <line x1="0" y1="500" x2="820" y2="500" stroke={color} strokeWidth="0.2" strokeDasharray="2 10" />
        <line x1="410" y1="0" x2="410" y2="980" stroke={color} strokeWidth="0.2" strokeDasharray="2 10" />

        {Array.from({ length: 12 }, (_, i) => (
          <g key={i}>
            <line x1={754 + i * 5} y1="44" x2={754 + i * 5} y2="94" stroke={color} strokeWidth="0.2" />
            <line x1="754" y1={44 + i * 4} x2="814" y2={44 + i * 4} stroke={color} strokeWidth="0.2" />
          </g>
        ))}
      </g>
    </svg>
  )
}

// ─── PDF background builder — covers full A4 page ──────────────────────────────
function buildPdfBackground(securityHash) {
  const W = 595, H = 842
  const shapes = []
  const color = '#8b5e2a'

  for (let x = -200; x < W + H; x += 22) {
    shapes.push({ type: 'line', x1: x, y1: 0, x2: x + H, y2: H, lineWidth: 0.17, lineColor: color })
  }

  ;[60, 100, 144, 190, 238, 288, 340].forEach(r => {
    shapes.push({ type: 'ellipse', x: W / 2, y: H / 2, r1: r, r2: r, lineWidth: 0.22, lineColor: color, dash: { length: 3, space: 8 } })
  })

  const corners = [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60]]
  corners.forEach(([cx, cy]) => {
    ;[12, 20, 30, 42].forEach(r => {
      shapes.push({ type: 'ellipse', x: cx, y: cy, r1: r, r2: r, lineWidth: 0.18, lineColor: color, dash: { length: 2, space: 5 } })
    })
  })

  shapes.push({ type: 'rect', x: 6,  y: 6,  w: W - 12, h: H - 12, lineWidth: 0.42, lineColor: color, r: 0 })
  shapes.push({ type: 'rect', x: 12, y: 12, w: W - 24, h: H - 24, lineWidth: 0.18, lineColor: color, r: 0 })

  const textRows = Array.from({ length: 32 }, (_, i) => ({
    text: `LOUABLE FACTORY · SECURE · ${securityHash} · NOT FOR REPRODUCTION · `.repeat(3),
    fontSize: 5,
    color,
    opacity: 0.048,
    absolutePosition: { x: 0, y: 14 + i * 28 },
    characterSpacing: 0.7,
  }))

  return [
    { canvas: shapes, opacity: 0.052, absolutePosition: { x: 0, y: 0 } },
    ...textRows
  ]
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  .inv-root {
    min-height: 100vh; font-family: 'DM Sans', sans-serif;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 40px 20px 80px;
  }
  .inv-root.dark  { background: #111010; color: #f0ece4; }
  .inv-root.light { background: #f7f4ef; color: #1a1510; }

  .inv-paper {
    width: 100%; max-width: 820px; border-radius: 4px;
    overflow: hidden; position: relative;
  }
  .dark .inv-paper  { background: #1c1b19; box-shadow: 0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,165,116,0.15); }
  .light .inv-paper { background: #ffffff; box-shadow: 0 24px 80px rgba(44,24,16,0.12), 0 0 0 1px rgba(212,165,116,0.2); }

  .inv-content-layer { position: relative; z-index: 1; }

  .inv-topbar { height: 5px; background: linear-gradient(90deg, #c4924f 0%, #e8c48a 50%, #c4924f 100%); }

  .inv-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 28px 48px 24px; border-bottom: 1px solid;
  }
  .dark .inv-header  { border-color: #2e2c28; }
  .light .inv-header { border-color: #ede8e0; }

  .inv-header-brand { display: flex; align-items: center; gap: 14px; }

  .inv-logo { height: 52px; width: auto; object-fit: contain; flex-shrink: 0; display: block; }
  .dark .inv-logo { filter: brightness(1.15) drop-shadow(0 0 2px rgba(212,165,116,0.2)); }

  .inv-logo-sep {
    width: 1px; height: 40px; flex-shrink: 0;
    background: linear-gradient(to bottom, transparent, #c4924f80, transparent);
  }
  .inv-brand-name {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 700; color: #c4924f; line-height: 1.1;
  }
  .inv-brand-sub {
    font-size: 9.5px; font-weight: 500; letter-spacing: 2.5px;
    text-transform: uppercase; opacity: 0.4; margin-top: 4px;
  }

  .inv-doc-meta { text-align: right; flex-shrink: 0; }
  .inv-doc-label {
    font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 600;
    letter-spacing: 4px; text-transform: uppercase; color: #c4924f; opacity: 0.25; line-height: 1;
  }
  .inv-doc-num  { font-family: 'DM Mono', monospace; font-size: 12.5px; margin-top: 8px; opacity: 0.65; }
  .inv-doc-date { font-size: 11.5px; margin-top: 4px; opacity: 0.4; }

  .inv-status-strip {
    display: flex; align-items: center; gap: 10px; padding: 11px 48px;
    font-size: 10.5px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase;
  }
  .inv-status-strip.verified  { background: rgba(107,158,95,0.09); color: #6b9e5f; border-bottom: 1px solid rgba(107,158,95,0.18); }
  .inv-status-strip.pending   { background: rgba(212,165,116,0.12); color: #c4924f; border-bottom: 1px solid rgba(212,165,116,0.25); }
  .inv-status-strip.verifying { background: rgba(212,165,116,0.07); color: #c4924f; border-bottom: 1px solid rgba(212,165,116,0.14); }
  .inv-status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  .inv-status-strip.verified .inv-status-dot { box-shadow: 0 0 0 3px rgba(107,158,95,0.18); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .inv-status-strip.verifying .inv-status-dot { animation: pulse 1.4s ease infinite; }
  .inv-status-hash { margin-left: auto; font-family: 'DM Mono', monospace; font-weight: 400; font-size: 9.5px; opacity: 0.5; }

  .inv-body { padding: 32px 48px; display: grid; gap: 32px; }

  .inv-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }

  .inv-info-block-label {
    font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;
    color: #c4924f; margin-bottom: 11px; padding-bottom: 7px; border-bottom: 1px solid;
  }
  .dark .inv-info-block-label  { border-color: #2e2c28; }
  .light .inv-info-block-label { border-color: #ede8e0; }

  .inv-info-row {
    display: flex; justify-content: space-between; gap: 12px;
    padding: 5px 0; font-size: 13px; border-bottom: 1px solid;
  }
  .dark .inv-info-row  { border-color: rgba(255,255,255,0.04); }
  .light .inv-info-row { border-color: rgba(0,0,0,0.04); }
  .inv-info-row:last-child { border-bottom: none; }
  .inv-info-key { opacity: 0.42; font-weight: 400; flex-shrink: 0; }
  .inv-info-val { font-weight: 500; text-align: right; word-break: break-all; }
  .inv-info-val.mono { font-family: 'DM Mono', monospace; font-size: 11px; }

  .inv-table-wrap { border-radius: 3px; overflow: hidden; border: 1px solid; }
  .dark .inv-table-wrap  { border-color: #2e2c28; }
  .light .inv-table-wrap { border-color: #ede8e0; }

  .inv-table-head {
    display: grid; grid-template-columns: 1fr 56px 110px 110px;
    padding: 10px 20px; font-size: 9.5px; font-weight: 600; letter-spacing: 1.8px;
    text-transform: uppercase; color: #fff;
    background: linear-gradient(90deg, #2c1810 0%, #3d2214 100%);
  }
  .inv-table-head span:not(:first-child) { text-align: right; }

  .inv-table-row {
    display: grid; grid-template-columns: 1fr 56px 110px 110px;
    padding: 13px 20px; font-size: 13px; border-top: 1px solid; transition: background 0.15s;
  }
  .dark .inv-table-row  { border-color: #2e2c28; }
  .light .inv-table-row { border-color: #f0ebe2; }
  .dark .inv-table-row:nth-child(even)  { background: rgba(255,255,255,0.018); }
  .light .inv-table-row:nth-child(even) { background: rgba(196,146,79,0.03); }
  .inv-table-row span:not(:first-child) { text-align: right; }
  .inv-item-name  { font-weight: 500; }
  .inv-item-qty   { font-family: 'DM Mono', monospace; font-size: 12px; opacity: 0.52; }
  .inv-item-price { opacity: 0.52; font-size: 12px; }
  .inv-item-total { font-weight: 600; }

  .inv-totals { display: flex; flex-direction: column; align-items: flex-end; }
  .inv-total-row { display: flex; justify-content: flex-end; gap: 48px; padding: 7px 0; font-size: 13px; width: 320px; }
  .inv-total-row + .inv-total-row { border-top: 1px dashed; }
  .dark .inv-total-row + .inv-total-row  { border-color: #2e2c28; }
  .light .inv-total-row + .inv-total-row { border-color: #ede8e0; }
  .inv-total-key { opacity: 0.42; min-width: 90px; }
  .inv-total-val { font-weight: 500; min-width: 100px; text-align: right; font-family: 'DM Mono', monospace; font-size: 12.5px; }
  .inv-total-val.green { color: #6b9e5f; }

  .inv-grand-total {
    width: 320px; margin-top: 6px; padding: 13px 0;
    border-top: 2px solid #c4924f;
    display: flex; justify-content: space-between; align-items: center;
  }
  .inv-grand-label  { font-size: 9.5px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; opacity: 0.42; }
  .inv-grand-amount { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: #c4924f; }

  .inv-footer {
    padding: 16px 48px; display: flex; justify-content: space-between; align-items: center;
    font-size: 9.5px; border-top: 1px solid; opacity: 0.38;
    font-family: 'DM Mono', monospace; letter-spacing: 0.5px; line-height: 1.7;
  }
  .dark .inv-footer  { border-color: #2e2c28; }
  .light .inv-footer { border-color: #ede8e0; }

  .inv-actions { display: flex; justify-content: center; gap: 12px; padding: 28px 0 0; flex-wrap: wrap; }
  .inv-btn {
    display: flex; align-items: center; gap: 8px; padding: 11px 26px; border-radius: 3px;
    font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600; letter-spacing: 1px;
    cursor: pointer; border: none; transition: all 0.2s ease; text-transform: uppercase;
  }
  .inv-btn:hover  { transform: translateY(-1px); }
  .inv-btn:active { transform: translateY(0); }
  .inv-btn-primary   { background: #c4924f; color: #fff; }
  .inv-btn-primary:hover   { background: #d4a45e; box-shadow: 0 6px 20px rgba(196,146,79,0.35); }
  .inv-btn-secondary { background: transparent; color: #c4924f; border: 1.5px solid #c4924f; }
  .inv-btn-secondary:hover { background: rgba(196,146,79,0.08); }
  .inv-btn-ghost     { background: transparent; border: 1.5px solid currentColor; }
  .dark .inv-btn-ghost  { color: #f0ece4; opacity: 0.5; }
  .light .inv-btn-ghost { color: #1a1510; opacity: 0.5; }
  .inv-btn-ghost:hover { opacity: 0.85; }

  .inv-error { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 80px 48px; gap: 16px; }
  .inv-error-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(231,111,81,0.12); color: #e76f51; display: flex; align-items: center; justify-content: center; font-size: 28px; }
  .inv-error h2 { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 600; margin: 0; }
  .inv-error p  { opacity: 0.5; font-size: 14px; max-width: 340px; line-height: 1.6; margin: 0; }

  @media print {
    .inv-actions, .no-print { display: none !important; }
    .inv-root { background: white !important; padding: 0; }
    .inv-paper { box-shadow: none !important; }
  }
`

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OrderSuccess() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { theme } = useTheme()
  const { lang }  = useLanguage()
  const [verificationStatus, setVerificationStatus] = useState('verifying')
  const { orderId, orderData } = location.state || {}

  // CRITICAL FIX: Define isPaid based on actual order status from props
  const orderStatus = orderData?.status || 'pending'
  const paymentStatus = orderData?.paymentStatus || 'pending'
  const isPaid = orderStatus === 'completed' || paymentStatus === 'paid' || paymentStatus === 'completed'

  const invoiceNumber = useMemo(() => {
    if (!orderId) return 'N/A'
    return `INV-${(orderId.split('_')[1] || orderId).toUpperCase()}`
  }, [orderId])

  const securityHash = useMemo(() => {
    if (!orderId || !orderData) return 'INVALID'
    const s = `${orderId}${orderData.totalPrice}${orderData.timestamp || Date.now()}`
    let h = 0
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h }
    return Math.abs(h).toString(16).toUpperCase().padStart(8, '0')
  }, [orderId, orderData])

  const now = useMemo(() => new Date(), [])
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB'

  const creationDate = useMemo(() => ({
    short:   now.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
    full:    now.toLocaleString(locale, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    shortEN: dateShortEN(now),
    iso:     now.toISOString(),
    file:    now.toLocaleDateString('en-GB').replace(/\//g, '-'),
  }), [now, locale])

  const formatPrice = useCallback((p) => `EGP ${(parseFloat(p) || 0).toFixed(2)}`, [])
  const safePrice   = useCallback((p) => parseFloat(p) || 0, [])

  useEffect(() => {
    if (!orderId || !orderData) { 
      setVerificationStatus('invalid')
      return
    }
    
    // Set status based on actual order status (not hardcoded)
    if (isPaid) {
      setVerificationStatus('verified')
    } else {
      setVerificationStatus('pending')
    }
  }, [orderId, orderData, isPaid])

  // ── PDF ──────────────────────────────────────────────────────────────────────
  const generatePDF = useCallback(async () => {
    if (!orderData || !orderId) return
    try {
      // CRITICAL FIX: Dynamic status for PDF
      const statusText = isPaid ? 'PAID' : 'PENDING'
      const statusColor = isPaid ? '#6b9e5f' : '#c4924f'
      
      const items    = orderData.items || []
      const discount = safePrice(orderData.discount)
      const shipping = safePrice(orderData.shippingCost)

      let logoB64 = null
      try { logoB64 = await imageToBase64(logoLight) }
      catch (e) { console.warn('Logo skipped:', e) }

      const doc = {
        pageSize: 'A4',
        pageMargins: [48, 48, 48, 56],
        background: () => buildPdfBackground(securityHash),
        info: {
          title: `Invoice ${invoiceNumber}`, author: 'Louable Factory',
          subject: 'Tax Invoice', creator: 'Louable Secure System', creationDate: new Date()
        },
        content: [
          // Top accent bar
          { canvas: [{ type: 'rect', x: 0, y: 0, w: 499, h: 4, r: 0, color: '#c4924f' }], margin: [0, 0, 0, 18] },

          // Header
          {
            columns: [
              {
                columns: [
                  logoB64 ? { image: logoB64, width: 44, height: 44, margin: [0, 0, 8, 0] } : { text: '', width: 0 },
                  logoB64 ? { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 0, y2: 34, lineWidth: 0.7, lineColor: '#c4924f' }], width: 10, margin: [0, 5, 8, 0] } : { text: '', width: 0 },
                  {
                    stack: [
                      { text: 'LOUABLE', fontSize: 17, bold: true, color: '#c4924f' },
                      { text: 'FACTORY', fontSize: 17, bold: true, color: '#2C1810', margin: [0, -4, 0, 0] },
                      { text: 'PREMIUM CHOCOLATES', fontSize: 6, color: '#999', letterSpacing: 2, margin: [0, 3, 0, 0] }
                    ]
                  }
                ], columnGap: 0, width: '*'
              },
              {
                stack: [
                  { text: 'TAX INVOICE', fontSize: 18, bold: true, color: '#2C1810', alignment: 'right' },
                  { text: invoiceNumber, fontSize: 10, color: '#c4924f', alignment: 'right', margin: [0, 5, 0, 0] },
                  { text: creationDate.shortEN, fontSize: 9, color: '#999', alignment: 'right', margin: [0, 3, 0, 0] }
                ], width: 'auto'
              }
            ],
            margin: [0, 0, 0, 14]
          },

          // Divider
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.6, lineColor: '#e8e0d4' }], margin: [0, 0, 0, 14] },

          // Billed To / Order Details
          {
            columns: [
              {
                stack: [
                  { text: 'BILLED TO', fontSize: 7, bold: true, color: '#c4924f', letterSpacing: 2, margin: [0, 0, 0, 7] },
                  { text: pdfSafeText(orderData.customerName) || 'Guest', fontSize: 12, bold: true, color: '#2C1810' },
                  orderData.customerEmail ? { text: orderData.customerEmail, fontSize: 9.5, color: '#666', margin: [0, 3, 0, 0] } : {},
                  orderData.customerPhone ? { text: String(orderData.customerPhone), fontSize: 9.5, color: '#666', margin: [0, 2, 0, 0] } : {},
                  orderData.governorate   ? { text: pdfSafeText(orderData.governorate), fontSize: 9.5, color: '#666', margin: [0, 2, 0, 0] } : {}
                ]
              },
              {
                stack: [
                  { text: 'ORDER DETAILS', fontSize: 7, bold: true, color: '#c4924f', letterSpacing: 2, margin: [0, 0, 0, 7] },
                  {
                    table: {
                      widths: [60, '*'],
                      body: [
                        [{ text: 'Invoice No', fontSize: 9, color: '#999', border: [false,false,false,false] }, { text: invoiceNumber, fontSize: 9, bold: true, border: [false,false,false,false] }],
                        [{ text: 'Order ID',   fontSize: 9, color: '#999', border: [false,false,false,false] }, { text: orderId, fontSize: 7.5, border: [false,false,false,false] }],
                        [{ text: 'Date',       fontSize: 9, color: '#999', border: [false,false,false,false] }, { text: creationDate.shortEN, fontSize: 9, border: [false,false,false,false] }],
                        [{ text: 'Payment',    fontSize: 9, color: '#999', border: [false,false,false,false] }, { text: pdfSafeText(orderData.paymentMethod) || 'N/A', fontSize: 9, border: [false,false,false,false] }],
                        // CRITICAL FIX: Use dynamic statusText and statusColor
                        [{ text: 'Status',     fontSize: 9, color: '#999', border: [false,false,false,false] }, { text: statusText, fontSize: 9, bold: true, color: statusColor, border: [false,false,false,false] }]
                      ]
                    }, layout: 'noBorders'
                  }
                ]
              }
            ],
            margin: [0, 0, 0, 20]
          },

          // Items section header
          { text: 'ITEMS', fontSize: 7, bold: true, color: '#c4924f', letterSpacing: 2, margin: [0, 0, 0, 7] },

          // Items table
          {
            table: {
              headerRows: 1,
              widths: ['*', 38, 90, 88],
              body: [
                [
                  { text: 'DESCRIPTION', bold: true, fontSize: 8, color: 'white', border: [false,false,false,false] },
                  { text: 'QTY',         bold: true, fontSize: 8, color: 'white', alignment: 'center', border: [false,false,false,false] },
                  { text: 'UNIT PRICE',  bold: true, fontSize: 8, color: 'white', alignment: 'right',  border: [false,false,false,false] },
                  { text: 'AMOUNT',      bold: true, fontSize: 8, color: 'white', alignment: 'right',  border: [false,false,false,false] }
                ],
                ...items.map(item => [
                  { text: pdfSafeText(item.name) || 'Product', fontSize: 10, bold: true, color: '#2C1810', border: [false,false,false,false] },
                  { text: String(item.quantity || 1), fontSize: 10, alignment: 'center', color: '#555', border: [false,false,false,false] },
                  { text: formatPrice(item.price), fontSize: 10, alignment: 'right', color: '#555', border: [false,false,false,false] },
                  { text: formatPrice((item.price || 0) * (item.quantity || 1)), fontSize: 10, alignment: 'right', bold: true, color: '#2C1810', border: [false,false,false,false] }
                ])
              ]
            },
            layout: {
              fillColor: (row) => row === 0 ? '#2C1810' : (row % 2 === 0 ? '#faf8f5' : null),
              hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.45,
              vLineWidth: () => 0,
              hLineColor: () => '#e8e0d4',
              paddingTop: () => 9, paddingBottom: () => 9,
              paddingLeft: () => 11, paddingRight: () => 11
            },
            margin: [0, 0, 0, 18]
          },

          // Totals
          {
            columns: [
              { text: '' },
              {
                width: 230,
                stack: [
                  {
                    table: {
                      widths: ['*', 90],
                      body: [
                        [
                          { text: 'Subtotal', fontSize: 10, color: '#666', border: [false,false,false,true], borderColor: [null,null,null,'#e8e0d4'], margin: [0,0,0,5] },
                          { text: formatPrice(orderData.subtotal), fontSize: 10, alignment: 'right', border: [false,false,false,true], borderColor: [null,null,null,'#e8e0d4'], margin: [0,0,0,5] }
                        ],
                        ...(discount > 0 ? [[
                          { text: 'Discount', fontSize: 10, color: '#666', border: [false,false,false,true], borderColor: [null,null,null,'#e8e0d4'], margin: [0,5,0,5] },
                          { text: `-${formatPrice(discount)}`, fontSize: 10, alignment: 'right', color: '#6b9e5f', border: [false,false,false,true], borderColor: [null,null,null,'#e8e0d4'], margin: [0,5,0,5] }
                        ]] : []),
                        [
                          { text: 'Shipping', fontSize: 10, color: '#666', border: [false,false,false,true], borderColor: [null,null,null,'#e8e0d4'], margin: [0,5,0,5] },
                          { text: shipping === 0 ? 'FREE' : formatPrice(shipping), fontSize: 10, alignment: 'right', color: shipping === 0 ? '#6b9e5f' : '#2C1810', border: [false,false,false,true], borderColor: [null,null,null,'#e8e0d4'], margin: [0,5,0,5] }
                        ]
                      ]
                    },
                    layout: 'noBorders',
                    margin: [0, 0, 0, 0]
                  },
                  {
                    columns: [
                      { text: 'TOTAL DUE', fontSize: 11.5, bold: true, color: '#2C1810' },
                      { text: formatPrice(orderData.totalPrice), fontSize: 14, bold: true, color: '#c4924f', alignment: 'right' }
                    ],
                    margin: [0, 10, 0, 0],
                  }
                ]
              }
            ],
            margin: [0, 0, 0, 6]
          },

          // Gold line above total
          {
            columns: [
              { text: '', width: '*' },
              {
                width: 230,
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 1.5, lineColor: '#c4924f' }],
                margin: [0, -18, 0, 24]
              }
            ]
          },

          // Footer divider
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.6, lineColor: '#e8e0d4' }], margin: [0, 0, 0, 10] },

          // Footer text
          {
            columns: [
              {
                stack: [
                  { text: 'Thank you for your order.', fontSize: 9.5, bold: true, color: '#2C1810' },
                  { text: 'Questions? Contact us at hello@louablefactory.com', fontSize: 8, color: '#999', margin: [0, 3, 0, 0] }
                ]
              },
              {
                stack: [
                  { text: `Hash: ${securityHash}`, fontSize: 7, color: '#bbb', alignment: 'right' },
                  { text: `Generated: ${creationDate.iso.slice(0,19).replace('T',' ')} UTC`, fontSize: 6.5, color: '#bbb', alignment: 'right', margin: [0, 3, 0, 0] },
                  { text: 'Computer-generated · No signature required', fontSize: 6.5, color: '#bbb', italics: true, alignment: 'right', margin: [0, 3, 0, 0] }
                ]
              }
            ]
          }
        ],
        defaultStyle: { font: 'Roboto', fontSize: 11, color: '#2C1810' }
      }

      pdfMake.createPdf(doc).download(`Louable_Invoice_${invoiceNumber}_${creationDate.file}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Failed to generate PDF. Please use the print option.')
    }
  }, [orderData, orderId, invoiceNumber, securityHash, creationDate, formatPrice, safePrice, isPaid])

  const handlePrint = useCallback(() => window.print(), [])

  // ── Invalid ──────────────────────────────────────────────────────────────────
  if (verificationStatus === 'invalid') {
    return (
      <>
        <style>{css}</style>
        <div className={`inv-root ${theme}`}>
          <div className="inv-paper" style={{ maxWidth: 520 }}>
            <div className="inv-topbar" style={{ background: '#e76f51' }} />
            <div className="inv-error">
              <div className="inv-error-icon">!</div>
              <h2>Order Not Found</h2>
              <p>Order information is missing or has expired. Please check your confirmation email.</p>
              <button className="inv-btn inv-btn-primary" onClick={() => navigate('/home')}>Return Home</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  const discount = safePrice(orderData?.discount)
  const shipping  = safePrice(orderData?.shippingCost)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>
      <div className={`inv-root ${theme}`}>
        <div style={{ width: '100%', maxWidth: 820 }}>
          <div className="inv-paper">

            {/* Security layer */}
            <SecurityLayer
              orderId={orderId}
              securityHash={securityHash}
              isDark={theme === 'dark'}
            />

            {/* Invoice content */}
            <div className="inv-content-layer">
              <div className="inv-topbar" />

              {/* Header */}
              <div className="inv-header">
                <div className="inv-header-brand">
                  <img src={logoLight} alt="Louable Factory" className="inv-logo" />
                  <div className="inv-logo-sep" />
                  <div>
                    <div className="inv-brand-name">Louable Factory</div>
                    <div className="inv-brand-sub">Premium Chocolates</div>
                  </div>
                </div>
                <div className="inv-doc-meta">
                  <div className="inv-doc-label">Invoice</div>
                  <div className="inv-doc-num">{invoiceNumber}</div>
                  <div className="inv-doc-date">{creationDate.short}</div>
                </div>
              </div>

              {/* Status - FIXED to show pending for COD */}
              <div className={`inv-status-strip ${verificationStatus}`}>
                <div className="inv-status-dot" />
                {verificationStatus === 'verified' 
                  ? 'Payment Confirmed — Paid in Full' 
                  : verificationStatus === 'pending'
                  ? 'Payment Pending — Cash on Delivery'
                  : 'Verifying Payment…'}
                <span className="inv-status-hash">Hash: {securityHash}</span>
              </div>

              {/* Body */}
              <div className="inv-body">

                {/* Info */}
                <div className="inv-info-grid">
                  <div>
                    <div className="inv-info-block-label">Billed To</div>
                    <div className="inv-info-row"><span className="inv-info-key">Name</span><span className="inv-info-val">{orderData?.customerName || 'Guest'}</span></div>
                    {orderData?.customerEmail && <div className="inv-info-row"><span className="inv-info-key">Email</span><span className="inv-info-val">{orderData.customerEmail}</span></div>}
                    {orderData?.customerPhone && <div className="inv-info-row"><span className="inv-info-key">Phone</span><span className="inv-info-val">{orderData.customerPhone}</span></div>}
                    {orderData?.governorate   && <div className="inv-info-row"><span className="inv-info-key">Region</span><span className="inv-info-val">{orderData.governorate}</span></div>}
                  </div>
                  <div>
                    <div className="inv-info-block-label">Order Details</div>
                    <div className="inv-info-row"><span className="inv-info-key">Invoice No.</span><span className="inv-info-val mono">{invoiceNumber}</span></div>
                    <div className="inv-info-row"><span className="inv-info-key">Order ID</span><span className="inv-info-val mono" style={{fontSize:10.5}}>{orderId}</span></div>
                    <div className="inv-info-row"><span className="inv-info-key">Date</span><span className="inv-info-val">{creationDate.short}</span></div>
                    <div className="inv-info-row"><span className="inv-info-key">Payment</span><span className="inv-info-val">{orderData?.paymentMethod || 'N/A'}</span></div>
                    {/* CRITICAL FIX: Dynamic status display */}
                    <div className="inv-info-row">
                      <span className="inv-info-key">Status</span>
                      <span className="inv-info-val" style={{
                        color: isPaid ? '#6b9e5f' : '#c4924f', 
                        fontWeight: 600
                      }}>
                        {isPaid ? 'PAID' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="inv-table-wrap">
                    <div className="inv-table-head">
                      <span>Description</span>
                      <span>Qty</span>
                      <span>Unit Price</span>
                      <span>Amount</span>
                    </div>
                    {(orderData?.items || []).map((item, i) => (
                      <div className="inv-table-row" key={i}>
                        <span className="inv-item-name">{item.name}</span>
                        <span className="inv-item-qty" style={{textAlign:'right'}}>×{item.quantity || 1}</span>
                        <span className="inv-item-price">{formatPrice(item.price)}</span>
                        <span className="inv-item-total">{formatPrice((item.price || 0) * (item.quantity || 1))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="inv-totals">
                  <div className="inv-total-row">
                    <span className="inv-total-key">Subtotal</span>
                    <span className="inv-total-val">{formatPrice(orderData?.subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="inv-total-row">
                      <span className="inv-total-key">Discount</span>
                      <span className="inv-total-val green">−{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="inv-total-row">
                    <span className="inv-total-key">Shipping</span>
                    <span className="inv-total-val" style={shipping === 0 ? {color:'#6b9e5f'} : {}}>
                      {shipping === 0 ? 'FREE' : formatPrice(shipping)}
                    </span>
                  </div>
                  <div className="inv-grand-total">
                    <span className="inv-grand-label">Total Due</span>
                    <span className="inv-grand-amount">{formatPrice(orderData?.totalPrice)}</span>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="inv-footer">
                <div>
                  <div>Thank you for your order, {orderData?.customerName?.split(' ')[0] || 'valued customer'}.</div>
                  <div>Louable Factory · Premium Chocolates · hello@louablefactory.com</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div>Hash: {securityHash} · {orderId}</div>
                  <div>{creationDate.iso.slice(0,19).replace('T',' ')} UTC</div>
                </div>
              </div>

            </div>
          </div>

          {/* Actions */}
          <div className="inv-actions no-print">
            <button className="inv-btn inv-btn-ghost"     onClick={() => navigate('/home')}>← Back to Shop</button>
            <button className="inv-btn inv-btn-secondary" onClick={handlePrint}>🖨 Print</button>
            <button className="inv-btn inv-btn-primary"   onClick={generatePDF}>⬇ Download PDF</button>
          </div>

        </div>
      </div>
    </>
  )
}