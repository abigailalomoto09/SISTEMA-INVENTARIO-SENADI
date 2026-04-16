package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.dao.*;
import com.mycompany.sistemainventariov3.model.*;
import java.lang.reflect.Field;
import java.util.List;

/**
 * Servicio para gestión de bienes (Genérico para todos los tipos)
 */
public class BienService {
    
    private PCDAO pcDAO;
    private LaptopDAO laptopDAO;
    private HistoricoService historicoService;
    private CustodioDAO custodioDAO;
    private UbicacionDAO ubicacionDAO;
    
    public BienService() {
        this.pcDAO = new PCDAO();
        this.laptopDAO = new LaptopDAO();
        this.historicoService = new HistoricoService();
        this.custodioDAO = new CustodioDAO();
        this.ubicacionDAO = new UbicacionDAO();
    }
    
    // ==================== PC ====================
    
    /**
     * Crear nuevo PC
     */
    public PC crearPC(PC pc) throws Exception {
        validarCodigosUnicos(pc.getCodigoMegan(), pc.getCodigoSbai(), "pcs");
        pc = pcDAO.guardar(pc);
        historicoService.registrarCambio("pcs", pc.getCodigoSbai(), "REGISTRO", "", "Nuevo equipo registrado", "", "INSERT");
        return pc;
    }
    
    /**
     * Obtener PC por ID
     */
    public PC obtenerPC(String codigoSbai) {
        return pcDAO.buscarPorCodigoSbai(codigoSbai);
    }
    
    /**
     * Actualizar PC con histórico automático
     */
    public PC actualizarPC(PC pcActualizado, String motivo) throws Exception {
        PC pcAnterior = pcDAO.buscarPorCodigoSbai(pcActualizado.getCodigoSbai());
        if (pcAnterior == null) {
            throw new Exception("PC no encontrada");
        }
        
        // Registrar cambios en cada campo
        registrarCambiosEntidad(pcAnterior, pcActualizado, "pcs", motivo);
        
        PC pcActualizada = pcDAO.guardar(pcActualizado);
        return pcActualizada;
    }
    
    /**
     * Eliminar PC
     */
    public void eliminarPC(String codigoSbai) throws Exception {
        PC pc = pcDAO.buscarPorCodigoSbai(codigoSbai);
        if (pc == null) {
            throw new Exception("PC no encontrada");
        }
        historicoService.registrarCambio("pcs", pc.getCodigoSbai(), "ELIMINACION", pc.getCodigoMegan(), "", "", "DELETE");
        pcDAO.eliminar(pc);
    }
    
    /**
     * Listar todas las PCs
     */
    public List<PC> listarPCs() {
        return pcDAO.obtenerTodas();
    }
    
    /**
     * Buscar PCs por estado
     */
    public List<PC> buscarPCsPorEstado(String estado) {
        return pcDAO.buscarPorEstado(estado);
    }
    
    /**
     * Buscar PCs por marca
     */
    public List<PC> buscarPCsPorMarca(String marca) {
        return pcDAO.buscarPorMarca(marca);
    }
    
    // ==================== LAPTOP ====================
    
    /**
     * Crear nuevo Laptop
     */
    public Laptop crearLaptop(Laptop laptop) throws Exception {
        validarCodigosUnicos(laptop.getCodigoMegan(), laptop.getCodigoSbai(), "laptops");
        laptop = laptopDAO.guardar(laptop);
        historicoService.registrarCambio("laptops", laptop.getCodigoSbai(), "REGISTRO", "", "Nuevo equipo registrado", "", "INSERT");
        return laptop;
    }
    
    /**
     * Obtener Laptop por ID
     */
    public Laptop obtenerLaptop(String codigoSbai) {
        return laptopDAO.buscarPorCodigoSbai(codigoSbai);
    }
    
    /**
     * Actualizar Laptop con histórico automático
     */
    public Laptop actualizarLaptop(Laptop laptopActualizado, String motivo) throws Exception {
        Laptop laptopAnterior = laptopDAO.buscarPorCodigoSbai(laptopActualizado.getCodigoSbai());
        if (laptopAnterior == null) {
            throw new Exception("Laptop no encontrada");
        }
        
        // Registrar cambios en cada campo
        registrarCambiosEntidad(laptopAnterior, laptopActualizado, "laptops", motivo);
        
        Laptop laptopActualizada = laptopDAO.guardar(laptopActualizado);
        return laptopActualizada;
    }
    
    /**
     * Eliminar Laptop
     */
    public void eliminarLaptop(String codigoSbai) throws Exception {
        Laptop laptop = laptopDAO.buscarPorCodigoSbai(codigoSbai);
        if (laptop == null) {
            throw new Exception("Laptop no encontrada");
        }
        historicoService.registrarCambio("laptops", laptop.getCodigoSbai(), "ELIMINACION", laptop.getCodigoMegan(), "", "", "DELETE");
        laptopDAO.eliminar(laptop);
    }
    
    /**
     * Listar todas las Laptops
     */
    public List<Laptop> listarLaptops() {
        return laptopDAO.obtenerTodas();
    }
    
    /**
     * Buscar Laptops por estado
     */
    public List<Laptop> buscarLaptopsPorEstado(String estado) {
        return laptopDAO.buscarPorEstado(estado);
    }
    
    /**
     * Buscar Laptops por marca
     */
    public List<Laptop> buscarLaptopsPorMarca(String marca) {
        return laptopDAO.buscarPorMarca(marca);
    }
    
    // ==================== VALIDACIONES Y UTILIDADES ====================
    
    /**
     * Validar que los códigos Megan y SBAI sean únicos
     */
    private void validarCodigosUnicos(String codigoMegan, String codigoSbai, String tabla) throws Exception {
        if ("pcs".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && pcDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe un PC con el Código Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && pcDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe un PC con el Código SBAI: " + codigoSbai);
            }
        } else if ("laptops".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && laptopDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe una Laptop con el Código Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && laptopDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe una Laptop con el Código SBAI: " + codigoSbai);
            }
        }
    }
    
    /**
     * Registrar cambios entre dos versiones de una entidad
     */
    private void registrarCambiosEntidad(Object entidadAntigua, Object entidadNueva, String tabla, String motivo) {
        try {
            Field[] fields = entidadAntigua.getClass().getDeclaredFields();
            
            for (Field field : fields) {
                field.setAccessible(true);
                Object valorAntiguo = field.get(entidadAntigua);
                Object valorNuevo = field.get(entidadNueva);
                
                // Si los valores son diferentes, registrar el cambio
                if ((valorAntiguo == null && valorNuevo != null) ||
                    (valorAntiguo != null && !valorAntiguo.equals(valorNuevo))) {
                    
                    String nombreCampo = field.getName();
                    String valorAntiguoStr = valorAntiguo != null ? valorAntiguo.toString() : "";
                    String valorNuevoStr = valorNuevo != null ? valorNuevo.toString() : "";
                    
                    // Obtener el ID del bien
                    Field idField = entidadAntigua.getClass().getDeclaredField("codigoSbai");
                    idField.setAccessible(true);
                    String idBien = (String) idField.get(entidadAntigua);
                    
                    historicoService.registrarCambio(tabla, idBien, nombreCampo, valorAntiguoStr, valorNuevoStr, motivo, "UPDATE");
                }
            }
        } catch (Exception e) {
            System.err.println("Error al registrar cambios: " + e.getMessage());
        }
    }
}
