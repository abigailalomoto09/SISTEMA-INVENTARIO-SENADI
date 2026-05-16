package com.mycompany.sistemainventariov3.util;

import com.novell.ldap.LDAPAttribute;
import com.novell.ldap.LDAPAttributeSet;
import com.novell.ldap.LDAPConnection;
import com.novell.ldap.LDAPEntry;
import com.novell.ldap.LDAPException;
import com.novell.ldap.LDAPSearchConstraints;
import com.novell.ldap.LDAPSearchResults;

import java.net.InetAddress;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Utilidad para autenticación contra LDAP/Active Directory
 * Configurada para SC_Inventario con grupos: SC_ADMIN, SC_TECNICO, SC_CUSTODIO
 */
public class LDAP {

    private static final String LDAP_SERVER = "192.168.1.1";
    private static final int LDAP_PORT = 389;
    private static final String LDAP_DOMAIN = "iepi";
    private static final String SEARCH_BASE = "OU=Usuarios,OU=Oficina matriz,DC=iepi,DC=gov,DC=EC";

    // Grupos LDAP para SC_Inventario
    private static final String GROUP_SC_INVENTARIO = "SC_Inventario";
    private static final String GROUP_ADMIN = "SC_ADMIN";
    private static final String GROUP_TECNICO = "SC_TECNICO";
    private static final String GROUP_CUSTODIO = "SC_CUSTODIO";

    // Constantes LDAP
    private static final String SEARCH_BY_SAM_ACCOUNT_NAME = "(SAMAccountName={0})";
    private static final String SEARCH_GROUP_BY_GROUP_CN = "(&(objectCategory=group)(cn={0}))";
    private static final String DISTINGUISHED_NAME = "distinguishedName";
    private static final String CN = "cn";
    private static final String MEMBER_OF = "memberOf";

