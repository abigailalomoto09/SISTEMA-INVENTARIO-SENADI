package com.mycompany.sistemainventariov3.resources;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.mycompany.sistemainventariov3.dto.ApiResponse;
import com.mycompany.sistemainventariov3.dto.InventoryItemDTO;
import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.service.InventarioJdbcService;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * API de inventario sobre el modelo final equipo + tablas hijas.
 */
@Path("inventario")
public class InventarioResource {

    private final InventarioJdbcService inventarioJdbcService = new InventarioJdbcService();
    private final Gson gson = new Gson();

    @GET
    @Path("todos")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listarTodo() {
        try {
            Usuario usuario = validarAutenticacion();
            List<InventoryItemDTO> items = esCustodio(usuario)
                    ? inventarioJdbcService.obtenerInventarioPorCustodio(usuario.getIdCustodio())
                    : inventarioJdbcService.obtenerInventarioCompleto();
            ApiResponse<List<InventoryItemDTO>> response = ApiResponse.success("Inventario completo obtenido", items);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @GET
    @Path("{tipo}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listarPorTipo(@PathParam("tipo") String tipo) {
        try {
            Usuario usuario = validarAutenticacion();
            List<InventoryItemDTO> items = esCustodio(usuario)
                    ? inventarioJdbcService.obtenerInventarioPorTipoYCustodio(tipo, usuario.getIdCustodio())
                    : inventarioJdbcService.obtenerInventarioPorTipo(tipo);
            ApiResponse<List<InventoryItemDTO>> response = ApiResponse.success("Inventario filtrado obtenido", items);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @GET
    @Path("campos")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerCamposFormulario() {
        try {
            validarAutenticacion();
            Map<String, Object> catalogo = inventarioJdbcService.obtenerCatalogoCamposFormulario();
            ApiResponse<Map<String, Object>> response = ApiResponse.success("Catalogo de campos obtenido", catalogo);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @GET
    @Path("custodios")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listarCustodios(@QueryParam("q") String query, @QueryParam("limit") Integer limit) {
        try {
            validarAutenticacion();
            List<Map<String, Object>> custodios = inventarioJdbcService.obtenerCustodiosActivos(query, limit);
            ApiResponse<List<Map<String, Object>>> response = ApiResponse.success("Custodios obtenidos", custodios);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @GET
    @Path("ubicaciones")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listarUbicaciones(@QueryParam("q") String query, @QueryParam("limit") Integer limit) {
        try {
            validarAutenticacion();
            List<Map<String, Object>> ubicaciones = inventarioJdbcService.obtenerUbicaciones(query, limit);
            ApiResponse<List<Map<String, Object>>> response = ApiResponse.success("Ubicaciones obtenidas", ubicaciones);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @GET
    @Path("catalogos/{campo}")
    @Produces(MediaType.APPLICATION_JSON)
    public Response listarCatalogo(@PathParam("campo") String campo, @QueryParam("q") String query, @QueryParam("limit") Integer limit) {
        try {
            validarAutenticacion();
            List<String> valores = inventarioJdbcService.obtenerValoresDistintos(campo, query, limit);
            ApiResponse<List<String>> response = ApiResponse.success("Catalogo obtenido", valores);
            return Response.ok(gson.toJson(response)).build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> resp = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @PUT
    @Path("{id}/custodio")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response actualizarCustodio(@PathParam("id") Integer idEquipo, String json) {
        try {
            Usuario usuario = validarAutenticacion();
            validarRoles(usuario, "ADMINISTRADOR", "TECNICO");

            Map<String, Object> payload = gson.fromJson(json, new TypeToken<Map<String, Object>>() {}.getType());
            if (payload == null) {
                payload = Collections.emptyMap();
            }
            Integer idCustodioNuevo = leerEntero(payload.get("idCustodio"));
            if (idCustodioNuevo == null) {
                idCustodioNuevo = leerEntero(payload.get("custodioId"));
            }
            if (idCustodioNuevo == null) {
                ApiResponse<?> resp = ApiResponse.error("VALIDATION_ERROR", "El id del custodio es obligatorio.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
            }

            boolean registrarAuditoria = "TECNICO".equals(usuario.getRol());
            InventoryItemDTO item = inventarioJdbcService.actualizarCustodioEquipo(
                    idEquipo,
                    idCustodioNuevo,
                    usuario.getUsuario(),
                    usuario.getRol(),
                    registrarAuditoria
            );

            ApiResponse<InventoryItemDTO> response = ApiResponse.success("Custodio actualizado correctamente", item);
            return Response.ok(gson.toJson(response)).build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> resp = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        } catch (SecurityException e) {
            ApiResponse<?> resp = ApiResponse.error("FORBIDDEN", e.getMessage());
            return Response.status(Response.Status.FORBIDDEN).entity(gson.toJson(resp)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @PUT
    @Path("{id}/estado")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response actualizarEstado(@PathParam("id") Integer idEquipo, String json) {
        try {
            Usuario usuario = validarAutenticacion();
            validarRoles(usuario, "ADMINISTRADOR");

            Map<String, Object> payload = gson.fromJson(json, new TypeToken<Map<String, Object>>() {}.getType());
            if (payload == null) {
                payload = Collections.emptyMap();
            }
            String estado = payload != null && payload.get("estado") != null ? String.valueOf(payload.get("estado")) : "";
            InventoryItemDTO item = inventarioJdbcService.actualizarEstadoEquipo(idEquipo, estado);
            ApiResponse<InventoryItemDTO> response = ApiResponse.success("Estado actualizado correctamente", item);
            return Response.ok(gson.toJson(response)).build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> resp = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        } catch (SecurityException e) {
            ApiResponse<?> resp = ApiResponse.error("FORBIDDEN", e.getMessage());
            return Response.status(Response.Status.FORBIDDEN).entity(gson.toJson(resp)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @GET
    @Path("{id}/historial")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerHistorialEquipo(@PathParam("id") Integer idEquipo) {
        try {
            Usuario usuario = validarAutenticacion();
            if (esCustodio(usuario)) {
                if (usuario.getIdCustodio() == null ||
                        !inventarioJdbcService.equipoPerteneceACustodio(idEquipo, usuario.getIdCustodio())) {
                    ApiResponse<?> resp = ApiResponse.error("FORBIDDEN", "No tiene permiso para ver este historial.");
                    return Response.status(Response.Status.FORBIDDEN).entity(gson.toJson(resp)).build();
                }
            }

            List<Map<String, Object>> historial = inventarioJdbcService.obtenerHistorialEquipo(idEquipo);
            ApiResponse<List<Map<String, Object>>> response = ApiResponse.success("Historial obtenido", historial);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            return errorInterno(e);
        }
    }

    @PUT
    @Path("{tipo}/{id}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response actualizar(@PathParam("tipo") String tipo, @PathParam("id") String id, String json) {
        try {
            validarAutenticacion();
            ApiResponse<?> response = ApiResponse.error(
                    "NOT_IMPLEMENTED",
                    "La edicion del modelo final aun no esta habilitada desde este endpoint.");
            return Response.status(Response.Status.NOT_IMPLEMENTED).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.UNAUTHORIZED).entity(gson.toJson(resp)).build();
        }
    }

    @POST
    @Path("{tipo}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response crear(@PathParam("tipo") String tipo, String json) {
        try {
            Usuario usuario = validarAutenticacion();
            validarRoles(usuario, "ADMINISTRADOR");

            Map<String, Object> payload = gson.fromJson(json, new TypeToken<Map<String, Object>>() {}.getType());
            InventoryItemDTO creado = inventarioJdbcService.crearEquipo(tipo, payload);
            ApiResponse<InventoryItemDTO> response = ApiResponse.success("Equipo creado correctamente", creado);
            return Response.status(Response.Status.CREATED).entity(gson.toJson(response)).build();
        } catch (SecurityException e) {
            ApiResponse<?> resp = ApiResponse.error("FORBIDDEN", e.getMessage());
            return Response.status(Response.Status.FORBIDDEN).entity(gson.toJson(resp)).build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> resp = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(resp)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }

    private Response errorInterno(Exception e) {
        System.err.println("[InventarioResource] Error: " + e.getMessage());
        e.printStackTrace();
        ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
    }

    private Usuario validarAutenticacion() throws Exception {
        Usuario usuario = SesionUsuario.getUsuarioActual();
        if (usuario == null) {
            throw new Exception("Usuario no autenticado");
        }
        return usuario;
    }

    private void validarRoles(Usuario usuario, String... rolesPermitidos) {
        for (String rol : rolesPermitidos) {
            if (rol.equals(usuario.getRol())) {
                return;
            }
        }
        throw new SecurityException("Permisos insuficientes");
    }

    private boolean esCustodio(Usuario usuario) {
        return usuario != null && "CUSTODIO".equals(usuario.getRol());
    }

    private Integer leerEntero(Object value) {
        if (value == null) {
            return null;
        }
        String texto = String.valueOf(value).trim();
        if (texto.isEmpty()) {
            return null;
        }
        return Integer.parseInt(texto);
    }
}
