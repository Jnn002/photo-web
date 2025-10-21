/**
 * Packages Component (Placeholder)
 *
 * Main component for package management.
 * TODO: Implement full CRUD functionality similar to Items
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-packages',
  imports: [CommonModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="padding: 1.5rem;">
      <div style="margin-bottom: 1.5rem;">
        <h2>Paquetes</h2>
        <p class="text-muted">Gestión de paquetes fotográficos predefinidos</p>
      </div>

      <p-button label="+ Nuevo Paquete" icon="pi pi-plus" />

      <div
        style="margin-top: 2rem; padding: 3rem; text-align: center; border: 2px dashed var(--surface-border); border-radius: var(--border-radius);"
      >
        <i class="pi pi-box" style="font-size: 3rem; color: var(--text-color-secondary);"></i>
        <p style="margin-top: 1rem; color: var(--text-color-secondary);">
          Funcionalidad de paquetes en desarrollo
        </p>
        <p style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-color-secondary);">
          Próximamente: creación y gestión de paquetes con items incluidos
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .text-muted {
        color: var(--text-color-secondary);
        font-size: 0.875rem;
        margin: 0;
      }

      h2 {
        margin: 0 0 0.25rem 0;
        font-size: 1.5rem;
        font-weight: 600;
      }
    `,
  ],
})
export class PackagesComponent {}
