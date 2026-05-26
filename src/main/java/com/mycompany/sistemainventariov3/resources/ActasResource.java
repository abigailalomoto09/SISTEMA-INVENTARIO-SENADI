package com.mycompany.sistemainventariov3.resources;

import com.google.gson.Gson;
import com.mycompany.sistemainventariov3.dto.ActaMantenimientoPcRequest;
import com.mycompany.sistemainventariov3.dto.ActaSoftwareRequest;
import com.mycompany.sistemainventariov3.dto.ApiResponse;
import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.service.ActaMantenimientoPcDocumentService;
import com.mycompany.sistemainventariov3.service.ActaMantenimientoImpresoraDocumentService;
import com.mycompany.sistemainventariov3.service.ActaMantenimientoProyectorDocumentService;
import com.mycompany.sistemainventariov3.service.ActaMantenimientoEscanerDocumentService;
import com.mycompany.sistemainventariov3.service.ActaMantenimientoTelefonoDocumentService;
import com.mycompany.sistemainventariov3.service.ActaSoftwareDocumentService;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.HttpHeaders;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Path("actas")
public class ActasResource {

    private final Gson gson = new Gson();
    private final ActaMantenimientoPcDocumentService documentService = new ActaMantenimientoPcDocumentService();
    private final ActaMantenimientoImpresoraDocumentService impresoraDocumentService = new ActaMantenimientoImpresoraDocumentService();
    private final ActaMantenimientoProyectorDocumentService proyectorDocumentService = new ActaMantenimientoProyectorDocumentService();
    private final ActaMantenimientoEscanerDocumentService escanerDocumentService = new ActaMantenimientoEscanerDocumentService();
    private final ActaMantenimientoTelefonoDocumentService telefonoDocumentService = new ActaMantenimientoTelefonoDocumentService();
    private final ActaSoftwareDocumentService softwareDocumentService = new ActaSoftwareDocumentService();

    @POST
    @Path("software/export/{format}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportarActaSoftware(@PathParam("format") String format, String json) {
        try {
            validarAutenticacion();
            ActaSoftwareRequest request = gson.fromJson(json, ActaSoftwareRequest.class);
            if (request == null || request.getFuncionario() == null || isBlank(request.getFuncionario().getNombre())) {
                ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", "El nombre del funcionario es obligatorio.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
            }
            String normalizedFormat = String.valueOf(format).trim().toLowerCase();
            byte[] content;
            String mediaType;
            String extension;
            if ("docx".equals(normalizedFormat)) {
                content = softwareDocumentService.generarDocx(request);
                mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
            } else if ("pdf".equals(normalizedFormat)) {
                content = softwareDocumentService.generarPdf(request);
                mediaType = "application/pdf";
                extension = "pdf";
            } else {
                ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", "Formato no soportado.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
            }
            String codigo = sanitizeSegment(request.getEquipo() != null ? request.getEquipo().getCodigo() : "equipo");
            String fecha = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm"));
            String fileName = "acta_software_" + codigo + "_" + fecha + "." + extension;
            return Response.ok(content, mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            e.printStackTrace();
            ApiResponse<?> response = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(response)).build();
        }
    }

    @POST
    @Path("equipos/pc/export/{format}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportarActaPc(@PathParam("format") String format, String json) {
        try {
            validarAutenticacion();
            ActaMantenimientoPcRequest request = gson.fromJson(json, ActaMantenimientoPcRequest.class);
            validarRequest(request);

            String normalizedFormat = String.valueOf(format).trim().toLowerCase();
            byte[] content;
            String mediaType;
            String extension;
            if ("docx".equals(normalizedFormat)) {
                content = documentService.generarDocx(request);
                mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
            } else if ("pdf".equals(normalizedFormat)) {
                content = documentService.generarPdf(request);
                mediaType = "application/pdf";
                extension = "pdf";
            } else {
                ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", "Formato no soportado.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
            }

            String fileName = buildFileName(request, extension);
            return Response.ok(content, mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            e.printStackTrace();
            ApiResponse<?> response = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(response)).build();
        }
    }

