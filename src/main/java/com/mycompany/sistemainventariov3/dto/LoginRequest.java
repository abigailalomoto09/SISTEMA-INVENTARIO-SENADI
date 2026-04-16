package com.mycompany.sistemainventariov3.dto;

/**
 * DTO para petición de login
 */
public class LoginRequest {
    private String username;  // Mantenemos username en la API para compatibilidad
    private String password;

    public LoginRequest() {}

    public LoginRequest(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
