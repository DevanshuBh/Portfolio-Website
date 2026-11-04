// Hand-drawn glyphs for app icons, status bar and UI chrome.

export const Glyph = {
  person: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="23" r="10" fill="#6e7480" />
      <path d="M12 50c1.5-10 9-15.5 18-15.5S46.5 40 48 50z" fill="#6e7480" />
    </svg>
  ),
  briefcase: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path
        d="M23 18v-3.2c0-1.6 1.3-2.8 2.8-2.8h8.4c1.6 0 2.8 1.3 2.8 2.8V18"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
      />
      <rect x="10" y="18" width="40" height="30" rx="6" fill="#fff" />
      <rect x="10" y="29" width="40" height="3" fill="rgba(0,0,0,.18)" />
      <rect x="26" y="26.5" width="8" height="8" rx="2" fill="#2f6fe8" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path
        d="M22 19 11 30l11 11M38 19l11 11-11 11M33.5 14.5l-7 31"
        fill="none"
        stroke="#fff"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="30" cy="30" r="19" fill="none" stroke="#e9eaee" strokeWidth="6" strokeDasharray="5.97 5.97" />
      <circle cx="30" cy="30" r="16" fill="#e9eaee" />
      <circle cx="30" cy="30" r="11" fill="#8a8f98" />
      <circle cx="30" cy="30" r="5.5" fill="#e9eaee" />
    </svg>
  ),
  cap: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path d="M30 13 6 24l24 11 24-11z" fill="#fff" />
      <path d="M17 30v9c0 3.9 5.8 7 13 7s13-3.1 13-7v-9l-13 6z" fill="#fff" />
      <path d="M50 25.5V38" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="50" cy="40" r="2.6" fill="#fff" />
    </svg>
  ),
  wallet: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <rect x="9" y="13" width="42" height="26" rx="4" fill="#3d8bfd" />
      <rect x="9" y="18" width="42" height="26" rx="4" fill="#ffc40a" />
      <rect x="9" y="23" width="42" height="26" rx="4" fill="#34c759" />
      <rect x="9" y="28" width="42" height="26" rx="4" fill="#ff5b4f" />
      <path d="M9 33h11c2 0 3 1 4 3 1.2 2.3 3.2 3.5 6 3.5s4.8-1.2 6-3.5c1-2 2-3 4-3h11v17a4 4 0 0 1-4 4H13a4 4 0 0 1-4-4z" fill="#d8d6cf" />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path d="M17 8h18l11 11v31a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z" fill="#fff" stroke="#d3d6dc" strokeWidth="1.2" />
      <path d="M35 8v8a3 3 0 0 0 3 3h8" fill="#e4e7ec" />
      <rect x="20" y="25" width="20" height="2.6" rx="1.3" fill="#c3c8d0" />
      <rect x="20" y="30" width="16" height="2.6" rx="1.3" fill="#c3c8d0" />
      <rect x="20" y="35" width="18" height="2.6" rx="1.3" fill="#c3c8d0" />
      <rect x="11" y="40" width="26" height="11" rx="2.5" fill="#ff3b30" />
      <text x="24" y="48.6" textAnchor="middle" fontSize="8.4" fontWeight="800" fill="#fff" fontFamily="-apple-system, Inter, sans-serif">
        CV
      </text>
    </svg>
  ),
  map: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <rect width="60" height="60" fill="#e9f0dc" />
      <path d="M0 40 60 22v12L0 52z" fill="#bfe0a3" />
      <path d="M38 0h22v18L45 22z" fill="#a8d5f5" />
      <path d="M-4 30 64 12" stroke="#fff" strokeWidth="7" />
      <path d="M22 -4 34 64" stroke="#ffd34d" strokeWidth="6" />
      <path d="M22 -4 34 64" stroke="#f2b632" strokeWidth="1.2" />
      <circle cx="30" cy="27" r="9.5" fill="#0a84ff" stroke="#fff" strokeWidth="3" />
      <path d="M30 22.5 34 31l-4-2-4 2z" fill="#fff" />
    </svg>
  ),
  bubble: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path
        d="M30 11c-11.6 0-21 7.6-21 17 0 5.2 2.9 9.8 7.4 12.9-.4 3-2 5.8-4.3 7.6 4.3.3 8.4-1.2 11.4-3.8 2.1.5 4.2.8 6.5.8 11.6 0 21-7.6 21-17S41.6 11 30 11z"
        fill="#fff"
      />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
      />
    </svg>
  ),
  gmail: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path d="M9 19.5v24.5a3 3 0 0 0 3 3h6V27.5z" fill="#4285f4" />
      <path d="M51 19.5v24.5a3 3 0 0 1-3 3h-6V27.5z" fill="#34a853" />
      <path d="M9 19.5c0-3.7 4.2-5.8 7.2-3.6L30 26.3l13.8-10.4c3-2.2 7.2-.1 7.2 3.6L42 27.5 30 36.5l-12-9z" fill="#ea4335" />
      <path d="M9 19.5c0-3.7 4.2-5.8 7.2-3.6l1.8 1.4v10.2z" fill="#c5221f" />
      <path d="M51 19.5c0-3.7-4.2-5.8-7.2-3.6L42 17.3v10.2z" fill="#fbbc04" />
    </svg>
  ),
  compass: (
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <defs>
        <linearGradient id="saf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1fc0ff" />
          <stop offset="1" stopColor="#1462e8" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="30" r="24" fill="url(#saf)" />
      <circle cx="30" cy="30" r="21" fill="none" stroke="#fff" strokeWidth="2.4" strokeDasharray="0.9 2.4" opacity=".85" />
      <g transform="rotate(45 30 30)">
        <path d="M30 11 34 30h-8z" fill="#ff3b30" />
        <path d="M30 49 26 30h8z" fill="#fff" />
      </g>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 512 512" aria-hidden="true">
      <path
        fill="#fff"
        d="M256 32C132.3 32 32 134.9 32 261.7c0 101.5 64.2 187.5 153.2 217.9a17.56 17.56 0 003.8.4c8.3 0 11.5-6.1 11.5-11.4 0-5.5-.2-19.9-.3-39.1a102.4 102.4 0 01-22.6 2.7c-43.1 0-52.9-33.5-52.9-33.5-10.2-26.5-24.9-33.6-24.9-33.6-19.5-13.7-.1-14.1 1.4-14.1h.1c22.5 2 34.3 23.8 34.3 23.8 11.2 19.6 26.2 25.1 39.6 25.1a63 63 0 0025.6-6c2-14.8 7.8-24.9 14.2-30.7-49.7-5.8-102-25.5-102-113.5 0-25.1 8.7-45.6 23-61.6-2.3-5.8-10-29.2 2.2-60.8a18.64 18.64 0 015-.5c8.1 0 26.4 3.1 56.6 24.1a208.21 208.21 0 01112.2 0c30.2-21 48.5-24.1 56.6-24.1a18.64 18.64 0 015 .5c12.2 31.6 4.5 55 2.2 60.8 14.3 16.1 23 36.6 23 61.6 0 88.2-52.4 107.6-102.3 113.3 8 7.1 15.2 21.1 15.2 42.5 0 30.7-.3 55.5-.3 63 0 5.4 3.1 11.5 11.4 11.5a19.35 19.35 0 004-.4C415.9 449.2 480 363.1 480 261.7 480 134.9 379.7 32 256 32z"
      />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M7.1 9.5h-2.6V19h2.6V9.5zM5.8 5.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM19.5 13.6c0-2.6-.6-4.3-3.5-4.3-1.4 0-2.3.6-2.7 1.4V9.5h-2.5V19h2.6v-4.7c0-1.2.2-2.4 1.8-2.4 1.5 0 1.6 1.4 1.6 2.5V19h2.7v-5.4z"
      />
    </svg>
  ),
  kaggle: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#fff"
        d="M7.998 0h-2.4c-.233 0-.348.118-.348.352v23.295c0 .235.115.352.348.352h2.401c.232 0 .349-.117.349-.352v-5.11l1.427-1.374 5.115 6.59c.137.165.299.247.485.247h3.097c.162 0 .255-.047.278-.141l-.07-.353-6.749-8.494 6.471-6.343c.121-.124.078-.493-.244-.493h-3.201c-.162 0-.324.083-.487.247l-6.123 6.273V.352C8.347.118 8.23 0 7.998 0z"
      />
    </svg>
  ),
  medium: (
    <svg viewBox="0 0 30 24" aria-hidden="true">
      <circle cx="8.5" cy="12" r="6.5" fill="#fff" />
      <ellipse cx="19.3" cy="12" rx="3.3" ry="6.1" fill="#fff" />
      <ellipse cx="25.3" cy="12" rx="1.2" ry="5.5" fill="#fff" />
    </svg>
  ),
  leetcode: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#B3B1B0"
        d="M22 14.355c0-.742-.564-1.346-1.26-1.346H10.676c-.696 0-1.26.604-1.26 1.346s.563 1.346 1.26 1.346H20.74c.696.001 1.26-.603 1.26-1.346z"
      />
      <path
        fill="#E7A41F"
        d="m3.482 18.187 4.313 4.361c.973.979 2.318 1.452 3.803 1.452 1.485 0 2.83-.512 3.805-1.494l2.588-2.637c.51-.514.492-1.365-.039-1.9-.531-.535-1.375-.553-1.884-.039l-2.676 2.607c-.462.467-1.102.662-1.809.662s-1.346-.195-1.81-.662l-4.298-4.363c-.463-.467-.696-1.15-.696-1.863 0-.713.233-1.357.696-1.824l4.285-4.38c.463-.467 1.116-.645 1.822-.645s1.346.195 1.809.662l2.676 2.606c.51.515 1.354.497 1.885-.038.531-.536.549-1.387.039-1.901l-2.588-2.636a4.994 4.994 0 0 0-2.392-1.33l-.034-.007 2.447-2.503c.512-.514.494-1.366-.037-1.901-.531-.535-1.376-.552-1.887-.038l-10.018 10.1C2.509 11.458 2 12.813 2 14.311c0 1.498.509 2.896 1.482 3.876z"
      />
      <path
        fill="#fff"
        d="M8.115 22.814a2.109 2.109 0 0 1-.474-.361c-1.327-1.333-2.66-2.66-3.984-3.997-1.989-2.008-2.302-4.937-.786-7.32a6 6 0 0 1 .839-1.004L13.333.489c.625-.626 1.498-.652 2.079-.067.56.563.527 1.455-.078 2.066-.769.776-1.539 1.55-2.309 2.325-.041.122-.14.2-.225.287-.863.876-1.75 1.729-2.601 2.618-.111.116-.262.186-.372.305-1.423 1.423-2.863 2.83-4.266 4.272-1.135 1.167-1.097 2.938.068 4.127 1.308 1.336 2.639 2.65 3.961 3.974.067.067.136.132.204.198.468.303.474 1.25.183 1.671-.321.465-.74.75-1.333.728-.199-.006-.363-.086-.529-.179z"
      />
    </svg>
  ),
};

