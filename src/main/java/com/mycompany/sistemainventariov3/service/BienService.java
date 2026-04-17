package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.dao.*;
import com.mycompany.sistemainventariov3.model.*;
import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Servicio para gestión de bienes (Genérico para todos los tipos)
 */
public class BienService {
    
    private PCDAO pcDAO;
    private LaptopDAO laptopDAO;
    private TelefonoDAO telefonoDAO;
    private EscanerDAO escanerDAO;
    private ImpresoraDAO impresoraDAO;
    private ProyectorDAO proyectorDAO;
    private HistoricoService historicoService;
    private CustodioDAO custodioDAO;
    private UbicacionDAO ubicacionDAO;
    
    public BienService() {
        this.pcDAO = new PCDAO();
        this.laptopDAO = new LaptopDAO();
        this.telefonoDAO = new TelefonoDAO();
        this.escanerDAO = new EscanerDAO();
        this.impresoraDAO = new ImpresoraDAO();
        this.proyectorDAO = new ProyectorDAO();
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
    
    // ==================== TELEFONO ====================

    public Telefono crearTelefono(Telefono telefono) throws Exception {
        validarCodigosUnicos(telefono.getCodigoMegan(), telefono.getCodigoSbaiOriginal(), "telefonos");
        if (telefono.getEstado() == null || telefono.getEstado().isEmpty()) {
            telefono.setEstado("OPERATIVO");
        }
        telefono = telefonoDAO.guardar(telefono);
        historicoService.registrarCambio("telefonos", telefono.getCodigoSbaiOriginal(), "REGISTRO", "", "Nuevo equipo registrado", "", "INSERT");
        return telefono;
    }

    public Telefono obtenerTelefono(String codigoSbai) {
        return telefonoDAO.buscarPorCodigoSbai(codigoSbai);
    }

    public Telefono actualizarTelefono(Telefono telefonoActualizado, String motivo) throws Exception {
        Telefono telefonoAnterior = telefonoDAO.buscarPorCodigoSbai(telefonoActualizado.getCodigoSbaiOriginal());
        if (telefonoAnterior == null) {
            throw new Exception("Telefono no encontrado");
        }
        registrarCambiosEntidad(telefonoAnterior, telefonoActualizado, "telefonos", motivo);
        return telefonoDAO.guardar(telefonoActualizado);
    }

    public void eliminarTelefono(String codigoSbai) throws Exception {
        Telefono telefono = telefonoDAO.buscarPorCodigoSbai(codigoSbai);
        if (telefono == null) {
            throw new Exception("Telefono no encontrado");
        }
        historicoService.registrarCambio("telefonos", telefono.getCodigoSbaiOriginal(), "ELIMINACION", telefono.getCodigoMegan(), "", "", "DELETE");
        telefonoDAO.eliminar(telefono);
    }

    public List<Telefono> listarTelefonos() {
        return telefonoDAO.obtenerTodas();
    }

    public List<Telefono> buscarTelefonosPorEstado(String estado) {
        return telefonoDAO.buscarPorEstado(estado);
    }

    // ==================== ESCANER ====================

    public Escaner crearEscaner(Escaner escaner) throws Exception {
        validarCodigosUnicos(escaner.getCodigoMegan(), escaner.getCodigoSbaiOriginal(), "escaners");
        if (escaner.getEstado() == null || escaner.getEstado().isEmpty()) {
            escaner.setEstado("OPERATIVO");
        }
        escaner = escanerDAO.guardar(escaner);
        historicoService.registrarCambio("escaners", escaner.getCodigoSbaiOriginal(), "REGISTRO", "", "Nuevo equipo registrado", "", "INSERT");
        return escaner;
    }

    public Escaner obtenerEscaner(String codigoSbai) {
        return escanerDAO.buscarPorCodigoSbai(codigoSbai);
    }

    public Escaner actualizarEscaner(Escaner escanerActualizado, String motivo) throws Exception {
        Escaner escanerAnterior = escanerDAO.buscarPorCodigoSbai(escanerActualizado.getCodigoSbaiOriginal());
        if (escanerAnterior == null) {
            throw new Exception("Escaner no encontrado");
        }
        registrarCambiosEntidad(escanerAnterior, escanerActualizado, "escaners", motivo);
        return escanerDAO.guardar(escanerActualizado);
    }

    public void eliminarEscaner(String codigoSbai) throws Exception {
        Escaner escaner = escanerDAO.buscarPorCodigoSbai(codigoSbai);
        if (escaner == null) {
            throw new Exception("Escaner no encontrado");
        }
        historicoService.registrarCambio("escaners", escaner.getCodigoSbaiOriginal(), "ELIMINACION", escaner.getCodigoMegan(), "", "", "DELETE");
        escanerDAO.eliminar(escaner);
    }

    public List<Escaner> listarEscaners() {
        return escanerDAO.obtenerTodas();
    }

    public List<Escaner> buscarEscanersPorEstado(String estado) {
        return escanerDAO.buscarPorEstado(estado);
    }

    // ==================== IMPRESORA ====================

    public Impresora crearImpresora(Impresora impresora) throws Exception {
        validarCodigosUnicos(impresora.getCodigoMegan(), impresora.getCodigoSbaiOriginal(), "impresoras");
        if (impresora.getEstado() == null || impresora.getEstado().isEmpty()) {
            impresora.setEstado("OPERATIVO");
        }
        impresora = impresoraDAO.guardar(impresora);
        historicoService.registrarCambio("impresoras", impresora.getCodigoSbaiOriginal(), "REGISTRO", "", "Nuevo equipo registrado", "", "INSERT");
        return impresora;
    }

    public Impresora obtenerImpresora(String codigoSbai) {
        return impresoraDAO.buscarPorCodigoSbai(codigoSbai);
    }

    public Impresora actualizarImpresora(Impresora impresoraActualizada, String motivo) throws Exception {
        Impresora impresoraAnterior = impresoraDAO.buscarPorCodigoSbai(impresoraActualizada.getCodigoSbaiOriginal());
        if (impresoraAnterior == null) {
            throw new Exception("Impresora no encontrada");
        }
        registrarCambiosEntidad(impresoraAnterior, impresoraActualizada, "impresoras", motivo);
        return impresoraDAO.guardar(impresoraActualizada);
    }

    public void eliminarImpresora(String codigoSbai) throws Exception {
        Impresora impresora = impresoraDAO.buscarPorCodigoSbai(codigoSbai);
        if (impresora == null) {
            throw new Exception("Impresora no encontrada");
        }
        historicoService.registrarCambio("impresoras", impresora.getCodigoSbaiOriginal(), "ELIMINACION", impresora.getCodigoMegan(), "", "", "DELETE");
        impresoraDAO.eliminar(impresora);
    }

    public List<Impresora> listarImpresoras() {
        return impresoraDAO.obtenerTodas();
    }

    public List<Impresora> buscarImpresorasPorEstado(String estado) {
        return impresoraDAO.buscarPorEstado(estado);
    }

    // ==================== PROYECTOR ====================

    public Proyector crearProyector(Proyector proyector) throws Exception {
        validarCodigosUnicos(proyector.getCodigoMegan(), proyector.getCodigoSbaiOriginal(), "proyectores");
        if (proyector.getEstado() == null || proyector.getEstado().isEmpty()) {
            proyector.setEstado("OPERATIVO");
        }
        proyector = proyectorDAO.guardar(proyector);
        historicoService.registrarCambio("proyectores", proyector.getCodigoSbaiOriginal(), "REGISTRO", "", "Nuevo equipo registrado", "", "INSERT");
        return proyector;
    }

    public Proyector obtenerProyector(String codigoSbai) {
        return proyectorDAO.buscarPorCodigoSbai(codigoSbai);
    }

    public Proyector actualizarProyector(Proyector proyectorActualizado, String motivo) throws Exception {
        Proyector proyectorAnterior = proyectorDAO.buscarPorCodigoSbai(proyectorActualizado.getCodigoSbaiOriginal());
        if (proyectorAnterior == null) {
            throw new Exception("Proyector no encontrado");
        }
        registrarCambiosEntidad(proyectorAnterior, proyectorActualizado, "proyectores", motivo);
        return proyectorDAO.guardar(proyectorActualizado);
    }

    public void eliminarProyector(String codigoSbai) throws Exception {
        Proyector proyector = proyectorDAO.buscarPorCodigoSbai(codigoSbai);
        if (proyector == null) {
            throw new Exception("Proyector no encontrado");
        }
        historicoService.registrarCambio("proyectores", proyector.getCodigoSbaiOriginal(), "ELIMINACION", proyector.getCodigoMegan(), "", "", "DELETE");
        proyectorDAO.eliminar(proyector);
    }

    public List<Proyector> listarProyectores() {
        return proyectorDAO.obtenerTodas();
    }

    public List<Proyector> buscarProyectoresPorEstado(String estado) {
        return proyectorDAO.buscarPorEstado(estado);
    }

    // ==================== CATEGORIAS Y METADATOS ====================

    public Map<String, Object> obtenerCategorias() {
        Map<String, Object> categorias = new HashMap<>();

        List<Map<String, String>> pcsFields = new ArrayList<>();
        pcsFields.add(createFieldMeta("codigoSbaiOriginal", "Codigo SBAI", "text"));
        pcsFields.add(createFieldMeta("codigoMegan", "Codigo Megan", "text"));
        pcsFields.add(createFieldMeta("descripcion", "Descripcion", "text"));
        pcsFields.add(createFieldMeta("ip", "IP", "text"));
        pcsFields.add(createFieldMeta("marca", "Marca", "text"));
        pcsFields.add(createFieldMeta("modelo", "Modelo", "text"));
        pcsFields.add(createFieldMeta("numeroSerie", "Numero de Serie", "text"));
        pcsFields.add(createFieldMeta("custodio", "Custodio", "text"));
        pcsFields.add(createFieldMeta("ubicacion", "Ubicacion", "text"));
        pcsFields.add(createFieldMeta("procesador", "Procesador", "text"));
        pcsFields.add(createFieldMeta("ram", "RAM", "text"));
        pcsFields.add(createFieldMeta("discoDuro", "Disco Duro", "text"));
        pcsFields.add(createFieldMeta("sistemaOperativo", "Sistema Operativo", "text"));
        pcsFields.add(createFieldMeta("estado", "Estado", "select"));
        pcsFields.add(createFieldMeta("observacion", "Observacion", "textarea"));
        categorias.put("pcs", createCategoryMeta("Desktop", pcsFields));

        List<Map<String, String>> laptopsFields = new ArrayList<>(pcsFields);
        categorias.put("laptops", createCategoryMeta("Laptop", laptopsFields));

        List<Map<String, String>> telefonosFields = new ArrayList<>();
        telefonosFields.add(createFieldMeta("codigoSbaiOriginal", "Codigo SBAI", "text"));
        telefonosFields.add(createFieldMeta("codigoMegan", "Codigo Megan", "text"));
        telefonosFields.add(createFieldMeta("descripcion", "Descripcion", "text"));
        telefonosFields.add(createFieldMeta("marca", "Marca", "text"));
        telefonosFields.add(createFieldMeta("modelo", "Modelo", "text"));
        telefonosFields.add(createFieldMeta("numeroSerie", "Numero de Serie", "text"));
        telefonosFields.add(createFieldMeta("custodio", "Custodio", "text"));
        telefonosFields.add(createFieldMeta("ubicacion", "Ubicacion", "text"));
        telefonosFields.add(createFieldMeta("caracteristicas", "Caracteristicas", "textarea"));
        telefonosFields.add(createFieldMeta("estado", "Estado", "select"));
        telefonosFields.add(createFieldMeta("observacion", "Observacion", "textarea"));
        categorias.put("telefonos", createCategoryMeta("Telefonos", telefonosFields));

        List<Map<String, String>> escanersFields = new ArrayList<>(telefonosFields);
        categorias.put("escaners", createCategoryMeta("Escanners", escanersFields));

        List<Map<String, String>> impresorasFields = new ArrayList<>();
        impresorasFields.add(createFieldMeta("codigoSbaiOriginal", "Codigo SBAI", "text"));
        impresorasFields.add(createFieldMeta("codigoMegan", "Codigo Megan", "text"));
        impresorasFields.add(createFieldMeta("descripcion", "Descripcion", "text"));
        impresorasFields.add(createFieldMeta("marca", "Marca", "text"));
        impresorasFields.add(createFieldMeta("modelo", "Modelo", "text"));
        impresorasFields.add(createFieldMeta("numeroSerie", "Numero de Serie", "text"));
        impresorasFields.add(createFieldMeta("custodio", "Custodio", "text"));
        impresorasFields.add(createFieldMeta("ubicacion", "Ubicacion", "text"));
        impresorasFields.add(createFieldMeta("ip", "IP", "text"));
        impresorasFields.add(createFieldMeta("caracteristicas", "Caracteristicas", "textarea"));
        impresorasFields.add(createFieldMeta("estado", "Estado", "select"));
        impresorasFields.add(createFieldMeta("observacion", "Observacion", "textarea"));
        categorias.put("impresoras", createCategoryMeta("Impresoras", impresorasFields));

        List<Map<String, String>> proyectoresFields = new ArrayList<>();
        proyectoresFields.add(createFieldMeta("codigoSbaiOriginal", "Codigo SBAI", "text"));
        proyectoresFields.add(createFieldMeta("codigoMegan", "Codigo Megan", "text"));
        proyectoresFields.add(createFieldMeta("descripcion", "Descripcion", "text"));
        proyectoresFields.add(createFieldMeta("marca", "Marca", "text"));
        proyectoresFields.add(createFieldMeta("modelo", "Modelo", "text"));
        proyectoresFields.add(createFieldMeta("numeroSerie", "Numero de Serie", "text"));
        proyectoresFields.add(createFieldMeta("custodio", "Custodio Actual", "text"));
        proyectoresFields.add(createFieldMeta("custodioAnterior", "Custodio Anterior", "text"));
        proyectoresFields.add(createFieldMeta("ubicacion", "Ubicacion", "text"));
        proyectoresFields.add(createFieldMeta("caracteristicas", "Caracteristicas", "textarea"));
        proyectoresFields.add(createFieldMeta("estado", "Estado", "select"));
        proyectoresFields.add(createFieldMeta("observacion", "Observacion", "textarea"));
        proyectoresFields.add(createFieldMeta("actaUgdt", "Acta UGDT", "text"));
        proyectoresFields.add(createFieldMeta("actaUgad", "Acta UGAD", "text"));
        proyectoresFields.add(createFieldMeta("anotaciones", "Anotaciones", "textarea"));
        categorias.put("proyectores", createCategoryMeta("Proyectores", proyectoresFields));

        return categorias;
    }

    private Map<String, Object> createCategoryMeta(String label, List<Map<String, String>> fields) {
        Map<String, Object> meta = new HashMap<>();
        meta.put("label", label);
        meta.put("fields", fields);
        return meta;
    }

    private Map<String, String> createFieldMeta(String key, String label, String type) {
        Map<String, String> field = new HashMap<>();
        field.put("key", key);
        field.put("label", label);
        field.put("type", type);
        return field;
    }

    // ==================== VALIDACIONES Y UTILIDADES ====================
    
    /**
     * Validar que los códigos Megan y SBAI sean únicos
     */
    private void validarCodigosUnicos(String codigoMegan, String codigoSbai, String tabla) throws Exception {
        if ("pcs".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && pcDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe un PC con el Codigo Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && pcDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe un PC con el Codigo SBAI: " + codigoSbai);
            }
        } else if ("laptops".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && laptopDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe una Laptop con el Codigo Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && laptopDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe una Laptop con el Codigo SBAI: " + codigoSbai);
            }
        } else if ("telefonos".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && telefonoDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe un Telefono con el Codigo Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && telefonoDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe un Telefono con el Codigo SBAI: " + codigoSbai);
            }
        } else if ("escaners".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && escanerDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe un Escaner con el Codigo Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && escanerDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe un Escaner con el Codigo SBAI: " + codigoSbai);
            }
        } else if ("impresoras".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && impresoraDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe una Impresora con el Codigo Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && impresoraDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe una Impresora con el Codigo SBAI: " + codigoSbai);
            }
        } else if ("proyectores".equals(tabla)) {
            if (codigoMegan != null && !codigoMegan.isEmpty() && proyectorDAO.buscarPorCodigoMegan(codigoMegan) != null) {
                throw new Exception("Ya existe un Proyector con el Codigo Megan: " + codigoMegan);
            }
            if (codigoSbai != null && !codigoSbai.isEmpty() && proyectorDAO.buscarPorCodigoSbai(codigoSbai) != null) {
                throw new Exception("Ya existe un Proyector con el Codigo SBAI: " + codigoSbai);
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
