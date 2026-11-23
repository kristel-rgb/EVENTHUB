// Componentes compartidos: accesibilidad básica y comportamiento.
import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { h } from 'vue'
import FormField from '~/components/FormField.vue'
import StarRating from '~/components/StarRating.vue'
import PermissionPicker from '~/components/admin/PermissionPicker.vue'
import type { PermissionCatalog } from '~/types/models'

describe('FormField', () => {
  it('une la etiqueta, la ayuda y el error al campo (aria)', async () => {
    const w = await mountSuspended(FormField, {
      props: { id: 'email', label: 'Correo', hint: 'Te escribimos aquí', error: 'Correo no válido', optional: true },
      slots: { default: (p: { id: string, describedBy?: string, invalid: boolean }) => h('input', { 'id': p.id, 'aria-describedby': p.describedBy, 'aria-invalid': p.invalid }) },
    })
    const input = w.get('input')
    expect(w.get('label').attributes('for')).toBe('email')
    expect(w.text()).toContain('(opcional)')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain('email-error')
    expect(w.get('#email-error').text()).toContain('Correo no válido')
  })
})

describe('StarRating', () => {
  it('se lee como texto para lectores de pantalla', async () => {
    const w = await mountSuspended(StarRating, { props: { value: 4.5 } })
    expect(w.get('[role="img"]').attributes('aria-label')).toBe('4,5 de 5 estrellas')
  })
})

describe('PermissionPicker', () => {
  const catalog: PermissionCatalog = {
    groups: [
      { key: 'events', label: 'Organizar eventos', permissions: [{ key: 'events:create', label: 'Crear eventos' }, { key: 'files:upload', label: 'Subir imágenes' }] },
      { key: 'admin', label: 'Administración', permissions: [{ key: 'users:update', label: 'Cambiar usuarios' }] },
    ],
    adminOnly: ['users:update'],
    defaults: { attendee: [], organization: ['events:create', 'files:upload'], venue: ['events:create', 'files:upload'], admin: ['events:create', 'files:upload', 'users:update'] },
  }
  it('marca y desmarca permisos', async () => {
    const w = await mountSuspended(PermissionPicker, { props: { catalog, defaults: catalog.defaults.organization, allowAdmin: false, idPrefix: 't', modelValue: ['events:create', 'files:upload'] } })
    await w.get('#t-events\\:create').setValue(false)
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([['files:upload']])
  })
  it('bloquea los permisos de administración si la cuenta no es Super Admin', async () => {
    const w = await mountSuspended(PermissionPicker, { props: { catalog, defaults: catalog.defaults.organization, allowAdmin: false, idPrefix: 't', modelValue: [] } })
    const groups = w.findAll('fieldset')
    expect(groups[1]!.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Solo se pueden dar a una cuenta Super Admin.')
  })
})
