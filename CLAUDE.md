# Photography Studio Web - Contexto del Proyecto

## Descripción General

Aplicación web de gestión para estudios fotográficos desarrollada con Angular 20+ y TypeScript. El proyecto sigue estrictamente las mejores prácticas de Angular moderno y la arquitectura **Scope Rule** con principios de **Screaming Architecture**.

## Stack Tecnológico

### Core

-   **Angular**: 20.3.0 (Standalone Components)
-   **TypeScript**: 5.9.2
-   **RxJS**: 7.8.0
-   **pnpm**: 10.8.1 (Manejador de paquetes)

### UI/UX

-   **PrimeNG**: 20.2.0 (Biblioteca de componentes UI)
-   **PrimeIcons**: 7.0.0
-   **@primeuix/themes**: 1.2.5 (Tema Aura configurado)

### Herramientas de Desarrollo

-   **Angular CLI**: 20.3.6
-   **@hey-api/openapi-ts**: 0.85.2 (Generación de clientes API desde OpenAPI)
-   **Prettier**: Configurado para formateo de código
-   **Karma + Jasmine**: Testing

### Backend Integration

-   API REST documentada con OpenAPI/Swagger
-   Cliente API generado automáticamente desde `http://localhost:8000/openapi.json`
-   Archivos generados en `src/generated/`

## Arquitectura del Proyecto

### Estructura de Carpetas

```
src/
├── app/
│   ├── core/                      # Servicios singleton y configuración global
│   │   ├── guards/                # Guards de autenticación y permisos
│   │   ├── interceptors/          # HTTP interceptors (auth, error)
│   │   ├── services/              # Servicios core (auth, storage, notification)
│   │   └── utils/                 # Utilidades globales
│   │
│   ├── features/                  # Características de negocio
│   │   ├── auth/                  # Autenticación (login)
│   │   ├── dashboard/             # Dashboard principal
│   │   ├── unauthorized/          # Página de acceso no autorizado
│   │   └── shared/                # SOLO componentes usados por 2+ features
│   │
│   ├── app.ts                     # Componente raíz standalone
│   ├── app.config.ts              # Configuración de la aplicación
│   └── app.routes.ts              # Configuración de rutas
│
├── generated/                     # Código auto-generado (OpenAPI client)
├── environments/                  # Configuraciones de entorno
├── main.ts                        # Bootstrap de la aplicación
└── styles.css                     # Estilos globales
```

### Path Aliases (tsconfig.json)

```typescript
{
  "@core/*": ["src/app/core/*"],
  "@shared/*": ["src/app/features/shared/*"],
  "@features/*": ["src/app/features/*"],
  "@environments/*": ["src/environments/*"],
  "@generated/*": ["src/generated/*"]
}
```

## Principios Fundamentales de Angular 20+

### 1. ⚠️ NO usar zone.js

**IMPORTANTE**: Este proyecto NO utiliza zone.js. Angular 20+ utiliza detección de cambios zoneless por defecto.

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(), // ✅ Modo zoneless
        // ...
    ],
};
```

### 2. ⚠️ NO declarar `standalone: true`

**IMPORTANTE**: A partir de Angular 20, `standalone: true` es el comportamiento por defecto y NO debe declararse explícitamente.

```typescript
// ❌ INCORRECTO (Angular 19 o anterior)
@Component({
  standalone: true,
  selector: 'app-login',
  // ...
})

// ✅ CORRECTO (Angular 20+)
@Component({
  selector: 'app-login',
  imports: [...],
  // ...
})
```

### 3. Componentes Standalone Modernos

Todos los componentes deben seguir este patrón:

```typescript
import { Component, ChangeDetectionStrategy, signal, computed, input, output } from '@angular/core';

