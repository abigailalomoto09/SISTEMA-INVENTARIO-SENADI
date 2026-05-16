# Obtener Usuarios del AD - Guía de Uso

## Nuevos Métodos en LDAP.java

Se han añadido 4 nuevos métodos para **jalar todos los usuarios registrados en el AD de SC_Inventario**:

### 1. `obtenerTodosLosUsuariosDelAD()`
Obtiene TODOS los usuarios que están en SC_Inventario

**Uso:**
```java
LDAP ldap = new LDAP();
List<Map<String, String>> usuarios = ldap.obtenerTodosLosUsuariosDelAD();

// Procesar usuarios
for (Map<String, String> usuario : usuarios) {
    String username = usuario.get("sAMAccountName");
    String nombre = usuario.get("displayName");
    String email = usuario.get("mail");
    String telefono = usuario.get("telephoneNumber");
    
    System.out.println("Usuario: " + username + " - " + nombre);
}
```

**Retorna:**
```java
List<Map<String, String>> donde cada mapa contiene:
{
    "sAMAccountName": "jdoe",
    "displayName": "John Doe",
    "mail": "jdoe@iepi.gov.ec",
    "telephoneNumber": "+593999123456",
    "title": "Técnico de Sistemas",
    "department": "TI",
    "distinguishedName": "CN=John Doe,OU=...",
    "memberOf": "CN=SC_TECNICO,..." 
}
```

### 2. `obtenerUsuariosDelGrupo(String grupo)`
Obtiene TODOS los usuarios de un grupo específico

**Uso:**
```java
LDAP ldap = new LDAP();

// Obtener solo ADMINISTRADORES
List<Map<String, String>> admins = ldap.obtenerUsuariosDelGrupo("SC_ADMIN");
System.out.println("Admins: " + admins.size());

// Obtener solo TECNICOS
List<Map<String, String>> tecnicos = ldap.obtenerUsuariosDelGrupo("SC_TECNICO");
System.out.println("Técnicos: " + tecnicos.size());

// Obtener solo CUSTODIOS
List<Map<String, String>> custodios = ldap.obtenerUsuariosDelGrupo("SC_CUSTODIO");
System.out.println("Custodios: " + custodios.size());
```

### 3. `buscarUsuarioPorNombre(String nombre)`
Busca usuarios por nombre (búsqueda parcial)

**Uso:**
```java
LDAP ldap = new LDAP();

// Buscar usuarios con "John" en el nombre
List<Map<String, String>> resultados = ldap.buscarUsuarioPorNombre("John");

// Buscar por usuario
List<Map<String, String>> resultados = ldap.buscarUsuarioPorNombre("jdoe");

for (Map<String, String> usuario : resultados) {
    System.out.println(usuario.get("displayName") + " (" + usuario.get("sAMAccountName") + ")");
}
```

### 4. `estoyEnSCInventario(LDAPEntry entry)` (interno)
Método auxiliar que verifica si un usuario está en SC_Inventario

## Ejemplos Prácticos

### Ejemplo 1: Crear una lista de usuarios para un dropdown/select

```java
LDAP ldap = new LDAP();
List<Map<String, String>> usuarios = ldap.obtenerTodosLosUsuariosDelAD();

// En JSF/PrimeFaces
// <h:selectOneMenu value="#{usuarioBean.usuarioSeleccionado}">
//     <f:selectItems value="#{usuarioBean.listaUsuarios}" 
//                    var="usuario" 
//                    itemLabel="#{usuario.displayName}" 
//                    itemValue="#{usuario.sAMAccountName}"/>
// </h:selectOneMenu>

List<SelectItem> items = new ArrayList<>();
for (Map<String, String> usuario : usuarios) {
    items.add(new SelectItem(
        usuario.get("sAMAccountName"),
        usuario.get("displayName")
    ));
}
```

### Ejemplo 2: Obtener estadísticas de usuarios por grupo

