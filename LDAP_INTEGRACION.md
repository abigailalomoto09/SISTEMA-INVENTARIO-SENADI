# Integración LDAP - SC_Inventario

## Descripción

Este documento describe la integración de autenticación LDAP con Active Directory para el Sistema de Inventario V3.

## Configuración

### Grupos LDAP en SC_Inventario

```
SC_Inventario (Grupo principal)
├── SC_ADMIN      → Rol: ADMINISTRADOR
├── SC_TECNICO    → Rol: TECNICO (+ hereda permisos CUSTODIO)
└── SC_CUSTODIO   → Rol: CUSTODIO
```

### Servidores y Dominios

- **Servidor LDAP**: 192.168.1.1
- **Puerto**: 389
- **Dominio**: iepi
- **Base de búsqueda**: OU=Usuarios,OU=Oficina matriz,DC=iepi,DC=gov,DC=EC

## Componentes

### 1. LDAP.java
**Ubicación**: `src/main/java/com/mycompany/sistemainventariov3/util/LDAP.java`

Clase utilitaria para operaciones básicas de LDAP:
- `validarIngresoLDAPSinRestriccion()` - Valida credenciales sin verificar grupos
- `validarIngresoLDAPRestringido()` - Valida credenciales y pertenencia a SC_Inventario
- `obtenerRolesLDAP()` - Obtiene los roles del usuario desde sus grupos LDAP
- `obtenerInfoUsuarioLDAP()` - Obtiene información del usuario (nombre, email, etc)

### 2. LDAPAuthService.java
**Ubicación**: `src/main/java/com/mycompany/sistemainventariov3/service/LDAPAuthService.java`

Servicio de autenticación que integra LDAP con la aplicación:
- `autenticarLDAP()` - Autentica usuario y obtiene sus roles
- `autenticarLDAPSinRestriccion()` - Valida sin restricción de grupo
- `obtenerRolesLDAP()` - Obtiene roles disponibles
- `obtenerInfoUsuarioLDAP()` - Obtiene información del usuario

### 3. LoginResource.java (Modificado)
**Ubicación**: `src/main/java/com/mycompany/sistemainventariov3/resources/LoginResource.java`

Endpoint REST modificado para soportar LDAP:
- Intenta autenticar contra LDAP primero (configurable)
- Cae a autenticación de BD local si LDAP falla
- Retorna roles y permisos del usuario

## Roles y Permisos

### ADMINISTRADOR
```json
{
  "puedeEditarTodos": true,
  "puedeActualizarEstado": true,
  "puedeVer": true,
  "puedeCrearEquipo": true,
  "puedeEditarCustodio": true,
  "puedeExportarInventario": true,
  "puedeVerHistorial": true
}
```

### TECNICO
```json
{
  "puedeEditarTodos": false,
  "puedeActualizarEstado": true,
  "puedeVer": true,
  "puedeCrearEquipo": true,
  "puedeEditarCustodio": false,
  "puedeExportarInventario": true,
  "puedeVerHistorial": true
}
```

### CUSTODIO
```json
{
  "puedeEditarTodos": false,
  "puedeActualizarEstado": false,
  "puedeVer": true,
  "puedeCrearEquipo": false,
  "puedeEditarCustodio": false,
  "puedeExportarInventario": false,
  "puedeVerHistorial": true
}
```

## Modo de Operación

Actualmente el sistema opera en modo **LDAP Principal**:
```java
private static final boolean USAR_LDAP_PRINCIPAL = true;
```

### Flujo de Autenticación
```
Usuario ingresa credenciales
        ↓
LDAP.validarIngresoLDAPRestringido()
        ↓
¿Credenciales válidas y usuario en SC_Inventario?
    ├─ SÍ → Obtener roles desde LDAP
    │   → Crear Usuario con roles
    │   → ✓ AUTENTICADO
    │
    └─ NO → Intentar BD Local
        ├─ SÍ → Usar roles de BD
        │   → ✓ AUTENTICADO
        │
        └─ NO → ✗ ERROR DE AUTENTICACIÓN
```

## Cambiar a Modo Fallback

Si deseas usar BD local como principal y LDAP como fallback:

```java
private static final boolean USAR_LDAP_PRINCIPAL = false;
```

## Uso en Cliente REST

### Solicitud
```bash
POST /api/login HTTP/1.1
Content-Type: application/json

{
  "username": "jdoe",
  "password": "password123",
  "rolElegido": null
}
```

### Respuesta (Éxito)
```json
{
  "success": true,
  "message": "Autenticacion exitosa (LDAP (SC_Inventario))",
  "requiereSeleccionPerfil": true,
  "data": {
    "usuario": "jdoe",
    "rol": "TECNICO",
    "nombreCompleto": "John Doe",
    "rolesDisponibles": ["TECNICO", "CUSTODIO"],
    "permisos": {
      "puedeEditarTodos": false,
      "puedeActualizarEstado": true,
      "puedeVer": true,
      "puedeCrearEquipo": true,
      "puedeEditarCustodio": false,
      "puedeExportarInventario": true,
      "puedeVerHistorial": true
    }
  }
}
```

### Respuesta (Error)
```json
{
  "success": false,
  "error": "AUTH_ERROR",
  "message": "El usuario no está autorizado para acceder a SC_Inventario"
}
```

## Dependencias Maven

```xml
<dependency>
    <groupId>com.novell.ldap</groupId>
    <artifactId>jldap</artifactId>
    <version>2009-10-07</version>
</dependency>
```

## Consideraciones Importantes

### Usuarios con Múltiples Roles
- Los técnicos heredan automáticamente el rol CUSTODIO
- Si un usuario está en SC_TECNICO, también tendrá acceso como CUSTODIO
- El usuario puede seleccionar qué rol usar en la aplicación

### Sincronización con BD
- La clase `LDAPAuthService` tiene un método `sincronizarUsuarioEnBD()` para mantener una copia local
- Esto es útil para auditoría y para guardar información adicional

### Seguridad
- Las contraseñas no se guardan, solo se validan contra LDAP
- Las sesiones se mantienen usando `SesionUsuario`
- El dominio LDAP está hard-codeado por seguridad

### Resolución de Problemas
- Revisar los logs de consola para mensajes de LDAP
- Verificar que el servidor 192.168.1.1 sea alcanzable
- Confirmar que el usuario existe en la OU especificada
- Validar que el usuario pertenece a SC_Inventario

## Próximas Mejoras Sugeridas

1. Hacer configurable el servidor LDAP (properties file)
2. Implementar sincronización automática de usuarios en BD
3. Caché de información LDAP para mejorar rendimiento
4. Logging detallado de intentos fallidos de autenticación
5. Recuperación automática de información del custodio desde BD
