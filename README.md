# Construction Tendering Marketplace - SaaS Prototype

A UK construction tendering marketplace prototype built with Next.js, TypeScript, and Tailwind CSS.

## ⚠️ Prototype Disclaimer

This is a **prototype and demonstration project**. It is **not secure, compliant, or production-ready**. It uses:
- Local mock data only
- Simulated payments and fees
- No real authentication
- No email services
- No data persistence

## Overview

A responsive SaaS platform for UK construction tendering with three role-based portals:

### 1. Client Portal
- Create construction tenders
- Receive and compare quotes
- Accept quotes
- Pay simulated processing fees
- Access retailer contact details

### 2. Retailer Portal
- Manage business capabilities and geographical coverage
- Receive matched tender opportunities
- Unlock tender details with subscription or fee
- Submit competitive quotes

### 3. Super User Portal
- User management
- Category and pricing management
- Subscription management
- Tender and quote management
- Payment records
- Document management
- Verification and audit records
- Analytics and insights

## Design System

### Color Palette
- **Construction Navy**: #1F2A33 (Primary navigation)
- **Safety Orange**: #F28C28 (Primary actions)
- **Concrete Grey**: #6B7280 (Secondary text)
- **Steel Blue**: #2F5D7C (Accents)
- **High-Vis Yellow**: #F5C542 (Alerts)
- **Off-White**: #F7F5F0 (Page backgrounds)
- **Success Green**: #2E7D32 (Success states)
- **Warning Amber**: #D97706 (Warnings)
- **Error Red**: #B91C1C (Errors)

## Features

- ✅ Role selection without authentication
- ✅ Desktop-first, fully responsive design
- ✅ Accessible labels and keyboard navigation
- ✅ Shared application shell
- ✅ Role-based sidebars
- ✅ Top navigation with notifications
- ✅ User menu
- ✅ Search functionality
- ✅ Breadcrumbs
- ✅ Empty states
- ✅ Loading skeletons
- ✅ Confirmation dialogs
- ✅ Status badges
- ✅ Tables with sorting and filtering
- ✅ Construction-focused mock data

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **State Management**: Zustand

## Getting Started

### Prerequisites
- Node.js 18+ (recommended 20)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/TenantSpace/Tender.git
cd Tender

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Role selection screen
│   ├── client/            # Client portal
│   ├── retailer/          # Retailer portal
│   └── admin/             # Super user portal
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Shared layout components
│   ├── forms/             # Form components
│   └── dashboard/         # Dashboard components
├── lib/
│   ├── mock-data/         # Fictional UK construction data
│   ├── types.ts           # Shared TypeScript types
│   ├── utils.ts           # Utility functions
│   └── store.ts           # Zustand store
└── hooks/                 # Custom React hooks
```

## Data

All data is mock and fictional. The prototype includes:
- Realistic but clearly fictional UK construction companies
- Sample tenders and quotes
- Mock payment transactions
- Fictional contact information
- Sample analytics data

## Development Notes

- No environment variables required for local development
- All data is stored in-memory and resets on page reload
- Payments are simulated and never processed
- User authentication is bypassed with role selection screen

## License

MIT
