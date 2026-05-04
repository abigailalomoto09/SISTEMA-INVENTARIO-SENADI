package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.util.EncriptacionUtil;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Servicio de autenticacion contra base de datos.
 */
public class UsuarioService {

    private static final String PASSWORD_TEMPORAL = "Temporal123";

    /**
     * Autenticar usuario desde base de datos.
     * @param rolRolSeleccionado Rol seleccionado (para multi-rol). Si null, cualquier rol OK.
     */
    public Usuario autenticar(String usuario, String password, String rolSeleccionado) throws Exception {
        if (usuario == null || usuario.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            throw new Exception("Usuario y contrasena son requeridos");
        }

        try (Connection conn = DatabaseService.getConnection()) {
            provisionarCustodios(conn);
            UsuarioAuthRecord record = buscarUsuario(conn, usuario.trim(), rolSeleccionado);

            if (record == null) {
                throw new Exception("Credenciales invalidas");
            }
            if (!record.activo) {
                throw new Exception("El usuario esta inactivo");
            }
            if (!validarPassword(password, record.passwordHash)) {
                throw new Exception("Credenciales invalidas");
            }

            return new Usuario(
                    record.username,
                    null,
                    normalizarRol(record.rol),
                    record.nombreCompleto,
                    record.idCustodio,
                    true
            );
        }
    }

    /**
     * Obtener usuario actual de la sesion.
     */
    public Usuario getUsuarioActual() {
        return SesionUsuario.getUsuarioActual();
    }

    /**
     * Logout.
     */
    public void logout() {
        SesionUsuario.limpiar();
    }

    public boolean esAdministrador() {
        return SesionUsuario.esAdministrador();
    }

    public boolean esTecnico() {
        return SesionUsuario.esTecnico();
    }

    private UsuarioAuthRecord buscarUsuario(Connection conn, String username, String rolSeleccionado) throws SQLException {
        if (existeTabla(conn, "usuario")) {
            String sql = "SELECT u.username, u.password_hash, u.rol, u.id_custodio, u.activo, " +
                    "COALESCE(c.nombre, u.username) AS nombre_completo " +
                    "FROM usuario u " +
                    "LEFT JOIN custodio c ON c.id_custodio = u.id_custodio " +
                    "WHERE u.username = ? LIMIT 1";
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, username);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        UsuarioAuthRecord record = new UsuarioAuthRecord();
                        record.username = rs.getString("username");
                        record.passwordHash = rs.getString("password_hash");
                        record.rol = rs.getString("rol");
                        record.idCustodio = (Integer) rs.getObject("id_custodio");
                        record.activo = rs.getInt("activo") == 1;
                        record.nombreCompleto = rs.getString("nombre_completo");
                        return record;
                    }
                }
            }
        }

