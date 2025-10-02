# Blackjack Game

A fully functional online blackjack game with AI assistance, user authentication, and persistent game history.

## 🎮 Live Demo

......

## 👨‍💻 Developer Information

- **Name**: Nicolas Winarto
- **Email**: nicolaswinarto7@gmail.com
- **GitHub**: Nico26122

## 🚀 Features

### Core Gameplay
- Complete blackjack game mechanics following standard casino rules
- Infinite deck simulation (constant card probabilities)
- Automatic dealer AI (hits on ≤16, stands on ≥17)
- Proper Ace handling (counts as 1 or 11)
- Win/loss/push detection
- Smooth card dealing animations

### Database Integration
- User chip balance stored in Supabase PostgreSQL database
- Game history tracking with timestamps
- Persistent data across sessions
- Row Level Security for data protection

### Authentication System
- Email/password registration and login
- Secure session management with Supabase Auth
- New users receive 500 chips on signup
- User-specific data isolation

### AI Assistant
- Gemini AI integration for strategic gameplay advice
- Context-aware recommendations based on player hand and dealer card
- Server-side API to protect API keys

### Additional Features
- Buy chips functionality
- Game history view with results and statistics
- Responsive design for mobile and desktop
- Sign out functionality

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Google Gemini API
- **Deployment**: Vercel

## 📋 Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account
- Google Gemini API key

