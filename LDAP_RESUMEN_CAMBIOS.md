# Resumen de Integración LDAP - SC_Inventario

## Cambios Realizados

### 1. **pom.xml** - Dependencia JLDAP
✅ Añadida la dependencia:
```xml
<dependency>
    <groupId>com.novell.ldap</groupId>
    <artifactId>jldap</artifactId>
    <version>2009-10-07</version>
</dependency>
```

### 2. **LDAP.java** (NUEVO) 
📍 **Ubicación**: `src/main/java/com/mycompany/sistemainventariov3/util/LDAP.java`

Clase utilitaria para operaciones LDAP configurada para:
- ✅ Servidor: 192.168.1.1:389
- ✅ Dominio: iepi (@iepi)
- ✅ Base de búsqueda: OU=Usuarios,OU=Oficina matriz,DC=iepi,DC=gov,DC=EC
- ✅ Grupo principal: SC_Inventario

**Métodos principales**:
- `validarIngresoLDAPSinRestriccion()` - Valida credenciales sin verificar grupos
- `validarIngresoLDAPRestringido()` - Valida credenciales Y pertenencia a SC_Inventario
- `obtenerRolesLDAP()` - Obtiene SC_ADMIN, SC_TECNICO, SC_CUSTODIO y los mapea a roles
- `obtenerInfoUsuarioLDAP()` - Obtiene nombre, email, teléfono, etc del usuario

**Mapeo de Grupos a Roles**:
```
SC_ADMIN    → ADMINISTRADOR
SC_TECNICO  → TECNICO (+ automáticamente CUSTODIO)
SC_CUSTODIO → CUSTODIO
```

### 3. **LDAPAuthService.java** (NUEVO)
📍 **Ubicación**: `src/main/java/com/mycompany/sistemainventariov3/service/LDAPAuthService.java`

Servicio de autenticación que integra LDAP con la aplicación:
- Autentica usuarios contra LDAP
- Obtiene sus roles desde LDAP
- Crea objeto Usuario con roles disponibles
- Integración con BD local (opcional)

### 4. **LoginResource.java** (MODIFICADO)
📍 **Ubicación**: `src/main/java/com/mycompany/sistemainventariov3/resources/LoginResource.java`

Cambios realizados:
- ✅ Añadida instancia de `LDAPAuthService`
- ✅ Método `autenticar()` ahora intenta LDAP primero
- ✅ Si LDAP falla, cae a autenticación de BD local
- ✅ Retorna método de autenticación usado en respuesta
- ✅ Permisos de TECNICO actualizados (puede actualizar estado y crear equipos)
- ✅ Modo configurable: `USAR_LDAP_PRINCIPAL = true/false`

**Flujo**:
```
Usuario ingresa credenciales
    ↓
LDAP.validarIngresoLDAPRestringido()
    ↓
¿Válido?
├─ SÍ  → Obtener roles de LDAP → ✓ AUTENTICADO
└─ NO  → Intentar BD local
    ├─ SÍ  → Usar roles de BD → ✓ AUTENTICADO
    └─ NO  → ✗ ERROR
```

## Estructura de Permisos

### ADMINISTRADOR (SC_ADMIN)
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

### TECNICO (SC_TECNICO) - ⭐ Hereda CUSTODIO
```json
{
  "puedeEditarTodos": false,
  "puedeActualizarEstado": true,        // ← Puede cambiar estado de equipos
  "puedeVer": true,
  "puedeCrearEquipo": true,             // ← Puede crear nuevos equipos
  "puedeEditarCustodio": false,
  "puedeExportarInventario": true,
  "puedeVerHistorial": true
}
```

### CUSTODIO (SC_CUSTODIO)
```json
{
  "puedeEditarTodos": false,
  "puedeActualizarEstado": false,
  "puedeVer": true,
  "puedeCrearEquipo": false,
  "puedeEditarCustodio": false,
  "puedeExportarInventario": false,
  "puedeVerHistorial": true            // ← Solo lectura del historial
}
```

## Archivos de Documentación

### 📄 **LDAP_INTEGRACION.md**
Documentación técnica completa:
- Descripción de componentes
- Configuración de servidores
- Roles y permisos
- Modo de operación
- Troubleshooting
- Mejoras futuras

### 📄 **LDAP_FRONTEND_EJEMPLO.js**
Ejemplos de integración en cliente:
- `realizarLogin()` - Autenticación desde JavaScript
- `mostrarSelectorRoles()` - Selector cuando hay múltiples roles
- `obtenerUsuarioActual()` - Obtiene usuario en sesión
- `tienePermiso()` - Verifica permisos específicos
- `tieneRol()` - Verifica si tiene un rol
- `realizarLogout()` - Cierre de sesión

