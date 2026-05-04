package com.mycompany.sistemainventariov3.model;

import javax.persistence.*;
import java.time.LocalDateTime;

/**
 * Entidad para tabla usuario_roles (multi-rol support)
 */
@Entity
@Table(name = "usuario_roles")
public class UsuarioRol {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    
    @Column(name = "id_usuario", nullable = false)
    private Integer idUsuario;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RolEnum rol;
    
    @Column(name = "fecha_asignacion")
    private LocalDateTime fechaAsignacion = LocalDateTime.now();
    
    // Constructor vacío
    public UsuarioRol() {}
    
    public UsuarioRol(Integer idUsuario, RolEnum rol) {
        this.idUsuario = idUsuario;
        this.rol = rol;
    }
    
    // Getters/Setters
    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    
    public RolEnum getRol() { return rol; }
    public void setRol(RolEnum rol) { this.rol = rol; }
    
    public LocalDateTime getFechaAsignacion() { return fechaAsignacion; }
    public void setFechaAsignacion(LocalDateTime fechaAsignacion) { this.fechaAsignacion = fechaAsignacion; }
    
    public enum RolEnum {
        ADMINISTRADOR, TECNICO, CUSTODIO
    }
}