@Component({
    selector: 'app-feature',
    imports: [
        /* dependencias */
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isLoading()) {
        <div>Loading...</div>
        } @else { @for (item of items(); track item.id) {
        <div>{{ item.name }}</div>
        } }
    `,
})
export class FeatureComponent {
    // ✅ Usar input() en lugar de @Input()
    readonly data = input<DataType>();
    readonly config = input({ required: true });

    // ✅ Usar output() en lugar de @Output()
    readonly itemSelected = output<ItemType>();

    // ✅ Usar signals para estado
    private readonly loading = signal(false);
    readonly isLoading = this.loading.asReadonly();

    // ✅ Usar computed para estado derivado
    readonly items = computed(() => this.data()?.filter((item) => item.active) ?? []);

    // ✅ Usar inject() en lugar de constructor
    private readonly service = inject(FeatureService);
}
```

### 4. NO usar NgModules

-   **Prohibido** crear o usar `@NgModule`
-   Usar lazy loading con standalone components
-   Importar dependencias directamente en el decorador `@Component`

### 5. Sintaxis Moderna de Templates

```typescript
// ✅ Control flow nativo (Angular 17+)
@if (condition) { ... }
@else { ... }

@for (item of items; track item.id) { ... }

@switch (value) {
  @case (1) { ... }
  @default { ... }
}

// ✅ Defer para lazy loading
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <div>Loading...</div>
}

// ❌ NO usar directivas estructurales antiguas
*ngIf, *ngFor, *ngSwitch
```

### 6. Gestión de Estado con Signals

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
    private readonly http = inject(HttpClient);

    // Signal privado para estado interno
    private readonly _state = signal<FeatureState>({
        items: [],
        loading: false,
        error: null,
    });

    // Computed públicos de solo lectura
    readonly items = computed(() => this._state().items);
    readonly loading = computed(() => this._state().loading);
    readonly error = computed(() => this._state().error);

    loadItems(): void {
        this._state.update((state) => ({ ...state, loading: true }));
        // Implementation
    }
}
```

### 7. Evitar Lifecycle Hooks

```typescript
// ❌ NO usar ngOnInit
ngOnInit() {
  this.loadData();
}

// ✅ Usar signals y computed
readonly data = computed(() => this.service.getData());

// ✅ O effect() si es necesario efectos secundarios
private loadEffect = effect(() => {
  const id = this.itemId();
  if (id) {
    this.loadData(id);
  }
});
```

### 8. Dependency Injection con inject()

```typescript
// ❌ NO usar constructor injection
constructor(
  private authService: AuthService,
  private router: Router
) {}

// ✅ Usar inject()
private readonly authService = inject(AuthService);
private readonly router = inject(Router);
```

### 9. NO usar 'any'

```typescript
// ❌ PROHIBIDO
const data: any = response;

// ✅ Usar tipos específicos o genéricos
const data: ResponseType = response;
const data = response as ResponseType;
```

### 10. Convención de Nombres de Archivos

**NO usar** sufijos `.component`, `.service`, `.module` en nombres de archivos.

```
❌ login.component.ts
❌ auth.service.ts
❌ auth.module.ts

✅ login.ts              (el comportamiento se entiende por el contexto)
✅ auth.ts               (servicio de autenticación)
✅ auth.routes.ts        (configuración de rutas)
```

## Scope Rule - Regla Fundamental

### "Scope determines structure"

**Regla absoluta e innegociable:**

-   **Código usado por 1 feature** → DEBE quedarse LOCAL en esa feature
-   **Código usado por 2+ features** → DEBE ir en `shared/` o `core/`

### Ejemplo de Estructura de Feature

```
features/
├── auth/
│   ├── login.ts                    # Componente principal
│   ├── login.html
│   ├── login.css
│   ├── components/                 # Componentes SOLO de auth
│   ├── services/                   # Servicios SOLO de auth
│   ├── models/                     # Tipos SOLO de auth
│   └── auth.routes.ts
│
└── shared/                         # SOLO si 2+ features lo usan
    ├── components/
    ├── directives/
    ├── pipes/
    └── services/
```

## Configuración de la Aplicación

### Change Detection Zoneless

```typescript
// app.config.ts
export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(), // ✅ Sin zone.js
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura,
                options: {
                    prefix: 'p',
                    darkModeSelector: 'class',
                    cssLayer: false,
                },
            },
        }),
        MessageService,
    ],
};
```

### Rutas

```typescript
// app.routes.ts
export const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full',
    },
    {
        path: 'auth',
        loadChildren: () => import('./features/auth/auth.routes'),
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
    },
    {
        path: 'unauthorized',
        loadComponent: () =>
            import('./features/unauthorized/unauthorized').then((m) => m.UnauthorizedComponent),
    },
];
```

## Comandos Importantes

### Desarrollo

```bash
ng serve -o                  # Servidor de desarrollo (http://localhost:4200)
ng build                     # Build de producción
pnpm run watch               # Build en modo watch
pnpm test                    # Tests con Karma
```

### Generación de API Client

```bash
pnpm run generate:api         # Genera cliente desde OpenAPI (una vez)
pnpm run generate:api:watch   # Genera en modo watch
```

El cliente se genera desde `http://localhost:8000/openapi.json` hacia `src/generated/`.

