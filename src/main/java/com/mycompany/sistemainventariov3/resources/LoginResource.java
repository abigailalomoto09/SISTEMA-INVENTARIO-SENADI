package com.mycompany.sistemainventariov3.resources;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.mycompany.sistemainventariov3.dto.LoginRequest;
import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.service.UsuarioService;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.*;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

/**
 * Controlador REST para autenticación de usuarios
 * Usuarios quemados: admin/admin123, tecnico/tecnico123
 */
@Path("login")
public class LoginResource {
    
    @Context
    private HttpServletRequest request;

    private UsuarioService usuarioService;
    private Gson gson = new Gson();
    
    public LoginResource() {
        this.usuarioService = new UsuarioService();
        System.out.println("[LoginResource] ✓ Inicializado correctamente");
    }
    
    /**
     * Endpoint para autenticar usuario
     * POST /resources/login
     */
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response autenticar(String json) {
        System.out.println("[LoginResource.autenticar] POST recibido: " + json);
        try {
            // Parsear JSON
            LoginRequest loginRequest = gson.fromJson(json, LoginRequest.class);
            System.out.println("[LoginResource] Intentando autenticar: " + loginRequest.getUsername());
            
            // Autenticar
            Usuario usuario = usuarioService.autenticar(loginRequest.getUsername(), loginRequest.getPassword());
            SesionUsuario.setUsuarioActual(request, usuario);
            System.out.println("[LoginResource] ✓ Autenticación exitosa para: " + usuario.getUsuario());
            
            // Preparar respuesta
            JsonObject usuarioResponse = new JsonObject();
            usuarioResponse.addProperty("usuario", usuario.getUsuario());
            usuarioResponse.addProperty("rol", usuario.getRol());
            
            // Agregar permisos según el rol
            JsonObject permisos = new JsonObject();
            if ("ADMINISTRADOR".equals(usuario.getRol())) {
                permisos.addProperty("puedeEditarTodos", true);
                permisos.addProperty("puedeActualizarEstado", true);
                permisos.addProperty("puedeVer", true);
                permisos.addProperty("puedeCrearEquipo", true);
                permisos.addProperty("puedeEditarCustodio", true);
                permisos.addProperty("puedeGenerarReportes", true);
            } else if ("TECNICO".equals(usuario.getRol())) {
                permisos.addProperty("puedeEditarTodos", false);
                permisos.addProperty("puedeActualizarEstado", false);
                permisos.addProperty("puedeVer", true);
                permisos.addProperty("puedeCrearEquipo", false);
                permisos.addProperty("puedeEditarCustodio", true);
                permisos.addProperty("puedeGenerarReportes", false);
            }
            usuarioResponse.add("permisos", permisos);
            
            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("message", "Autenticación exitosa");
            response.add("data", usuarioResponse);
            
            return Response.ok(response.toString()).build();
            
        } catch (Exception e) {
            System.err.println("[LoginResource] ✗ Error de autenticación: " + e.getMessage());
            
            JsonObject errorResponse = new JsonObject();
            errorResponse.addProperty("success", false);
            errorResponse.addProperty("error", "AUTH_ERROR");
            errorResponse.addProperty("message", e.getMessage() != null ? e.getMessage() : "Error desconocido");
            
            return Response.status(Response.Status.UNAUTHORIZED).entity(errorResponse.toString()).build();
        }
    }
    
    /**
     * Endpoint para obtener usuario actual
     * GET /resources/login/actual
     */
    @GET
    @Path("actual")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerUsuarioActual() {
        try {
            Usuario usuario = SesionUsuario.getUsuarioActual(request);
            
            if (usuario == null) {
                JsonObject errorResponse = new JsonObject();
                errorResponse.addProperty("success", false);
                errorResponse.addProperty("error", "NOT_AUTHENTICATED");
                errorResponse.addProperty("message", "No hay usuario autenticado");
                return Response.status(Response.Status.UNAUTHORIZED).entity(errorResponse.toString()).build();
            }
            
            JsonObject usuarioResponse = new JsonObject();
            usuarioResponse.addProperty("usuario", usuario.getUsuario());
            usuarioResponse.addProperty("rol", usuario.getRol());
            
            // Agregar permisos según el rol
            JsonObject permisos = new JsonObject();
            if ("ADMINISTRADOR".equals(usuario.getRol())) {
                permisos.addProperty("puedeEditarTodos", true);
                permisos.addProperty("puedeActualizarEstado", true);
                permisos.addProperty("puedeVer", true);
                permisos.addProperty("puedeCrearEquipo", true);
                permisos.addProperty("puedeEditarCustodio", true);
                permisos.addProperty("puedeGenerarReportes", true);
            } else if ("TECNICO".equals(usuario.getRol())) {
                permisos.addProperty("puedeEditarTodos", false);
                permisos.addProperty("puedeActualizarEstado", false);
                permisos.addProperty("puedeVer", true);
                permisos.addProperty("puedeCrearEquipo", false);
                permisos.addProperty("puedeEditarCustodio", true);
                permisos.addProperty("puedeGenerarReportes", false);
            }
            usuarioResponse.add("permisos", permisos);
            
            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("message", "Usuario actual obtenido");
            response.add("data", usuarioResponse);
            
            return Response.ok(response.toString()).build();
        } catch (Exception e) {
            JsonObject errorResponse = new JsonObject();
            errorResponse.addProperty("success", false);
            errorResponse.addProperty("error", "ERROR");
            errorResponse.addProperty("message", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse.toString()).build();
        }
    }
    
    /**
     * Endpoint para cerrar sesión
     * POST /resources/login/logout
     */
    @POST
    @Path("logout")
    @Produces(MediaType.APPLICATION_JSON)
    public Response logout() {
        try {
            SesionUsuario.limpiar(request);
            
            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("message", "Sesión cerrada exitosamente");
            
            return Response.ok(response.toString()).build();
        } catch (Exception e) {
            JsonObject errorResponse = new JsonObject();
            errorResponse.addProperty("success", false);
            errorResponse.addProperty("error", "ERROR");
            errorResponse.addProperty("message", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse.toString()).build();
        }
    }
}
