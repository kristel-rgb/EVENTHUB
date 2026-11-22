// Separación de accesos: revisa cada página antes de mostrarla.
//   · Público (sin cuenta): Inicio, Buscar, detalle de eventos, páginas legales, Ingresar y Crear cuenta.
//   · auth: true → cualquier usuario que ingresó (Mis entradas, Perfil).
//   · panel: 'organizer' → Organización y Super Admin · panel: 'admin' → solo Super Admin.
// Sin sesión se manda a Ingresar y, después de ingresar, se vuelve a la página que se pidió.
// Ojo: esto solo ordena la navegación. La seguridad real está en la API, que revisa el token y el rol en cada llamada.
import type { Role } from '~/types/models'

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore()
  const role = session.role

  // La Organización solo usa su panel: no tiene Inicio ni Mis entradas,
  // y Buscar, el detalle de un evento y su Perfil se muestran con la barra de íconos del panel.
  if (role === 'organizer') {
    if (to.path === '/' || to.path === '/mis-entradas') return navigateTo('/organizador', { replace: true })
    if (to.path === '/buscar' || to.path.startsWith('/eventos/') || to.path === '/perfil') {
      to.meta.layout = 'panel'
      to.meta.panel = 'organizer'
    }
  }

  if (to.meta.guestOnly && session.isLoggedIn) {
    return navigateTo(safeRedirect(to.query.redirect) ?? homeForRole(role), { replace: true })
  }

  // La vista previa de un borrador es solo para quien organiza
  const isPreview = to.path.startsWith('/eventos/') && to.query.vista === 'previa'

  let allowed: Role[] | 'any' | null = null
  if (to.meta.roles?.length) allowed = to.meta.roles
  else if (to.meta.panel === 'admin') allowed = ['admin']
  else if (to.meta.panel === 'organizer' || isPreview) allowed = ['organizer', 'admin']
  else if (to.meta.auth) allowed = 'any'
  if (!allowed) return

  if (!session.isLoggedIn) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (allowed !== 'any' && (!role || !allowed.includes(role))) {
    return abortNavigation(createError({ statusCode: 403, statusMessage: 'Tu cuenta no tiene acceso a esta sección.' }))
  }
})
