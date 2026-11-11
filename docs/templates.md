# Liquid Project Templates 🫟

Liquid provides 8 curated, production-ready project templates that work seamlessly on **Web** and **native Android** with zero configuration.

You can inspect the full template catalog anytime from the CLI:
```bash
liquid create --list
# or
liquid templates
```

To create a new project using any template:
```bash
liquid create <project-name> --template <template-id>
```

---

## Catalog Overview

| Template ID | Name | Category | Description |
|---|---|---|---|
| [`starter`](#1-starter) | Starter | Foundations | Minimal clean structure with client routing, state store, design tokens, and 2 sample pages. |
| [`todo-pro`](#2-todo-pro) | Todo Pro | Productivity | Complete task manager with search, filter tabs, priority tags, and persistence. |
| [`notes`](#3-notes) | Notes | Productivity | Notes app with list/detail/editor workflow, tag badges, instant search, and delete confirmation modal. |
| [`chat`](#4-chat) | Chat | Communication | Messenger interface with conversation list, message bubbles, timestamps, and simulated auto-reply bot. |
| [`shop`](#5-shop) | Shop | E-Commerce | Storefront with product catalog, cart drawer, totals calculation (tax & shipping), and checkout modal. |
| [`weather`](#6-weather) | Weather | Data & Utilities | Real-time weather dashboard with Open-Meteo REST API, offline mock fallback, and °C/°F unit toggle. |
| [`expense-tracker`](#7-expense-tracker) | Expense Tracker | Finance | Budget tracker with pure flex view-based bar charts (0% canvas/SVG), progress bars, and categories. |
| [`arabic-app`](#8-arabic-app-rtl) | Arabic App (RTL) | Internationalization | Arabic-first bidirectional app with CSS logical properties, cultural wisdom cards, and live Ar/En switch. |

---

## Template Details

### 1. `starter`
- **Command**: `liquid create my-app --template starter`
- **Purpose**: The ideal starting point for new applications.
- **Features**:
  - Centralized design tokens in `src/tokens.js`.
  - Global reactive store in `src/store.js`.
  - Reusable `Header` and `Card` components.
  - Multi-page routing between `/` (Home) and `/#/about` (About).
- **Run**:
  ```bash
  cd my-app
  npm run dev
  ```

### 2. `todo-pro`
- **Command**: `liquid create my-todo --template todo-pro`
- **Purpose**: Demonstrates state filtering, signals, lists, and cross-platform storage.
- **Features**:
  - Filter tabs: *All*, *Active*, *Completed*.
  - Priority levels (*High*, *Medium*, *Low*) with color badges.
  - Live search input filter.
  - Automatic persistence to `localStorage` (with graceful fallback on Android).

### 3. `notes`
- **Command**: `liquid create my-notes --template notes`
- **Purpose**: Master-detail flow and modal overlays.
- **Features**:
  - Split master-detail view with live editor.
  - Category tagging (Work, Personal, Ideas).
  - Search filter across title and body text.
  - Delete confirmation dialog modal with scrim backdrop.

### 4. `chat`
- **Command**: `liquid create my-chat --template chat`
- **Purpose**: Responsive flexbox layouts, event handlers, and asynchronous simulation.
- **Features**:
  - Conversation list with active selection and unread badges.
  - Left-aligned (bot) and right-aligned (user) message bubbles.
  - Simulated intelligent bot auto-replies with 1-second typing delay.
  - Automatic timestamp generation.

### 5. `shop`
- **Command**: `liquid create my-shop --template shop`
- **Purpose**: E-commerce storefront architecture and derived computed financial calculations.
- **Features**:
  - Category filter pills (Electronics, Audio, Wearables, Accessories).
  - Slide-out Cart Drawer with animated item counters.
  - Live calculations: subtotal, 8% sales tax, and tiered free shipping.
  - Checkout modal with credit card & address input validation.

### 6. `weather`
- **Command**: `liquid create my-weather --template weather`
- **Purpose**: Handling external asynchronous REST APIs and network resilience.
- **Features**:
  - Fetches real live weather data from Open-Meteo REST endpoints.
  - Fallback mock data when offline or in restricted environments.
  - City selector (Tokyo, Paris, New York, Cairo, Sydney).
  - One-click temperature unit toggle (°C / °F).
  - 7-day weather forecast breakdown.

### 7. `expense-tracker`
- **Command**: `liquid create my-expenses --template expense-tracker`
- **Purpose**: Pure view-based data visualization without external graphing libraries.
- **Features**:
  - Monthly budget limit and reactive progress bar.
  - Pure CSS flex-based vertical bar charts (100% Android and web native, 0% SVG/Canvas).
  - Category breakdown (Food, Transport, Utilities, Entertainment).
  - Quick-add transaction modal dialog.

### 8. `arabic-app` (RTL)
- **Command**: `liquid create my-arabic-app --template arabic-app`
- **Purpose**: Right-To-Left language support and internationalization best practices.
- **Features**:
  - Arabic-first typography using system native Arabic fonts.
  - Bidirectional layout mirroring using CSS logical properties (`margin-inline`, `padding-inline`, `border-inline-start`).
  - Dynamic runtime language switcher (Arabic ⇄ English) updating `dir="rtl"` / `dir="ltr"` on the fly.
  - Cultural wisdom quote cards and bilingual task items.

---

## Verification & Parity Guarantee

Every template is continuously tested to guarantee:
1. **Universal Build**: Compiles for both Web and native Android (`liquid build android`).
2. **Zero Unsupported CSS**: Produces 0 unsupported native Android style diagnostics.
3. **Link Checking**: Passes compile-time pure JS scope analysis with 0 unresolved identifiers.
4. **Automated Unit Tests**: Includes comprehensive unit tests in `tests/<id>.test.js`.
