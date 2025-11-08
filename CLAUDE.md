# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Next.js 16 project with React 19, TypeScript 5, and Tailwind CSS 4. The project uses shadcn/ui components (New York style) and includes MCP server integration for enhanced development capabilities.

## Commands

### Development
```bash
npm run dev          # Start dev server (default port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

Note: The project has both `package-lock.json` and `pnpm-lock.yaml` present. Use npm for consistency with the package.json scripts.

## Project Structure

```
/www/ib-editor/my-app/
├── app/             # Next.js 16 App Router
│   ├── page.tsx     # Home page
│   ├── layout.tsx   # Root layout
│   └── globals.css  # Global styles (Tailwind 4)
├── lib/             # Utilities (cn() helper from shadcn)
└── public/          # Static assets
```

## Technology Stack

- **Framework**: Next.js 16.0.1 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x (target: ES2017)
- **Styling**: Tailwind CSS 4 with `tw-animate-css`
- **UI Components**: shadcn/ui (New York style, lucide-react icons)
- **Path Aliases**: `@/*` maps to project root

## Key Configuration

### TypeScript
- Path alias: `@/*` resolves to root directory
- JSX runtime: `react-jsx` (new JSX transform)
- Target: ES2017 with strict mode

### Tailwind CSS 4
- Uses `@import "tailwindcss"` syntax (CSS-first configuration)
- Custom dark mode variant: `@custom-variant dark (&:is(.dark *))`
- Theme variables defined in `globals.css` using OKLCH color space
- Supports both light and dark modes with CSS variables

### shadcn/ui
- Style: `new-york`
- RSC: enabled
- Icon library: `lucide-react`
- Base color: neutral
- Component aliases configured in `components.json`

## MCP Server Integration

Four MCP servers configured in `.mcp.json`:

1. **next-devtools**: Next.js development tools
2. **chrome-devtools**: Browser debugging and performance analysis
3. **context7**: Up-to-date documentation for Next.js, React, TypeScript, etc.
4. **postgres-editor**: PostgreSQL database access (localhost:5432/postgres)

Use the context7 server to fetch latest documentation for libraries when needed.
