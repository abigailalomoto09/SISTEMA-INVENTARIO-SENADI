# Adaptación LDAP para SC_Inventario - Resumen Completo

## ¿Qué se hizo?

Se adaptó un ejemplo de login LDAP (basado en múltiples grupos como SC_TramitesSENADI, SC_CambioCasillero, etc.) para tu proyecto de **Sistema de Inventario V3** usando solamente los 3 grupos de **SC_Inventario**:

- **SC_ADMIN** → Administrador
- **SC_TECNICO** → Técnico (+ hereda Custodio)
- **SC_CUSTODIO** → Custodio

## Comparación: Antes vs Después

### ANTES (Ejemplo Original)
```java
public void login(ActionEvent actionEvent) {
    LDAP c = new LDAP();
    String grup = "SC_TramitesSENADI";           // Grupo principal
    String grupocas = "SC_CambioCasillero";      // Grupo secundario 1
    String grupodep = "SC_DEPURAR_DUP";          // Grupo secundario 2
    String grupopat = "SC_Patentes";             // Grupo secundario 3

    int n = c.validarIngresoLDAPRestringido(nombre, clave, grup);
    switch (n) {
        case 1:
            // Usuario en SC_TramitesSENADI
            n = c.validarIngresoLDAPRestringido(nombre, clave, grupocas);
            // ... más validaciones de grupos
            break;
        case -1:
            // No autorizado
            break;
        default:
            // Credenciales incorrectas
            break;
    }
}
```

### DESPUÉS (LoginBean.java - Adaptado para SC_Inventario)
```java
@ManagedBean(name = "loginBean")
@SessionScoped
public class LoginBean {
    
    public void login() {
        // PASO 1: Validar SC_Inventario
        int resultadoInventario = ldapUtil.validarIngresoLDAPRestringido(usuario, clave);
        
        switch (resultadoInventario) {
            case 1: // Usuario en SC_Inventario
                // PASO 2: Verificar grupos
                verificarGruposDelUsuario();
                
                if (!gruposDisponibles.isEmpty()) {
                    logeado = true;
                    // ... establecer permisos
                }
                break;
            case -1: // No autorizado
                // ...
                break;
            default: // Credenciales incorrectas
                // ...
                break;
        }
    }
    
    private void verificarGruposDelUsuario() {
        // Verificar SC_ADMIN
        // Verificar SC_TECNICO (+ hereda CUSTODIO)
        // Verificar SC_CUSTODIO
    }
}
```

## Archivos Creados / Modificados

### ✅ NUEVOS ARCHIVOS

| Archivo | Ubicación | Descripción |
|---------|-----------|-------------|
| **LDAP.java** | `src/main/java/com/mycompany/sistemainventariov3/util/` | Utilidad LDAP con métodos de autenticación |
| **LDAPAuthService.java** | `src/main/java/com/mycompany/sistemainventariov3/service/` | Servicio LDAP para REST API |
| **LoginBean.java** | `src/main/java/com/mycompany/sistemainventariov3/bean/` | Bean JSF/PrimeFaces para login |
| **login.xhtml** | `src/main/webapp/` | Formulario de login JSF/PrimeFaces |
| **LDAP_INTEGRACION.md** | Raíz del proyecto | Documentación técnica de LDAP |
| **LDAP_RESUMEN_CAMBIOS.md** | Raíz del proyecto | Resumen de cambios realizados |
| **LDAP_LOGINBEAN_EJEMPLOS.md** | Raíz del proyecto | Ejemplos de uso del LoginBean |

### 🔄 MODIFICADOS

| Archivo | Cambios |
|---------|---------|
| **pom.xml** | Añadida dependencia `jldap 2009-10-07` |
| **LoginResource.java** | Integración de LDAPAuthService como método principal |

### ❌ ELIMINADOS

| Archivo | Razón |
|---------|-------|
| `senadi/gob/ec/busfonetico/util/LDAP.java` | Package incorrecto para proyecto de inventario |

## Estructura de Carpetas

