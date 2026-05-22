import java.sql.*;
public class JdbcProbe {
  public static void main(String[] args) throws Exception {
    Class.forName("com.mysql.cj.jdbc.Driver");
    try (Connection c = DriverManager.getConnection("jdbc:mysql://localhost:3306/inventario_dtic_2026?useSSL=false&serverTimezone=America/Lima&allowPublicKeyRetrieval=true", "root", "123456")) {
      System.out.println("OK " + c.getCatalog());
    }
  }
}