```java
LDAP ldap = new LDAP();

int admins = ldap.obtenerUsuariosDelGrupo("SC_ADMIN").size();
int tecnicos = ldap.obtenerUsuariosDelGrupo("SC_TECNICO").size();
int custodios = ldap.obtenerUsuariosDelGrupo("SC_CUSTODIO").size();

System.out.println("Estadísticas de usuarios en SC_Inventario:");
System.out.println("  Administradores: " + admins);
System.out.println("  Técnicos: " + tecnicos);
System.out.println("  Custodios: " + custodios);
System.out.println("  TOTAL: " + (admins + tecnicos + custodios));
```

### Ejemplo 3: Crear un objeto Usuario con datos del AD

```java
LDAP ldap = new LDAP();
List<Map<String, String>> usuarios = ldap.obtenerTodosLosUsuariosDelAD();

for (Map<String, String> usuarioMap : usuarios) {
    Usuario usuario = new Usuario(
        usuarioMap.get("sAMAccountName"),
        null, // password no se guarda
        "", // rol se determina por grupo
        usuarioMap.get("displayName"),
        null, // idCustodio se busca en BD
        true
    );
    
    // Guardar en BD si no existe
    usuarioService.crearSiNoExiste(usuario);
}
```

### Ejemplo 4: Buscar y mostrar información de usuario

```java
LDAP ldap = new LDAP();

// Buscar "maria"
List<Map<String, String>> resultados = ldap.buscarUsuarioPorNombre("maria");

if (!resultados.isEmpty()) {
    Map<String, String> usuario = resultados.get(0);
    
    System.out.println("Usuario encontrado:");
    System.out.println("  Nombre: " + usuario.get("displayName"));
    System.out.println("  Usuario: " + usuario.get("sAMAccountName"));
    System.out.println("  Email: " + usuario.get("mail"));
    System.out.println("  Teléfono: " + usuario.get("telephoneNumber"));
    System.out.println("  Departamento: " + usuario.get("department"));
} else {
    System.out.println("Usuario no encontrado");
}
```

### Ejemplo 5: Sincronizar usuarios de AD con BD local

```java
public void sincronizarUsuariosDesdeAD() {
    LDAP ldap = new LDAP();
    UsuarioService usuarioService = new UsuarioService();
    
    List<Map<String, String>> usuariosAD = ldap.obtenerTodosLosUsuariosDelAD();
    
    int creados = 0;
    int actualizados = 0;
    
    for (Map<String, String> usuarioAD : usuariosAD) {
        String username = usuarioAD.get("sAMAccountName");
        String nombre = usuarioAD.get("displayName");
        String email = usuarioAD.get("mail");
        
        Usuario usuarioExistente = usuarioService.buscarPorUsername(username);
        
        if (usuarioExistente == null) {
            // Crear nuevo
            Usuario nuevo = new Usuario(username, null, "", nombre, null, true);
            usuarioService.guardar(nuevo);
            creados++;
        } else {
            // Actualizar nombre y email si cambiaron
            if (!usuarioExistente.getNombreCompleto().equals(nombre)) {
                usuarioExistente.setNombreCompleto(nombre);
                usuarioService.actualizar(usuarioExistente);
                actualizados++;
            }
        }
    }
    
    System.out.println("Sincronización completada:");
    System.out.println("  Usuarios creados: " + creados);
    System.out.println("  Usuarios actualizados: " + actualizados);
}
```

### Ejemplo 6: Llenar tabla de administración de usuarios

```java
// En un Bean o Servlet
LDAP ldap = new LDAP();
List<Map<String, String>> usuarios = ldap.obtenerTodosLosUsuariosDelAD();

// En JSF
// <h:dataTable value="#{administradorBean.usuarios}" var="usuario">
//     <h:column>
//         <h:outputText value="#{usuario.displayName}"/>
//     </h:column>
//     <h:column>
//         <h:outputText value="#{usuario.sAMAccountName}"/>
//     </h:column>
//     <h:column>
//         <h:outputText value="#{usuario.mail}"/>
//     </h:column>
// </h:dataTable>
```

