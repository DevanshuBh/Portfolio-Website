import { Icon } from '../icons.jsx';
import { education, experience, profile } from '../data.js';

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Noida%2C%20Uttar%20Pradesh%2C%20India';

// A stylised (not geographic) city map for the backdrop.
const CityMap = () => (
  <svg className="map-svg" viewBox="0 0 390 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <rect width="390" height="640" className="map-land" />
    <path className="map-park" d="M20 70h110v80H20zM250 380h120v90H250zM40 470l70-20 30 70-80 20z" />
    <path className="map-water" d="M-20 210c80 10 120 60 150 120s40 140 110 190 120 40 180 40v100H-20z" />
    <g className="map-road-minor">
      <path d="M0 110h390M0 300h390M0 430h390M0 560h390M70 0v640M170 0v640M300 0v640M230 0v640" />
      <path d="M0 40l390 180M0 520l390-240" />
    </g>
    <g className="map-road-major">
      <path d="M-10 250C90 240 200 260 400 200" />
      <path d="M200 -10C210 160 190 320 215 650" />
    </g>
    <g className="map-road-major-in">
      <path d="M-10 250C90 240 200 260 400 200" />
      <path d="M200 -10C210 160 190 320 215 650" />
    </g>
  </svg>
);

const MapsApp = ({ goHome }) => (
  <div className="app app--maps">
    <CityMap />
    <button type="button" className="map-back" onClick={goHome} aria-label="Back to Home">
      {Icon.chevronLeft}
    </button>
    <div className="map-pin" aria-hidden="true">
      <span className="map-pulse" />
      <span className="map-pin-head">
        <img src={profile.avatar} alt="" />
      </span>
      <span className="map-pin-label">{profile.firstName}</span>
    </div>

    <div className="sheet">
      <span className="sheet-grabber" aria-hidden="true" />
      <h1 className="sheet-title">Noida</h1>
      <p className="sheet-sub">Uttar Pradesh, India · where I work</p>
      <div className="sheet-rows">
        <div className="sheet-row">
          <span className="sheet-dot" style={{ background: '#0a84ff' }}>
            {Icon.pin}
          </span>
          <span>
            <b>{experience.company}</b>
            <small>
              {experience.role} · {experience.location}
            </small>
          </span>
        </div>
        <div className="sheet-row">
          <span className="sheet-dot" style={{ background: '#ff9f0a' }}>
            {Icon.pin}
          </span>
          <span>
            <b>{education.short}</b>
            <small>
              {education.degree} · {education.location}
            </small>
          </span>
        </div>
      </div>
      <a className="big-btn big-btn--link" href={MAPS_URL} target="_blank" rel="noopener noreferrer">
        {Icon.external} Open in Google Maps
      </a>
    </div>
  </div>
);

export default MapsApp;
