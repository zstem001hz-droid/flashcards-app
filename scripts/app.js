/* ========================================
   AppState - Centralized application state
   ======================================== */

const AppState = {
  decks: [],
  cardsByDeckId: {},
  activeDeckId: null,
  ui: {
    isModalOpen: false,
    activeCardIndex: 0,
    isFlipped: false,
  },

  /**
   * Initialize AppState from LocalStorage or create defaults
   */
  init() {
    const stored = localStorage.getItem("flashcardsAppState");
    if (stored) {
      const parsed = JSON.parse(stored);
      this.decks = parsed.decks || [];
      this.cardsByDeckId = parsed.cardsByDeckId || {};
      this.activeDeckId = parsed.activeDeckId || null;
      this.ui = { ...this.ui, ...parsed.ui };
    }
  },

  /**
   * Save current state to LocalStorage
   */
  save() {
    const state = {
      decks: this.decks,
      cardsByDeckId: this.cardsByDeckId,
      activeDeckId: this.activeDeckId,
      ui: this.ui,
    };
    localStorage.setItem("flashcardsAppState", JSON.stringify(state));
  },
};

/* ========================================
   Deck CRUD Operations
   ======================================== */

/**
 * Create a new deck and save to state
 * @param {string} name - Deck name
 * @returns {object} - Created deck object
 */
function createDeck(name) {
  if (!name || name.trim().length === 0) {
    console.warn("Deck name cannot be empty");
    return null;
  }

  const deckId = `deck-${Date.now()}`;
  const newDeck = {
    id: deckId,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };

  AppState.decks.push(newDeck);
  AppState.cardsByDeckId[deckId] = [];
  AppState.save();

  return newDeck;
}

/**
 * Edit an existing deck name
 * @param {string} deckId - Deck ID to edit
 * @param {string} newName - New deck name
 * @returns {boolean} - Success status
 */
function editDeck(deckId, newName) {
  if (!newName || newName.trim().length === 0) {
    console.warn("Deck name cannot be empty");
    return false;
  }

  const deck = AppState.decks.find((d) => d.id === deckId);
  if (!deck) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  deck.name = newName.trim();
  AppState.save();

  return true;
}

/**
 * Delete a deck and all its cards
 * @param {string} deckId - Deck ID to delete
 * @returns {boolean} - Success status
 */
function deleteDeck(deckId) {
  const deckIndex = AppState.decks.findIndex((d) => d.id === deckId);
  if (deckIndex === -1) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  AppState.decks.splice(deckIndex, 1);
  delete AppState.cardsByDeckId[deckId];

  // Clear active deck if the deleted deck was active
  if (AppState.activeDeckId === deckId) {
    AppState.activeDeckId =
      AppState.decks.length > 0 ? AppState.decks[0].id : null;
    AppState.ui.activeCardIndex = 0;
  }

  AppState.save();

  return true;
}

/**
 * Get a single deck by ID
 * @param {string} deckId - Deck ID
 * @returns {object|null} - Deck object or null
 */
function getDeck(deckId) {
  return AppState.decks.find((d) => d.id === deckId) || null;
}

/**
 * Get all cards in a deck
 * @param {string} deckId - Deck ID
 * @returns {array} - Array of cards
 */
function getCardsInDeck(deckId) {
  return AppState.cardsByDeckId[deckId] || [];
}

/* ========================================
   Deck UI Rendering
   ======================================== */

/**
 * Render deck list to sidebar
 */
function renderDeckList() {
  const deckListEl = document.getElementById("deck-list");
  const emptyMessageEl = document.getElementById("empty-decks-message");

  if (!deckListEl) return;

  deckListEl.innerHTML = "";

  if (AppState.decks.length === 0) {
    emptyMessageEl?.classList.remove("hidden");
    return;
  }

  emptyMessageEl?.classList.add("hidden");

  AppState.decks.forEach((deck) => {
    const li = document.createElement("li");
    const button = document.createElement("button");

    button.className = "deck-button";
    button.textContent = deck.name;
    button.dataset.deckId = deck.id;

    // Add active state
    if (AppState.activeDeckId === deck.id) {
      button.classList.add("active");
    }

    li.appendChild(button);
    deckListEl.appendChild(li);
  });
}

/**
 * Switch active deck
 * @param {string} deckId - Deck ID to activate
 * @returns {boolean} - Success status
 */
function setActiveDeck(deckId) {
  if (!deckId) {
    AppState.activeDeckId = null;
    AppState.ui.activeCardIndex = 0;
    AppState.ui.isFlipped = false;
    AppState.save();
    return true;
  }

  const deck = getDeck(deckId);
  if (!deck) {
    console.warn(`Deck ${deckId} not found`);
    return false;
  }

  AppState.activeDeckId = deckId;
  AppState.ui.activeCardIndex = 0;
  AppState.ui.isFlipped = false;
  AppState.save();

  return true;
}

