# AllergenGuard

> A Chrome extension that scans grocery and food delivery websites for your selected allergens and warns you the moment it spots one.

AllergenGuard automatically reads product pages on **DoorDash**, **Uber Eats**, **Amazon**, and **ShopRite**, checks the ingredients against the allergens you've flagged, and slides down a red warning banner at the top of the page when it finds a match. No scrolling through ingredient lists. No second-guessing. No accidents.

Built for the [Hackathon Name] hackathon at Kean University.

---

## Why this exists

Over **32 million Americans** live with food allergies. Online grocery sites bury ingredient lists in image-only product photos, hide them behind tabs, or scatter them across multiple page sections. A peanut allergy doesn't care that you missed line 47 of an ingredient panel.

AllergenGuard is a personal allergen watchdog that runs silently in the background and only speaks up when it needs to.

---

## Features

- **Big 9 allergen support** — Milk, Eggs, Fish, Shellfish, Tree Nuts, Peanuts, Wheat, Soy, Sesame
- **Smart alias matching** — Detects allergens hidden under industrial names (e.g., "whey" → milk, "albumin" → eggs, "groundnut" → peanut)
- **4 supported platforms** — DoorDash, Uber Eats, Amazon, ShopRite
- **Real-time alerts** — Red warning banner slides down when an allergen is detected on the current page
- **Safe-by-design dismiss** — Confirmation modal prevents accidental dismissals of warnings
- **Light + Dark mode** — User-toggleable theme that respects user preference
- **Fully on-device** — All data stored in `chrome.storage.local`. Nothing sent to a server.
- **Accessibility-first** — Keyboard navigation, screen reader support, focus management, semantic HTML

---

## Installation (Development)

AllergenGuard is built as a Chrome Extension. To run it locally:

### 1. Clone the repo

```bash
git clone https://github.com/[your-username]/AllGen.git
cd AllGen/frontend
```

### 2. Load into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** ON (top right corner)
3. Click **Load unpacked**
4. Select the `frontend/` folder from this repo
5. The AllergenGuard icon should appear in your toolbar

### 3. Set up your allergens

1. Click the AllergenGuard icon in the toolbar
2. Click **Get Started** to launch the onboarding flow
3. Walk through the 5-screen tour and pick your allergens on screen 4
4. Click **Start Browsing** on the final screen

### 4. Test it

1. Visit any product page on DoorDash, Uber Eats, Amazon, or ShopRite
2. If the product contains one of your selected allergens, a red banner slides down at the top of the page
3. Click the chevron (`⌄`) on the banner to see which ingredient triggered the warning

---

## Project structure

```
frontend/
│
├── manifest.json              # Chrome extension config
├── README.md                  # This file
│
├── popup/                     # Toolbar popup window
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
├── onboarding/                # First-time welcome flow (5 screens)
│   ├── onboarding.html
│   ├── onboarding.css
│   └── onboarding.js
│
├── settings/                  # Manage allergens, theme, reset
│   ├── settings.html
│   ├── settings.css
│   └── settings.js
│
├── content/                   # In-page warning banner
│   ├── alert-banner.html      # Reference template (not loaded directly)
│   ├── alert-banner.css
│   └── alert-banner.js
│
├── scrapers/                  # Per-platform DOM readers
│   ├── scraper-doordash.js
│   ├── scraper-ubereats.js
│   ├── scraper-amazon.js
│   └── scraper-shoprite.js
│
├── shared/                    # Cross-surface code
│   ├── allergen-data.js       # Big 9 + alias dictionary
│   ├── allergen-matcher.js    # Word-boundary matcher
│   └── theme.css              # Design tokens (light + dark)
│
└── assets/                    # Visual resources
    ├── icons/                 # Toolbar icons (16/32/48/128 px)
    └── images/                # Master SVG logo
```

---

## How it works

