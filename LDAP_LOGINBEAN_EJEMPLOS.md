# Uso del LoginBean.java - JSF/PrimeFaces

## Descripción

`LoginBean.java` es un bean administrado de JSF/PrimeFaces que implementa la autenticación contra LDAP (SC_Inventario) con soporte para 3 grupos:

- **SC_ADMIN** → ADMINISTRADOR (Acceso total)
- **SC_TECNICO** → TECNICO (Puede modificar) + hereda CUSTODIO
- **SC_CUSTODIO** → CUSTODIO (Solo lectura)

## Componentes Creados

### 1. LoginBean.java
📍 `src/main/java/com/mycompany/sistemainventariov3/bean/LoginBean.java`

- Anotado con `@ManagedBean(name = "loginBean")` y `@SessionScoped`
- Maneja toda la lógica de autenticación LDAP
- Mantiene la sesión del usuario logueado
- Gestiona permisos y grupos disponibles

### 2. login.xhtml
📍 `src/main/webapp/login.xhtml`

Formulario de login con:
- Campos usuario y contraseña
- Mensajes de error/éxito
- Efecto visual "shake" en error
- Información de grupos disponibles

## Uso en Formularios

### Ejemplo 1: Botón de Login
```xhtml
<h:form>
    <h:outputLabel for="usuario" value="Usuario:"/>
    <h:inputText id="usuario" value="#{loginBean.usuario}"/>
    
    <h:outputLabel for="clave" value="Contraseña:"/>
    <h:inputSecret id="clave" value="#{loginBean.clave}"/>
    
    <h:commandButton value="Ingresar"
                     action="#{loginBean.login()}"
                     update="messages"/>
</h:form>
```

### Ejemplo 2: Logout
```xhtml
<h:form>
    <h:outputText value="Bienvenido: #{loginBean.nombreCompleto}"/>
    
    <h:commandButton value="Logout"
                     action="#{loginBean.logout()}"
                     immediate="true"/>
</h:form>
```

## Protección de Páginas

### Ejemplo 3: Mostrar contenido solo si está logeado
```xhtml
<h:panelGroup rendered="#{loginBean.logeado}">
    <h1>Hola #{loginBean.nombreCompleto}</h1>
    <p>Tu grupo: #{loginBean.grupoActual}</p>
</h:panelGroup>

<h:panelGroup rendered="#{not loginBean.logeado}">
    <h:outputText value="Por favor inicia sesión"/>
</h:panelGroup>
```

### Ejemplo 4: Mostrar contenido solo para ADMINISTRADOR
```xhtml
<h:panelGroup rendered="#{loginBean.esAdmin}">
    <h1>Panel de Administración</h1>
    <!-- Opciones solo para admin -->
</h:panelGroup>
```

### Ejemplo 5: Mostrar contenido para TECNICO o ADMIN
```xhtml
<h:panelGroup rendered="#{loginBean.esTecnico or loginBean.esAdmin}">
    <h:commandButton value="Crear Equipo"
                     action="nuevo-equipo.xhtml"
                     rendered="#{loginBean.tienePermiso('puedeCrearEquipo')}"/>
</h:panelGroup>
```

## Verificación de Permisos

### Ejemplo 6: Usar método tienePermiso()
```xhtml
<!-- Mostrar botón solo si tiene permiso -->
<h:commandButton value="Editar"
                 rendered="#{loginBean.tienePermiso('puedeEditarTodos')}"/>

<!-- Botón deshabilitado si no tiene permiso -->
<h:commandButton value="Exportar"
                 disabled="#{not loginBean.tienePermiso('puedeExportarInventario')}"/>
```

### Ejemplo 7: Usar método tieneGrupo()
```xhtml
<h:selectOneMenu value="#{loginBean.grupoActual}"
                 rendered="#{loginBean.gruposDisponibles.size() > 1}">
    <f:selectItems value="#{loginBean.gruposDisponibles}"/>
    <p:ajax listener="#{loginBean.cambiarGrupo(loginBean.grupoActual)}"
            update="@form"/>
</h:selectOneMenu>
```

## Información del Usuario

### Ejemplo 8: Mostrar información del usuario
```xhtml
<div class="user-info">
    <p><strong>Usuario:</strong> #{loginBean.usuario}</p>
    <p><strong>Nombre Completo:</strong> #{loginBean.nombreCompleto}</p>
    <p><strong>Grupo Actual:</strong> #{loginBean.grupoActual}</p>
    <p><strong>Es Administrador:</strong> #{loginBean.esAdmin}</p>
    <p><strong>Es Técnico:</strong> #{loginBean.esTecnico}</p>
    <p><strong>Es Custodio:</strong> #{loginBean.esCustodio}</p>
</div>
```

## Cambiar Rol/Grupo

### Ejemplo 9: Selector de rol cuando hay múltiples
```xhtml
<!-- Solo mostrar si tiene más de un rol -->
<h:panelGroup rendered="#{loginBean.gruposDisponibles.size() > 1}">
    <h:selectOneMenu value="#{loginBean.grupoActual}">
        <f:selectItems value="#{loginBean.gruposDisponibles}"/>
    </h:selectOneMenu>
    
    <h:commandButton value="Cambiar Rol"
                     action="#{loginBean.cambiarGrupo(loginBean.grupoActual)}"
                     update="@form"/>
</h:panelGroup>
```

