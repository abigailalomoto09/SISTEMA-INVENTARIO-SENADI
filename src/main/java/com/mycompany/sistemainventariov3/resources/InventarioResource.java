package com.mycompany.sistemainventariov3.resources;

import com.google.gson.Gson;
import com.mycompany.sistemainventariov3.dto.ApiResponse;
import com.mycompany.sistemainventariov3.model.Laptop;
import com.mycompany.sistemainventariov3.model.PC;
import com.mycompany.sistemainventariov3.service.BienService;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controlador REST para gestión del inventario de bienes
 */
@Path("inventario")
public class InventarioResource {
    
    private BienService bienService = new BienService();
    private Gson gson = new Gson();
    
    // ==================== PCs ====================
    
    /**
     * Listar todas las PCs
     * GET /resources/inventario/pcs
     */
    @GET
    @Path("pcs")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listarPCs() {
        try {
            List<PC> pcs = bienService.listarPCs();
            ApiResponse<List<PC>> response = ApiResponse.success("Listado de PCs obtenido", pcs);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            System.err.println("[InventarioResource.listarPCs] Error: " + e.getMessage());
            e.printStackTrace();
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Obtener PC por código SBAI
     * GET /resources/inventario/pcs/{codigoSbai}
     */
    @GET
    @Path("pcs/{codigoSbai}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerPC(@PathParam("codigoSbai") String codigoSbai) {
        try {
            PC pc = bienService.obtenerPC(codigoSbai);
            if (pc == null) {
                ApiResponse<?> resp = ApiResponse.error("NOT_FOUND", "PC no encontrada");
                return Response.status(Response.Status.NOT_FOUND).entity(gson.toJson(resp)).build();
            }
            ApiResponse<PC> response = ApiResponse.success("PC obtenida", pc);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            System.err.println("[InventarioResource.obtenerPC] Error: " + e.getMessage());
            e.printStackTrace();
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Crear nueva PC
     * POST /resources/inventario/pcs
     */
    @POST
    @Path("pcs")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response crearPC(String json) {
        try {
            validarAutenticacion();
            validarAdministrador();
            
            PC pc = gson.fromJson(json, PC.class);
            PC pcCreada = bienService.crearPC(pc);
            
            ApiResponse<PC> response = ApiResponse.success("PC creada exitosamente", pcCreada);
            return Response.status(Response.Status.CREATED).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Actualizar PC
     * PUT /resources/inventario/pcs/{codigoSbai}
     */
    @PUT
    @Path("pcs/{codigoSbai}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response actualizarPC(@PathParam("codigoSbai") String codigoSbai, String json) {
        try {
            validarAutenticacion();
            validarAdministrador();
            
            PC pcActualizada = gson.fromJson(json, PC.class);
            pcActualizada.setCodigoSbai(codigoSbai);
            
            // Obtener motivo de la actualización desde headers o JSON
            String motivo = "";
            
            PC pc = bienService.actualizarPC(pcActualizada, motivo);
            
            ApiResponse<PC> response = ApiResponse.success("PC actualizada exitosamente", pc);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Eliminar PC
     * DELETE /resources/inventario/pcs/{codigoSbai}
     */
    @DELETE
    @Path("pcs/{codigoSbai}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response eliminarPC(@PathParam("codigoSbai") String codigoSbai) {
        try {
            validarAutenticacion();
            validarAdministrador();
            
            bienService.eliminarPC(codigoSbai);
            
            ApiResponse<?> response = ApiResponse.success("PC eliminada exitosamente");
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }
    
    // ==================== LAPTOPS ====================
    
    /**
     * Listar todas las Laptops
     * GET /resources/inventario/laptops
     */
    @GET
    @Path("laptops")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listarLaptops() {
        try {
            List<Laptop> laptops = bienService.listarLaptops();
            ApiResponse<List<Laptop>> response = ApiResponse.success("Listado de Laptops obtenido", laptops);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            System.err.println("[InventarioResource.listarLaptops] Error: " + e.getMessage());
            e.printStackTrace();
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Obtener Laptop por código SBAI
     * GET /resources/inventario/laptops/{codigoSbai}
     */
    @GET
    @Path("laptops/{codigoSbai}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerLaptop(@PathParam("codigoSbai") String codigoSbai) {
        try {
            Laptop laptop = bienService.obtenerLaptop(codigoSbai);
            if (laptop == null) {
                ApiResponse<?> resp = ApiResponse.error("NOT_FOUND", "Laptop no encontrada");
                return Response.status(Response.Status.NOT_FOUND).entity(gson.toJson(resp)).build();
            }
            ApiResponse<Laptop> response = ApiResponse.success("Laptop obtenida", laptop);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            System.err.println("[InventarioResource.obtenerLaptop] Error: " + e.getMessage());
            e.printStackTrace();
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Crear nueva Laptop
     * POST /resources/inventario/laptops
     */
    @POST
    @Path("laptops")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response crearLaptop(String json) {
        try {
            validarAutenticacion();
            validarAdministrador();
            
            Laptop laptop = gson.fromJson(json, Laptop.class);
            Laptop laptopCreada = bienService.crearLaptop(laptop);
            
            ApiResponse<Laptop> response = ApiResponse.success("Laptop creada exitosamente", laptopCreada);
            return Response.status(Response.Status.CREATED).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Actualizar Laptop
     * PUT /resources/inventario/laptops/{codigoSbai}
     */
    @PUT
    @Path("laptops/{codigoSbai}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response actualizarLaptop(@PathParam("codigoSbai") String codigoSbai, String json) {
        try {
            validarAutenticacion();
            validarAdministrador();
            
            Laptop laptopActualizada = gson.fromJson(json, Laptop.class);
            laptopActualizada.setCodigoSbai(codigoSbai);
            
            String motivo = "";
            Laptop laptop = bienService.actualizarLaptop(laptopActualizada, motivo);
            
            ApiResponse<Laptop> response = ApiResponse.success("Laptop actualizada exitosamente", laptop);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Eliminar Laptop
     * DELETE /resources/inventario/laptops/{codigoSbai}
     */
    @DELETE
    @Path("laptops/{codigoSbai}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response eliminarLaptop(@PathParam("codigoSbai") String codigoSbai) {
        try {
            validarAutenticacion();
            validarAdministrador();
            
            bienService.eliminarLaptop(codigoSbai);
            
            ApiResponse<?> response = ApiResponse.success("Laptop eliminada exitosamente");
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }
    
    // ==================== VALIDACIONES ====================
    
    private void validarAutenticacion() throws Exception {
        if (!SesionUsuario.estaAutenticado()) {
            throw new Exception("Usuario no autenticado");
        }
    }
    
    private void validarAdministrador() throws Exception {
        if (!SesionUsuario.esAdministrador()) {
            throw new Exception("Permisos insuficientes. Se requiere rol de Administrador");
        }
    }
}
