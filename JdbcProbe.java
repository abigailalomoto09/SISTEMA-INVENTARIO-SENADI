import java.sql.*;
import java.util.*;

public class JdbcProbe {
  public static void main(String[] args) throws Exception {
    Class.forName("com.mysql.cj.jdbc.Driver");
    String url = "jdbc:mysql://localhost:3306/inventario_dtic_2026?useSSL=false&serverTimezone=America/Lima&allowPublicKeyRetrieval=true";
    try (Connection c = DriverManager.getConnection(url, "root", "123456")) {
      System.out.println("Database: " + c.getCatalog());
      
      String[] tables = {"custodio", "usuario", "usuarios", "ubicacion"};
      for (String table : tables) {
        System.out.println("\n--- Columns in table: " + table + " ---");
        try (Statement stmt = c.createStatement();
             ResultSet rs = stmt.executeQuery("SELECT * FROM " + table + " LIMIT 1")) {
          ResultSetMetaData meta = rs.getMetaData();
          int cols = meta.getColumnCount();
          for (int i = 1; i <= cols; i++) {
            System.out.println("  " + meta.getColumnName(i) + " (" + meta.getColumnTypeName(i) + ")");
          }
          
          // Print some rows
          System.out.println("Sample rows:");
          try (ResultSet rsRows = stmt.executeQuery("SELECT * FROM " + table + " LIMIT 3")) {
            while (rsRows.next()) {
              Map<String, Object> row = new LinkedHashMap<>();
              for (int i = 1; i <= cols; i++) {
                row.put(meta.getColumnName(i), rsRows.getObject(i));
              }
              System.out.println("  " + row);
            }
          }
        } catch (Exception e) {
          System.out.println("  Error reading table: " + e.getMessage());
        }
      }
    }
  }
}
