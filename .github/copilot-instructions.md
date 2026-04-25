# Flashcards App - Copilot Instructions

## Project Overview
A browser-based flashcards study app built with vanilla JavaScript, HTML, and CSS.
Single-page app, no frameworks, no build tools required.
Texas Hold'em poker subject matter across multiple thematic decks.

## Architecture
- `scriptsapp.js` — main application logic
- `styles/style.css` — all styles
- `index.html` — single HTML entry point
- No build tools, no frameworks, no compilation step

## Data Model
AppState shape:
- decks: array of { id, name, createdAt }
- cardsByDeckId: object keyed by deckId, values are arrays of { id, front, back, updatedAt }
- activeDeckId: string or null
- ui: { isModalOpen, activeCardIndex }

## Lab Requirements
- CRUD for decks and cards via modals
- Study mode: flip, next, previous, shuffle
- Keyword search within active deck
- LocalStorage persistence including last active deck
- Responsive layout, keyboard navigation, basic accessibility
- Empty states for no decks and no cards

## Conventions
- Use Plain JS (ES6+), no frameworks or libraries
- Use kebab-case for CSS class names
- Use camelCase for JavaScript variables and functions
- Use event delegation where possible
- Use LocalStorage for persistence
- Reset flip state on card navigation
- All modals must have focus traps and ESC to close

## Deck Content
This app uses multiple decks focused on Texas Hold'em poker:
- Deck 1: Hand Rankings & Hierarchy
- Deck 2: Starting Hand Odds & Hole Card Strategy  
- Deck 3: Pot Odds, Outs & Math
- Deck 4: Position & Table Dynamics