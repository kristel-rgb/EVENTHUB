// =========================================================
// Textos legales de EventHub: Política de privacidad y Términos y condiciones.
// Redactados para el proyecto académico tomando como referencia la estructura
// de plataformas de venta de entradas en Costa Rica. NO es asesoría legal:
// antes de usarlos en un sitio real deben ser revisados por un profesional.
// Para editar un texto basta con cambiarlo aquí; las páginas se actualizan solas.
// =========================================================

export interface LegalSection {
  id: string
  title: string
  paragraphs?: string[]
  list?: string[]
  after?: string[]
}

export interface LegalDocument {
  title: string
  updated: string // AAAA-MM-DD
  intro: string[]
  sections: LegalSection[]
}

export const privacyPolicy: LegalDocument = {
  title: 'Política de privacidad',
  updated: '2026-11-20',
  intro: [
    'En EventHub nos tomamos en serio tus datos. Esta política explica qué información recopilamos cuando usás la plataforma, para qué la usamos, con quién la compartimos y qué derechos tenés sobre ella.',
    'Al crear una cuenta o usar EventHub aceptás el tratamiento de tus datos según lo descrito aquí y conforme a la Ley N.º 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales de Costa Rica.',
  ],
  sections: [
    {
      id: 'definiciones',
      title: 'Definiciones',
      list: [
        'EventHub, "nosotros" o "la plataforma": el sitio web y los servicios que permiten publicar eventos, reservar espacios y obtener entradas digitales.',
        'Usuario o "vos": cualquier persona que visita EventHub o tiene una cuenta, sea Asistente, Organizador o Administrador.',
        'Datos personales: cualquier información que identifique o permita identificar a una persona.',
        'Proveedor de servicios: empresa externa que procesa datos en nuestro nombre para que la plataforma funcione (por ejemplo, alojamiento o envío de correos).',
      ],
    },
    {
      id: 'datos-que-recopilamos',
      title: 'Datos que recopilamos',
      paragraphs: ['Recopilamos solo la información necesaria para darte el servicio:'],
      list: [
        'Datos de cuenta: nombre, correo electrónico, contraseña (guardada únicamente de forma cifrada con un algoritmo de hash, nunca en texto plano) y tu rol en la plataforma.',
        'Datos de inicio de sesión con Google: si elegís ingresar con Google, recibimos tu nombre, correo y foto de perfil según los permisos que aceptes en Google.',
        'Datos de reservaciones y entradas: eventos reservados, cantidad, estado de cada entrada, código QR y fecha de uso.',
        'Contenido que publicás: comentarios y calificaciones de eventos y, en el caso de organizadores, la información e imágenes de sus eventos.',
        'Datos técnicos y de uso: dirección IP, tipo de navegador y dispositivo, páginas visitadas, fecha y hora de acceso y registros de errores, que se generan automáticamente al usar el servicio.',
      ],
    },
    {
      id: 'para-que-los-usamos',
      title: 'Para qué usamos tus datos',
      list: [
        'Crear y administrar tu cuenta, verificar tu correo y permitirte recuperar tu contraseña.',
        'Procesar tus reservaciones, emitir tus entradas digitales y validarlas en el ingreso al evento.',
        'Enviarte correos sobre tu cuenta y tus entradas: confirmaciones, cancelaciones y recordatorios de eventos próximos.',
        'Mostrarle al organizador la información necesaria para gestionar su evento (por ejemplo, la lista de reservaciones).',
        'Generar estadísticas y reportes agregados para organizadores y administradores.',
        'Proteger la plataforma: detectar accesos indebidos, intentos de fraude o abuso, y cumplir obligaciones legales.',
      ],
      after: ['No vendemos tus datos personales ni los usamos para publicidad de terceros.'],
    },
    {
      id: 'cookies',
      title: 'Cookies y almacenamiento local',
      paragraphs: [
        'Usamos cookies y almacenamiento del navegador estrictamente necesarios para mantener tu sesión iniciada de forma segura y recordar preferencias básicas. Sin ellas no es posible iniciar sesión ni comprar entradas.',
        'Podés configurar tu navegador para rechazar cookies, pero algunas funciones de EventHub dejarán de funcionar.',
      ],
    },
    {
      id: 'con-quien-compartimos',
      title: 'Con quién compartimos tus datos',
      paragraphs: ['Solo compartimos información cuando es necesario para prestar el servicio:'],
      list: [
        'Organizadores: ven el nombre y el estado de las reservaciones de sus propios eventos, nunca tu contraseña ni datos de otros eventos.',
        'Proveedores de infraestructura: servicios en la nube que alojan la base de datos y los archivos (por ejemplo, Amazon Web Services para almacenamiento de imágenes y reportes, y envío de correos).',
        'Google: únicamente si iniciás sesión con tu cuenta de Google.',
        'Autoridades competentes: cuando una ley o una orden judicial nos obligue a hacerlo.',
      ],
    },
    {
      id: 'pagos',
      title: 'Pagos',
      paragraphs: [
        'EventHub no almacena números de tarjeta ni datos bancarios. Cuando un evento tenga costo, el pago se procesará a través de una pasarela de pagos certificada bajo el estándar PCI-DSS, que trata esos datos según su propia política de privacidad.',
      ],
    },
    {
      id: 'seguridad',
      title: 'Seguridad de la información',
      paragraphs: [
        'Aplicamos medidas técnicas razonables para proteger tus datos: contraseñas cifradas, conexiones seguras (HTTPS), tokens de sesión con expiración, permisos por rol validados en el servidor, límite de intentos de inicio de sesión y almacenamiento privado de archivos.',
        'Ningún sistema es 100 % seguro. Si detectamos un incidente que afecte tus datos, te lo comunicaremos y lo informaremos a la autoridad correspondiente según la ley.',
      ],
    },
    {
      id: 'conservacion',
      title: 'Cuánto tiempo guardamos tus datos',
      paragraphs: [
        'Conservamos tus datos mientras tu cuenta esté activa. Si la eliminás, borramos o anonimizamos tu información personal, salvo la que debamos conservar por obligaciones legales, contables o para resolver disputas, y solo por el tiempo que esas obligaciones exijan.',
      ],
    },
    {
      id: 'tus-derechos',
      title: 'Tus derechos',
      paragraphs: ['Según la Ley N.º 8968, en cualquier momento podés ejercer tus derechos de:'],
      list: [
        'Acceso: saber qué datos tenemos sobre vos.',
        'Rectificación: corregir datos incorrectos o incompletos.',
        'Supresión: pedir que eliminemos tus datos cuando ya no sean necesarios.',
        'Oposición: oponerte a ciertos usos de tus datos.',
      ],
      after: [
        'Para ejercerlos escribinos al correo de contacto indicado abajo. Te responderemos dentro de los plazos que establece la ley. Si considerás que no atendimos tu solicitud, podés acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).',
      ],
    },
    {
      id: 'menores',
      title: 'Personas menores de edad',
      paragraphs: [
        'EventHub está dirigido a personas mayores de 18 años. Las personas menores de edad solo pueden usar la plataforma con autorización y supervisión de su madre, padre o persona encargada. Si detectamos una cuenta de un menor sin esa autorización, podremos eliminarla.',
      ],
    },
    {
      id: 'enlaces',
      title: 'Enlaces a otros sitios',
      paragraphs: [
        'La plataforma puede incluir enlaces a sitios externos, como mapas o páginas de organizadores. No controlamos esos sitios ni sus políticas de privacidad, por lo que te recomendamos revisarlas.',
      ],
    },
    {
      id: 'cambios',
      title: 'Cambios a esta política',
      paragraphs: [
        'Podemos actualizar esta política. Cuando el cambio sea importante te avisaremos por correo o con un aviso visible en la plataforma antes de que entre en vigencia, y actualizaremos la fecha de "Última actualización".',
      ],
    },
  ],
}

