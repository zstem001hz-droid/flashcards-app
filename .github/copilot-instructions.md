# Flashcards App - Copilot Instructions

## Project Overview
A browser-based flashcards study app built with TypeScript, HTML, and CSS.
Single-page app, no frameworks, no build tools required for the browser.
TypeScript source in `src/`, compiled output in `dist/`.

## Architecture
- `src/app.ts` - main application logic
- `styles/style.css` - all styles
- `index.html` - single HTML entry point
- `dist/` - compiled JavaScript output (do not edit manually)

## Data Model
```typescript
interface Deck {
  id: string;
  name: string;
  createdAt: number;
}

interface Card {
  id: string;
  front: string;
  back: string;
  updatedAt: number;
}

interface AppState {
  decks: Deck[];
  cardsByDeckId: Record<string, Card[]>;
  activeDeckId: string | null;
  ui: {
    isModalOpen: boolean;
    activeCardIndex: number;
  };
}
```

## Conventions
- Use TypeScript interfaces for all data structures
- Use kebab-case for CSS class names
- Use camelCase for TypeScript variables and functions
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