## Información Disponible por Usuario

Cada usuario devuelto contiene:

| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| `sAMAccountName` | Nombre de usuario | `jdoe` |
| `displayName` | Nombre completo | `John Doe` |
| `mail` | Correo electrónico | `jdoe@iepi.gov.ec` |
| `telephoneNumber` | Teléfono | `+593999123456` |
| `title` | Puesto/Cargo | `Técnico de Sistemas` |
| `department` | Departamento | `TI` |
| `distinguishedName` | DN del usuario | `CN=John Doe,OU=...` |
| `memberOf` | Grupos a los que pertenece | `CN=SC_TECNICO,...` |

## Performance y Consideraciones

### Caché de Usuarios
Para mejorar performance, se puede cachear la lista de usuarios:

```java
public class UsuarioCache {
    private static List<Map<String, String>> usuarios = null;
    private static long ultimaActualizacion = 0;
    private static final long VALIDEZ_CACHE = 5 * 60 * 1000; // 5 minutos

    public static List<Map<String, String>> obtenerUsuarios() {
        long ahora = System.currentTimeMillis();
        
        // Renovar caché si expiró
        if (usuarios == null || (ahora - ultimaActualizacion) > VALIDEZ_CACHE) {
            LDAP ldap = new LDAP();
            usuarios = ldap.obtenerTodosLosUsuariosDelAD();
            ultimaActualizacion = ahora;
            System.out.println("Caché de usuarios renovado");
        }
        
        return usuarios;
    }
    
    public static void invalidar() {
        usuarios = null;
    }
}

// Uso:
List<Map<String, String>> usuarios = UsuarioCache.obtenerUsuarios();
```

### Búsqueda Eficiente
```java
// Usar buscarUsuarioPorNombre para búsquedas específicas
// Es más rápido que traer todos y filtrar

List<Map<String, String>> resultados = ldap.buscarUsuarioPorNombre("maria");
// Vs.
List<Map<String, String>> todos = ldap.obtenerTodosLosUsuariosDelAD();
todos.stream().filter(u -> u.get("displayName").contains("maria")).collect(toList());
```

## Integración en REST API

```java
@Path("usuarios")
public class UsuariosResource {
    
    private LDAP ldap = new LDAP();
    
    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerTodos() {
        List<Map<String, String>> usuarios = ldap.obtenerTodosLosUsuariosDelAD();
        return Response.ok(gson.toJson(usuarios)).build();
    }
    
    @GET
    @Path("grupo/{grupo}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerPorGrupo(@PathParam("grupo") String grupo) {
        List<Map<String, String>> usuarios = ldap.obtenerUsuariosDelGrupo(grupo);
        return Response.ok(gson.toJson(usuarios)).build();
    }
    
    @GET
    @Path("buscar/{nombre}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response buscar(@PathParam("nombre") String nombre) {
        List<Map<String, String>> usuarios = ldap.buscarUsuarioPorNombre(nombre);
        return Response.ok(gson.toJson(usuarios)).build();
    }
}
```

## Logs Esperados

```
✓ Obtenidos 25 usuarios de SC_Inventario
✓ Obtenidos 5 usuarios del grupo SC_ADMIN
✓ Encontrados 3 usuarios para: maria
```

## Resumen de Funcionalidad

- ✅ Obtener TODOS los usuarios de SC_Inventario
- ✅ Obtener usuarios por grupo específico (SC_ADMIN, SC_TECNICO, SC_CUSTODIO)
- ✅ Buscar usuarios por nombre
- ✅ Obtener información completa (nombre, email, teléfono, departamento)
- ✅ Sin necesidad de contraseña de usuario individual
- ✅ Compatible con JSF, REST API, y aplicaciones Java

---

**Versión actualizada**: 15 de Mayo de 2026
**Estado**: ✅ COMPILADO Y FUNCIONAL
