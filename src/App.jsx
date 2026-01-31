import MapView from "./components/MapView";
import "./App.css";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Capital Region Explorer</h1>
      </header>
      <main className="app-main">
        <MapView />
      </main>
    </div>
  );
}