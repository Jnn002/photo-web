# Rooms Feature Implementation

## Overview

Implementación completa de la funcionalidad de gestión de Salas (Rooms) del estudio fotográfico, siguiendo los wireframes proporcionados y las mejores prácticas de Angular 20.

## Archivos Creados

### Servicio

- **`services/room.service.ts`**
  - Gestión de estado con signals
  - Métodos CRUD completos: create, read, update, delete, reactivate, setMaintenance
  - Integración con endpoints del backend
  - Manejo de filtros y paginación
  - Notificaciones de éxito/error

### Componentes

#### 1. Container Component (`rooms/rooms.ts`)

- Componente principal que coordina list, form y availability dialog
- Gestiona visibilidad de modales
- Maneja eventos entre componentes hijos

#### 2. Room List (`rooms/room-list.ts/html/css`)

- Tabla con PrimeNG TableModule
- Columnas: Nombre, Descripción, Capacidad, Estado, Acciones
- Filtros: búsqueda por nombre, solo activos
- Paginación configurable (10, 25, 50, 100)
- Acciones por sala:
  - Ver disponibilidad (icono calendario)
  - Editar (icono lápiz)
  - Mantenimiento (icono llave - solo activas)
  - Desactivar (icono X - solo activas)
  - Reactivar (icono check - inactivas/mantenimiento)
- Confirmaciones para acciones destructivas
- Empty state con opción de limpiar filtros

#### 3. Room Form (`rooms/room-form.ts/html/css`)

- Dialog modal para crear/editar salas
- Campos:
  - **Nombre** (requerido, max 255 caracteres)
  - **Descripción** (opcional, textarea)
  - **Capacidad** (opcional, número con spinner, mínimo 1 persona)
  - **Tarifa por Hora** (opcional, formato moneda GTQ)
- Validaciones en tiempo real
- Estados de carga durante guardado
- FloatLabel para mejor UX

#### 4. Room Availability Dialog (`rooms/room-availability-dialog.ts/html/css`)

- Modal que muestra:
  - Detalles de la sala (capacidad, descripción, tarifa)
  - Lista de sesiones próximas (preparado para integración futura)
  - Mock data de ejemplo para demostración
- Diseño según wireframe
- Preparado para integración con módulo de sesiones

### Modelos

Actualizaciones en **`models/catalog.models.ts`**:

- `RoomStatus` type: extends Status con 'Maintenance'
- `getRoomStatusLabel()`: traduce estados a español
- `getRoomStatusSeverity()`: mapea estados a colores PrimeNG

## Integración con Backend

### Endpoints Utilizados

```
GET    /api/v1/rooms              - List rooms (paginado, con filtros)
POST   /api/v1/rooms              - Create room
GET    /api/v1/rooms/{id}         - Get room by ID
PATCH  /api/v1/rooms/{id}         - Update room
DELETE /api/v1/rooms/{id}         - Deactivate room (soft delete)
PUT    /api/v1/rooms/{id}/reactivate   - Reactivate room
PUT    /api/v1/rooms/{id}/maintenance  - Set to maintenance
```

### Parámetros de Query

- `offset`: paginación (default: 0)
- `limit`: items por página (default: 50)
- `active_only`: filtrar solo activas (boolean)
- `search`: búsqueda por nombre (futuro)

## Estados de Sala

1. **Active** (Activo): Sala disponible para uso
2. **Inactive** (Inactivo): Sala desactivada, puede reactivarse
3. **Maintenance** (Mantenimiento): Sala temporalmente fuera de servicio

## Características Implementadas

✅ CRUD completo de salas
✅ Paginación y filtros
✅ Búsqueda por nombre
✅ Estados múltiples (Activo/Inactivo/Mantenimiento)
✅ Confirmaciones para acciones críticas
✅ Validaciones de formulario
✅ Notificaciones de éxito/error
✅ Loading states
✅ Empty states
✅ Diseño responsive
✅ Integración con backend real
✅ Dialog de disponibilidad con mock de sesiones
✅ Preparado para integración con módulo de sesiones

## Angular 20 Best Practices

✅ Standalone components (sin declarar `standalone: true`)
✅ Signals para gestión de estado
✅ `inject()` en lugar de constructor injection
✅ Control flow nativo (`@if`, `@for`, `@else`)
✅ OnPush change detection
✅ `input()` y `output()` en lugar de decoradores
✅ Zoneless change detection
✅ No lifecycle hooks (uso de effects cuando necesario)
✅ Tipos estrictos (no `any`)

## PrimeNG 20 Components Used

- `TableModule` - tabla de datos
- `ButtonModule` - botones de acción
- `InputTextModule` - campos de texto
- `InputNumberModule` - campos numéricos
- `TextareaModule` - área de texto
- `Select` - dropdowns
- `DialogModule` - modales
- `TagModule` - badges de estado
- `ConfirmDialogModule` - confirmaciones
- `FloatLabelModule` - labels flotantes

## Próximos Pasos / Mejoras Futuras

- [ ] Integrar con módulo de sesiones para mostrar disponibilidad real
- [ ] Agregar calendario de disponibilidad
- [ ] Implementar reservas de salas desde el dialog
- [ ] Agregar fotos de las salas
- [ ] Equipamiento disponible por sala
- [ ] Historial de uso de salas
- [ ] Reportes de ocupación

## Testing

### Para Probar Localmente

1. Asegurarse de que el backend esté corriendo en `http://127.0.0.1:8000`
2. Iniciar el frontend:
   ```bash
   cd photography-studio-web
   npm start
   ```
3. Navegar a: `http://localhost:4200/rooms`
4. Probar las operaciones CRUD:
   - Crear nueva sala
   - Editar sala existente
   - Ver disponibilidad
   - Cambiar estados (mantenimiento, desactivar, reactivar)

### Build Exitoso

```bash
npm run build
```

- ✅ Compilación exitosa
- ⚠️ Warning de budget (525.61 KB vs 500 KB) - aceptable
- Chunk de rooms: 28.12 kB (6.89 kB comprimido)

## Estructura de Archivos

```
src/app/features/catalog/
├── rooms/
│   ├── room-list.ts
│   ├── room-list.html
│   ├── room-list.css
│   ├── room-form.ts
│   ├── room-form.html
│   ├── room-form.css
│   ├── room-availability-dialog.ts
│   ├── room-availability-dialog.html
│   ├── room-availability-dialog.css
│   └── rooms.ts
├── services/
│   └── room.service.ts
└── models/
    └── catalog.models.ts (actualizado)
```

## Notas Técnicas

- **Lazy Loading**: El módulo de rooms se carga de manera lazy desde `app.routes.ts`
- **State Management**: Todo el estado se maneja con signals reactivos
- **Error Handling**: Manejo centralizado de errores en el servicio
- **Optimistic Updates**: Updates locales optimistas antes de reload completo
- **Responsive**: Diseño adaptable a móviles y tablets

---

**Implementado por**: Claude Code
**Fecha**: 21 de Octubre, 2025
**Versión Angular**: 20.3.0
**Versión PrimeNG**: 20.2.0