    /**
     * Valida credenciales sin restricción de grupo
     * @param user Usuario (sin dominio)
     * @param pass Contraseña
     * @return true si las credenciales son válidas
     */
    public boolean validarIngresoLDAPSinRestriccion(String user, String pass) {
        if (!validarConexion()) {
            return false;
        }

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            conn.bind(LDAPConnection.LDAP_V3, user + "@" + LDAP_DOMAIN, pass);
            conn.disconnect();
            System.out.println("Autenticación exitosa para usuario: " + user);
            return true;
        } catch (Exception ex) {
            System.out.println("Error Autenticando mediante LDAP: " + ex.toString());
            return false;
        }
    }

    /**
     * Valida credenciales y verifica pertenencia a un grupo específico
     * @param user Usuario (sin dominio)
     * @param pass Contraseña
     * @param groupName Nombre del grupo a verificar (ej: "SC_Inventario", "SC_ADMIN", etc)
     * @return 1: Usuario autorizado en el grupo, -1: No autorizado, 0: Credenciales incorrectas
     */
    public int validarIngresoLDAPRestringido(String user, String pass, String groupName) {
        if (!validarConexion()) {
            return 0;
        }

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            conn.bind(LDAPConnection.LDAP_V3, user + "@" + LDAP_DOMAIN, pass);

            // Buscar usuario en base LDAP
            LDAPSearchResults searchResults = conn.search(SEARCH_BASE,
                    LDAPConnection.SCOPE_SUB,
                    formatSearchFilter(SEARCH_BY_SAM_ACCOUNT_NAME, user),
                    new String[]{DISTINGUISHED_NAME, CN, MEMBER_OF},
                    false);

            if (!searchResults.hasMore()) {
                conn.disconnect();
                return -1; // Usuario no encontrado en LDAP
            }

            LDAPEntry entry = searchResults.next();
            LDAPAttribute memberOfAttr = entry.getAttribute(MEMBER_OF);

            if (memberOfAttr != null) {
                String[] groupValues = memberOfAttr.getStringValueArray();
                for (String groupDN : groupValues) {
                    String groupCN = extractCN(groupDN);
                    if (groupName.equalsIgnoreCase(groupCN)) {
                        System.out.println(user + " pertenece a " + groupName);
                        conn.disconnect();
                        return 1;
                    }
                }
            }

            System.out.println(user + " no pertenece a " + groupName);
            conn.disconnect();
            return -1;

        } catch (LDAPException ex) {
            if (ex.getResultCode() == LDAPException.INVALID_CREDENTIALS) {
                System.out.println("Credenciales incorrectas para: " + user);
                return 0;
            }
            System.out.println("Error de autenticación LDAP: " + ex.toString());
            return 0;
        } catch (Exception ex) {
            System.out.println("Error de conexión LDAP: " + ex.toString());
            return 0;
        }
    }

    /**
     * Valida credenciales y verifica pertenencia a SC_Inventario (versión sin grupo específico)
     * @param user Usuario (sin dominio)
     * @param pass Contraseña
     * @return 1: Usuario autorizado en SC_Inventario, -1: No autorizado, 0: Credenciales incorrectas
     */
    public int validarIngresoLDAPRestringido(String user, String pass) {
        // Verificar pertenencia a SC_Inventario
        return validarIngresoLDAPRestringido(user, pass, GROUP_SC_INVENTARIO);
    }

    /**
     * Obtiene los roles (subgrupos) de SC_Inventario a los que pertenece el usuario
     * @param user Usuario (sin dominio)
     * @param pass Contraseña
     * @return Lista de roles (ADMINISTRADOR, TECNICO, CUSTODIO)
     */
    public List<String> obtenerRolesLDAP(String user, String pass) {
        List<String> roles = new ArrayList<>();
        
        if (!validarConexion()) {
            return roles;
        }

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            conn.bind(LDAPConnection.LDAP_V3, user + "@" + LDAP_DOMAIN, pass);

            // Buscar usuario
            LDAPSearchResults searchResults = conn.search(SEARCH_BASE,
                    LDAPConnection.SCOPE_SUB,
                    formatSearchFilter(SEARCH_BY_SAM_ACCOUNT_NAME, user),
                    new String[]{DISTINGUISHED_NAME, CN, MEMBER_OF},
                    false);

            if (!searchResults.hasMore()) {
                conn.disconnect();
                return roles;
            }

            LDAPEntry entry = searchResults.next();
            LDAPAttribute memberOfAttr = entry.getAttribute(MEMBER_OF);

            if (memberOfAttr != null) {
                String[] groupValues = memberOfAttr.getStringValueArray();
                for (String groupDN : groupValues) {
                    String groupName = extractCN(groupDN);
                    
                    // Mapear grupos LDAP a roles de la aplicación
                    if (GROUP_ADMIN.equals(groupName)) {
                        if (!roles.contains("ADMINISTRADOR")) {
                            roles.add("ADMINISTRADOR");
                        }
                    } else if (GROUP_TECNICO.equals(groupName)) {
                        if (!roles.contains("TECNICO")) {
                            roles.add("TECNICO");
                        }
                        // Si es técnico, también es custodio
                        if (!roles.contains("CUSTODIO")) {
                            roles.add("CUSTODIO");
                        }
                    } else if (GROUP_CUSTODIO.equals(groupName)) {
                        if (!roles.contains("CUSTODIO")) {
                            roles.add("CUSTODIO");
                        }
                    }
                }
            }

            conn.disconnect();
            System.out.println("Roles obtenidos para " + user + ": " + roles);
            return roles;

        } catch (Exception ex) {
            System.out.println("Error obteniendo roles LDAP: " + ex.toString());
            return roles;
        }
    }

    /**
     * Obtiene información del usuario desde LDAP
     * @param user Usuario (sin dominio)
     * @param pass Contraseña
     * @return Map con información del usuario (nombre, email, etc)
     */
    public Map<String, String> obtenerInfoUsuarioLDAP(String user, String pass) {
        Map<String, String> info = new HashMap<>();
        
        if (!validarConexion()) {
            return info;
        }

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            conn.bind(LDAPConnection.LDAP_V3, user + "@" + LDAP_DOMAIN, pass);

            LDAPSearchResults searchResults = conn.search(SEARCH_BASE,
                    LDAPConnection.SCOPE_SUB,
                    formatSearchFilter(SEARCH_BY_SAM_ACCOUNT_NAME, user),
                    new String[]{"sAMAccountName", "displayName", "mail", "telephoneNumber", "title"},
                    false);

            if (searchResults.hasMore()) {
                LDAPEntry entry = searchResults.next();
                LDAPAttributeSet attributeSet = entry.getAttributeSet();

                for (Object attr : attributeSet) {
                    LDAPAttribute attribute = (LDAPAttribute) attr;
                    String attrName = attribute.getName();
                    String attrValue = attribute.getStringValue();
                    info.put(attrName, attrValue);
                }
            }

            conn.disconnect();
            return info;

        } catch (Exception ex) {
            System.out.println("Error obteniendo información del usuario: " + ex.toString());
            return info;
        }
    }

    /**
     * Valida la conexión al servidor LDAP
     * @return true si el servidor está reachable
     */
    private boolean validarConexion() {
        try {
            InetAddress inet = InetAddress.getByName(LDAP_SERVER);
            boolean reachable = inet.isReachable(5000);
            if (!reachable) {
                System.out.println("Servidor LDAP no alcanzable: " + LDAP_SERVER);
            }
            return reachable;
        } catch (Exception ex) {
            System.out.println("Error validando conexión LDAP: " + ex.toString());
            return false;
        }
    }

    /**
     * Extrae el CN de un DN (Distinguished Name)
     * Ej: "CN=SC_ADMIN,OU=..." retorna "SC_ADMIN"
     */
    private static String extractCN(String dn) {
        if (dn == null || !dn.toUpperCase().startsWith("CN=")) {
            return "";
        }
        String cn = dn.substring(3);
        int position = cn.indexOf(',');
        if (position == -1) {
            return cn;
        }
        return cn.substring(0, position);
    }

    /**
     * Formatea un filtro LDAP reemplazando {0} con el valor
     */
    private static String formatSearchFilter(String filter, String value) {
        return filter.replace("{0}", escapeFilterValue(value));
    }

    /**
     * Escapa caracteres especiales en valores LDAP
     */
    private static String escapeFilterValue(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\5c")
                    .replace("*", "\\2a")
                    .replace("(", "\\28")
                    .replace(")", "\\29")
                    .replace("\u0000", "\\00");
    }

    /**
     * Obtiene TODOS los usuarios registrados en SC_Inventario
     * @return Lista de usuarios con su información
     */
    public List<Map<String, String>> obtenerTodosLosUsuariosDelAD() {
        List<Map<String, String>> usuarios = new ArrayList<>();

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            
            // Búsqueda anónima para obtener todos los usuarios
            String filter = "(&(objectCategory=person)(sAMAccountName=*))";
            String[] attributes = {"sAMAccountName", "displayName", "mail", "telephoneNumber", 
                                    "title", "department", "distinguishedName", "memberOf"};

            LDAPSearchResults searchResults = conn.search(SEARCH_BASE,
                    LDAPConnection.SCOPE_SUB,
                    filter,
                    attributes,
                    false);

            while (searchResults.hasMore()) {
                try {
                    LDAPEntry entry = searchResults.next();
                    Map<String, String> usuario = new HashMap<>();
                    
                    LDAPAttributeSet attributeSet = entry.getAttributeSet();
                    for (Object attr : attributeSet) {
                        LDAPAttribute attribute = (LDAPAttribute) attr;
                        String attrName = attribute.getName();
                        String attrValue = attribute.getStringValue();
                        usuario.put(attrName, attrValue);
                    }

                    // Solo agregar si está en SC_Inventario
                    if (estoyEnSCInventario(entry)) {
                        usuarios.add(usuario);
                    }
                } catch (Exception e) {
                    System.out.println("Error procesando usuario: " + e.toString());
                }
            }

            conn.disconnect();
            System.out.println("✓ Obtenidos " + usuarios.size() + " usuarios de SC_Inventario");
            return usuarios;

        } catch (Exception ex) {
            System.out.println("Error obteniendo usuarios del AD: " + ex.toString());
            return usuarios;
        }
    }

    /**
     * Obtiene todos los usuarios de un grupo específico
     * @param nombreGrupo Nombre del grupo (ej: "SC_ADMIN", "SC_TECNICO", "SC_CUSTODIO")
     * @return Lista de usuarios del grupo
     */
    public List<Map<String, String>> obtenerUsuariosDelGrupo(String nombreGrupo) {
        List<Map<String, String>> usuarios = new ArrayList<>();

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);

            // Buscar el grupo
            String filterGrupo = "(&(objectCategory=group)(cn=" + escapeFilterValue(nombreGrupo) + "))";
            String[] attrsGrupo = {"member", "distinguishedName"};

            LDAPSearchResults searchResultsGrupo = conn.search(SEARCH_BASE,
                    LDAPConnection.SCOPE_SUB,
                    filterGrupo,
                    attrsGrupo,
                    false);

            if (!searchResultsGrupo.hasMore()) {
                System.out.println("Grupo no encontrado: " + nombreGrupo);
                conn.disconnect();
                return usuarios;
            }

            LDAPEntry grupoEntry = searchResultsGrupo.next();
            LDAPAttribute memberAttr = grupoEntry.getAttribute("member");

            if (memberAttr != null) {
                String[] members = memberAttr.getStringValueArray();

                // Para cada miembro, obtener su información
                for (String memberDN : members) {
                    try {
                        LDAPSearchResults searchResultsUser = conn.search(SEARCH_BASE,
                                LDAPConnection.SCOPE_SUB,
                                "(distinguishedName=" + escapeFilterValue(memberDN) + ")",
                                new String[]{"sAMAccountName", "displayName", "mail", "telephoneNumber",
                                             "title", "department"},
                                false);

                        if (searchResultsUser.hasMore()) {
                            LDAPEntry userEntry = searchResultsUser.next();
                            Map<String, String> usuario = new HashMap<>();
                            
                            LDAPAttributeSet attributeSet = userEntry.getAttributeSet();
                            for (Object attr : attributeSet) {
                                LDAPAttribute attribute = (LDAPAttribute) attr;
                                usuario.put(attribute.getName(), attribute.getStringValue());
                            }
                            usuarios.add(usuario);
                        }
                    } catch (Exception e) {
                        System.out.println("Error procesando miembro: " + e.toString());
                    }
                }
            }

            conn.disconnect();
            System.out.println("✓ Obtenidos " + usuarios.size() + " usuarios del grupo " + nombreGrupo);
            return usuarios;

        } catch (Exception ex) {
            System.out.println("Error obteniendo usuarios del grupo: " + ex.toString());
            return usuarios;
        }
    }

    /**
     * Busca usuarios por nombre en SC_Inventario
     * @param nombreBusqueda Nombre a buscar (parcial o completo)
     * @return Lista de usuarios encontrados
     */
    public List<Map<String, String>> buscarUsuarioPorNombre(String nombreBusqueda) {
        List<Map<String, String>> usuarios = new ArrayList<>();

        if (nombreBusqueda == null || nombreBusqueda.trim().isEmpty()) {
            return usuarios;
        }

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);

            // Buscar por displayName o sAMAccountName
            String filter = "(&(objectCategory=person)(|(displayName=*" + escapeFilterValue(nombreBusqueda) + "*)" +
                           "(sAMAccountName=*" + escapeFilterValue(nombreBusqueda) + "*)))";
            String[] attributes = {"sAMAccountName", "displayName", "mail", "telephoneNumber",
                                    "title", "department", "distinguishedName", "memberOf"};

            LDAPSearchResults searchResults = conn.search(SEARCH_BASE,
                    LDAPConnection.SCOPE_SUB,
                    filter,
                    attributes,
                    false);

            while (searchResults.hasMore()) {
                try {
                    LDAPEntry entry = searchResults.next();
                    
                    // Solo si está en SC_Inventario
                    if (estoyEnSCInventario(entry)) {
                        Map<String, String> usuario = new HashMap<>();
                        LDAPAttributeSet attributeSet = entry.getAttributeSet();
                        for (Object attr : attributeSet) {
                            LDAPAttribute attribute = (LDAPAttribute) attr;
                            usuario.put(attribute.getName(), attribute.getStringValue());
                        }
                        usuarios.add(usuario);
                    }
                } catch (Exception e) {
                    System.out.println("Error procesando usuario: " + e.toString());
                }
            }

            conn.disconnect();
            System.out.println("✓ Encontrados " + usuarios.size() + " usuarios para: " + nombreBusqueda);
            return usuarios;

        } catch (Exception ex) {
            System.out.println("Error buscando usuarios: " + ex.toString());
            return usuarios;
        }
    }

    /**
     * Verifica si un usuario está en SC_Inventario
     */
    private boolean estoyEnSCInventario(LDAPEntry entry) {
        try {
            LDAPAttribute memberOfAttr = entry.getAttribute(MEMBER_OF);
            if (memberOfAttr != null) {
                String[] groupValues = memberOfAttr.getStringValueArray();
                for (String groupDN : groupValues) {
                    if (groupDN.toLowerCase().contains("cn=" + GROUP_SC_INVENTARIO.toLowerCase())) {
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("Error verificando grupo: " + e.toString());
        }
        return false;
    }

    /**
     * Información de permisos por rol en SC_Inventario
     */
    public static class RolPermisos {
        public static Map<String, Boolean> obtenerPermisos(String rol) {
            Map<String, Boolean> permisos = new HashMap<>();
            
            if ("ADMINISTRADOR".equals(rol)) {
                permisos.put("puedeEditarTodos", true);
                permisos.put("puedeActualizarEstado", true);
                permisos.put("puedeVer", true);
                permisos.put("puedeCrearEquipo", true);
                permisos.put("puedeEditarCustodio", true);
                permisos.put("puedeExportarInventario", true);
                permisos.put("puedeVerHistorial", true);
            } else if ("TECNICO".equals(rol)) {
                permisos.put("puedeEditarTodos", false);
                permisos.put("puedeActualizarEstado", true);
                permisos.put("puedeVer", true);
                permisos.put("puedeCrearEquipo", true);
                permisos.put("puedeEditarCustodio", false);
                permisos.put("puedeExportarInventario", true);
                permisos.put("puedeVerHistorial", true);
            } else if ("CUSTODIO".equals(rol)) {
                permisos.put("puedeEditarTodos", false);
                permisos.put("puedeActualizarEstado", false);
                permisos.put("puedeVer", true);
                permisos.put("puedeCrearEquipo", false);
                permisos.put("puedeEditarCustodio", false);
                permisos.put("puedeExportarInventario", false);
                permisos.put("puedeVerHistorial", false);
            }
            
            return permisos;
        }
    }
}