String sql;
            if (rolSeleccionado != null) {
                sql = "SELECT u.username, u.password as password_hash, u.rol, u.nombre_completo, u.estado, u.id_custodio, ur.rol as rol_confirmado " +
                      "FROM usuarios u " +
                      "JOIN usuario_roles ur ON u.id_usuario = ur.id_usuario " +
                      "WHERE u.username = ? AND ur.rol = ? AND u.estado = 'ACTIVO' " +
                      "LIMIT 1";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, username);
                    ps.setString(2, rolSeleccionado.toUpperCase());
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            UsuarioAuthRecord record = new UsuarioAuthRecord();
                            record.username = rs.getString("username");
                            record.passwordHash = rs.getString("password_hash");
                            record.rol = rs.getString("rol_confirmado") != null ? rs.getString("rol_confirmado") : rs.getString("rol");
                            record.nombreCompleto = rs.getString("nombre_completo");
                            record.activo = true;
                            record.idCustodio = rs.getObject("id_custodio") != null ? rs.getInt("id_custodio") : null;
                            return record;
                        }
                    }
                }
            } else {
                sql = "SELECT u.username, u.password as password_hash, u.rol, u.nombre_completo, u.estado, u.id_custodio " +
                      "FROM usuarios u " +
                      "WHERE u.username = ? AND u.estado = 'ACTIVO' LIMIT 1";
                try (PreparedStatement ps = conn.prepareStatement(sql)) {
                    ps.setString(1, username);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) {
                            UsuarioAuthRecord record = new UsuarioAuthRecord();
                            record.username = rs.getString("username");
                            record.passwordHash = rs.getString("password_hash");
                            record.rol = rs.getString("rol");
                            record.nombreCompleto = rs.getString("nombre_completo");
                            record.activo = true;
                            record.idCustodio = rs.getObject("id_custodio") != null ? rs.getInt("id_custodio") : null;
                            return record;
                        }
                    }
                }
            }

        return null;
    }

    private boolean validarPassword(String passwordIngresado, String passwordPersistido) {
        if (passwordPersistido == null) {
            return false;
        }
        if (passwordPersistido.equals(passwordIngresado)) {
            return true;
        }
        String md5 = EncriptacionUtil.encriptarMD5(passwordIngresado);
        return passwordPersistido.equalsIgnoreCase(md5);
    }

    private String normalizarRol(String rol) {
        String valor = rol == null ? "" : rol.trim().toUpperCase(Locale.ROOT);
        if ("ADMIN".equals(valor) || "ADMINISTRADOR".equals(valor)) {
            return "ADMINISTRADOR";
        }
        if ("TECNICO".equals(valor)) {
            return "TECNICO";
        }
        if ("CUSTODIO".equals(valor)) {
            return "CUSTODIO";
        }
        return "TECNICO";
    }

    private void provisionarCustodios(Connection conn) {
        try {
            if (existeTabla(conn, "usuario")) {
                provisionarCustodiosTablaUsuario(conn);
                return;
            }
            if (existeTabla(conn, "usuarios") && existeColumna(conn, "usuarios", "id_custodio")) {
                provisionarCustodiosTablaUsuarios(conn);
            }
        } catch (Exception e) {
            System.err.println("[UsuarioService] No se pudo provisionar custodios: " + e.getMessage());
        }
    }

    private void provisionarCustodiosTablaUsuario(Connection conn) throws SQLException {
        Set<String> existentes = cargarUsernames(conn, "usuario");
        String sql = "SELECT c.id_custodio, c.nombre " +
                "FROM custodio c " +
                "LEFT JOIN usuario u ON u.id_custodio = c.id_custodio AND u.rol = 'CUSTODIO' " +
                "WHERE c.activo = 1 AND u.id_usuario IS NULL " +
                "ORDER BY c.nombre";
        try (PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Integer idCustodio = rs.getInt("id_custodio");
                String nombre = rs.getString("nombre");
                String username = generarUsername(nombre, existentes);

                try (PreparedStatement insert = conn.prepareStatement(
                        "INSERT INTO usuario (username, password_hash, rol, id_custodio, activo) VALUES (?, ?, 'CUSTODIO', ?, 1)")) {
                    insert.setString(1, username);
                    insert.setString(2, EncriptacionUtil.encriptarMD5(PASSWORD_TEMPORAL));
                    insert.setInt(3, idCustodio);
                    insert.executeUpdate();
                }
            }
        }
    }

    private void provisionarCustodiosTablaUsuarios(Connection conn) throws SQLException {
        Set<String> existentes = cargarUsernames(conn, "usuarios");
        String sql = "SELECT c.id_custodio, c.nombre " +
                "FROM custodio c " +
                "LEFT JOIN usuarios u ON u.id_custodio = c.id_custodio AND UPPER(u.rol) = 'CUSTODIO' " +
                "WHERE c.activo = 1 AND u.id_usuario IS NULL " +
                "ORDER BY c.nombre";
        try (PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                Integer idCustodio = rs.getInt("id_custodio");
                String nombre = rs.getString("nombre");
                String username = generarUsername(nombre, existentes);

                try (PreparedStatement insert = conn.prepareStatement(
                        "INSERT INTO usuarios (username, password, nombre_completo, rol, estado, id_custodio, fecha_creacion) " +
                                "VALUES (?, ?, ?, 'CUSTODIO', 'ACTIVO', ?, NOW())")) {
                    insert.setString(1, username);
                    insert.setString(2, EncriptacionUtil.encriptarMD5(PASSWORD_TEMPORAL));
                    insert.setString(3, nombre);
                    insert.setInt(4, idCustodio);
                    insert.executeUpdate();
                }
            }
        }
    }

    private Set<String> cargarUsernames(Connection conn, String tabla) throws SQLException {
        Set<String> usernames = new HashSet<>();
        try (PreparedStatement ps = conn.prepareStatement("SELECT username FROM " + tabla);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                String username = rs.getString("username");
                if (username != null) {
                    usernames.add(username.toLowerCase(Locale.ROOT));
                }
            }
        }
        return usernames;
    }

    private String generarUsername(String nombreCompleto, Set<String> existentes) {
        String limpio = Normalizer.normalize(nombreCompleto == null ? "" : nombreCompleto, Normalizer.Form.NFD)
                .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
                .replaceAll("[^A-Za-z0-9 ]", " ")
                .trim()
                .replaceAll("\\s+", " ");

        String[] partes = limpio.isEmpty() ? new String[0] : limpio.split(" ");
        String base;
        if (partes.length == 0) {
            base = "custodio";
        } else if (partes.length == 1) {
            base = partes[0].toLowerCase(Locale.ROOT);
        } else {
            String inicial = partes[0].substring(0, 1).toLowerCase(Locale.ROOT);
            String apellido = partes[partes.length - 1].toLowerCase(Locale.ROOT);
            base = (inicial + apellido).replaceAll("[^a-z0-9]", "");
        }

        if (base.isEmpty()) {
            base = "custodio";
        }
        if (base.length() > 75) {
            base = base.substring(0, 75);
        }

        String candidato = base;
        int contador = 1;
        while (existentes.contains(candidato)) {
            String sufijo = String.valueOf(contador++);
            int limite = Math.max(1, 80 - sufijo.length());
            String prefijo = base.length() > limite ? base.substring(0, limite) : base;
            candidato = prefijo + sufijo;
        }
        existentes.add(candidato);
        return candidato;
    }

    private boolean existeTabla(Connection conn, String tabla) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, tabla);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private boolean existeColumna(Connection conn, String tabla, String columna) throws SQLException {
        String sql = "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, tabla);
            ps.setString(2, columna);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static class UsuarioAuthRecord {
        String username;
        String passwordHash;
        String rol;
        String nombreCompleto;
        Integer idCustodio;
        boolean activo;
    }
}
