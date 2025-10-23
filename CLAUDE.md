# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Photography studio management web application built with **Angular 20.3** and **TypeScript 5.9**. Uses modern Angular patterns: standalone components, signals-based state, zoneless change detection, and the **Scope Rule** architecture pattern.

**Package Manager**: `pnpm` (required)

## Essential Commands

### Development
```bash
pnpm install              # Install dependencies (first time setup)
ng serve -o              # Dev server at http://localhost:4200
ng build                 # Production build
pnpm run watch           # Development build in watch mode
pnpm test                # Run all tests (Karma + Jasmine)
```

### API Client Generation
```bash
pnpm run generate:api           # Generate from http://localhost:8000/openapi.json
pnpm run generate:api:watch     # Watch mode for API changes
```

Generated TypeScript client is output to `src/generated/` using `@hey-api/openapi-ts`.

### Code Generation
```bash
ng generate component feature-name    # Creates standalone component
ng generate service service-name      # Creates injectable service
ng generate guard guard-name          # Creates route guard
```

**Important**: DO NOT use `.component`, `.service`, `.module` suffixes in filenames. The Angular CLI will add them, but they should be removed (e.g., `login.component.ts` → `login.ts`).

## Architecture

### Folder Structure
```
src/app/
├── core/                           # Singleton services, guards, interceptors, directives
│   ├── guards/                     # authGuard, permissionGuard
│   ├── interceptors/               # auth, error, token-refresh
│   ├── services/                   # auth, storage, notification, token-refresh
│   ├── directives/                 # hasPermission, hasRole
│   ├── layout/                     # main-layout, topbar, sidebar
│   ├── utils/                      # jwt.utils
│   └── config/                     # api-client.config
│
├── features/                       # Business features (lazy-loaded)
│   ├── auth/                       # Login, authentication
│   ├── dashboard/                  # Main dashboard
│   ├── clients/                    # Client management
│   ├── catalog/                    # Package/service catalog
│   ├── sessions/                   # Photo session management
│   ├── users/                      # User administration
│   ├── unauthorized/               # 403 page
│   └── shared/                     # Components used by 2+ features ONLY
│
├── app.ts                          # Root component
├── app.config.ts                   # App configuration (DI, routing, etc.)
└── app.routes.ts                   # Top-level routes

src/
├── generated/                      # Auto-generated OpenAPI client (DO NOT EDIT)
├── environments/                   # Environment configs
├── main.ts                         # Bootstrap
└── styles.css                      # Global styles
```

### Path Aliases (tsconfig.json)
```typescript
"@core/*"         → "src/app/core/*"
"@shared/*"       → "src/app/features/shared/*"
"@features/*"     → "src/app/features/*"
"@environments/*" → "src/environments/*"
"@generated/*"    → "src/generated/*"
```

### Scope Rule (Critical Architecture Pattern)

**"Scope determines structure"** - Non-negotiable rule for code organization:

- **Used by 1 feature only** → Keep it LOCAL within that feature folder
- **Used by 2+ features** → Move to `shared/` or `core/`

Example feature structure:
```
features/auth/
├── login.ts                 # Main component
├── login.html
├── login.css
├── components/              # Auth-specific components ONLY
├── services/                # Auth-specific services ONLY
├── models/                  # Auth-specific types ONLY
└── auth.routes.ts           # Auth routes
```

**Never** create a component in `shared/` until it's actually used by 2+ features.

## Angular 20+ Critical Patterns

### 1. Zoneless Change Detection (NO zone.js)
This project uses `provideZonelessChangeDetection()`. Change detection is triggered by signals, not zones.

### 2. DO NOT declare `standalone: true`
It's the default in Angular 20+. Declaring it explicitly is redundant and should be avoided.

### 3. Modern Component Pattern
```typescript
import { Component, ChangeDetectionStrategy, signal, computed, input, output, inject } from '@angular/core';

@Component({
  selector: 'app-example',
  imports: [CommonModule, /* other imports */],
  changeDetection: ChangeDetectionStrategy.OnPush,  // REQUIRED
  templateUrl: './example.html'
})
export class ExampleComponent {
  // ✅ Use input() not @Input()
  readonly data = input<DataType>();

  // ✅ Use output() not @Output()
  readonly selected = output<ItemType>();

  // ✅ Use signals for state
  private readonly loading = signal(false);
  readonly isLoading = this.loading.asReadonly();

  // ✅ Use computed for derived state
  readonly filteredData = computed(() => this.data()?.filter(x => x.active) ?? []);

  // ✅ Use inject() not constructor injection
  private readonly service = inject(ExampleService);

  // ✅ Use effect() not ngOnInit for side effects
  constructor() {
    effect(() => {
      if (this.data()) {
        this.service.doSomething(this.data());
      }
    });
  }
}
```

