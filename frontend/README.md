This is a [Next.js](https://nextjs.org) project (frontend) that connects to the Node.js backend API.

## Prerequisites

- Node.js 18+
- The backend must be running on port 3000 (see `../backend/README.md`)

## Setup

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```
Edit `.env.local` and set `NEXT_PUBLIC_API_URL` to your backend URL (default: `http://localhost:3000`).

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

> **Default login credentials:** `admin@admin.com` / `admin`  
> These are created automatically when the backend starts for the first time.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
