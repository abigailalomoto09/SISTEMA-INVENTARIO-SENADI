package com.mycompany.sistemainventariov3;

import com.novell.ldap.LDAPConnection;
import com.novell.ldap.LDAPException;
import java.net.InetAddress;

/**
 * 🧪 TEST DE CONEXIÓN LDAP
 * 
 * Ejecutar para verificar que la conexión con Active Directory funciona correctamente
 * 
 * Uso: 
 * 1. Cambiar las variables de configuración en este archivo
 * 2. Ejecutar como aplicación Java
 * 3. Revisar la salida en consola
 */
public class LDAPConnectionTest {

    // ⚙️ CONFIGURACIÓN - CAMBIAR SEGÚN TU ENTORNO
    private static final String LDAP_SERVER = "192.168.1.1";      // 👈 IP del servidor AD
    private static final int LDAP_PORT = 389;                      // Puerto LDAP
    private static final String LDAP_DOMAIN = "iepi";              // Dominio sin .gov.ec
    private static final String FULL_DOMAIN = "iepi.gov.ec";       // Dominio completo para bind
    private static final String SEARCH_BASE = "DC=iepi,DC=gov,DC=ec"; // Base LDAP

    // 📝 CREDENCIALES DE PRUEBA - CAMBIAR POR TUS DATOS
    private static final String TEST_USER = "migue.cabrera";       // 👈 Usuario a probar
    private static final String TEST_PASSWORD = "TuContraseña";     // 👈 Contraseña
    private static final String TEST_GROUP = "SC_Inventario";      // 👈 Grupo a validar

    public static void main(String[] args) {
        System.out.println("\n" + "=".repeat(80));
        System.out.println("🧪 TEST DE CONEXIÓN LDAP/ACTIVE DIRECTORY");
        System.out.println("=".repeat(80));

        // Paso 1: Validar conectividad de red
        testConectividadRed();

        // Paso 2: Conectar al servidor LDAP
        testConexionLDAP();

        // Paso 3: Autenticar usuario
        testAutenticacionUsuario();

        // Paso 4: Buscar usuario en LDAP
        testBusquedaUsuario();

        // Paso 5: Validar pertenencia a grupo
        testValidacionGrupo();

        System.out.println("\n" + "=".repeat(80));
        System.out.println("✅ PRUEBAS COMPLETADAS");
        System.out.println("=".repeat(80) + "\n");
    }

    /**
     * Test 1: Verificar que el servidor es alcanzable por red
     */
    private static void testConectividadRed() {
        System.out.println("\n[TEST 1] VERIFICANDO CONECTIVIDAD DE RED");
        System.out.println("-".repeat(80));
        System.out.println("Servidor: " + LDAP_SERVER);
        System.out.println("Puerto: " + LDAP_PORT);

        try {
            InetAddress inet = InetAddress.getByName(LDAP_SERVER);
            boolean reachable = inet.isReachable(5000);
            
            if (reachable) {
                System.out.println("✅ ÉXITO: Servidor " + LDAP_SERVER + " es alcanzable");
            } else {
                System.out.println("⚠️ ADVERTENCIA: Servidor no responde a ping, pero podría estar disponible por firewall");
                System.out.println("   Continuando con prueba de conexión LDAP...");
            }
        } catch (Exception e) {
            System.out.println("❌ ERROR: No se puede alcanzar el servidor");
            System.out.println("   Causa: " + e.getMessage());
            System.out.println("   Verificar: IP correcta, firewall, conectividad de red");
        }
    }

    /**
     * Test 2: Conectar directamente al servidor LDAP
     */
    private static void testConexionLDAP() {
        System.out.println("\n[TEST 2] CONECTANDO AL SERVIDOR LDAP");
        System.out.println("-".repeat(80));

        try {
            LDAPConnection conn = new LDAPConnection();
            System.out.println("Conectando a " + LDAP_SERVER + ":" + LDAP_PORT + "...");
            
            conn.connect(LDAP_SERVER, LDAP_PORT);
            System.out.println("✅ ÉXITO: Conexión establecida al servidor LDAP");
            
            conn.disconnect();
        } catch (LDAPException e) {
            System.out.println("❌ ERROR: No se puede conectar al servidor LDAP");
            System.out.println("   Código: " + e.getResultCode());
            System.out.println("   Mensaje: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("❌ ERROR: " + e.getMessage());
        }
    }

    /**
     * Test 3: Autenticar usuario contra el servidor LDAP
     */
    private static void testAutenticacionUsuario() {
        System.out.println("\n[TEST 3] AUTENTICANDO USUARIO");
        System.out.println("-".repeat(80));
        System.out.println("Usuario: " + TEST_USER);
        System.out.println("Dominio: " + FULL_DOMAIN);
        System.out.println("Bind como: " + TEST_USER + "@" + FULL_DOMAIN);

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            
            System.out.println("Intentando bind...");
            conn.bind(LDAPConnection.LDAP_V3, TEST_USER + "@" + FULL_DOMAIN, TEST_PASSWORD);
            
            System.out.println("✅ ÉXITO: Usuario autenticado correctamente");
            conn.disconnect();
        } catch (LDAPException e) {
            if (e.getResultCode() == LDAPException.INVALID_CREDENTIALS) {
                System.out.println("❌ ERROR: Credenciales inválidas");
                System.out.println("   Usuario o contraseña incorrectos");
            } else {
                System.out.println("❌ ERROR LDAP: " + e.getMessage());
                System.out.println("   Código: " + e.getResultCode());
            }
        } catch (Exception e) {
            System.out.println("❌ ERROR: " + e.getMessage());
        }
    }

