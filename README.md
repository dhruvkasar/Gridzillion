# Color War 🔴🔵

A strategic game of territorial dominance built with React, TypeScript, and Tailwind CSS. Paint the grid, trap your opponent, and claim the most squares to win!

## 🎮 Overview
Experience a beautiful Bauhaus-inspired UI with smooth animations and dynamic audio.

### Features
* **Game Modes:** Play locally against a friend (PvP) or challenge the AI (PvE).
* **AI Difficulties:** Choose from Easy, Medium, Hard, or **Pro** (powered by a Minimax algorithm with Alpha-Beta pruning for deep strategic look-ahead).
* **Rule Sets:**
  * **Classic:** Place tiles adjacent to your existing territory to slowly expand.
  * **Advanced:** Flank and trap your opponent's tiles to flip them to your color (Othello/Reversi style).
* **Dynamic Grid Sizes:** Play on 6x6, 8x8, 10x10, or 12x12 grids.
* **Interactive Onboarding:** A 3-step animated tutorial to teach new players the mechanics.
* **Dynamic Audio:** Generative Web Audio API soundscapes that create a unique victory melody based on the final grid pattern.
* **Responsive Design:** A fully responsive, single-screen layout that works perfectly on desktop and mobile without scrolling.

## 🛠️ Tech Stack
* **Frontend Framework:** React 18
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Animations:** Framer Motion
* **Icons:** Lucide React
* **Audio:** Native Web Audio API

## 📖 How to Play
1. **The Objective:** Have the most squares of your color when the board is completely full.
2. **Basic Rules:** You can only place a tile adjacent to an existing tile on the board. Block your opponent's path to limit their moves and control the board.
3. **Advanced Mode:** Placing a tile that traps your opponent's tiles between two of yours will flip them to your color!

## 👨‍💻 Authors
Built by **Dhruv Kasar** and **Harshil**.
