package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

/**
 * Servicio de autenticación con usuarios quemados (hardcoded)
 * Usuarios: admin/admin123 (ADMINISTRADOR), tecnico/tecnico123 (TECNICO)
 */
public class UsuarioService {
    
    // Usuarios quemados con credenciales de prueba
    private static final Usuario[] USUARIOS_QUEMADOS = {
        new Usuario("admin", "admin123", "ADMINISTRADOR"),
        new Usuario("tecnico", "tecnico123", "TECNICO")
    };
    
    /**
     * Autenticar usuario con usuario y contraseña simples
     */
    public Usuario autenticar(String usuario, String password) throws Exception {
        if (usuario == null || usuario.isEmpty() || password == null || password.isEmpty()) {
            throw new Exception("Usuario y contraseña son requeridos");
        }
        
        // Validar contra usuarios quemados
        for (Usuario u : USUARIOS_QUEMADOS) {
            if (u.getUsuario().equals(usuario) && u.getPassword().equals(password)) {
                System.out.println("[UsuarioService] ✓ Usuario autenticado: " + usuario + " | Rol: " + u.getRol());
                return u;
            }
        }
        
        throw new Exception("Credenciales inválidas");
    }
    
    /**
     * Obtener usuario actual de la sesión
     */
    public Usuario getUsuarioActual() {
        return SesionUsuario.getUsuarioActual();
    }
    
    /**
     * Logout
     */
    public void logout() {
        SesionUsuario.limpiar();
    }
    
    /**
     * Verificar si el usuario actual es administrador
     */
    public boolean esAdministrador() {
        return SesionUsuario.esAdministrador();
    }
    
    /**
     * Verificar si el usuario actual es técnico
     */
    public boolean esTecnico() {
        return SesionUsuario.esTecnico();
    }
}