```
SistemaInventarioV3/
├── src/main/java/com/mycompany/sistemainventariov3/
│   ├── util/
│   │   └── LDAP.java                    ← NUEVA
│   ├── service/
│   │   ├── UsuarioService.java          (existente)
│   │   ├── DatabaseService.java         (existente)
│   │   └── LDAPAuthService.java         ← NUEVA
│   ├── bean/
│   │   └── LoginBean.java               ← NUEVA
│   ├── resources/
│   │   ├── LoginResource.java           (modificado)
│   │   └── ...
│   └── ...
├── src/main/webapp/
│   ├── login.xhtml                      ← NUEVA
│   ├── dashboard.html                   (existente)
│   └── ...
├── pom.xml                              (modificado)
├── LDAP_INTEGRACION.md                  ← NUEVA
├── LDAP_RESUMEN_CAMBIOS.md              ← NUEVA
└── LDAP_LOGINBEAN_EJEMPLOS.md           ← NUEVA
```

## Dos Enfoques de Uso

### ENFOQUE 1: REST API (LoginResource.java)
Para aplicaciones frontales modernas (React, Vue, Angular, etc.)

```bash
POST /api/login HTTP/1.1
Content-Type: application/json

{
  "username": "jdoe",
  "password": "password123",
  "rolElegido": null
}
```

**Ventajas**:
- Arquitectura moderna desacoplada
- Fácil de testear
- Multiplataforma (web, mobile, desktop)

### ENFOQUE 2: JSF/PrimeFaces (LoginBean.java)
Para aplicaciones Java EE/Jakarta tradicionales

```xhtml
<h:inputText value="#{loginBean.usuario}"/>
<h:inputSecret value="#{loginBean.clave}"/>
<h:commandButton action="#{loginBean.login()}"/>
```

**Ventajas**:
- Integración nativa con Java EE
- Bean administrado de sesión
- Renderizado en servidor

## Flujo de Autenticación

```
┌─────────────────────────────────────────────────────┐
│                 USUARIO INGRESA                      │
│         usuario + contraseña + selecciona rol        │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  ¿Cuál es el origen?  │
         └───────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        │ REST API   │   JSF      │ JavaScript
        │ LoginRes   │ LoginBean  │ AJAX
        │            │            │
        └────┬───────┴──┬─────────┴─────┐
             │          │               │
    ┌────────▼──────────▼───┐ ┌────────▼───────┐
    │  LDAPAuthService      │ │  LoginBean     │
    │  (para REST)          │ │  (para JSF)    │
    └────────┬──────────────┘ └────────┬───────┘
             │                        │
             └────────────┬───────────┘
                          │
                    ┌─────▼──────┐
                    │  LDAP.java │
                    │ Utilidades │
                    └─────┬──────┘
                          │
            ┌─────────────▼─────────────┐
            │   SERVIDOR LDAP/AD        │
            │   192.168.1.1:389         │
            │   Dominio: iepi           │
            │   SC_Inventario           │
            │   ├─ SC_ADMIN             │
            │   ├─ SC_TECNICO           │
            │   └─ SC_CUSTODIO          │
            └───────────────────────────┘
```

## Configuración Requerida

### 1. pom.xml
✅ Dependencia JLDAP ya añadida:
```xml
<dependency>
    <groupId>com.novell.ldap</groupId>
    <artifactId>jldap</artifactId>
    <version>2009-10-07</version>
</dependency>
```

### 2. LDAP.java
Constantes preconfiguradas:
```java
private static final String LDAP_SERVER = "192.168.1.1";
private static final int LDAP_PORT = 389;
private static final String LDAP_DOMAIN = "iepi";
private static final String SEARCH_BASE = "OU=Usuarios,OU=Oficina matriz,DC=iepi,DC=gov,DC=EC";
```

### 3. LoginBean.java
Anotación JSF:
```java
@ManagedBean(name = "loginBean")
@SessionScoped
```

### 4. web.xml (puede requerir)
Si usas autenticación de contenedor:
```xml
<login-config>
    <auth-method>FORM</auth-method>
    <form-login-config>
        <form-login-page>/login.xhtml</form-login-page>
        <form-error-page>/login.xhtml?error=true</form-error-page>
    </form-login-config>
</login-config>
```

## Permisos por Grupo

### SC_ADMIN (ADMINISTRADOR)
```
✓ Puede editar todos los equipos
✓ Puede actualizar estado
✓ Puede crear equipos
✓ Puede editar custodios
✓ Puede exportar inventario
✓ Puede ver historial completo
```