### Gestión de Paquetes (pnpm)

```bash
pnpm install                 # Instalar dependencias
pnpm add <package>           # Agregar dependencia
pnpm add -D <package>        # Agregar dependencia de desarrollo
pnpm remove <package>        # Eliminar dependencia
pnpm update                  # Actualizar dependencias
```

### Angular CLI

```bash
ng generate component feature-name    # Genera componente standalone
ng generate service service-name      # Genera servicio
ng generate guard guard-name          # Genera guard
```

## Core Services

### AuthService (`@core/services/auth`)

Maneja autenticación, tokens JWT y estado de sesión.

```typescript
readonly isAuthenticated = signal(false);
readonly currentUser = signal<User | null>(null);

login(credentials: LoginRequest): Observable<LoginResponse>
logout(): void
getToken(): string | null
```

### StorageService (`@core/services/storage`)

Abstracción sobre localStorage/sessionStorage.

### NotificationService (`@core/services/notification`)

Wrapper sobre PrimeNG MessageService para mostrar toasts.

```typescript
showSuccess(message: string): void
showError(message: string): void
showInfo(message: string): void
showWarning(message: string): void
```

## Interceptors

### authInterceptor

Añade el token JWT a todas las peticiones HTTP.

### errorInterceptor

Maneja errores HTTP globalmente (401, 403, 500, etc.).

## Guards

### authGuard

Protege rutas que requieren autenticación.

### permissionGuard

Valida permisos específicos para acceder a rutas.

## Prettier Configuration

```json
{
    "printWidth": 100,
    "singleQuote": true,
    "overrides": [
        {
            "files": "*.html",
            "options": {
                "parser": "angular"
            }
        }
    ]
}
```

## TypeScript Configuration

-   **Strict mode**: Habilitado
-   **Target**: ES2022
-   **Module**: preserve
-   Strict templates y injection parameters
-   No implicit returns
-   No fallthrough cases

#### ⚠️ Deprecated `allowSignalWrites` Warning

**Problema:** Uso del antipatrón `route.snapshot` en constructor, incompatible con Angular 20+ zoneless.

**Solución:**

-   Migrado a patrón reactivo usando `toSignal()` de `@angular/core/rxjs-interop`
-   Implementado `computed()` para extraer ID de la ruta
-   Usar `effect()` sin `allowSignalWrites` para carga reactiva de datos

## Consideraciones de Rendimiento

1. **OnPush Change Detection**: Todos los componentes deben usar `ChangeDetectionStrategy.OnPush`
2. **Signals**: Preferir signals sobre observables para estado local
3. **Defer**: Usar `@defer` para cargar componentes pesados bajo demanda
4. **Lazy loading**: Todas las features deben cargarse lazy
5. **NgOptimizedImage**: Usar para todas las imágenes estáticas

## Testing

-   Framework: Jasmine + Karma
-   Todos los componentes y servicios deben tener tests
-   Usar `TestBed` para testing de componentes standalone
-   Mock de servicios con signals

## Dominio de Negocio

### Contexto: Estudio Fotográfico

El sistema gestiona:

-   Clientes y sesiones fotográficas
-   Galería de imágenes
-   Pedidos y entregas
-   Usuarios y permisos

## Próximos Pasos / Roadmap

-   [ ] Implementar gestión de clientes
-   [ ] Sistema de galería de fotos
-   [ ] Módulo de pedidos
-   [ ] Panel de administración
-   [ ] Reportes y estadísticas

## Notas Adicionales

-   **NO usar decoradores antiguos**: Migrar `@Input()/@Output()` a `input()/output()`
-   **NO usar lifecycle hooks**: Preferir signals, computed y effect
-   **NO comprometer el Scope Rule**: Es absoluto e innegociable
-   **Consultar Angular MCP**: Validar patrones contra la documentación oficial antes de implementar

## Referencias

-   [Angular Documentation](https://angular.dev)
-   [PrimeNG Documentation](https://primeng.org)
-   [Scope Rule Architecture](.windsurf/rules/angular-scope-rule-architect.md)
