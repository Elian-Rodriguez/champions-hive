# Cómo vender Champion Hive

Guía comercial del producto. Los precios son hipótesis para validar con los
primeros diez clientes, no una tabla cerrada: el número correcto es el que la
gente paga sin pensarlo dos veces.

## 1. Qué se vende

No se vende "software de torneos". Se vende **que el torneo se organice solo**.
El organizador de un campeonato de barrio hoy vive de un grupo de WhatsApp, un
Excel y llamadas: cada aplazamiento son treinta mensajes, cada tabla de
posiciones son dos horas de digitar, y cada reclamo por un resultado mal
apuntado le cuesta credibilidad.

Champion Hive le cambia eso por: fixture generado, marcador público con QR,
árbitro cargando desde el celular (incluso sin señal) y los capitanes avisados
solos cuando algo se mueve.

Los tres argumentos que cierran la venta, en este orden:

1. **Tiempo.** "El fixture de 20 equipos te lo arma en un minuto, y si mueves un
   partido no tienes que avisarle a nadie: les llega."
2. **Autoridad.** "Tu campeonato se ve como un torneo profesional: tabla, goleadores,
   bracket, imágenes listas para redes con tu logo y el de tus patrocinadores."
3. **Plata.** "Con el marcador público y las piezas para redes puedes cobrarle
   más a tus patrocinadores; la herramienta se paga sola con uno."

## 2. A quién venderle (en orden de facilidad)

| Segmento | Quién es | Por qué compra | Ticket |
|---|---|---|---|
| **Ligas de barrio y empresariales** | Una persona que organiza 1–3 torneos al año, 10–30 equipos | Le devuelve fines de semana enteros | Bajo, volumen alto |
| **Escuelas de formación** | Club con categorías sub-9 a sub-17 | Los papás quieren ver estadísticas de su hijo | Medio, muy fiel |
| **Colegios y universidades** | Bienestar / deportes | Presupuesto anual, compra por contrato | Medio-alto |
| **Alcaldías y cajas de compensación** | Juegos municipales, torneos de empresas | Necesitan transparencia y evidencia pública | Alto, ciclo largo |
| **Canchas sintéticas** | Dueño que alquila y organiza torneos para llenar horarios | El torneo le llena la cancha entre semana | Medio, recurrente |

El primer segmento es el que valida el producto; el cuarto es el que lo hace
rentable. Empieza por el primero para tener casos, cobra en el tercero y cuarto.

## 3. Empaquetado

El cupo de campeonatos por organizador (`max_tournaments`) ya está en la
plataforma: el superadministrador se lo asigna a cada cuenta y el sistema
bloquea la creación al llegar al tope. Sobre esa palanca se arman los planes.

| Plan | Cupo | Para quién | Precio sugerido (COP/mes) | USD aprox. |
|---|---|---|---|---|
| **Torneo único** | 1 campeonato | Prueba real, un torneo puntual | Pago único $150.000–250.000 por torneo | 35–60 |
| **Liga** | 3 campeonatos activos | Organizador con varias categorías | $120.000/mes | ~30 |
| **Club** | 10 campeonatos | Escuelas, colegios, canchas | $280.000/mes | ~70 |
| **Institucional** | Sin límite + marca blanca | Alcaldías, cajas, federaciones | Desde $900.000/mes o contrato anual | 220+ |

Reglas de empaquetado que conviene sostener:

- **Nunca cobres por equipo ni por jugador.** El organizador de barrio recorta
  equipos para pagar menos y el producto se ve peor. Cobra por campeonato.
- **El marcador público siempre gratis y abierto.** Es tu canal de adquisición:
  cada jugador que consulta la tabla ve tu marca. No lo metas detrás del plan.
- **El cupo se amplía en un clic** desde el panel del superadministrador. Una
  llamada de "necesito uno más" tiene que resolverse en diez segundos, cobrando.
- **Vende el primer torneo, no la suscripción.** Un organizador de barrio no
  firma una mensualidad; paga su torneo. La suscripción llega en el segundo.

## 4. Qué se cobra aparte (upsell real)

- **Marca blanca** (logo, colores y dominio del cliente en el marcador público):
  el argumento más fácil para instituciones. Recargo de 30–50%.
- **Paquete de patrocinadores**: la franja de patrocinadores en las imágenes de
  redes y en el marcador ya existe. Véndeselo al organizador como "tu inventario
  publicitario": él le cobra a su patrocinador y tú le cobras el paquete.
- **Operación asistida**: tú cargas los equipos, armas el fixture y capacitas a
  los árbitros del primer torneo. Es el servicio que convierte a un cliente
  desconfiado en uno que renueva. Cóbralo como implementación única.
- **Inscripciones en línea** (siguiente iteración): cobrar la inscripción de los
  equipos a través de la plataforma y quedarte con un porcentaje. Es el modelo
  con más techo, porque escala con el tamaño del torneo y no con tu precio.

## 5. Cómo entrar al mercado

1. **Tres torneos gratis, elegidos a dedo.** Uno de barrio, uno de escuela, uno
   de empresa. A cambio: fotos, un video del organizador y permiso para usar su
   nombre. Sin casos locales no vendes nada.
2. **El QR es el vendedor.** Cada torneo publica su marcador; el pie dice "Hecho
   con Champion Hive". Cada jugador que lo abre es un organizador potencial.
3. **Venta directa por WhatsApp.** Este mercado no compra por web: compra porque
   alguien le muestra la app en el celular en la cancha un domingo. Ve a las
   canchas.
4. **Alianza con canchas sintéticas.** El dueño de la cancha conoce a todos los
   organizadores de la zona. Dale comisión por cada torneo referido, o el plan
   gratis a cambio de que te presente.
5. **Temporada.** El negocio es estacional: se vende antes de que arranque el
   torneo, no en la mitad. Concentra el esfuerzo comercial en las semanas
   previas al inicio de las ligas de tu ciudad.

## 6. Qué falta para poder cobrar bien

Lo que ya está listo para vender: los cuatro roles, el cupo por plan, el
soporte con reseteo de contraseñas, los avisos automáticos a los capitanes, el
marcador público y las exportaciones.

Lo que conviene tener antes de escalar precios:

- **Pasarela de pago** y facturación automática del plan (hoy el cobro es manual
  y el cupo se ajusta a mano; funciona para los primeros veinte clientes).
- **Autoservicio de alta**: que un organizador pueda registrarse y arrancar un
  torneo de prueba sin que tú crees la cuenta.
- **Avisos por WhatsApp o push**, además de la bandeja dentro de la app. La
  bandeja ya existe y `services/notifications.py` es el único punto a tocar;
  el día que el aviso llegue al celular sin abrir la app, el valor percibido
  para el capitán se multiplica.
- **Recuperación de contraseña por correo** (hoy la resetea soporte; sirve, pero
  no escala más allá de unos cientos de usuarios).

## 7. Métricas que hay que mirar

- **Torneos terminados**, no torneos creados: un torneo abandonado a media
  fase es un cliente que no renueva.
- **Partidos cargados por el árbitro desde el celular**: mide si la operación
  de verdad se movió a la plataforma o si el organizador sigue con su Excel.
- **Capitanes activos por torneo**: es el indicador de que el producto llegó a
  los equipos, que es lo que hace que el torneo del año siguiente ya lo pidan
  ellos.
- **Renovación por temporada**, no mensual: el ciclo real de este negocio es el
  del campeonato.