## Migración del LDAP Antiguo

❌ **ELIMINADO**: `src/main/java/senadi/gob/ec/busfonetico/util/LDAP.java`

**Razón**: Package incorrecto (`senadi.gob.ec.busfonetico.util` no debería estar en proyecto)

✅ **REEMPLAZADO POR**: `src/main/java/com/mycompany/sistemainventariov3/util/LDAP.java`

## Paso a Paso para Usar

### 1. Compilar el Proyecto
```bash
mvn clean install
```

### 2. Desplegar a Servidor
Colocar WAR en servidor (Tomcat, etc)

### 3. Cambiar Credenciales de Prueba
En **LoginResource.java**, línea con:
```java
private static final boolean USAR_LDAP_PRINCIPAL = true;
```

- `true` = LDAP principal (fallback a BD local)
- `false` = BD local principal (fallback a LDAP)

### 4. Probar Login
```bash
curl -X POST http://localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jdoe",
    "password": "password123",
    "rolElegido": null
  }'
```

### 5. Respuesta Esperada
```json
{
  "success": true,
  "message": "Autenticacion exitosa (LDAP (SC_Inventario))",
  "requiereSeleccionPerfil": false,
  "data": {
    "usuario": "jdoe",
    "rol": "TECNICO",
    "nombreCompleto": "John Doe",
    "rolesDisponibles": ["TECNICO", "CUSTODIO"],
    "permisos": { ... }
  }
}
```

## Casos Especiales

### Usuarios con Múltiples Roles
```
Usuario en SC_TECNICO
  → Recibe roles: ["TECNICO", "CUSTODIO"]
  → Puede seleccionar cuál usar
  → Si selecciona TECNICO, obtiene todos esos permisos
  → Si selecciona CUSTODIO, obtiene esos permisos
```

### Usuarios sin Grupo
Si un usuario existe en LDAP pero NO está en SC_Inventario:
```
Respuesta: -1 (No autorizado para SC_Inventario)
Sistema intenta BD local como fallback
Si tampoco está en BD → Error de autenticación
```

### Credenciales Incorrectas
```
Respuesta: 0 (Error de credenciales)
Sistema NO intenta fallback (es error claro)
```

## Logs para Debug

El sistema imprime logs útiles en consola:

```
✓ Autenticación LDAP exitosa
✓ Roles obtenidos para user: [TECNICO, CUSTODIO]
✓ Sincronizando usuario en BD local
✗ Error Autenticando mediante LDAP: ...
✗ Servidor LDAP no alcanzable
```

## Próximos Pasos Sugeridos

1. **Configuración Externa**: Mover datos LDAP a properties file
2. **Sincronización BD**: Implementar `sincronizarUsuarioEnBD()` completamente
3. **Auditoría**: Registrar intentos fallidos de login
4. **Caché**: Cachear roles LDAP para mejorar performance
5. **UI**: Actualizar formulario login para mostrar método autenticación usado

## Preguntas Frecuentes

**P: ¿Qué pasa si LDAP no está disponible?**
A: Sistema cae automáticamente a autenticación de BD local.

**P: ¿Se guardan las contraseñas?**
A: NO. Solo se validan contra LDAP. La sesión se mantiene en servidor.

**P: ¿Puedo usar solo LDAP sin BD local?**
A: Sí, cambia `USAR_LDAP_PRINCIPAL` a `true` y captura excepciones de BD.

**P: ¿Cómo agrego más grupos LDAP?**
A: Edita `LDAP.java` - agrega constantes y métodos para nuevos grupos.

**P: ¿Dónde van las credenciales LDAP?**
A: En `LDAP.java` líneas 21-23. Considera mover a properties para producción.

---

## ✅ Estado Actual
- ✅ Autenticación LDAP implementada
- ✅ 3 Grupos LDAP mapeados (ADMIN, TECNICO, CUSTODIO)
- ✅ Permisos por rol definidos
- ✅ Integración con BD local (fallback)
- ✅ Ejemplos de uso en frontend
- ✅ Documentación completa

## 🚀 Lista para Producción
Requiere:
1. Mover credenciales LDAP a properties/env vars
2. Implementar sincronización BD completa
3. Pruebas con usuarios reales en SC_Inventario
4. Validación en diferentes navegadores
5. Logs y monitoreo de intentos fallidos
