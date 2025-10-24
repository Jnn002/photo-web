# Core Directives - Angular 20+ Modernized

This directory contains structural directives for role-based and permission-based access control, modernized to use Angular 20+ signals and `input()` functions.

## 🎯 Available Directives

### `*hasPermission` - Permission-based Access Control

Shows or hides elements based on user permissions.

#### Features

-   ✅ Uses Angular 20+ `input()` signals
-   ✅ Reactive to permission changes
-   ✅ Supports single or multiple permissions
-   ✅ Configurable mode: 'all' or 'any'

#### Usage

```html
<!-- Single permission -->
<button *hasPermission="'user.create'">Create User</button>

<!-- Multiple permissions (ALL required) -->
<button *hasPermission="['user.create', 'user.edit']">Edit User</button>

<!-- Multiple permissions (ANY required) -->
<button *hasPermission="['user.view', 'user.list']; mode: 'any'">View Users</button>
```

#### Implementation Details

```typescript
// Input signals
readonly hasPermission = input.required<string | string[]>();
readonly hasPermissionMode = input<'all' | 'any'>('all');

// Reactive to changes
effect(() => {
  this.hasPermission();
  this.hasPermissionMode();
  this.authService.permissions();
  this.updateView();
});
```

---

### `*hasRole` - Role-based Access Control

Shows or hides elements based on user roles.

#### Features

-   ✅ Uses Angular 20+ `input()` signals
-   ✅ Reactive to role changes
-   ✅ Supports single or multiple roles
-   ✅ Multiple roles use OR logic (user needs at least one)

#### Usage

```html
<!-- Single role -->
<div *hasRole="'Admin'">Admin Panel</div>

<!-- Multiple roles (ANY required) -->
<div *hasRole="['Admin', 'Manager']">Management Section</div>
```

#### Implementation Details

```typescript
// Input signal
readonly hasRole = input.required<string | string[]>();

// Reactive to changes
effect(() => {
  this.hasRole();
  this.authService.userRoles();
  this.updateView();
});
```

---

## 🔧 How to Use in Components

To use these directives in your components, import them directly:

```typescript
import { Component } from '@angular/core';
import { HasPermissionDirective, HasRoleDirective } from '@core/directives';

@Component({
    selector: 'app-my-component',
    imports: [HasPermissionDirective, HasRoleDirective],
    template: `
        <button *hasPermission="'user.create'">Create</button>
        <div *hasRole="'Admin'">Admin Only</div>
    `,
})
export class MyComponent {}
```

---

## 🚀 Migration from Old Pattern

### Before (Deprecated `@Input()`)

```typescript
@Input()
set hasPermission(value: string | string[]) {
  this.permissions = value;
  this.updateView();
}
```

### After (Modern `input()`)

```typescript
readonly hasPermission = input.required<string | string[]>();

constructor() {
  effect(() => {
    this.hasPermission(); // Tracks changes
    this.updateView();
  });
}
```

### Benefits of Modern Approach

-   ✅ **Type-safe**: Input signals are fully typed
-   ✅ **Reactive**: Automatic change detection
-   ✅ **Declarative**: Clear input definition
-   ✅ **Immutable**: Inputs are readonly by default
-   ✅ **Performance**: Better change detection with signals

---

## 📚 Related Documentation

-   [Angular Signals](https://angular.dev/guide/signals)
-   [Structural Directives](https://angular.dev/guide/directives/structural-directives)
-   [Input Signals](https://angular.dev/guide/components/inputs)

---

## 🧪 Testing

Example test for `HasPermissionDirective`:

```typescript
it('should show element when user has permission', () => {
    const authService = TestBed.inject(AuthService);
    authService.hasPermission = jasmine.createSpy().and.returnValue(true);

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
});
```

---

**Last Updated:** October 2025 - Angular 20+