/**
 * Get currently active deck
 * @returns {object|null} - Active deck or null
 */
function getActiveDeck() {
  return AppState.activeDeckId ? getDeck(AppState.activeDeckId) : null;
}

/* ========================================
   Event Delegation & Initialization
   ======================================== */

/**
 * Initialize event listeners with delegation
 */
function initEventListeners() {
  const deckListEl = document.getElementById("deck-list");
  const newDeckBtnEl = document.getElementById("new-deck-btn");
  const deckFormEl = document.getElementById("deck-form");
  const deckModalCancelEl = document.getElementById("deck-modal-cancel");

  // Event delegation on deck list
  if (deckListEl) {
    deckListEl.addEventListener("click", (event) => {
      const button = event.target.closest(".deck-button");
      if (!button) return;

      const deckId = button.dataset.deckId;
      setActiveDeck(deckId);
      renderDeckList();
      updateUIForActiveDeck();
    });
  }

  // New deck button
  if (newDeckBtnEl) {
    newDeckBtnEl.addEventListener("click", () => {
      openNewDeckModal();
    });
  }

  // Deck form submission
  if (deckFormEl) {
    deckFormEl.addEventListener("submit", handleDeckFormSubmit);
  }

  // Deck modal cancel button
  if (deckModalCancelEl) {
    deckModalCancelEl.addEventListener("click", () => {
      ModalManager.closeModal();
    });
  }
}

/**
 * Update UI to reflect active deck
 */
function updateUIForActiveDeck() {
  const noDeckMessageEl = document.getElementById("no-deck-message");
  const noCardsMessageEl = document.getElementById("no-cards-message");
  const cardContainerEl = document.getElementById("card-container");

  const activeDeck = getActiveDeck();
  const cards = activeDeck ? getCardsInDeck(activeDeck.id) : [];

  if (!activeDeck) {
    // No deck selected
    noDeckMessageEl?.classList.remove("hidden");
    noCardsMessageEl?.classList.add("hidden");
    cardContainerEl?.classList.add("hidden");
    return;
  }

  noDeckMessageEl?.classList.add("hidden");

  if (cards.length === 0) {
    // Deck selected but no cards
    noCardsMessageEl?.classList.remove("hidden");
    cardContainerEl?.classList.add("hidden");
    return;
  }

  // Show cards
  noCardsMessageEl?.classList.add("hidden");
  cardContainerEl?.classList.remove("hidden");

  renderCard();
}

/* ========================================
   Card Display (Placeholder)
   ======================================== */

/**
 * Render current card
 * TODO: Implement full card rendering with flip logic
 */
function renderCard() {
  const activeDeck = getActiveDeck();
  if (!activeDeck) return;

  const cards = getCardsInDeck(activeDeck.id);
  const currentIndex = AppState.ui.activeCardIndex;
  const currentCard = cards[currentIndex];

  if (!currentCard) return;

  const cardTextEl = document.getElementById("card-text");
  const cardIndexEl = document.getElementById("card-index");
  const cardTotalEl = document.getElementById("card-total");

  if (cardTextEl) {
    cardTextEl.textContent = AppState.ui.isFlipped
      ? currentCard.back
      : currentCard.front;
  }

  if (cardIndexEl) {
    cardIndexEl.textContent = currentIndex + 1;
  }

  if (cardTotalEl) {
    cardTotalEl.textContent = cards.length;
  }
}

/* ========================================
   Modal Management with Accessibility
   ======================================== */

const ModalManager = {
  activeModal: null,
  focusBeforeOpen: null,
  currentContext: null, // Store modal context (deckId, etc.)

  /**
   * Get all focusable elements within a modal
   */
  getFocusableElements(modal) {
    const selector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return modal.querySelectorAll(selector);
  },

  /**
   * Create focus trap - keep focus within modal
   */
  trapFocus(e, modal) {
    const focusables = this.getFocusableElements(modal);
    const firstFocusable = focusables[0];
    const lastFocusable = focusables[focusables.length - 1];

    if (e.key !== "Tab") return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  },

  /**
   * Handle ESC key to close modal
   */
  handleEscKey(e) {
    if (e.key === "Escape" && this.activeModal) {
      this.closeModal();
    }
  },

  /**
   * Open a modal with focus management
   */
  openModal(modal) {
    if (this.activeModal) {
      this.closeModal();
    }

    this.activeModal = modal;
    this.focusBeforeOpen = document.activeElement;

    // Open the dialog
    modal.showModal();

    // Set focus to first focusable element
    const focusables = this.getFocusableElements(modal);
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    // Add event listeners
    modal.addEventListener("keydown", (e) => this.trapFocus(e, modal));
    document.addEventListener("keydown", this.handleEscKey.bind(this));
  },

  /**
   * Close modal and return focus
   */
  closeModal() {
    if (!this.activeModal) return;

    const modal = this.activeModal;
    modal.close();
    this.activeModal = null;
    this.currentContext = null;

    // Return focus to the element that opened the modal
    if (this.focusBeforeOpen && this.focusBeforeOpen.focus) {
      this.focusBeforeOpen.focus();
    }

    // Remove event listeners
    document.removeEventListener("keydown", this.handleEscKey.bind(this));
  },
};

