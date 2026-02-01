import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import { useMemo, useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";
import "./MapView.css";

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import AlbanyData from "../data/Albany.json";
import TroyData from "../data/Troy.json";
import SchenectadyData from "../data/Schenectady.json";

// ✅ Sample upcoming events (replace with real data later)
const UPCOMING_EVENTS = [
  {
    id: 1,
    name: "Troy Night Out",
    date: "Feb 15, 2026",
    location: "Downtown Troy",
    link: "https://www.troyny.gov"
  },
  {
    id: 2,
    name: "Winter Farmers Market",
    date: "Feb 8, 2026",
    location: "Empire State Plaza, Albany",
    link: "https://www.albanyfarmersmarket.com"
  },
  {
    id: 3,
    name: "Schenectady Music Festival",
    date: "Feb 22, 2026",
    location: "Proctors Theatre",
    link: "https://www.proctors.org"
  }
];

// Fix Leaflet marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ✅ Adapter: JSON -> app format
function normalizeCityFile(cityFile) {
  return cityFile.landmarks.map((lm) => {
    const city = cityFile.city;

    const typeTag = lm.typetag ?? lm.type ?? "";
    const experienceTags = Array.isArray(lm.experiencetag) ? lm.experiencetag : [];

    return {
      id: `${city.toLowerCase()}-${lm.id}`,
      city,
      name: lm.name,
      description: lm.description,
      address: lm.address,
      lat: lm.latitude,
      lng: lm.longitude,
      website: lm.website,
      typetag: typeTag,
      experiencetag: experienceTags,
    };
  });
}

// ✅ Helper to get photo paths for a landmark
function getLandmarkPhotos(landmark) {
  // Base path: /photos/{city}/{landmark name}/
  const basePath = `/photos/${landmark.city}/${landmark.name}`;
  
  // Only jpg and png extensions
  const extensions = ['jpg', 'png'];
  const filenames = ['download', 'images', 'imagess'];
  
  const photos = [];
  
  // Try each combination
  filenames.forEach(filename => {
    extensions.forEach(ext => {
      photos.push(`${basePath}/${filename}.${ext}`);
    });
  });
  
  return photos;
}

// ✅ AND logic for experience tags
function matchesExperienceTags(landmark, selectedExperienceTags) {
  if (selectedExperienceTags.length === 0) return true;
  return selectedExperienceTags.every((tag) => landmark.experiencetag.includes(tag));
}

function LocateButton({ userLocation, onRequestLocation }) {
  const map = useMap();

  return (
    <button
      className="floating-locate-btn"
      type="button"
      onClick={() => {
        if (!userLocation) {
          onRequestLocation?.();
          return;
        }
        map.setView([userLocation.lat, userLocation.lng], Math.max(map.getZoom(), 14), {
          animate: true,
        });
      }}
      title="Center on my location"
    >
      ◎
    </button>
  );
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 3958.7613; // Earth radius in miles

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

// ✅ Photo Carousel Component
function PhotoCarousel({ photos }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedPhotos, setLoadedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset when photos change
    setCurrentIndex(0);
    setLoadedPhotos([]);
    setLoading(true);

    // Try to load each photo using Image objects
    const checkPhotos = async () => {
      const validPhotos = [];
      
      for (const photoUrl of photos) {
        try {
          // Create a promise that resolves when image loads
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              validPhotos.push(photoUrl);
              resolve();
            };
            img.onerror = () => reject();
            img.src = photoUrl;
          });
        } catch (e) {
          // Photo doesn't exist or failed to load, skip it
        }
      }
      
      setLoadedPhotos(validPhotos);
      setLoading(false);
    };

    checkPhotos();
  }, [photos]);

  if (loading) {
    return (
      <div className="photo-carousel loading">
        <div className="photo-placeholder">Loading photos...</div>
      </div>
    );
  }

  if (loadedPhotos.length === 0) {
    return null; // No photos available
  }

  return (
    <div className="photo-carousel">
      <div className="photo-container">
        <img
          src={loadedPhotos[currentIndex]}
          alt={`View ${currentIndex + 1}`}
          className="landmark-photo"
        />
        
        {loadedPhotos.length > 1 && (
          <>
            <button
              className="photo-nav photo-nav-prev"
              onClick={() => setCurrentIndex((prev) => 
                prev === 0 ? loadedPhotos.length - 1 : prev - 1
              )}
              type="button"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              className="photo-nav photo-nav-next"
              onClick={() => setCurrentIndex((prev) => 
                (prev + 1) % loadedPhotos.length
              )}
              type="button"
              aria-label="Next photo"
            >
              ›
            </button>
            
            <div className="photo-dots">
              {loadedPhotos.map((_, idx) => (
                <button
                  key={idx}
                  className={`photo-dot ${idx === currentIndex ? 'photo-dot-active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  type="button"
                  aria-label={`View photo ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ✅ Map Apps Selector Component
function MapAppsMenu({ address, lat, lng, onClose }) {
  const mapLinks = {
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    apple: `https://maps.apple.com/?address=${encodeURIComponent(address)}`,
    waze: `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes&zoom=17`
  };

  return (
    <div className="map-apps-menu">
      <div className="map-apps-title">Open in:</div>
      <a href={mapLinks.google} target="_blank" rel="noreferrer" className="map-app-link">
        <span className="map-app-icon">🗺️</span>
        Google Maps
      </a>
      <a href={mapLinks.apple} target="_blank" rel="noreferrer" className="map-app-link">
        <span className="map-app-icon">🍎</span>
        Apple Maps
      </a>
      <a href={mapLinks.waze} target="_blank" rel="noreferrer" className="map-app-link">
        <span className="map-app-icon">🚗</span>
        Waze
      </a>
      <button className="map-apps-close" onClick={onClose} type="button">✕</button>
    </div>
  );
}

// ✅ Events Banner Component - Hover to reveal
function EventsBanner({ events }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (events.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % events.length);
    }, 5000); // Change event every 5 seconds

    return () => clearInterval(interval);
  }, [events.length]);

  if (events.length === 0) return null;

  const currentEvent = events[currentIndex];
  const isVisible = isHovered || isPinned;

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? events.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % events.length);
  };

  return (
    <div 
      className={`events-banner ${isVisible ? 'events-banner-visible' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab that's always visible */}
      <div className="events-tab">
        <span className="events-tab-text">Upcoming Events</span>
        <span className="events-arrow">▼</span>
      </div>

      {/* Full content that slides down */}
      <div className="events-content">
        <div className="events-banner-inner">
          {/* Previous button */}
          {events.length > 1 && (
            <button
              className="events-nav events-nav-prev"
              onClick={goToPrev}
              type="button"
              aria-label="Previous event"
            >
              ‹
            </button>
          )}
          
          <span className="events-icon">📅</span>
          <div className="events-text">
            <strong>{currentEvent.name}</strong>
            <span className="events-divider">•</span>
            <span>{currentEvent.date}</span>
            <span className="events-divider">•</span>
            <span>{currentEvent.location}</span>
          </div>
          {currentEvent.link && (
            <a 
              href={currentEvent.link} 
              target="_blank" 
              rel="noreferrer"
              className="events-link"
            >
              Learn more →
            </a>
          )}
          
          {/* Next button */}
          {events.length > 1 && (
            <button
              className="events-nav events-nav-next"
              onClick={goToNext}
              type="button"
              aria-label="Next event"
            >
              ›
            </button>
          )}
          
          <button
            className="events-pin-btn"
            onClick={() => setIsPinned(!isPinned)}
            type="button"
            title={isPinned ? "Unpin banner" : "Keep banner open"}
          >
            {isPinned ? "📌" : "📍"}
          </button>
        </div>
        {events.length > 1 && (
          <div className="events-dots">
            {events.map((_, idx) => (
              <button
                key={idx}
                className={`events-dot ${idx === currentIndex ? 'events-dot-active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                type="button"
                aria-label={`View event ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ✅ Component to handle map clicks for pin placement
function MapClickHandler({ onMapClick, pinMode }) {
  const map = useMap();

  useEffect(() => {
    if (!pinMode) return;

    const handleClick = (e) => {
      onMapClick(e.latlng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick, pinMode]);

  return null;
}

export default function MapView() {
  const [selected, setSelected] = useState(null);
  
  // ✅ Pin mode states
  const [pinMode, setPinMode] = useState(true);
  const [droppedPin, setDroppedPin] = useState(null);
  
  // ✅ Map apps menu state
  const [showMapApps, setShowMapApps] = useState(false);
  
  // location states
  const [userLocation, setUserLocation] = useState(null); // {lat, lng, accuracy}
  const [geoError, setGeoError] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

  const [watchId, setWatchId] = useState(null);

  // ✅ Saved landmarks (persisted to localStorage)
  const [savedLandmarks, setSavedLandmarks] = useState(() => {
    try {
      const saved = localStorage.getItem("savedLandmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ✅ Active view: 'filters' or 'nearby' or 'saved'
  const [activeView, setActiveView] = useState("filters");

  useEffect(() => {
    return () => {
      if (watchId != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  useEffect(() => {
    if (userLocation) {
      setShowLocationPrompt(false);
    }
  }, [userLocation]);

  // ✅ Save to localStorage whenever savedLandmarks changes
  useEffect(() => {
    localStorage.setItem("savedLandmarks", JSON.stringify(savedLandmarks));
  }, [savedLandmarks]);

  // ✅ Drawer open/close
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ✅ separate filter states
  const [selectedCity, setSelectedCity] = useState(""); // single
  const [selectedType, setSelectedType] = useState(""); // single
  const [selectedExperienceTags, setSelectedExperienceTags] = useState([]); // multi AND

  const landmarks = useMemo(() => {
    return [
      ...normalizeCityFile(AlbanyData),
      ...normalizeCityFile(TroyData),
      ...normalizeCityFile(SchenectadyData),
    ];
  }, []);

  // ✅ Build filter options from data
  const cityOptions = useMemo(() => {
    return Array.from(new Set(landmarks.map((l) => l.city))).sort();
  }, [landmarks]);

  const typeOptions = useMemo(() => {
    return Array.from(new Set(landmarks.map((l) => l.typetag).filter(Boolean))).sort();
  }, [landmarks]);

  const experienceOptions = useMemo(() => {
    const set = new Set();
    landmarks.forEach((l) => l.experiencetag.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [landmarks]);

  // ✅ Apply all filters
  const filteredLandmarks = useMemo(() => {
    return landmarks.filter((l) => {
      const cityOk = selectedCity ? l.city === selectedCity : true;
      const typeOk = selectedType ? l.typetag === selectedType : true;
      const expOk = matchesExperienceTags(l, selectedExperienceTags);
      return cityOk && typeOk && expOk;
    });
  }, [landmarks, selectedCity, selectedType, selectedExperienceTags]);

  const NEARBY_RADIUS_MI = 3;
  const NEARBY_LIMIT = 10;

  const nearby = useMemo(() => {
    if (!userLocation) return [];

    const withDistance = filteredLandmarks
      .map((l) => ({
        ...l,
        distanceMi: haversineMiles(userLocation.lat, userLocation.lng, l.lat, l.lng),
      }))
      .filter((l) => l.distanceMi <= NEARBY_RADIUS_MI)
      .sort((a, b) => a.distanceMi - b.distanceMi)
      .slice(0, NEARBY_LIMIT);

    return withDistance;
  }, [userLocation, filteredLandmarks]);

  // ✅ Get saved landmark objects
  const savedLandmarkObjects = useMemo(() => {
    return landmarks.filter((l) => savedLandmarks.includes(l.id));
  }, [landmarks, savedLandmarks]);

  // ✅ Toggle saved
  function toggleSaved(landmarkId) {
    setSavedLandmarks((prev) =>
      prev.includes(landmarkId)
        ? prev.filter((id) => id !== landmarkId)
        : [...prev, landmarkId]
    );
  }

  // ✅ Chip toggles
  function toggleCity(city) {
    setSelectedCity((prev) => (prev === city ? "" : city));
    setSelected(null);
  }

  function toggleType(type) {
    setSelectedType((prev) => (prev === type ? "" : type));
    setSelected(null);
  }

  function toggleExperienceTag(tag) {
    setSelectedExperienceTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

    setSelected((prevSelected) => {
      if (!prevSelected) return null;

      const nextTags = selectedExperienceTags.includes(tag)
        ? selectedExperienceTags.filter((t) => t !== tag)
        : [...selectedExperienceTags, tag];

      const stillVisible =
        (selectedCity ? prevSelected.city === selectedCity : true) &&
        (selectedType ? prevSelected.typetag === selectedType : true) &&
        matchesExperienceTags(prevSelected, nextTags);

      return stillVisible ? prevSelected : null;
    });
  }

  function clearAllFilters() {
    setSelectedCity("");
    setSelectedType("");
    setSelectedExperienceTags([]);
    setSelected(null);
  }

  const activeCount =
    (selectedCity ? 1 : 0) + (selectedType ? 1 : 0) + selectedExperienceTags.length;

  function startLocationTracking() {
    setGeoError("");

    if (!("geolocation" in navigator)) {
      setGeoError("Geolocation isn't supported in this browser.");
      return;
    }

    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGeoError(err.message || "Couldn't get your location.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 10000,
      }
    );

    setWatchId(id);
    return id;
  }

  return (
    <div className="map-page">
      {/* ✅ Events Banner at the top */}
      <EventsBanner events={UPCOMING_EVENTS} />

      {/* ✅ Map behind everything with pin cursor */}
      <MapContainer 
        center={[42.68, -73.75]} 
        zoom={12} 
        className={`map ${pinMode ? 'map-with-pin-cursor' : ''}`}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ✅ Handle map clicks for pin placement */}
        <MapClickHandler
          pinMode={pinMode}
          onMapClick={(latlng) => {
            setDroppedPin(latlng);
            setFiltersOpen(true); // Open drawer when pin is dropped
          }}
        />

        {/* ✅ Dropped pin marker (red) */}
        {droppedPin && (
          <Marker
            position={[droppedPin.lat, droppedPin.lng]}
            icon={L.divIcon({
              className: 'dropped-pin-icon',
              html: `<div class="dropped-pin">📍</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 30],
            })}
          />
        )}

        {/* Landmark markers */}
        {filteredLandmarks.map((lm) => (
          <Marker
            key={lm.id}
            position={[lm.lat, lm.lng]}
            eventHandlers={{
              click: () => setSelected(lm),
            }}
          />
        ))}

        {/* ✅ User location (blue dot + accuracy ring) */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={Math.min(userLocation.accuracy || 40, 150)}
              pathOptions={{}}
              className="user-accuracy"
            />

            <Marker
              position={[userLocation.lat, userLocation.lng]}
              zIndexOffset={1000}
              icon={L.divIcon({
                className: "user-location-icon",
                html: `<div class="user-dot"></div>`,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              })}
            />
          </>
        )}

        {/* ✅ Floating locate button that uses map instance */}
        <LocateButton
          userLocation={userLocation}
          onRequestLocation={() => setShowLocationPrompt(true)}
        />
      </MapContainer>

      {/* ✅ Location prompt (overlay) */}
      {showLocationPrompt && !userLocation && (
        <div className="location-prompt">
          <div className="location-prompt-title">See what's around you?</div>
          <div className="location-prompt-text">
            Enable location to show nearby places and your position on the map.
          </div>

          {geoError && <div className="location-error">{geoError}</div>}

          <div className="location-prompt-actions">
            <button
              className="location-allow"
              type="button"
              onClick={() => {
                startLocationTracking();
                setShowLocationPrompt(false);
              }}
            >
              Use my location
            </button>

            <button
              className="location-dismiss"
              type="button"
              onClick={() => setShowLocationPrompt(false)}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* ✅ Floating logo (top-left) */}
      <div className="floating-title">
        <img src="/src/assets/logo.jpg" alt="Capital Region Explorer" className="app-logo" />
      </div>

      {/* ✅ Floating menu button (top-right) */}
      <button
        className="floating-filters-btn"
        type="button"
        onClick={() => setFiltersOpen(true)}
      >
        Menu
      </button>

      {/* ✅ Backdrop to close drawer */}
      {filtersOpen && (
        <button
          className="filters-backdrop"
          type="button"
          aria-label="Close menu"
          onClick={() => setFiltersOpen(false)}
        />
      )}

      {/* ✅ Drawer with tabs */}
      <aside className={`filters-drawer ${filtersOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <div className="drawer-title">Capital Region Explorer</div>
          <button
            className="drawer-close"
            type="button"
            onClick={() => setFiltersOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* ✅ Tab navigation */}
        <div className="drawer-tabs">
          <button
            className={`drawer-tab ${activeView === "filters" ? "drawer-tab-active" : ""}`}
            onClick={() => setActiveView("filters")}
            type="button"
          >
            Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </button>
          <button
            className={`drawer-tab ${activeView === "nearby" ? "drawer-tab-active" : ""}`}
            onClick={() => setActiveView("nearby")}
            type="button"
          >
            Nearby {nearby.length > 0 ? `(${nearby.length})` : ""}
          </button>
          <button
            className={`drawer-tab ${activeView === "saved" ? "drawer-tab-active" : ""}`}
            onClick={() => setActiveView("saved")}
            type="button"
          >
            Saved {savedLandmarks.length > 0 ? `(${savedLandmarks.length})` : ""}
          </button>
        </div>

        <div className="drawer-content">
          {/* ✅ FILTERS VIEW */}
          {activeView === "filters" && (
            <>
              {/* City */}
              <div className="filter-section">
                <div className="filter-section-title">City</div>
                <div className="chip-row">
                  {cityOptions.map((city) => (
                    <button
                      key={city}
                      className={`chip ${selectedCity === city ? "chip-active" : ""}`}
                      onClick={() => toggleCity(city)}
                      type="button"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div className="filter-section">
                <div className="filter-section-title">Type</div>
                <div className="chip-row">
                  {typeOptions.map((type) => (
                    <button
                      key={type}
                      className={`chip ${selectedType === type ? "chip-active" : ""}`}
                      onClick={() => toggleType(type)}
                      type="button"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="filter-section">
                <div className="filter-section-title">Experience</div>
                <div className="chip-row">
                  {experienceOptions.map((tag) => (
                    <button
                      key={tag}
                      className={`chip ${
                        selectedExperienceTags.includes(tag) ? "chip-active" : ""
                      }`}
                      onClick={() => toggleExperienceTag(tag)}
                      type="button"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {activeCount > 0 && (
                <button className="clear-btn" onClick={clearAllFilters} type="button">
                  Clear all filters
                </button>
              )}
            </>
          )}

          {/* ✅ NEARBY VIEW */}
          {activeView === "nearby" && (
            <div className="list-view">
              {!userLocation ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📍</div>
                  <div className="empty-state-title">Location needed</div>
                  <div className="empty-state-text">
                    Enable location access to see landmarks near you
                  </div>
                  <button
                    className="empty-state-btn"
                    onClick={() => {
                      setShowLocationPrompt(true);
                      setFiltersOpen(false);
                    }}
                    type="button"
                  >
                    Enable location
                  </button>
                </div>
              ) : nearby.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">Nothing nearby</div>
                  <div className="empty-state-text">
                    No landmarks found within {NEARBY_RADIUS_MI} miles
                  </div>
                </div>
              ) : (
                <>
                  <div className="list-header">
                    Within {NEARBY_RADIUS_MI} miles of you
                  </div>
                  {nearby.map((lm) => (
                    <div
                      key={lm.id}
                      className="list-item"
                      onClick={() => {
                        setSelected(lm);
                        setFiltersOpen(false);
                      }}
                    >
                      <div className="list-item-content">
                        <div className="list-item-title">{lm.name}</div>
                        <div className="list-item-subtitle">
                          {lm.distanceMi.toFixed(1)} mi · {lm.city}
                        </div>
                      </div>
                      <button
                        className="star-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaved(lm.id);
                        }}
                        type="button"
                        title={savedLandmarks.includes(lm.id) ? "Remove from saved" : "Save"}
                      >
                        {savedLandmarks.includes(lm.id) ? "★" : "☆"}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ✅ SAVED VIEW */}
          {activeView === "saved" && (
            <div className="list-view">
              {savedLandmarkObjects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⭐</div>
                  <div className="empty-state-title">No saved landmarks</div>
                  <div className="empty-state-text">
                    Star landmarks you want to visit to save them here
                  </div>
                </div>
              ) : (
                <>
                  <div className="list-header">
                    Your saved landmarks ({savedLandmarkObjects.length})
                  </div>
                  {savedLandmarkObjects.map((lm) => (
                    <div
                      key={lm.id}
                      className="list-item"
                      onClick={() => {
                        setSelected(lm);
                        setFiltersOpen(false);
                      }}
                    >
                      <div className="list-item-content">
                        <div className="list-item-title">{lm.name}</div>
                        <div className="list-item-subtitle">
                          {lm.city} · {lm.typetag}
                        </div>
                      </div>
                      <button
                        className="star-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaved(lm.id);
                        }}
                        type="button"
                        title="Remove from saved"
                      >
                        ★
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Bottom sheet with photos */}
      {selected && (
        <div className="bottom-sheet" role="dialog" aria-modal="true">
          <button
            className="close-btn"
            onClick={() => setSelected(null)}
            type="button"
          >
            ✕
          </button>

          {/* ✅ Photo Carousel */}
          <PhotoCarousel photos={getLandmarkPhotos(selected)} />

          <div className="sheet-header">
            <h2 className="sheet-title">{selected.name}</h2>
            <button
              className="star-btn-large"
              onClick={() => toggleSaved(selected.id)}
              type="button"
              title={savedLandmarks.includes(selected.id) ? "Remove from saved" : "Save"}
            >
              {savedLandmarks.includes(selected.id) ? "★" : "☆"}
            </button>
          </div>

          <p className="sheet-desc">{selected.description}</p>

          {selected.address && (
            <div className="sheet-address-row">
              <div className="sheet-address-text">
                <b>📍 Address:</b> {selected.address}
              </div>
              <div className="map-apps-icons">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="map-app-icon-btn"
                  title="Open in Google Maps"
                >
                  🗺️
                </a>
                <a 
                  href={`https://maps.apple.com/?address=${encodeURIComponent(selected.address)}`}
                  target="_blank" 
                  rel="noreferrer"
                  className="map-app-icon-btn"
                  title="Open in Apple Maps"
                >
                  🍎
                </a>
                <a 
                  href={`https://www.waze.com/ul?ll=${selected.lat},${selected.lng}&navigate=yes&zoom=17`}
                  target="_blank" 
                  rel="noreferrer"
                  className="map-app-icon-btn"
                  title="Open in Waze"
                >
                  🚗
                </a>
              </div>
            </div>
          )}

          {selected.website && (
            <p className="sheet-desc">
              <a href={selected.website} target="_blank" rel="noreferrer">
                Official site →
              </a>
            </p>
          )}

          <div className="tag-row">
            <span className="tag-pill">{selected.city}</span>
            {selected.typetag && <span className="tag-pill">{selected.typetag}</span>}
            {selected.experiencetag.map((t) => (
              <span key={t} className="tag-pill">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}