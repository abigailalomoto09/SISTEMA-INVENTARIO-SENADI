package com.mycompany.sistemainventariov3.model;

import javax.persistence.*;

/**
 * Entidad Ubicación - Lugar donde se encuentra un bien
 */
@Entity
@Table(name = "ubicaciones")
public class Ubicacion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ubicacion")
    private Integer idUbicacion;
    
    @Column(name = "clave_ubicacion", length = 255)
    private String claveUbicacion;
    
    @Column(name = "edificio", length = 120)
    private String edificio;
    
    @Column(name = "piso", length = 60)
    private String piso;
    
    @Column(name = "detalle", length = 150)
    private String detalle;

    // Getters y Setters
    public Integer getIdUbicacion() {
        return idUbicacion;
    }

    public void setIdUbicacion(Integer idUbicacion) {
        this.idUbicacion = idUbicacion;
    }

    public String getClaveUbicacion() {
        return claveUbicacion;
    }

    public void setClaveUbicacion(String claveUbicacion) {
        this.claveUbicacion = claveUbicacion;
    }

    public String getEdificio() {
        return edificio;
    }

    public void setEdificio(String edificio) {
        this.edificio = edificio;
    }

    public String getPiso() {
        return piso;
    }

    public void setPiso(String piso) {
        this.piso = piso;
    }

    public String getDetalle() {
        return detalle;
    }

    public void setDetalle(String detalle) {
        this.detalle = detalle;
    }

    public String getUbicacionCompleta() {
        return (edificio != null ? edificio : "") + " - " + 
               (piso != null ? piso : "") + " - " + 
               (detalle != null ? detalle : "");
    }

    @Override
    public String toString() {
        return getUbicacionCompleta();
    }
}
