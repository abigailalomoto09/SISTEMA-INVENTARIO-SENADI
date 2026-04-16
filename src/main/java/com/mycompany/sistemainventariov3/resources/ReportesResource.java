package com.mycompany.sistemainventariov3.resources;

import com.google.gson.Gson;
import com.mycompany.sistemainventariov3.dto.ApiResponse;
import com.mycompany.sistemainventariov3.model.Laptop;
import com.mycompany.sistemainventariov3.model.PC;
import com.mycompany.sistemainventariov3.service.BienService;
import com.mycompany.sistemainventariov3.util.SesionUsuario;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.ByteArrayOutputStream;
import java.lang.reflect.Field;
import java.util.List;

/**
 * Controlador REST para generación de reportes y exportación a Excel
 */
@Path("reportes")
public class ReportesResource {
    
    private BienService bienService = new BienService();
    private Gson gson = new Gson();
    
    /**
     * Exportar Inventario de PCs a Excel
     * GET /resources/reportes/pcs/excel
     */
    @GET
    @Path("pcs/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarPCsExcel() {
        try {
            validarAutenticacion();
            
            List<PC> pcs = bienService.listarPCs();
            
            ByteArrayOutputStream out = generarExcelPCs(pcs);
            
            return Response
                    .ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=Inventario_PCs.xlsx")
                    .build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Exportar Inventario de Laptops a Excel
     * GET /resources/reportes/laptops/excel
     */
    @GET
    @Path("laptops/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarLaptopsExcel() {
        try {
            validarAutenticacion();
            
            List<Laptop> laptops = bienService.listarLaptops();
            
            ByteArrayOutputStream out = generarExcelLaptops(laptops);
            
            return Response
                    .ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=Inventario_Laptops.xlsx")
                    .build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Exportar Inventario Completo (PCs + Laptops) a Excel
     * GET /resources/reportes/inventario/excel
     */
    @GET
    @Path("inventario/excel")
    @Produces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public Response exportarInventarioCompleto() {
        try {
            validarAutenticacion();
            
            List<PC> pcs = bienService.listarPCs();
            List<Laptop> laptops = bienService.listarLaptops();
            
            Workbook workbook = new XSSFWorkbook();
            
            // Hoja de PCs
            generarHojaPCs(workbook, pcs);
            
            // Hoja de Laptops
            generarHojaLaptops(workbook, laptops);
            
            // Hoja de Resumen
            generarHojaResumen(workbook, pcs.size(), laptops.size());
            
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            workbook.close();
            
            return Response
                    .ok(out.toByteArray())
                    .header("Content-Disposition", "attachment; filename=Inventario_Completo.xlsx")
                    .build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(gson.toJson(resp)).build();
        }
    }
    
    /**
     * Obtener estadísticas del inventario
     * GET /resources/reportes/estadisticas
     */
    @GET
    @Path("estadisticas")
    @Produces(MediaType.APPLICATION_JSON)
    public Response obtenerEstadisticas() {
        try {
            validarAutenticacion();
            
            List<PC> pcs = bienService.listarPCs();
            List<Laptop> laptops = bienService.listarLaptops();
            
            java.util.Map<String, Object> estadisticas = new java.util.HashMap<>();
            estadisticas.put("totalPCs", pcs.size());
            estadisticas.put("totalLaptops", laptops.size());
            estadisticas.put("totalBienes", pcs.size() + laptops.size());
            
            // Contar por estados
            long pcsActivas = pcs.stream().filter(p -> "Activo".equals(p.getEstado())).count();
            long laptopsActivas = laptops.stream().filter(l -> "Activo".equals(l.getEstado())).count();
            
            estadisticas.put("pcsActivas", pcsActivas);
            estadisticas.put("laptopsActivas", laptopsActivas);
            
            ApiResponse<?> response = ApiResponse.success("Estadísticas obtenidas", estadisticas);
            return Response.ok(gson.toJson(response)).build();
        } catch (Exception e) {
            ApiResponse<?> resp = ApiResponse.error("ERROR", e.getMessage());
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(gson.toJson(resp)).build();
        }
    }
    
    // ==================== MÉTODOS AUXILIARES ====================
    
    private ByteArrayOutputStream generarExcelPCs(List<PC> pcs) throws Exception {
        Workbook workbook = new XSSFWorkbook();
        generarHojaPCs(workbook, pcs);
        
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        
        return out;
    }
    
    private ByteArrayOutputStream generarExcelLaptops(List<Laptop> laptops) throws Exception {
        Workbook workbook = new XSSFWorkbook();
        generarHojaLaptops(workbook, laptops);
        
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        workbook.write(out);
        workbook.close();
        
        return out;
    }
    
    private void generarHojaPCs(Workbook workbook, List<PC> pcs) {
        Sheet sheet = workbook.createSheet("PCs");
        createHeaderRow(sheet, new String[]{"Código SBAI", "Código Megan", "Descripción", "Marca", 
            "Modelo", "Serie", "Custodio", "Ubicación", "Procesador", "RAM", "Disco Duro", 
            "S.O.", "Estado", "Observaciones"});
        
        int rowNum = 1;
        for (PC pc : pcs) {
            Row row = sheet.createRow(rowNum++);
            setCellValue(row, 0, pc.getCodigoSbai());
            setCellValue(row, 1, pc.getCodigoMegan());
            setCellValue(row, 2, pc.getDescripcion());
            setCellValue(row, 3, pc.getMarca());
            setCellValue(row, 4, pc.getModelo());
            setCellValue(row, 5, pc.getNumeroSerie());
            setCellValue(row, 6, pc.getCustodioActual() != null ? pc.getCustodioActual().getNombre() : "");
            setCellValue(row, 7, pc.getUbicacion() != null ? pc.getUbicacion().getUbicacionCompleta() : "");
            setCellValue(row, 8, pc.getProcesador());
            setCellValue(row, 9, pc.getRam());
            setCellValue(row, 10, pc.getDiscoDuro());
            setCellValue(row, 11, pc.getSistemaOperativo());
            setCellValue(row, 12, pc.getEstado());
            setCellValue(row, 13, pc.getObservacion());
        }
        
        autoSizeColumns(sheet, 14);
    }
    
    private void generarHojaLaptops(Workbook workbook, List<Laptop> laptops) {
        Sheet sheet = workbook.createSheet("Laptops");
        createHeaderRow(sheet, new String[]{"Código SBAI", "Código Megan", "Descripción", "Marca", 
            "Modelo", "Serie", "Custodio", "Ubicación", "Procesador", "RAM", "Disco Duro", 
            "S.O.", "Estado", "Observaciones"});
        
        int rowNum = 1;
        for (Laptop laptop : laptops) {
            Row row = sheet.createRow(rowNum++);
            setCellValue(row, 0, laptop.getCodigoSbai());
            setCellValue(row, 1, laptop.getCodigoMegan());
            setCellValue(row, 2, laptop.getDescripcion());
            setCellValue(row, 3, laptop.getMarca());
            setCellValue(row, 4, laptop.getModelo());
            setCellValue(row, 5, laptop.getNumeroSerie());
            setCellValue(row, 6, laptop.getCustodioActual() != null ? laptop.getCustodioActual().getNombre() : "");
            setCellValue(row, 7, laptop.getUbicacion() != null ? laptop.getUbicacion().getUbicacionCompleta() : "");
            setCellValue(row, 8, laptop.getProcesador());
            setCellValue(row, 9, laptop.getRam());
            setCellValue(row, 10, laptop.getDiscoDuro());
            setCellValue(row, 11, laptop.getSistemaOperativo());
            setCellValue(row, 12, laptop.getEstado());
            setCellValue(row, 13, laptop.getObservacion());
        }
        
        autoSizeColumns(sheet, 14);
    }
    
    private void generarHojaResumen(Workbook workbook, int totalPCs, int totalLaptops) {
        Sheet sheet = workbook.createSheet("Resumen");
        
        Row row1 = sheet.createRow(0);
        row1.createCell(0).setCellValue("Resumen de Inventario");
        
        Row row3 = sheet.createRow(2);
        row3.createCell(0).setCellValue("Concepto");
        row3.createCell(1).setCellValue("Cantidad");
        
        Row row4 = sheet.createRow(3);
        row4.createCell(0).setCellValue("Total de PCs");
        row4.createCell(1).setCellValue(totalPCs);
        
        Row row5 = sheet.createRow(4);
        row5.createCell(0).setCellValue("Total de Laptops");
        row5.createCell(1).setCellValue(totalLaptops);
        
        Row row6 = sheet.createRow(5);
        row6.createCell(0).setCellValue("Total de Bienes");
        row6.createCell(1).setCellValue(totalPCs + totalLaptops);
        
        sheet.autoSizeColumn(0);
        sheet.autoSizeColumn(1);
    }
    
    private void createHeaderRow(Sheet sheet, String[] headers) {
        Row headerRow = sheet.createRow(0);
        CellStyle headerStyle = sheet.getWorkbook().createCellStyle();
        headerStyle.setFillForegroundColor(IndexedColors.LIGHT_BLUE.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        Font font = sheet.getWorkbook().createFont();
        font.setBold(true);
        headerStyle.setFont(font);
        
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
    }
    
    private void setCellValue(Row row, int cellIndex, Object value) {
        Cell cell = row.createCell(cellIndex);
        if (value instanceof Number) {
            cell.setCellValue(((Number) value).doubleValue());
        } else if (value instanceof java.util.Date) {
            cell.setCellValue((java.util.Date) value);
        } else {
            cell.setCellValue(value != null ? value.toString() : "");
        }
    }
    
    private void autoSizeColumns(Sheet sheet, int columnCount) {
        for (int i = 0; i < columnCount; i++) {
            sheet.autoSizeColumn(i);
        }
    }
    
    // ==================== VALIDACIONES ====================
    
    private void validarAutenticacion() throws Exception {
        if (!SesionUsuario.estaAutenticado()) {
            throw new Exception("Usuario no autenticado");
        }
    }
}