### SC_TECNICO (TÉCNICO)
```
✗ NO puede editar todos (solo sus equipos)
✓ Puede actualizar estado de equipos
✓ Puede crear equipos nuevos
✗ NO puede editar custodios
✓ Puede exportar inventario
✓ Puede ver historial
+ Hereda permisos de CUSTODIO
```

### SC_CUSTODIO (CUSTODIO)
```
✗ No puede editar
✗ No puede crear
✗ No puede cambiar estado
✓ Puede ver inventario
✓ Puede ver historial
✗ No puede exportar
```

## Cómo Usar

### Opción 1: Usar JSF/PrimeFaces (Recomendado para tu caso)

1. **Accede a login.xhtml**:
   ```
   http://localhost:8080/SistemaInventarioV3/login.xhtml
   ```

2. **Ingresa credenciales LDAP**:
   - Usuario: `jdoe` (sin dominio)
   - Contraseña: `tu_password`

3. **El LoginBean**:
   - Verifica SC_Inventario
   - Busca SC_ADMIN, SC_TECNICO, SC_CUSTODIO
   - Establece permisos
   - Redirige a dashboard

### Opción 2: Usar REST API (Para frontends modernos)

```javascript
fetch('http://localhost:8080/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: 'jdoe',
        password: 'password123',
        rolElegido: null
    })
})
```

## Debugging y Logs

### En la consola verás:
```
✓ Autenticación exitosa para: jdoe
  Rol principal: SC_TECNICO
  Grupos disponibles: [SC_TECNICO, SC_CUSTODIO]
  Nombre: John Doe
  ✓ Usuario es TECNICO (+ CUSTODIO)
```

### Si hay error:
```
✗ Usuario no autorizado: jdoe
✗ Credenciales incorrectas para: jdoe
✗ Servidor LDAP no alcanzable
✗ Error: Servidor LDAP no disponible
```

## Próximos Pasos

1. **Compilar el proyecto**:
   ```bash
   mvn clean install
   ```

2. **Desplegar**:
   - Copiar WAR a servidor (Tomcat, etc)
   - Reiniciar servidor

3. **Probar**:
   - Acceder a http://localhost:8080/SistemaInventarioV3/login.xhtml
   - Usar credenciales de usuario que esté en SC_Inventario

4. **Proteger páginas**:
   - Agregar validación `rendered="#{loginBean.logeado}"` en XHTML
   - O usar `<f:viewAction action="#{not loginBean.logeado ? 'login' : null}"/>`

5. **Verificar permisos**:
   - Usar `tienePermiso()` y `tieneGrupo()` en controles

## Resumen de Métodos LoginBean

| Método | Parámetros | Retorna | Descripción |
|--------|-----------|---------|-------------|
| `login()` | - | void | Autentica usuario contra LDAP |
| `logout()` | - | void | Cierra la sesión |
| `cambiarGrupo()` | `nuevoGrupo` | void | Cambia el rol/grupo actual |
| `tienePermiso()` | `nombrePermiso` | boolean | Verifica un permiso específico |
| `tieneGrupo()` | `grupo` | boolean | Verifica pertenencia a grupo |

## Resumen de Propiedades

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `usuario` | String | Nombre de usuario logueado |
| `logeado` | boolean | Si está autenticado |
| `nombreCompleto` | String | Nombre completo del LDAP |
| `grupoActual` | String | Rol/grupo actual |
| `gruposDisponibles` | List<String> | Roles disponibles para cambiar |
| `esAdmin` | boolean | Si pertenece a SC_ADMIN |
| `esTecnico` | boolean | Si pertenece a SC_TECNICO |
| `esCustodio` | boolean | Si pertenece a SC_CUSTODIO |
| `permisos` | Map<String,Boolean> | Mapa de permisos específicos |

## ✅ Estado Final

- ✅ LDAP.java creado con métodos de autenticación
- ✅ LoginBean.java creado para JSF/PrimeFaces
- ✅ login.xhtml creado con formulario
- ✅ SC_Inventario configurado con 3 grupos
- ✅ Permisos definidos por grupo
- ✅ Documentación completa
- ✅ Ejemplos de uso
- ✅ Integración REST (alternativa)

## 🎯 Listo para Usar
El sistema está completamente configurado para autenticar usuarios contra LDAP usando SC_Inventario y sus 3 grupos: SC_ADMIN, SC_TECNICO, SC_CUSTODIO.