## Flujo de Autenticación

```
Usuario ingresa credenciales (usuario + clave)
        ↓
loginBean.login()
        ↓
LDAP.validarIngresoLDAPRestringido(usuario, clave)
        ↓
¿Está en SC_Inventario?
    ├─ SÍ → verificarGruposDelUsuario()
    │       ├─ Verificar SC_ADMIN
    │       ├─ Verificar SC_TECNICO (+ hereda CUSTODIO)
    │       └─ Verificar SC_CUSTODIO
    │       ↓
    │       establecerPermisos()
    │       ↓
    │       logeado = true
    │       ✓ ÉXITO
    │
    └─ NO → logeado = false
            ✗ ERROR: No autorizado
```

## Propiedades del Usuario en Sesión

```java
loginBean.usuario              // "jdoe"
loginBean.clave                // (no se guarda)
loginBean.logeado              // true/false
loginBean.nombreCompleto       // "John Doe"
loginBean.grupoActual          // "SC_TECNICO"
loginBean.gruposDisponibles    // ["SC_TECNICO", "SC_CUSTODIO"]
loginBean.esAdmin              // false
loginBean.esTecnico            // true
loginBean.esCustodio           // true
loginBean.permisos             // Map con permisos
```

## Permisos por Grupo

### ADMINISTRADOR
```
puedeEditarTodos: true
puedeActualizarEstado: true
puedeVer: true
puedeCrearEquipo: true
puedeEditarCustodio: true
puedeExportarInventario: true
puedeVerHistorial: true
```

### TECNICO
```
puedeEditarTodos: false
puedeActualizarEstado: true      ← Puede cambiar estado
puedeVer: true
puedeCrearEquipo: true           ← Puede crear equipos
puedeEditarCustodio: false
puedeExportarInventario: true
puedeVerHistorial: true
```

### CUSTODIO
```
puedeEditarTodos: false
puedeActualizarEstado: false
puedeVer: true
puedeCrearEquipo: false
puedeEditarCustodio: false
puedeExportarInventario: false
puedeVerHistorial: true          ← Solo lectura de historial
```

## Casos Especiales

### Usuario con múltiples roles
Si un usuario está en SC_TECNICO:
- Automáticamente obtiene rol SC_CUSTODIO
- `gruposDisponibles` incluye ambos
- Puede cambiar entre ellos
- Permisos se ajustan al grupo actual

### Usuario sin ningún grupo
Si está en SC_Inventario pero sin subgrupo:
- Login falla con mensaje "No tiene grupos asignados"
- `logeado` queda en false

### Credenciales incorrectas
- Login falla con mensaje "Credenciales Incorrectas"
- Efecto visual "shake" en el formulario

## Integración con BD Local (Opcional)

El LoginBean también puede sincronizar con BD local:

```java
// En el método login(), después de autenticar:
Usuario usuarioSesion = new Usuario(
    usuario,
    null,               // password no se guarda
    grupoActual,
    nombreCompleto,
    null,               // idCustodio
    true
);
usuarioSesion.setRolesDisponibles(gruposDisponibles);
SesionUsuario.setUsuarioActual(usuarioSesion);
```

## Ejemplo Completo: Dashboard Protegido

```xhtml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:h="http://xmlns.jcp.org/jsf/html"
      xmlns:f="http://xmlns.jcp.org/jsf/core"
      xmlns:p="http://primefaces.org/ui">

<h:head>
    <title>Dashboard</title>
</h:head>

<h:body>
    <!-- Protección: redirigir si no está logeado -->
    <f:metadata>
        <f:viewAction action="#{not loginBean.logeado ? 'login' : null}"/>
    </f:metadata>

    <!-- Mostrar solo si está logeado -->
    <h:panelGroup rendered="#{loginBean.logeado}">
        <h1>Bienvenido #{loginBean.nombreCompleto}</h1>
        
        <!-- Opciones por rol -->
        <h:panelGroup rendered="#{loginBean.esAdmin}">
            <h:link value="Panel Admin" outcome="admin-panel"/>
        </h:panelGroup>

        <h:panelGroup rendered="#{loginBean.esTecnico}">
            <h:link value="Crear Equipo" outcome="nuevo-equipo"/>
        </h:panelGroup>

        <h:link value="Ver Inventario" outcome="inventario"/>
        
        <h:form>
            <h:commandButton value="Logout"
                             action="#{loginBean.logout()}"
                             immediate="true"/>
        </h:form>
    </h:panelGroup>
</h:body>
</html>
```

## Debugging

Para ver qué está pasando, revisa los logs:

```
✓ Autenticación exitosa para: jdoe
  Rol principal: SC_TECNICO
  Grupos disponibles: [SC_TECNICO, SC_CUSTODIO]
  Nombre: John Doe
```

## Resumen

El LoginBean proporciona:
- ✅ Autenticación contra LDAP (SC_Inventario)
- ✅ Soporte para 3 grupos con permisos diferenciados
- ✅ Gestión de múltiples roles
- ✅ Fácil protección de páginas
- ✅ Verificación de permisos granulares
- ✅ Información del usuario en sesión

Toda la lógica se ejecuta del lado del servidor (seguro) y el formulario es responsivo con PrimeFaces.