// Small SF-Symbol-ish UI icons, drawn on a 24 grid with currentColor.
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const Icon = {
  chevronLeft: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.6" aria-hidden="true">
      <path d="M15 4 7 12l8 8" />
    </svg>
  ),
  chevronRight: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.4" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12 3.39 13.87z" />
    </svg>
  ),
  arrowUp: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.8" aria-hidden="true">
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.6" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  ),
  mail: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
  message: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.5c-5 0-9 3.3-9 7.4 0 2.3 1.2 4.3 3.2 5.7-.2 1.4-.9 2.6-1.9 3.4 1.9.1 3.7-.5 5-1.7.9.2 1.8.3 2.7.3 5 0 9-3.3 9-7.4s-4-7.7-9-7.7z"
      />
    </svg>
  ),
  call: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
      />
    </svg>
  ),
  doc: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.5a7 7 0 0 0-7 7c0 5 7 12 7 12s7-7 7-12a7 7 0 0 0-7-7zm0 9.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z"
      />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  ),
  sparkles: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10 3.5 11.6 8a3 3 0 0 0 1.9 1.9L18 11.5l-4.5 1.6a3 3 0 0 0-1.9 1.9L10 19.5 8.4 15a3 3 0 0 0-1.9-1.9L2 11.5l4.5-1.6A3 3 0 0 0 8.4 8zM18.5 2l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"
      />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" {...stroke} strokeWidth="2.4" aria-hidden="true">
      <path d="M8 7 3 12l5 5M16 7l5 5-5 5" />
    </svg>
  ),
  server: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="4" y="4" width="16" height="7" rx="2" />
      <rect x="4" y="13" width="16" height="7" rx="2" />
      <path d="M8 7.5h.01M8 16.5h.01" strokeWidth="3" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 19a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 10.5z"
      />
    </svg>
  ),
  checklist: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="m4 6.5 1.6 1.6L8.5 5M4 13.5l1.6 1.6 2.9-3.1M11.5 7h8.5M11.5 14h8.5M4 19.5h16" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M12 15V3.5M8 7.5l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
    </svg>
  ),
  flashlight: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M8 3h8v4l-2 4v9a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-9L8 7zM8 7h8M12 13v2" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  paperclip: (
    <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 10V7.5a5 5 0 0 1 10 0V10h.5A1.5 1.5 0 0 1 19 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5v-8A1.5 1.5 0 0 1 6.5 10zm2 0h6V7.5a3 3 0 0 0-6 0z"
      />
    </svg>
  ),
};

