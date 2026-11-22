/** Opción del menú de acciones "⋯" (componente ActionMenu) */
export interface MenuAction {
  key: string
  label: string
  icon: string
  danger?: boolean
  to?: string            // enlace interno
  external?: boolean     // abrir en otra pestaña
}