```
USER VISITS A SUPPORTED SITE
          │
          ▼
manifest.json injects all content scripts
          │
          ▼
┌─────────────────────────────────────────┐
│  shared/allergen-data.js                │
│    → Loads Big 9 list + aliases         │
│                                         │
│  shared/allergen-matcher.js             │
│    → Word-boundary detection            │
│                                         │
│  scrapers/scraper-{platform}.js         │
│    → Reads product name + ingredients   │
│                                         │
│  content/alert-banner.js                │
│    → Orchestrates the pipeline          │
└─────────────────────────────────────────┘
          │
          ▼
content/alert-banner.js calls the scraper
          │
          ▼
Scraper returns { productName, ingredients }
          │
          ▼
Matcher checks against user's saved allergens
          │
          ▼
        Match found?
          ├── YES → Build banner DOM, slide down
          └── NO  → Stay silent
```

The architecture is **strictly layered**. Each file does one job:
- **Scrapers** observe the page silently
- **Matcher** checks text against allergens
- **Banner controller** decides when to show warnings
- **UI surfaces** (popup, onboarding, settings) handle user preferences

Adding a new platform requires writing one new scraper file and adding two lines to `manifest.json`. Everything else just works.

---

## Tech stack

- **Vanilla HTML / CSS / JavaScript** — Zero frameworks, zero build step
- **Chrome Extension Manifest V3** — Latest extension standard
- **CSS Custom Properties (variables)** — Powers the design system + dark mode
- **CSS Grid + Flexbox** — Modern responsive layouts
- **Chrome Storage API** — On-device persistence
- **No external dependencies** — Nothing to npm install, nothing to build

This was a deliberate choice for a hackathon project. No build pipeline = nothing to break under demo pressure.

---

## Architecture decisions

A few intentional choices worth knowing about:

### Why no framework (React, Vue, etc.)?

Chrome extensions don't need them. Vanilla JS is faster to load, requires no build step, and produces smaller bundles. For 20 files of UI code, a framework adds overhead without benefits.

### Why CSS variables for theming?

A single `theme.css` file defines all colors, spacing, fonts, and animations as variables. Light/dark mode is one attribute swap on `<html>`. Every other CSS file just references variables — they get dark mode support for free.

### Why `chrome.storage.local` instead of a backend?

Privacy. AllergenGuard doesn't need to know who you are or what you eat. All data lives on your device. Nothing leaves the browser.

### Why scraping instead of an API?

Grocery sites don't expose public APIs for product data. Scraping the DOM is the only way to get ingredient information from real product pages.

### Why word-boundary matching instead of substring search?

To avoid false positives. Naively, `"milk".includes("milk")` matches both "milk" (correct) AND "milkweed extract" (wrong). Word boundaries (`\bmilk\b`) ensure we only match standalone words.

---

## Roadmap (post-hackathon)

Things we'd add given more time:

- **Custom allergens** — Let users add allergens beyond the Big 9 (gluten, MSG, mustard, etc.)
- **Image OCR** — Read ingredient panels from package photos (huge for Amazon/ShopRite)
- **Walmart, Target, Whole Foods** — More platforms to support
- **Severity tiers** — High vs. low severity per allergen with different banner intensities
- **Multi-profile** — Family mode for parents tracking kids' allergies
- **Backend product database** — UPC lookup for products without ingredient text
- **Mobile app** — iOS / Android versions

---

## Known limitations

We're being honest about what doesn't work yet:

- **Image-only ingredient lists are missed.** If a product hides ingredients in a package photo, we can't read them. The product title still helps catch obvious cases.
- **Selectors can break.** Grocery sites redesign frequently. When DoorDash changes their HTML, our scraper might miss data until we update the selector. We have fallback selectors but they're imperfect.
- **English only.** Aliases are in English. Spanish/French ingredient labels aren't supported.
- **No fuzzy matching.** Misspelled allergens ("Pe@nut") won't match. Real labels rarely have typos, so this is a minor issue.

---

## Built by

**Roberto Tirado Jr.** — Frontend (UI/UX, scrapers, shared logic, settings, onboarding)

**Karanpreet Singh** — Backend

Kean University, Computer Science. Hackathon project, 2026.

---

## License

This project was built for educational and hackathon purposes. No license is currently attached. Reach out if you want to use any of this code.

---

## Acknowledgments

- The **FDA's allergen labeling guidelines** for the Big 9 alias source data
- The **Chrome Extensions documentation team** for excellent Manifest V3 docs
- The **WCAG 2.1 accessibility guidelines** for the patterns used throughout
- Every person living with food allergies who deserves better digital safety tools