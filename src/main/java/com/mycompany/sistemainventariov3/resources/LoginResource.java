package com.mycompany.sistemainventariov3.resources;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.mycompany.sistemainventariov3.dto.LoginRequest;
import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.service.UsuarioService;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

import javax.servlet.http.HttpServletRequest;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

/**
 * Controlador REST para autenticacion de usuarios.
 */
@Path("login")
public class LoginResource {

    @Context
    private HttpServletRequest request;

    private final UsuarioService usuarioService;
    private final Gson gson = new Gson();

    public LoginResource() {
        this.usuarioService = new UsuarioService();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    public Response autenticar(String json) {
        try {
            LoginRequest loginRequest = gson.fromJson(json, LoginRequest.class);
            String rol = loginRequest.getRolSeleccionado();
            Usuario usuario = usuarioService.autenticar(loginRequest.getUsername(), loginRequest.getPassword(), rol);
            SesionUsuario.setUsuarioActual(request, usuario);

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("message", "Autenticacion exitosa");
            response.add("data", construirUsuarioResponse(usuario));
            return Response.ok(response.toString()).build();
        } catch (Exception e) {
            JsonObject errorResponse = new JsonObject();
            errorResponse.addProperty("success", false);
            errorResponse.addProperty("error", "AUTH_ERROR");
            errorResponse.addProperty("message", e.getMessage() != null ? e.getMessage() : "Error desconocido");
            return Response.status(Response.Status.UNAUTHORIZED).entity(errorResponse.toString()).build();
        }
    }

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

            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("message", "Usuario actual obtenido");
            response.add("data", construirUsuarioResponse(usuario));
            return Response.ok(response.toString()).build();
        } catch (Exception e) {
            JsonObject errorResponse = new JsonObject();
            errorResponse.addProperty("success", false);
            errorResponse.addProperty("error", "ERROR");
            errorResponse.addProperty("message", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse.toString()).build();
        }
    }

    @POST
    @Path("logout")
    @Produces(MediaType.APPLICATION_JSON)
    public Response logout() {
        try {
            SesionUsuario.limpiar(request);
            JsonObject response = new JsonObject();
            response.addProperty("success", true);
            response.addProperty("message", "Sesion cerrada exitosamente");
            return Response.ok(response.toString()).build();
        } catch (Exception e) {
            JsonObject errorResponse = new JsonObject();
            errorResponse.addProperty("success", false);
            errorResponse.addProperty("error", "ERROR");
            errorResponse.addProperty("message", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(errorResponse.toString()).build();
        }
    }

    private JsonObject construirUsuarioResponse(Usuario usuario) {
        String rol = usuario.getRol() == null ? "" : usuario.getRol().toUpperCase();

        JsonObject usuarioResponse = new JsonObject();
        usuarioResponse.addProperty("usuario", usuario.getUsuario());
        usuarioResponse.addProperty("rol", rol);
        usuarioResponse.addProperty("nombreCompleto",
                usuario.getNombreCompleto() != null ? usuario.getNombreCompleto() : usuario.getUsuario());
        if (usuario.getIdCustodio() != null) {
            usuarioResponse.addProperty("idCustodio", usuario.getIdCustodio());
        }

        JsonObject permisos = new JsonObject();
        if ("ADMINISTRADOR".equals(rol)) {
            permisos.addProperty("puedeEditarTodos", true);
            permisos.addProperty("puedeActualizarEstado", true);
            permisos.addProperty("puedeVer", true);
            permisos.addProperty("puedeCrearEquipo", true);
            permisos.addProperty("puedeEditarCustodio", true);
            permisos.addProperty("puedeExportarInventario", true);
            permisos.addProperty("puedeVerHistorial", true);
        } else if ("TECNICO".equals(rol)) {
            permisos.addProperty("puedeEditarTodos", false);
            permisos.addProperty("puedeActualizarEstado", false);
            permisos.addProperty("puedeVer", true);
            permisos.addProperty("puedeCrearEquipo", false);
            permisos.addProperty("puedeEditarCustodio", true);
            permisos.addProperty("puedeExportarInventario", true);
            permisos.addProperty("puedeVerHistorial", true);
        } else if ("CUSTODIO".equals(rol)) {
            permisos.addProperty("puedeEditarTodos", false);
            permisos.addProperty("puedeActualizarEstado", false);
            permisos.addProperty("puedeVer", true);
            permisos.addProperty("puedeCrearEquipo", false);
            permisos.addProperty("puedeEditarCustodio", false);
            permisos.addProperty("puedeExportarInventario", false);
            permisos.addProperty("puedeVerHistorial", true);
        } else {
            permisos.addProperty("puedeVer", false);
        }
        usuarioResponse.add("permisos", permisos);
        return usuarioResponse;
    }
}
