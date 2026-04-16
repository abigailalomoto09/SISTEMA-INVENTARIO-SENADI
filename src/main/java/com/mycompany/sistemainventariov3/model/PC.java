package com.mycompany.sistemainventariov3.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.util.Date;

/**
 * Entidad PC - Computadora de escritorio
 */
@Entity
@Table(name = "pcs")
public class PC {
    
    @Id
    @Column(name = "codigo_sbai", length = 120)
    private String codigoSbai;
    
    @Column(name = "codigo_sbai_original", length = 120)
    private String codigoSbaiOriginal;
    
    @Column(name = "codigo_megan", length = 120)
    private String codigoMegan;
    
    @Column(name = "descripcion", length = 255)
    private String descripcion;
    
    @Column(name = "fecha_ingreso")
    private Date fechaIngreso;
    
    @Column(name = "costo")
    private BigDecimal costo;
    
    @Column(name = "marca", length = 120)
    private String marca;
    
    @Column(name = "modelo", length = 200)
    private String modelo;
    
    @Column(name = "sn", length = 150)
    private String numeroSerie;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_custodio_actual")
    private Custodio custodioActual;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_ubicacion")
    private Ubicacion ubicacion;
    
    @Column(name = "ultima_actualizacion")
    private Date ultimaActualizacion;
    
    @Column(name = "procesador", length = 150)
    private String procesador;
    
    @Column(name = "ram", length = 100)
    private String ram;
    
    @Column(name = "disco_duro", length = 100)
    private String discoDuro;
    
    @Column(name = "so", length = 100)
    private String sistemaOperativo;
    
    @Column(name = "estado", length = 100)
    private String estado;
    
    @Column(name = "observacion", columnDefinition = "TEXT")
    private String observacion;
    
    @Column(name = "ultimo_mantenimiento")
    private Date ultimoMantenimiento;
    
    @Column(name = "fila_excel")
    private Integer filaExcel;

    // Getters y Setters
    public String getCodigoSbai() {
        return codigoSbai;
    }

    public void setCodigoSbai(String codigoSbai) {
        this.codigoSbai = codigoSbai;
    }

    public String getCodigoSbaiOriginal() {
        return codigoSbaiOriginal;
    }

    public void setCodigoSbaiOriginal(String codigoSbaiOriginal) {
        this.codigoSbaiOriginal = codigoSbaiOriginal;
    }

    public String getCodigoMegan() {
        return codigoMegan;
    }

    public void setCodigoMegan(String codigoMegan) {
        this.codigoMegan = codigoMegan;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Date getFechaIngreso() {
        return fechaIngreso;
    }

    public void setFechaIngreso(Date fechaIngreso) {
        this.fechaIngreso = fechaIngreso;
    }

    public BigDecimal getCosto() {
        return costo;
    }

    public void setCosto(BigDecimal costo) {
        this.costo = costo;
    }

    public String getMarca() {
        return marca;
    }

    public void setMarca(String marca) {
        this.marca = marca;
    }

    public String getModelo() {
        return modelo;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public String getNumeroSerie() {
        return numeroSerie;
    }

    public void setNumeroSerie(String numeroSerie) {
        this.numeroSerie = numeroSerie;
    }

    public Custodio getCustodioActual() {
        return custodioActual;
    }

    public void setCustodioActual(Custodio custodioActual) {
        this.custodioActual = custodioActual;
    }

    public Ubicacion getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(Ubicacion ubicacion) {
        this.ubicacion = ubicacion;
    }

    public Date getUltimaActualizacion() {
        return ultimaActualizacion;
    }

    public void setUltimaActualizacion(Date ultimaActualizacion) {
        this.ultimaActualizacion = ultimaActualizacion;
    }

    public String getProcesador() {
        return procesador;
    }

    public void setProcesador(String procesador) {
        this.procesador = procesador;
    }

    public String getRam() {
        return ram;
    }

    public void setRam(String ram) {
        this.ram = ram;
    }

    public String getDiscoDuro() {
        return discoDuro;
    }

    public void setDiscoDuro(String discoDuro) {
        this.discoDuro = discoDuro;
    }

    public String getSistemaOperativo() {
        return sistemaOperativo;
    }

    public void setSistemaOperativo(String sistemaOperativo) {
        this.sistemaOperativo = sistemaOperativo;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getObservacion() {
        return observacion;
    }

    public void setObservacion(String observacion) {
        this.observacion = observacion;
    }

    public Date getUltimoMantenimiento() {
        return ultimoMantenimiento;
    }

    public void setUltimoMantenimiento(Date ultimoMantenimiento) {
        this.ultimoMantenimiento = ultimoMantenimiento;
    }

    public Integer getFilaExcel() {
        return filaExcel;
    }

    public void setFilaExcel(Integer filaExcel) {
        this.filaExcel = filaExcel;
    }
}