    /**
     * Test 4: Buscar usuario en la base LDAP
     */
    private static void testBusquedaUsuario() {
        System.out.println("\n[TEST 4] BUSCANDO USUARIO EN LDAP");
        System.out.println("-".repeat(80));
        System.out.println("Base de búsqueda: " + SEARCH_BASE);
        System.out.println("Filtro: (sAMAccountName=" + TEST_USER + ")");

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            conn.bind(LDAPConnection.LDAP_V3, TEST_USER + "@" + FULL_DOMAIN, TEST_PASSWORD);

            String filter = "(sAMAccountName=" + TEST_USER + ")";
            var searchResults = conn.search(
                SEARCH_BASE,
                LDAPConnection.SCOPE_SUB,
                filter,
                new String[]{"sAMAccountName", "displayName", "memberOf"},
                false
            );

            if (searchResults.hasMore()) {
                var entry = searchResults.next();
                System.out.println("✅ ÉXITO: Usuario encontrado");
                System.out.println("   DN: " + entry.getDN());
                
                var displayNameAttr = entry.getAttribute("displayName");
                if (displayNameAttr != null) {
                    System.out.println("   Nombre completo: " + displayNameAttr.getStringValue());
                }
            } else {
                System.out.println("⚠️ ADVERTENCIA: Usuario no encontrado en LDAP");
                System.out.println("   Verificar que SEARCH_BASE es correcto");
            }

            conn.disconnect();
        } catch (Exception e) {
            System.out.println("❌ ERROR: " + e.getMessage());
        }
    }

    /**
     * Test 5: Validar que el usuario está en el grupo especificado
     */
    private static void testValidacionGrupo() {
        System.out.println("\n[TEST 5] VALIDANDO PERTENENCIA AL GRUPO");
        System.out.println("-".repeat(80));
        System.out.println("Grupo a buscar: " + TEST_GROUP);

        try {
            LDAPConnection conn = new LDAPConnection();
            conn.connect(LDAP_SERVER, LDAP_PORT);
            conn.bind(LDAPConnection.LDAP_V3, TEST_USER + "@" + FULL_DOMAIN, TEST_PASSWORD);

            String filter = "(sAMAccountName=" + TEST_USER + ")";
            var searchResults = conn.search(
                SEARCH_BASE,
                LDAPConnection.SCOPE_SUB,
                filter,
                new String[]{"memberOf"},
                false
            );

            if (searchResults.hasMore()) {
                var entry = searchResults.next();
                var memberOfAttr = entry.getAttribute("memberOf");

                if (memberOfAttr != null) {
                    System.out.println("Grupos del usuario:");
                    String[] groups = memberOfAttr.getStringValueArray();
                    
                    boolean encontrado = false;
                    for (String groupDN : groups) {
                        String groupName = extractCN(groupDN);
                        System.out.println("   - " + groupName);
                        
                        if (TEST_GROUP.equalsIgnoreCase(groupName)) {
                            encontrado = true;
                        }
                    }

                    if (encontrado) {
                        System.out.println("\n✅ ÉXITO: Usuario está en el grupo " + TEST_GROUP);
                    } else {
                        System.out.println("\n❌ ERROR: Usuario NO está en el grupo " + TEST_GROUP);
                        System.out.println("   El usuario pertenece a otros grupos pero no a " + TEST_GROUP);
                    }
                } else {
                    System.out.println("⚠️ ADVERTENCIA: Usuario no tiene atributo memberOf");
                }
            }

            conn.disconnect();
        } catch (Exception e) {
            System.out.println("❌ ERROR: " + e.getMessage());
        }
    }

    /**
     * Extrae el CN de un DN
     * Ejemplo: "CN=SC_Inventario,OU=..." retorna "SC_Inventario"
     */
    private static String extractCN(String dn) {
        if (dn == null || !dn.toUpperCase().startsWith("CN=")) {
            return dn;
        }
        String cn = dn.substring(3);
        int position = cn.indexOf(',');
        if (position == -1) {
            return cn;
        }
        return cn.substring(0, position);
    }
}