export const termsAndConditions: LegalDocument = {
  title: 'Términos y condiciones',
  updated: '2026-11-20',
  intro: [
    'Estos Términos y condiciones regulan el acceso y uso de EventHub, una plataforma para descubrir eventos, reservar espacios y obtener entradas digitales con código QR.',
    'Al registrarte, reservar una entrada o publicar un evento aceptás estos términos. Si no estás de acuerdo con ellos, no uses la plataforma.',
  ],
  sections: [
    {
      id: 'definiciones',
      title: 'Definiciones',
      list: [
        'Asistente: persona que busca eventos, reserva espacios y recibe entradas.',
        'Organizador: persona o empresa que publica y administra eventos en la plataforma, y es responsable de su realización.',
        'Administrador: equipo de EventHub encargado de moderar la plataforma.',
        'Entrada: comprobante digital con código QR que permite el ingreso de una persona a un evento.',
        'Reservación: solicitud confirmada de una o varias entradas para un evento.',
      ],
    },
    {
      id: 'cuenta',
      title: 'Registro y cuenta',
      list: [
        'Para reservar o publicar eventos necesitás una cuenta con información verdadera y actualizada.',
        'Debés verificar tu correo electrónico para activar todas las funciones.',
        'Sos responsable de mantener tu contraseña en secreto y de toda actividad realizada desde tu cuenta. Si sospechás un acceso indebido, cambiá tu contraseña y avisanos.',
        'La cuenta es personal e intransferible: no podés venderla, cederla ni compartirla.',
        'Podemos suspender o cerrar cuentas con información falsa, actividad sospechosa o que incumplan estos términos.',
      ],
    },
    {
      id: 'rol-plataforma',
      title: 'El papel de EventHub',
      paragraphs: [
        'EventHub es un intermediario tecnológico: facilita la publicación de eventos y la emisión de entradas. Cada evento es organizado y realizado por su Organizador, quien es responsable de la fecha, el lugar, el contenido, la seguridad y el cumplimiento de los permisos y requisitos legales del evento.',
      ],
    },
    {
      id: 'organizadores',
      title: 'Obligaciones de los organizadores',
      list: [
        'Publicar información completa y veraz: nombre, descripción, fecha, hora, ubicación, capacidad, precio y restricciones de ingreso.',
        'Usar solo imágenes y contenidos sobre los que tengan derechos.',
        'Informar a tiempo cualquier cambio o cancelación del evento.',
        'Tratar los datos de los asistentes solo para gestionar su evento y no usarlos para otros fines sin consentimiento.',
        'EventHub puede ocultar o retirar eventos que incumplan estos términos o la ley.',
      ],
    },
    {
      id: 'reservas',
      title: 'Reservaciones y compras',
      list: [
        'Una reservación queda confirmada solo cuando la plataforma la confirma y emite las entradas. Te enviaremos un correo de confirmación.',
        'Los espacios son limitados y se asignan por orden de confirmación. Que un evento aparezca disponible no garantiza la reserva hasta que se confirme.',
        'Cada evento puede tener un máximo de entradas por compra o por persona. Las reservas que lo superen podrán anularse.',
        'Antes de confirmar, revisá el evento, la fecha, la cantidad y el total. Para eventos con costo, el pago se procesa mediante una pasarela segura y puede incluir cargos por servicio que se mostrarán antes de pagar.',
      ],
    },
    {
      id: 'entradas',
      title: 'Entradas digitales',
      list: [
        'Cada entrada tiene un código QR único válido para un solo ingreso. Una vez usada, no puede volver a utilizarse.',
        'Resguardá tus entradas: no publiques ni compartas el código QR. Si alguien lo usa primero, el sistema lo marcará como utilizado y no podremos garantizar tu ingreso.',
        'Las entradas obtenidas fuera de EventHub o de vendedores no autorizados no están garantizadas.',
        'Está prohibida la reventa de entradas a un precio mayor al original y cualquier uso comercial no autorizado.',
      ],
    },
    {
      id: 'cancelaciones',
      title: 'Cancelaciones, cambios y reembolsos',
      list: [
        'Podés cancelar tu reservación desde "Mis entradas" mientras el evento lo permita, según las reglas de cancelación que se indiquen en cada evento. Al cancelar, el espacio vuelve a quedar disponible.',
        'Si el organizador cancela el evento, te avisaremos por correo y las entradas quedarán anuladas. En eventos con costo, el reembolso del precio de la entrada se tramitará conforme a la Ley N.º 7472 de Promoción de la Competencia y Defensa Efectiva del Consumidor, respetando los plazos de la pasarela de pago y de las entidades bancarias.',
        'Si el evento cambia de fecha, hora o lugar, te lo comunicaremos. Es tu responsabilidad revisar esas notificaciones.',
        'No hay reembolsos por inasistencia por motivos personales, por llegar tarde ni por pérdida de la entrada por descuido del usuario.',
      ],
    },
    {
      id: 'ingreso',
      title: 'Ingreso al evento',
      list: [
        'Presentá tu código QR en la entrada. El organizador puede solicitarte un documento de identificación.',
        'El organizador puede reservarse el derecho de admisión y definir reglas propias (edad mínima, objetos prohibidos, uso de cámaras, horario de ingreso), que se informarán en el evento.',
        'Puede negarse el ingreso a personas con entradas alteradas, duplicadas o reportadas, o que incumplan las normas de seguridad o las disposiciones de las autoridades.',
      ],
    },
    {
      id: 'comentarios',
      title: 'Comentarios y calificaciones',
      list: [
        'Solo pueden comentar y calificar las personas con una reservación válida para el evento.',
        'Los comentarios deben ser respetuosos y relacionados con el evento. No se permite contenido ofensivo, discriminatorio, falso, publicitario ni datos personales de terceros.',
        'Los administradores pueden ocultar o eliminar comentarios que incumplan estas reglas.',
      ],
    },
    {
      id: 'uso-prohibido',
      title: 'Usos prohibidos',
      list: [
        'Usar programas automatizados (bots) para reservar entradas o extraer información de la plataforma.',
        'Intentar acceder a cuentas, datos o funciones que no te corresponden, o vulnerar la seguridad del sistema.',
        'Publicar eventos falsos o fraudulentos.',
        'Usar la plataforma para actividades ilegales.',
      ],
    },
    {
      id: 'propiedad',
      title: 'Propiedad intelectual',
      paragraphs: [
        'El diseño, el código y la marca EventHub pertenecen a sus creadores. El contenido de cada evento (textos e imágenes) pertenece a su organizador, quien nos autoriza a mostrarlo en la plataforma para promocionar su evento.',
      ],
    },
    {
      id: 'responsabilidad',
      title: 'Limitación de responsabilidad',
      list: [
        'EventHub no es responsable por la realización, cancelación, calidad o seguridad de los eventos, que corresponden al organizador.',
        'No respondemos por fallas ajenas a nuestro control, como problemas de conexión a internet del usuario, cortes eléctricos, fallas de proveedores externos, caso fortuito o fuerza mayor.',
        'Tampoco somos responsables por el contenido de sitios externos enlazados desde la plataforma.',
      ],
    },
    {
      id: 'cambios',
      title: 'Cambios a estos términos',
      paragraphs: [
        'Podemos modificar estos términos. Publicaremos la nueva versión en esta página con su fecha de actualización y, si el cambio es importante, te avisaremos por correo. Seguir usando la plataforma después del cambio implica que aceptás la nueva versión.',
      ],
    },
    {
      id: 'ley',
      title: 'Ley aplicable',
      paragraphs: [
        'Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier diferencia se intentará resolver primero de forma directa entre las partes y, de no lograrse, ante las autoridades competentes de Costa Rica.',
      ],
    },
  ],
}
