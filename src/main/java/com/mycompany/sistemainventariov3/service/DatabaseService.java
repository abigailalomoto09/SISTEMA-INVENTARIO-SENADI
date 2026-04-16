package com.mycompany.sistemainventariov3.service;

import java.sql.*;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class DatabaseService {
    
    private static final String URL = "jdbc:mysql://localhost:3306/inventario_dtic_2026?useSSL=false&serverTimezone=America/Lima";
    private static final String USER = "root";
    private static final String PASSWORD = "1234";
    
    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("Error cargando driver MySQL: " + e.getMessage());
        }
    }
    
    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
    
    public static JsonObject getDatabaseStatus() {
        JsonObject status = new JsonObject();
        
        try (Connection conn = getConnection()) {
            status.addProperty("conexion", "✅ EXITOSA");
            status.addProperty("base_datos", "inventario_dtic_2026");
            status.addProperty("tabla", "Resumen de datos");
            
            // Contar registros en cada tabla
            status.addProperty("custodios", countRecords(conn, "custodios"));
            status.addProperty("pcs", countRecords(conn, "pcs"));
            status.addProperty("laptops", countRecords(conn, "laptops"));
            status.addProperty("ubicaciones", countRecords(conn, "ubicaciones"));
            
        } catch (SQLException e) {
            status.addProperty("conexion", "❌ ERROR: " + e.getMessage());
        }
        
        return status;
    }
    
    public static JsonArray getCustodios() {
        JsonArray result = new JsonArray();
        
        try (Connection conn = getConnection()) {
            String query = "SELECT id_custodio, nombre FROM custodios LIMIT 20";
            try (Statement stmt = conn.createStatement()) {
                ResultSet rs = stmt.executeQuery(query);
                while (rs.next()) {
                    JsonObject obj = new JsonObject();
                    obj.addProperty("id", rs.getInt("id_custodio"));
                    obj.addProperty("nombre", rs.getString("nombre"));
                    result.add(obj);
                }
                rs.close();
            }
        } catch (SQLException e) {
            JsonObject error = new JsonObject();
            error.addProperty("error", e.getMessage());
            result.add(error);
        }
        
        return result;
    }
    
    public static JsonArray getPCs() {
        JsonArray result = new JsonArray();
        
        try (Connection conn = getConnection()) {
            String query = "SELECT codigo_sbai, descripcion, marca, modelo, procesador, ram FROM pcs LIMIT 20";
            try (Statement stmt = conn.createStatement()) {
                ResultSet rs = stmt.executeQuery(query);
                while (rs.next()) {
                    JsonObject obj = new JsonObject();
                    obj.addProperty("codigo", rs.getString("codigo_sbai"));
                    obj.addProperty("descripcion", rs.getString("descripcion"));
                    obj.addProperty("marca", rs.getString("marca"));
                    obj.addProperty("modelo", rs.getString("modelo"));
                    obj.addProperty("procesador", rs.getString("procesador"));
                    obj.addProperty("ram", rs.getString("ram"));
                    result.add(obj);
                }
                rs.close();
            }
        } catch (SQLException e) {
            JsonObject error = new JsonObject();
            error.addProperty("error", e.getMessage());
            result.add(error);
        }
        
        return result;
    }
    
    public static JsonArray getLaptops() {
        JsonArray result = new JsonArray();
        
        try (Connection conn = getConnection()) {
            String query = "SELECT codigo_sbai, descripcion, marca, modelo, procesador, ram FROM laptops LIMIT 20";
            try (Statement stmt = conn.createStatement()) {
                ResultSet rs = stmt.executeQuery(query);
                while (rs.next()) {
                    JsonObject obj = new JsonObject();
                    obj.addProperty("codigo", rs.getString("codigo_sbai"));
                    obj.addProperty("descripcion", rs.getString("descripcion"));
                    obj.addProperty("marca", rs.getString("marca"));
                    obj.addProperty("modelo", rs.getString("modelo"));
                    obj.addProperty("procesador", rs.getString("procesador"));
                    obj.addProperty("ram", rs.getString("ram"));
                    result.add(obj);
                }
                rs.close();
            }
        } catch (SQLException e) {
            JsonObject error = new JsonObject();
            error.addProperty("error", e.getMessage());
            result.add(error);
        }
        
        return result;
    }
    
    private static int countRecords(Connection conn, String tableName) {
        try (Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT COUNT(*) as total FROM " + tableName);
            if (rs.next()) {
                return rs.getInt("total");
            }
            rs.close();
        } catch (SQLException e) {
            System.err.println("Error contando registros en " + tableName + ": " + e.getMessage());
        }
        return 0;
    }
}