    @POST
    @Path("equipos/impresora/export/{format}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportarActaImpresora(@PathParam("format") String format, String json) {
        try {
            validarAutenticacion();
            ActaMantenimientoPcRequest request = gson.fromJson(json, ActaMantenimientoPcRequest.class);
            validarRequestImpresora(request);

            String normalizedFormat = String.valueOf(format).trim().toLowerCase();
            byte[] content;
            String mediaType;
            String extension;
            if ("docx".equals(normalizedFormat)) {
                content = impresoraDocumentService.generarDocx(request);
                mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
            } else if ("pdf".equals(normalizedFormat)) {
                content = impresoraDocumentService.generarPdf(request);
                mediaType = "application/pdf";
                extension = "pdf";
            } else {
                ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", "Formato no soportado.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
            }

            String fileName = buildFileName(request, extension);
            return Response.ok(content, mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            e.printStackTrace();
            ApiResponse<?> response = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(response)).build();
        }
    }

    @POST
    @Path("equipos/telefono/export/{format}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportarActaTelefono(@PathParam("format") String format, String json) {
        try {
            validarAutenticacion();
            ActaMantenimientoPcRequest request = gson.fromJson(json, ActaMantenimientoPcRequest.class);
            validarRequestTelefono(request);

            String normalizedFormat = String.valueOf(format).trim().toLowerCase();
            byte[] content;
            String mediaType;
            String extension;
            if ("docx".equals(normalizedFormat)) {
                content = telefonoDocumentService.generarDocx(request);
                mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
            } else if ("pdf".equals(normalizedFormat)) {
                content = telefonoDocumentService.generarPdf(request);
                mediaType = "application/pdf";
                extension = "pdf";
            } else {
                ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", "Formato no soportado.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
            }

            String fileName = buildFileName(request, extension);
            return Response.ok(content, mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            e.printStackTrace();
            ApiResponse<?> response = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(response)).build();
        }
    }