/* ========================================
   Deck Modal Functions with Form Handling
   ======================================== */

/**
 * Validate deck name input
 * @param {string} name - Deck name to validate
 * @returns {object} - { valid: boolean, message: string }
 */
function validateDeckName(name) {
  const trimmed = name.trim();

  if (!trimmed) {
    return { valid: false, message: "Deck name is required" };
  }

  if (trimmed.length < 2) {
    return { valid: false, message: "Deck name must be at least 2 characters" };
  }

  if (trimmed.length > 100) {
    return {
      valid: false,
      message: "Deck name must not exceed 100 characters",
    };
  }

  // Check for duplicate names
  const isDuplicate = AppState.decks.some(
    (deck) =>
      deck.name.toLowerCase() === trimmed.toLowerCase() &&
      deck.id !== ModalManager.currentContext?.deckId,
  );

  if (isDuplicate) {
    return { valid: false, message: "A deck with this name already exists" };
  }

  return { valid: true, message: "" };
}

/**
 * Show validation error in modal
 */
function showDeckFormError(message) {
  const errorEl = document.getElementById("deck-name-error");
  const inputEl = document.getElementById("deck-name-input");

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  if (inputEl) {
    inputEl.setAttribute("aria-invalid", "true");
  }
}

/**
 * Clear validation error in modal
 */
function clearDeckFormError() {
  const errorEl = document.getElementById("deck-name-error");
  const inputEl = document.getElementById("deck-name-input");

  if (errorEl) {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  if (inputEl) {
    inputEl.setAttribute("aria-invalid", "false");
  }
}

/**
 * Reset deck form
 */
function resetDeckForm() {
  const form = document.getElementById("deck-form");
  const titleEl = document.getElementById("deck-modal-title");

  if (form) {
    form.reset();
  }

  clearDeckFormError();

  if (titleEl) {
    titleEl.textContent = "Create Deck";
  }

  ModalManager.currentContext = null;
}

/**
 * Open new deck modal
 */
function openNewDeckModal() {
  resetDeckForm();
  const modal = document.getElementById("deck-modal");
  if (modal) {
    ModalManager.openModal(modal);
  }
}

/**
 * Open edit deck modal
 * @param {string} deckId - Deck ID to edit
 */
function openEditDeckModal(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;

  resetDeckForm();

  const titleEl = document.getElementById("deck-modal-title");
  const inputEl = document.getElementById("deck-name-input");

  if (titleEl) {
    titleEl.textContent = "Edit Deck";
  }

  if (inputEl) {
    inputEl.value = deck.name;
  }

  ModalManager.currentContext = { deckId };

  const modal = document.getElementById("deck-modal");
  if (modal) {
    ModalManager.openModal(modal);
  }
}

/**
 * Handle deck form submission
 */
function handleDeckFormSubmit(e) {
  e.preventDefault();

  const inputEl = document.getElementById("deck-name-input");
  const deckName = inputEl.value;

  // Validate
  const validation = validateDeckName(deckName);
  if (!validation.valid) {
    showDeckFormError(validation.message);
    return;
  }

  clearDeckFormError();

  // Create or update deck
  if (ModalManager.currentContext?.deckId) {
    // Edit mode
    const deckId = ModalManager.currentContext.deckId;
    editDeck(deckId, deckName);
  } else {
    // Create mode
    createDeck(deckName);
  }

  renderDeckList();
  setActiveDeck(
    ModalManager.currentContext?.deckId ||
      AppState.decks[AppState.decks.length - 1].id,
  );
  updateUIForActiveDeck();

  ModalManager.closeModal();
}

/**
 * Open delete confirmation modal
 * @param {string} deckId - Deck ID to delete
 */
function openDeleteDeckModal(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;

  if (
    confirm(
      `Delete deck "${deck.name}"? This action cannot be undone, and all ${getCardsInDeck(deckId).length} cards will be deleted.`,
    )
  ) {
    deleteDeck(deckId);
    renderDeckList();
    updateUIForActiveDeck();
  }
}

/* ========================================
   Application Initialization
   ======================================== */

/**
 * Initialize the application
 */
function initApp() {
  AppState.init();
  renderDeckList();
  initEventListeners();
  updateUIForActiveDeck();
}

// Start app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
