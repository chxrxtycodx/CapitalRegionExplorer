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

export default function MapView() {
  const [selected, setSelected] = useState(null);
  
  // location states
  const [userLocation, setUserLocation] = useState(null); // {lat, lng, accuracy}
  const [geoError, setGeoError] = useState("");
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);

  const [watchId, setWatchId] = useState(null);

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

    // If current selected landmark no longer matches, close it
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
    setGeoError("Geolocation isn’t supported in this browser.");
    return;
  }

  // ✅ Clear any previous watcher before starting a new one
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
      setGeoError(err.message || "Couldn’t get your location.");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 10000,
    }
  );

  // ✅ Save it so we can clear on unmount
  setWatchId(id);

  return id;
}


  return (
    <div className="map-page">
    {/* ✅ Map behind everything */}
    <MapContainer center={[42.68, -73.75]} zoom={12} className="map">
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

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
        <div className="location-prompt-title">See what’s around you?</div>
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

    {/* ✅ Floating title (top-left) */}
    <div className="floating-title">Capital Region Explorer</div>

    {/* ✅ Floating Filters button (top-right) */}
    <button
      className="floating-filters-btn"
      type="button"
      onClick={() => setFiltersOpen(true)}
    >
      Filters {activeCount > 0 ? `(${activeCount})` : ""}
    </button>

    {/* ✅ Backdrop to close drawer */}
    {filtersOpen && (
      <button
        className="filters-backdrop"
        type="button"
        aria-label="Close filters"
        onClick={() => setFiltersOpen(false)}
      />
    )}

      {/* ✅ Drawer */}
      <aside className={`filters-drawer ${filtersOpen ? "open" : ""}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            Filters {activeCount > 0 ? `(${activeCount})` : ""}
          </div>
          <button
            className="drawer-close"
            type="button"
            onClick={() => setFiltersOpen(false)}
          >
            ✕
          </button>
        </div>

        <div className="drawer-content">
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
              Clear all
            </button>
          )}
        </div>
      </aside>

      {/* Bottom sheet */}
      {selected && (
        <div className="bottom-sheet" role="dialog" aria-modal="true">
          <button
            className="close-btn"
            onClick={() => setSelected(null)}
            type="button"
          >
            ✕
          </button>

          <h2 className="sheet-title">{selected.name}</h2>
          <p className="sheet-desc">{selected.description}</p>

          {selected.address && (
            <p className="sheet-desc">
              <b>Address:</b> {selected.address}
            </p>
          )}

          {selected.website && (
            <p className="sheet-desc">
              <a href={selected.website} target="_blank" rel="noreferrer">
                Official site
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