export const StatusIcons = () => (
  <span className="sb-icons" aria-hidden="true">
    <svg viewBox="0 0 18 12" width="18" height="12">
      <rect x="0" y="8" width="3" height="4" rx="0.8" fill="currentColor" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" fill="currentColor" />
      <rect x="10" y="3" width="3" height="9" rx="0.8" fill="currentColor" />
      <rect x="15" y="0" width="3" height="12" rx="0.8" fill="currentColor" />
    </svg>
    <svg viewBox="0 0 16 12" width="16" height="12">
      <path
        fill="currentColor"
        d="M8 2.4c2.2 0 4.2.85 5.7 2.25l1.1-1.15A9.7 9.7 0 0 0 8 .8 9.7 9.7 0 0 0 1.2 3.5l1.1 1.15A8.2 8.2 0 0 1 8 2.4zm0 3.3c1.3 0 2.5.5 3.4 1.3l1.1-1.15A6.5 6.5 0 0 0 8 4.1c-1.7 0-3.3.67-4.5 1.75L4.6 7A4.9 4.9 0 0 1 8 5.7zm0 3.2c-.5 0-1 .2-1.3.5L8 10.8l1.3-1.4c-.3-.3-.8-.5-1.3-.5z"
      />
    </svg>
    <svg viewBox="0 0 27 13" width="27" height="13">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.6" fill="none" stroke="currentColor" opacity=".4" />
      <rect x="2" y="2" width="17.5" height="9" rx="2.2" fill="currentColor" />
      <path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" opacity=".45" />
    </svg>
  </span>
);