### 4. Modern Template Syntax
```html
<!-- ✅ Use native control flow -->
@if (isLoading()) {
  <p-progressSpinner />
} @else {
  @for (item of items(); track item.id) {
    <div>{{ item.name }}</div>
  }
}

@switch (status()) {
  @case ('active') { <span>Active</span> }
  @case ('inactive') { <span>Inactive</span> }
  @default { <span>Unknown</span> }
}

<!-- ✅ Use @defer for lazy loading -->
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <p-skeleton />
}

<!-- ❌ NEVER use old structural directives -->
<!-- *ngIf, *ngFor, *ngSwitch are forbidden -->
```

### 5. Signal-Based Services
```typescript
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);

  // Private signal for internal state
  private readonly _state = signal<State>({ items: [], loading: false });

  // Public read-only computed properties
  readonly items = computed(() => this._state().items);
  readonly loading = computed(() => this._state().loading);

  loadData(): void {
    this._state.update(s => ({ ...s, loading: true }));
    // ... fetch data
  }
}
```

### 6. Reactive Route Parameters (NO route.snapshot)
```typescript
// ❌ WRONG - breaks zoneless change detection
constructor() {
  const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
}

// ✅ CORRECT - reactive pattern
private readonly route = inject(ActivatedRoute);
readonly routeParams = toSignal(this.route.paramMap);
readonly id = computed(() => this.routeParams()?.get('id'));
```

## Core Services & Utilities

### AuthService (`@core/services/auth`)
JWT-based authentication with automatic token refresh.
```typescript
readonly isAuthenticated = signal<boolean>(false);
readonly currentUser = signal<User | null>(null);
login(credentials: LoginRequest): Observable<LoginResponse>
logout(): void
```

### StorageService (`@core/services/storage`)
Type-safe localStorage/sessionStorage wrapper.

### NotificationService (`@core/services/notification`)
PrimeNG MessageService wrapper for toast notifications.
```typescript
showSuccess(message: string): void
showError(message: string): void
showInfo(message: string): void
showWarning(message: string): void
```

### TokenRefreshService (`@core/services/token-refresh`)
Handles JWT refresh token logic with retry mechanism.

## HTTP Interceptors

### authInterceptor
Automatically adds JWT `Authorization` header to requests.

### tokenRefreshInterceptor
Intercepts 401 responses, refreshes token, and retries failed request.

### errorInterceptor
Global error handler for HTTP errors (maps to user-friendly messages).

## Route Guards

### authGuard
Redirects to `/auth/login` if not authenticated.

### permissionGuard
Checks user permissions before allowing route access (configurable via route data).

## Directives

### hasPermissionDirective
Conditionally shows/hides elements based on user permissions.

### hasRoleDirective
Conditionally shows/hides elements based on user roles.

## UI Framework

**PrimeNG 20.2** with **Aura** preset theme configured in `app.config.ts`:
```typescript
providePrimeNG({
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: 'class',
      cssLayer: false
    }
  }
})
```

Common components: `p-button`, `p-table`, `p-dialog`, `p-toast`, `p-calendar`, `p-dropdown`, etc.

**Chart.js 4.5** integrated for data visualization.

## TypeScript Configuration

- **Strict mode enabled**: All strict checks on
- **Target**: ES2022
- **No `any` types**: Use `unknown` or specific types
- **No implicit returns**
- **Strict template checking**
- **Strict injection parameters**

## Testing

- **Framework**: Karma + Jasmine
- Use `TestBed` for component/service testing
- Mock signals using `signal()` in test setup
- All new code should include tests

## Business Domain

Photography studio management system handling:
- **Clients**: Customer records and contact info
- **Sessions**: Photo shoot scheduling and tracking
- **Catalog**: Service packages and pricing
- **Users**: Staff accounts and permissions
- **Dashboard**: Overview metrics and quick actions

## Critical Rules

1. **NO NgModules** - This is a standalone-only project
2. **NO zone.js** - Use zoneless change detection patterns
3. **NO `standalone: true`** - It's default in Angular 20+
4. **NO `any` types** - Strict typing enforced
5. **NO old template syntax** - Use `@if`, `@for`, `@switch`
6. **NO `@Input/@Output`** - Use `input()/output()` functions
7. **NO constructor DI** - Use `inject()` function
8. **NO lifecycle hooks** - Use signals, computed, and effect
9. **NO violating Scope Rule** - Strictly enforce feature isolation
10. **NO file suffixes** - Use `login.ts` not `login.component.ts`

## References

- [Angular Official Docs](https://angular.dev)
- [PrimeNG Components](https://primeng.org)
- [OpenAPI TypeScript Generator](https://heyapi.vercel.app/openapi-ts/get-started.html)
