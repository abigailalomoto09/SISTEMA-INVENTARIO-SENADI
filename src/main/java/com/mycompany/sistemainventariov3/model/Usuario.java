package com.mycompany.sistemainventariov3.model;

/**
 * Modelo Usuario para autenticación con usuarios quemados (hardcoded)
 * Solo usuario, password y rol
 */
public class Usuario {
    
    private String usuario;
    private String password;
    private String rol; // ADMINISTRADOR, TECNICO

    public Usuario() {}

    public Usuario(String usuario, String password, String rol) {
        this.usuario = usuario;
        this.password = password;
        this.rol = rol;
    }

    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }
}
