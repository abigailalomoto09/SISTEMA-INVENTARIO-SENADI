package com.mycompany.sistemainventariov3;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * ARCHIVO DESACTIVADO - No usar como ejecutable
 * Solo contiene utilidades de prueba de conexión
 */
public class ConnectionTest {
    // DESACTIVADO: El método main() no se ejecuta en aplicaciones web
    private static void mainDesactivado(String[] args) {
        try {
            // Cargar el driver MySQL
            Class.forName("com.mysql.cj.jdbc.Driver");
            System.out.println("✅ Driver MySQL cargado correctamente");
            
            // Crear conexión
            Connection con = DriverManager.getConnection(
                "jdbc:mysql://localhost:3306/inventario_dtic_2026",
                "root",
                "1234"
            );
            
            System.out.println("✅ CONEXIÓN EXITOSA A LA BASE DE DATOS!");
            System.out.println("================================================");
            
            // Ejecutar queries de prueba
            Statement stmt = con.createStatement();
            
            // Prueba 1: Contar custodios
            ResultSet rs1 = stmt.executeQuery("SELECT COUNT(*) as total FROM custodios");
            if (rs1.next()) {
                System.out.println("Total de custodios: " + rs1.getInt("total"));
            }
            
            // Prueba 2: Contar PCs
            ResultSet rs2 = stmt.executeQuery("SELECT COUNT(*) as total FROM pcs");
            if (rs2.next()) {
                System.out.println("Total de PCs: " + rs2.getInt("total"));
            }
            
            // Prueba 3: Contar laptops
            ResultSet rs3 = stmt.executeQuery("SELECT COUNT(*) as total FROM laptops");
            if (rs3.next()) {
                System.out.println("Total de laptops: " + rs3.getInt("total"));
            }
            
            // Prueba 4: Contar ubicaciones
            ResultSet rs4 = stmt.executeQuery("SELECT COUNT(*) as total FROM ubicaciones");
            if (rs4.next()) {
                System.out.println("Total de ubicaciones: " + rs4.getInt("total"));
            }
            
            // Prueba 5: Mostrar algunos custodios
            System.out.println("\n================================================");
            System.out.println("PRIMEROS 5 CUSTODIOS:");
            System.out.println("================================================");
            
            ResultSet rs5 = stmt.executeQuery("SELECT id_custodio, nombre FROM custodios LIMIT 5");
            while (rs5.next()) {
                System.out.println(rs5.getInt("id_custodio") + " - " + rs5.getString("nombre"));
            }
            
            // Prueba 6: Mostrar algunos PCs
            System.out.println("\n================================================");
            System.out.println("PRIMERAS 5 COMPUTADORAS:");
            System.out.println("================================================");
            
            ResultSet rs6 = stmt.executeQuery(
                "SELECT codigo_sbai, descripcion, marca, modelo, procesador, ram FROM pcs LIMIT 5"
            );
            while (rs6.next()) {
                System.out.println("Código: " + rs6.getString("codigo_sbai"));
                System.out.println("  Marca: " + rs6.getString("marca"));
                System.out.println("  Modelo: " + rs6.getString("modelo"));
                System.out.println("  Procesador: " + rs6.getString("procesador"));
                System.out.println("  RAM: " + rs6.getString("ram"));
                System.out.println("---");
            }
            
            System.out.println("================================================");
            System.out.println("✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE!");
            System.out.println("================================================");
            
            con.close();
            
        } catch (ClassNotFoundException e) {
            System.out.println("❌ Error: Driver MySQL no encontrado");
            System.out.println("Asegúrate de tener mysql-connector-java en tu pom.xml");
            e.printStackTrace();
        } catch (Exception e) {
            System.out.println("❌ Error de conexión: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
