# 📱 Credenciales de Usuarios - Mecánica Integral

## Sistema de 4 Perfiles con Roles Diferenciados

### 🔐 Credenciales de Acceso

| Rol | Nombre | Email | Contraseña | Descripción |
|-----|--------|-------|-----------|-------------|
| **Admin** | Santiago | `santiago@mit.com` | `123456` | Dueño del taller - Acceso completo |
| **Supervisor** | Ana | `oasis@mit.com` | `123456` | Supervisor - Historial en tiempo real |
| **Mecánico** | Juan | `mecanico@mit.com` | `123456` | Mecánico - Tareas diarias (máx 3) |
| **Cliente** | Carlos | `camion1@mit.com` | `123456` | Dueño de camión - Mi camión + solicitudes |

---

## 🎯 Acceso por Rol

### 👤 **ADMIN (Santiago)**
- Dashboard con estadísticas (reparaciones, facturación, clientes, ingresos)
- Crear presupuestos (control interno)
- Facturar (tipos A, B, C, M)
- Checklist de ingreso de vehículos
- Gestión de clientes
- Tablero de turnos
- Acceso completo a todas las operaciones

### 📊 **SUPERVISOR (Ana)**
- Dashboard en tiempo real
- Historial de todas las reparaciones
- Filtros: Todos, En Proceso, Completado, En Espera
- Seguimiento del progreso por mecánico
- Ver reportes y estadísticas
- Acceso a tablero de turnos (lectura)

### 🔧 **MECÁNICO (Juan)**
- Mis tareas diarias (máximo 3 por día)
- Ver trabajo asignado (cliente, patente, descripción, tiempo estimado)
- Botones: Iniciar → Completar
- Historial de tareas completadas hoy
- Novedades y comunicaciones
- Acceso a tablero de turnos

### 🚗 **CLIENTE (Carlos)**
- Mi Camión: ver patente, modelo, año, marca, tipo, estado, último servicio
- Crear nueva solicitud de reparación
- Historial de servicios (fecha, servicio, costo, estado)
- Contacto con soporte técnico
- Estado en tiempo real de su vehículo

---

## 📱 Método de Acceso

### Login Tradicional
1. Ingresar email del usuario
2. Ingresar contraseña
3. Presionar "INGRESAR"

### Login con Huella Digital (Biometría)
1. Presionar "Usar huella digital"
2. Simula escaneo de 2.5 segundos
3. 80% de éxito (resto falla y pide reintentar)
4. Acceso por defecto como **ADMIN (Santiago)**

---

## 🚀 Características por Fase

### ✅ FASE 1 & 2 - Autenticación y Navegación
- Sistema de login con 4 perfiles
- Navegación condicional según rol
- Redux state management
- Biometric auth simulada

### ✅ FASE 3 & 4 - Dashboards Específicos
- **Admin Dashboard**: Estadísticas, reparaciones recientes, acciones rápidas
- **Supervisor Dashboard**: Historial en tiempo real con filtros y progreso
- **Mecánico Dashboard**: Tareas diarias con estado y progreso
- **Cliente Dashboard**: Mi camión y historial de servicios

---

## 🛠️ Funcionalidades Futuras

- [ ] Sincronización en tiempo real con Firebase
- [ ] Notificaciones push
- [ ] Reportes y análisis avanzados
- [ ] Chat de soporte
- [ ] Registro de clientes
- [ ] Multi-idioma
- [ ] Modo offline

---

**Versión:** 1.0.4  
**Última actualización:** 2 de Enero, 2026
