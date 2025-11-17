# LLM Governance Dashboard - Frontend

A modern, production-ready SvelteKit frontend for the LLM Governance Dashboard platform.

## Tech Stack

- **Framework**: SvelteKit 2.x with TypeScript
- **Styling**: Tailwind CSS 3.x with custom design system
- **Data Fetching**: TanStack Query (Svelte Query)
- **Validation**: Zod
- **Charts**: Chart.js with svelte-chartjs
- **Visualizations**: D3.js
- **Date Handling**: date-fns
- **Notifications**: svelte-sonner
- **Build**: Vite with optimized production builds
- **Deployment**: Node.js adapter for production

## Project Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── auth/        # Authentication components
│   │   │   ├── dashboard/   # Dashboard widgets
│   │   │   ├── policy/      # Policy management components
│   │   │   ├── audit/       # Audit log components
│   │   │   ├── cost/        # Cost tracking components
│   │   │   ├── users/       # User management components
│   │   │   └── common/      # Shared components (buttons, cards, etc.)
│   │   ├── stores/          # Svelte stores for state management
│   │   ├── api/             # API client and service functions
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── routes/              # SvelteKit routes and pages
│   │   ├── (auth)/          # Authentication routes (login, register)
│   │   ├── (app)/           # Protected application routes
│   │   └── api/             # API endpoints
│   ├── app.css              # Global styles and Tailwind directives
│   └── app.html             # HTML template
├── static/                  # Static assets (images, fonts, etc.)
├── tests/                   # Test files
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or pnpm

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env
```

Edit `.env` and configure the API URL and other settings:

```env
PUBLIC_API_URL=http://localhost:8000/api/v1
PUBLIC_APP_NAME=LLM Governance Dashboard
PUBLIC_APP_VERSION=1.0.0
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

#### Development Features

- Hot Module Replacement (HMR)
- TypeScript type checking
- Automatic API proxy to backend at `/api`
- Fast refresh for Svelte components

### Building for Production

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Production Deployment

The application uses `@sveltejs/adapter-node` for Node.js deployment:

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
node build
```

The build output includes:
- Precompressed assets (gzip/brotli)
- Code splitting and lazy loading
- Optimized vendor chunks
- CSS minification

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run type checking
- `npm run check:watch` - Run type checking in watch mode

## Design System

The application uses a professional design system built on Tailwind CSS:

### Color Palette

- **Primary**: Blue (for primary actions and branding)
- **Secondary**: Gray (for secondary elements)
- **Success**: Green (for positive states)
- **Warning**: Yellow (for warnings)
- **Danger**: Red (for errors and destructive actions)

### Typography

- **Font Family**: Inter (body), JetBrains Mono (code)
- **Font Weights**: 300, 400, 500, 600, 700

### Components

Pre-built component classes available:

- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.card` - White card with shadow and border
- `.input` - Styled form inputs
- `.label` - Form labels
- `.badge`, `.badge-primary`, `.badge-success`, etc.
- `.table`, `.table-header`, `.table-row`, `.table-cell`

## API Integration

The frontend communicates with the backend via a typed API client:

```typescript
import { apiClient, authApi, policiesApi } from '$api';

// Authentication
const response = await authApi.login({ email, password });

// Fetching data
const policies = await policiesApi.list({ is_active: true });
```

### API Modules

- `authApi` - Authentication and user management
- `policiesApi` - Policy CRUD and violations
- `usageApi` - LLM usage tracking and statistics
- `auditApi` - Audit logs
- `costsApi` - Cost tracking and budgets
- `usersApi` - User management

## State Management

The application uses Svelte stores for global state:

### Auth Store

```typescript
import { authStore } from '$stores';

// Access auth state
$authStore.user
$authStore.isAuthenticated

// Update auth state
authStore.setUser(user);
authStore.logout();
```

### Theme Store

```typescript
import { theme } from '$stores';

// Toggle theme
theme.toggle();

// Set specific theme
theme.set('dark');
```

## Data Fetching with TanStack Query

The application uses TanStack Query for server state management:

```typescript
import { createQuery } from '@tanstack/svelte-query';
import { policiesApi } from '$api';

const policiesQuery = createQuery({
  queryKey: ['policies'],
  queryFn: () => policiesApi.list(),
});

// Access data
$policiesQuery.data
$policiesQuery.isLoading
$policiesQuery.error
```

## Type Safety

All API models and responses are fully typed with TypeScript. Type definitions are located in `src/lib/types/index.ts`:

- User & Authentication types
- Policy types
- LLM Usage types
- Audit types
- Cost types
- Dashboard metrics
- API response types

## Utilities

Common utility functions are available:

### Formatters

```typescript
import { formatCurrency, formatNumber, formatPercentage } from '$utils';

formatCurrency(123.456); // "$123.46"
formatNumber(1234567); // "1.2M"
formatPercentage(45.67); // "45.7%"
```

### Date Utilities

```typescript
import { formatDate, formatDateTime, formatRelativeTime } from '$utils';

formatDate(new Date()); // "Nov 16, 2025"
formatDateTime(new Date()); // "Nov 16, 2025 2:30 PM"
formatRelativeTime(new Date()); // "just now"
```

### Validators

```typescript
import { loginSchema, registerSchema, isValidEmail } from '$utils';

const result = loginSchema.safeParse({ email, password });
```

## Environment Variables

All public environment variables must be prefixed with `PUBLIC_`:

- `PUBLIC_API_URL` - Backend API base URL
- `PUBLIC_APP_NAME` - Application name
- `PUBLIC_APP_VERSION` - Application version
- `PUBLIC_ENABLE_ANALYTICS` - Enable analytics
- `PUBLIC_ENABLE_NOTIFICATIONS` - Enable notifications

## Path Aliases

The following path aliases are configured:

- `$lib` - `src/lib`
- `$components` - `src/lib/components`
- `$stores` - `src/lib/stores`
- `$api` - `src/lib/api`
- `$types` - `src/lib/types`
- `$utils` - `src/lib/utils`

## Performance Optimizations

The production build includes:

- Code splitting and lazy loading
- Manual chunk splitting for vendors, charts, and utils
- CSS minification
- Asset precompression (gzip/brotli)
- Tree shaking
- Minification with esbuild
- Optimized dependency bundling

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)

## Contributing

1. Follow the existing code structure and naming conventions
2. Use TypeScript for all new code
3. Add proper type definitions
4. Use Tailwind CSS utility classes
5. Keep components small and focused
6. Write reusable utility functions

## License

This project is part of the LLM Governance Dashboard platform.