    private void validarRequestTelefono(ActaMantenimientoPcRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("No se recibieron datos del acta.");
        }
        if (request.getFuncionario() == null || isBlank(request.getFuncionario().getNombre())) {
            throw new IllegalArgumentException("El nombre del funcionario es obligatorio.");
        }
        if (request.getDesktop() == null || isBlank(request.getDesktop().getCodigo())) {
            throw new IllegalArgumentException("Debe seleccionar un teléfono IP válido.");
        }
        if (request.getActividades() == null || request.getActividades().isEmpty()) {
            throw new IllegalArgumentException("Las actividades del acta son obligatorias.");
        }
    }

    private void validarAutenticacion() throws Exception {
        Usuario usuario = SesionUsuario.getUsuarioActual();
        if (usuario == null) {
            throw new Exception("Usuario no autenticado");
        }
    }

    private void validarRequest(ActaMantenimientoPcRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("No se recibieron datos del acta.");
        }
        if (request.getFuncionario() == null || isBlank(request.getFuncionario().getNombre())) {
            throw new IllegalArgumentException("El nombre del funcionario es obligatorio.");
        }
        if (request.getDesktop() == null || isBlank(request.getDesktop().getCodigo())) {
            throw new IllegalArgumentException("Debe seleccionar un equipo valido.");
        }
        if (request.getActividades() == null || request.getActividades().isEmpty()) {
            throw new IllegalArgumentException("Las actividades del acta son obligatorias.");
        }
    }

    @POST
    @Path("equipos/proyector/export/{format}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportarActaProyector(@PathParam("format") String format, String json) {
        try {
            validarAutenticacion();
            ActaMantenimientoPcRequest request = gson.fromJson(json, ActaMantenimientoPcRequest.class);
            validarRequestProyector(request);

            String normalizedFormat = String.valueOf(format).trim().toLowerCase();
            byte[] content;
            String mediaType;
            String extension;
            if ("docx".equals(normalizedFormat)) {
                content = proyectorDocumentService.generarDocx(request);
                mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
            } else if ("pdf".equals(normalizedFormat)) {
                content = proyectorDocumentService.generarPdf(request);
                mediaType = "application/pdf";
                extension = "pdf";
            } else {
                ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", "Formato no soportado.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
            }

            String fileName = buildFileName(request, extension);
            return Response.ok(content, mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            e.printStackTrace();
            ApiResponse<?> response = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(response)).build();
        }
    }

    @POST
    @Path("equipos/escaner/export/{format}")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_OCTET_STREAM)
    public Response exportarActaEscaner(@PathParam("format") String format, String json) {
        try {
            validarAutenticacion();
            ActaMantenimientoPcRequest request = gson.fromJson(json, ActaMantenimientoPcRequest.class);
            validarRequestEscaner(request);

            String normalizedFormat = String.valueOf(format).trim().toLowerCase();
            byte[] content;
            String mediaType;
            String extension;
            if ("docx".equals(normalizedFormat)) {
                content = escanerDocumentService.generarDocx(request);
                mediaType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                extension = "docx";
            } else if ("pdf".equals(normalizedFormat)) {
                content = escanerDocumentService.generarPdf(request);
                mediaType = "application/pdf";
                extension = "pdf";
            } else {
                ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", "Formato no soportado.");
                return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
            }

            String fileName = buildFileName(request, extension);
            return Response.ok(content, mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .build();
        } catch (IllegalArgumentException e) {
            ApiResponse<?> response = ApiResponse.error("VALIDATION_ERROR", e.getMessage());
            return Response.status(Response.Status.BAD_REQUEST).entity(gson.toJson(response)).build();
        } catch (Exception e) {
            e.printStackTrace();
            ApiResponse<?> response = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(response)).build();
        }
    }

    private void validarRequestEscaner(ActaMantenimientoPcRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("No se recibieron datos del acta.");
        }
        if (request.getFuncionario() == null || isBlank(request.getFuncionario().getNombre())) {
            throw new IllegalArgumentException("El nombre del funcionario es obligatorio.");
        }
        if (request.getDesktop() == null || isBlank(request.getDesktop().getCodigo())) {
            throw new IllegalArgumentException("Debe seleccionar un escáner válido.");
        }
        if (request.getActividades() == null || request.getActividades().isEmpty()) {
            throw new IllegalArgumentException("Las actividades del acta son obligatorias.");
        }
    }

    private void validarRequestProyector(ActaMantenimientoPcRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("No se recibieron datos del acta.");
        }
        if (request.getFuncionario() == null || isBlank(request.getFuncionario().getNombre())) {
            throw new IllegalArgumentException("El nombre del funcionario es obligatorio.");
        }
        if (request.getDesktop() == null || isBlank(request.getDesktop().getCodigo())) {
            throw new IllegalArgumentException("Debe seleccionar un proyector válido.");
        }
        if (request.getActividades() == null || request.getActividades().isEmpty()) {
            throw new IllegalArgumentException("Las actividades del acta son obligatorias.");
        }
    }

    private void validarRequestImpresora(ActaMantenimientoPcRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("No se recibieron datos del acta.");
        }
        if (request.getFuncionario() == null || isBlank(request.getFuncionario().getNombre())) {
            throw new IllegalArgumentException("El nombre del funcionario es obligatorio.");
        }
        if (request.getDesktop() == null || isBlank(request.getDesktop().getCodigo())) {
            throw new IllegalArgumentException("Debe seleccionar una impresora válida.");
        }
        if (request.getActividades() == null || request.getActividades().isEmpty()) {
            throw new IllegalArgumentException("Las actividades del acta son obligatorias.");
        }
    }

    private String buildFileName(ActaMantenimientoPcRequest request, String extension) {
        String codigo = sanitizeSegment(request.getDesktop() != null ? request.getDesktop().getCodigo() : "equipo");
        String fecha = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm"));
        String tipo = sanitizeSegment(request.getSubapartado() != null ? request.getSubapartado() : "equipo");
        return "acta_mantenimiento_" + tipo + "_" + codigo + "_" + fecha + "." + extension;
    }

    private String sanitizeSegment(String value) {
        String normalized = isBlank(value) ? "equipo" : value.trim();
        return normalized.replaceAll("[^A-Za-z0-9_-]", "_");
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
