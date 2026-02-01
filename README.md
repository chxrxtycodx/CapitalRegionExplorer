# CapitalRegionExplorer

Capital Region Explorer is a mobile-first, map-based web application designed to improve how the Troy–Albany Capital Region is discovered, explored, and promoted. It addresses a real local challenge: the region’s most meaningful places, events, and experiences are often known only to locals and poorly surfaced to visitors, students, and new residents.

🚩 The Problem

Tourism and community engagement in the Capital Region face several challenges:

Information about local landmarks, parks, historic sites, and events is fragmented across websites, outdated pages, or word-of-mouth

Existing platforms prioritize reviews and restaurants, not community spaces or public assets

Local nonprofits, cultural organizations, and municipalities lack an accessible, modern discovery platform

Visitors and even long-time residents struggle to answer:

“What can I do around here that’s free, local, and meaningful?”

💡 Our Solution

Capital Region Explorer provides a curated, interactive discovery experience built specifically for the Capital Region.

Instead of reviews, ads, or rankings, the platform focuses on:

Places to explore

Experiences to plan

Community-driven discovery

Users can:

Explore the region through an interactive map

Filter locations by what they are (Historic, Park, Arts, Nature, etc.)

Filter by how they fit into a plan (Free, Day Trip, Adventure, Family-friendly, etc.)

View rich location details through a mobile-friendly bottom sheet UI

Use the app like a native mobile experience via Progressive Web App (PWA) support

This allows nonprofits, municipalities, and community organizations to be discoverable in context, not buried in search results.

🧠 Key Design Decisions
Dual-Tag System (Core Innovation)

Each location supports two independent tag dimensions:

Type Tags – what the place is

Historic, Park, Museum, Arts, Nature, Venue

Experience Tags – how the place fits into a day

Free, Day Trip, Adventure, Family, Outdoors, Rainy Day

This allows users to explore naturally:

“Show me historic places”

“Plan a free day trip”

“What can I do outdoors nearby?”

🛠️ Tech Stack
Frontend

React – component-based UI and state management

Vite – fast development server and modern build tooling

React-Leaflet + Leaflet – interactive map rendering

CSS (custom) – responsive, mobile-first styling

Data

JSON-based datasets for Troy, Albany, and Schenectady

Normalized at runtime into a unified landmark model

Designed to scale as more cities and organizations are added

Platform

Progressive Web App (PWA) architecture

Installable on mobile devices

Offline-friendly structure

No app store required

Deployment

Static, client-side architecture

Easily deployable via platforms like Vercel or Netlify

No backend required for MVP

🏗️ Implementation Overview

Landmarks are stored in city-specific JSON files

Each landmark includes:

Location data (lat/lng)

Descriptions and photos

Type and Experience tags

Data is normalized into a shared structure on load

Filters dynamically control marker visibility on the map

Selecting a marker opens a bottom sheet with rich content

UI is optimized for in-the-moment mobile use

🌱 Community Impact

Capital Region Explorer directly supports:

Local governments – by promoting public spaces and civic landmarks

Nonprofits & cultural organizations – by increasing visibility without requiring marketing budgets

Small businesses – indirectly, by increasing foot traffic and exploration

Residents & visitors – by making local experiences easier to find and plan

The platform can be extended to:

Feature seasonal events

Highlight nonprofit-run locations

Support curated routes and itineraries

Enable community or organizational submissions

🚀 Why This Matters

The Capital Region doesn’t lack things to do — it lacks discoverability.

Capital Region Explorer reframes the region as:

explorable

approachable

community-driven

accessible to everyone

This project demonstrates how technology can amplify local knowledge, strengthen community engagement, and better connect people to the places that already exist around them.

📍 Built For the Capital Region

Starting with:

Troy

Albany

Schenectady

Designed to grow with the community.
