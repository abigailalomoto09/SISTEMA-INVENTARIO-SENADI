package com.mycompany.sistemainventariov3.model;

import javax.persistence.*;

/**
 * Entidad Custodio - Responsable de un bien
 */
@Entity
@Table(name = "custodios")
public class Custodio {
    
    @Id
    @Column(name = "id_custodio")
    private Integer idCustodio;
    
    @Column(name = "nombre", nullable = false, length = 255)
    private String nombre;

    // Getters y Setters
    public Integer getIdCustodio() {
        return idCustodio;
    }

    public void setIdCustodio(Integer idCustodio) {
        this.idCustodio = idCustodio;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    @Override
    public String toString() {
        return nombre;
    }
}
