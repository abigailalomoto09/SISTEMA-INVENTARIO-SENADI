package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.util.LDAP;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Servicio de autenticación contra LDAP/Active Directory (SC_Inventario)
 * Integra con la base de datos local para información complementaria
 */
public class LDAPAuthService {

    private final LDAP ldap = new LDAP();

    /**
     * Autentica usuario contra LDAP y obtiene sus roles
     * @param usuario Usuario sin dominio (ej: "jdoe")
     * @param password Contraseña
     * @return Usuario con roles, o null si la autenticación falla
     */
    public Usuario autenticarLDAP(String usuario, String password) throws Exception {
        if (usuario == null || usuario.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new Exception("Usuario y contraseña son requeridos");
        }

        usuario = usuario.trim();

        // Validar credenciales contra LDAP
        int resultadoValidacion = ldap.validarIngresoLDAPRestringido(usuario, password);

        if (resultadoValidacion != 1) {
            if (resultadoValidacion == -1) {
                throw new Exception("El usuario no está autorizado para acceder a SC_Inventario");
            } else {
                throw new Exception("Credenciales inválidas");
            }
        }

        // Obtener roles desde LDAP
        List<String> rolesLDAP = ldap.obtenerRolesLDAP(usuario, password);
        if (rolesLDAP.isEmpty()) {
            throw new Exception("No se pudieron obtener los roles del usuario desde LDAP");
        }

        // Obtener información del usuario desde LDAP
        Map<String, String> infoLDAP = ldap.obtenerInfoUsuarioLDAP(usuario, password);
        String nombreCompleto = infoLDAP.getOrDefault("displayName", usuario);

        // Crear objeto Usuario
        Usuario u = new Usuario(usuario, null, rolesLDAP.get(0), nombreCompleto, null, true);
        u.setRolesDisponibles(rolesLDAP);

        // Opcional: Sincronizar con base de datos local
        sincronizarUsuarioEnBD(u, infoLDAP);

        System.out.println("Autenticación LDAP exitosa para: " + usuario + " con roles: " + rolesLDAP);
        return u;
    }

    /**
     * Autentica sin restricción de grupo (solo valida credenciales)
     * @param usuario Usuario sin dominio
     * @param password Contraseña
     * @return true si las credenciales son válidas
     */
    public boolean autenticarLDAPSinRestriccion(String usuario, String password) throws Exception {
        if (usuario == null || usuario.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new Exception("Usuario y contraseña son requeridos");
        }

        return ldap.validarIngresoLDAPSinRestriccion(usuario.trim(), password);
    }

    /**
     * Obtiene los roles que tiene un usuario en LDAP
     * @param usuario Usuario sin dominio
     * @param password Contraseña
     * @return Lista de roles del usuario
     */
    public List<String> obtenerRolesLDAP(String usuario, String password) throws Exception {
        if (usuario == null || usuario.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new Exception("Usuario y contraseña son requeridos");
        }

        return ldap.obtenerRolesLDAP(usuario.trim(), password);
    }

    /**
     * Obtiene información del usuario desde LDAP
     * @param usuario Usuario sin dominio
     * @param password Contraseña
     * @return Mapa con información del usuario
     */
    public Map<String, String> obtenerInfoUsuarioLDAP(String usuario, String password) throws Exception {
        if (usuario == null || usuario.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new Exception("Usuario y contraseña son requeridos");
        }

        return ldap.obtenerInfoUsuarioLDAP(usuario.trim(), password);
    }

    /**
     * Sincroniza la información del usuario con la base de datos local
     * Crea o actualiza el registro del usuario en la tabla de usuario
     */
    private void sincronizarUsuarioEnBD(Usuario usuarioLDAP, Map<String, String> infoLDAP) {
        try {
            // TODO: Implementar lógica de sincronización con BD local
            // Esto podría:
            // 1. Crear usuario en BD si no existe
            // 2. Actualizar información (nombre completo, email, etc)
            // 3. Sincronizar roles si la tabla usuario tiene columna roles_extra

            System.out.println("Sincronizando usuario " + usuarioLDAP.getUsuario() + " en BD local");
        } catch (Exception e) {
            System.out.println("Error sincronizando usuario en BD: " + e.toString());
            // No fallar la autenticación si hay problema de sincronización
        }
    }

    /**
     * Mapea roles LDAP a roles de aplicación con permisos
     */
    public static Map<String, Boolean> obtenerPermisosDelRol(String rol) {
        return LDAP.RolPermisos.obtenerPermisos(rol);
    }
}
