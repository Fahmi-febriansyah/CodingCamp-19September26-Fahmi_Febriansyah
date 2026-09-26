# Expense & Budget Visualizer — Project Steering

## Project Overview
A mobile-friendly web app that helps users track their daily spending.
Built as part of the CodingCamp assignment using Kiro IDE.

## Tech Stack
- **HTML** — structure only (index.html at root)
- **CSS** — styling only (`css/style.css`, single file)
- **Vanilla JavaScript** — all logic (`js/app.js`, single file)
- **Chart.js** — pie chart via CDN
- No frameworks (no React, Vue, etc.)
- No backend server

## Folder Rules
- Only 1 CSS file inside `css/`
- Only 1 JavaScript file inside `js/`

## Data Storage
- All data stored via browser `localStorage`
- No external API calls

## Features Implemented
### MVP
- Input form with Item Name, Amount, Category (Food, Transport, Fun)
- Form validation (all fields required, amount must be > 0)
- Transaction list (scrollable, shows name/amount/category/date, delete button)
- Total balance display (auto-updates on add/delete)
- Pie chart by category (Chart.js, auto-updates)

### Optional Challenges (3 of 5)
1. Dark / Light mode toggle
2. Sort transactions by amount or category
3. Monthly summary view with month navigation

### Bonus
- Custom category support
- Spending limit highlight / warning

## Browser Compatibility
Must work in: Chrome, Firefox, Edge, Safari
