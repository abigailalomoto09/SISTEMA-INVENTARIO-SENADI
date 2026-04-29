package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.dto.InventoryItemDTO;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Consultas JDBC contra el modelo final inventario_dtic_2026.
 */
public class InventarioJdbcService {

    private static final List<String> TIPOS_FORMULARIO = Arrays.asList(
            "pc",
            "laptop",
            "periferico",
            "impresora",
            "escaner",
            "telefono",
            "proyector",
            "infraestructura",
            "licencia",
            "bien_control_admin",
            "modem"
    );

    private static final List<String> CAMPOS_COMUNES_EQUIPO = Arrays.asList(
            "codigo_megan",
            "codigo_sbye",
            "descripcion",
            "marca",
            "modelo",
            "sn",
            "fecha_ingreso",
            "estado",
            "observacion",
            "ultima_actualizacion",
            "ultimo_mantenimiento"
    );

    private static final String BASE_QUERY =
            "SELECT e.id_equipo, e.tipo_equipo, e.codigo_sbye, e.codigo_megan, e.descripcion, " +
            "e.marca, e.modelo, e.sn, e.estado, e.observacion, " +
            "c.nombre AS custodio_nombre, " +
            "u.edificio, u.piso, u.direccion, " +
            "pc.procesador AS pc_procesador, pc.ram AS pc_ram, pc.disco_duro AS pc_disco_duro, pc.so AS pc_so, pc.ip AS pc_ip, " +
            "l.procesador AS laptop_procesador, l.ram AS laptop_ram, l.disco_duro AS laptop_disco_duro, l.so AS laptop_so, l.ip AS laptop_ip, " +
            "p.tipo_periferico, p.caracteristicas AS periferico_caracteristicas, " +
            "i.tipo_impresora, i.ip AS impresora_ip, i.caracteristicas AS impresora_caracteristicas, " +
            "es.caracteristicas AS escaner_caracteristicas, " +
            "t.caracteristicas AS telefono_caracteristicas, " +
            "pr.caracteristicas AS proyector_caracteristicas, pr.anotaciones AS proyector_anotaciones, " +
            "inf.subtipo AS infraestructura_subtipo, inf.caracteristicas AS infraestructura_caracteristicas, inf.anotaciones AS infraestructura_anotaciones, " +
            "li.caracteristicas AS licencia_caracteristicas, li.anotaciones AS licencia_anotaciones, " +
            "m.numero_contrato AS modem_numero_contrato, m.numero_servicio AS modem_numero_servicio, " +
            "m.plan_comercial AS modem_plan_comercial, m.estado_servicio AS modem_estado_servicio, m.megas AS modem_megas, " +
            "m.acreditacion AS modem_acreditacion, m.caracteristicas AS modem_caracteristicas, m.anotaciones AS modem_anotaciones, " +
            "bca.codigo_anterior " +
            "FROM equipo e " +
            "LEFT JOIN custodio c ON c.id_custodio = e.id_custodio_actual " +
            "LEFT JOIN ubicacion u ON u.id_ubicacion = e.id_ubicacion " +
            "LEFT JOIN pc pc ON pc.id_equipo = e.id_equipo " +
            "LEFT JOIN laptop l ON l.id_equipo = e.id_equipo " +
            "LEFT JOIN periferico p ON p.id_equipo = e.id_equipo " +
            "LEFT JOIN impresora i ON i.id_equipo = e.id_equipo " +
            "LEFT JOIN escaner es ON es.id_equipo = e.id_equipo " +
            "LEFT JOIN telefono t ON t.id_equipo = e.id_equipo " +
            "LEFT JOIN proyector pr ON pr.id_equipo = e.id_equipo " +
            "LEFT JOIN infraestructura inf ON inf.id_equipo = e.id_equipo " +
            "LEFT JOIN licencia li ON li.id_equipo = e.id_equipo " +
            "LEFT JOIN modem m ON m.id_equipo = e.id_equipo " +
            "LEFT JOIN bien_control_admin bca ON bca.id_equipo = e.id_equipo ";

    public List<InventoryItemDTO> obtenerInventarioCompleto() throws Exception {
        return consultarInventario(null);
    }

    public List<InventoryItemDTO> obtenerInventarioPorTipo(String tipo) throws Exception {
        return consultarInventario(tipo);
    }

    public List<InventoryItemDTO> obtenerInventarioPorCustodio(Integer idCustodio) throws Exception {
        return consultarInventarioRestringido(null, idCustodio);
    }

    public List<InventoryItemDTO> obtenerInventarioPorTipoYCustodio(String tipo, Integer idCustodio) throws Exception {
        return consultarInventarioRestringido(tipo, idCustodio);
    }

    public Map<String, Object> obtenerCatalogoCamposFormulario() throws Exception {
        Map<String, Object> catalogo = new LinkedHashMap<>();
        try (Connection conn = DatabaseService.getConnection()) {
            String schema = conn.getCatalog();
            for (String tipo : TIPOS_FORMULARIO) {
                Map<String, Object> config = new LinkedHashMap<>();
                config.put("label", etiquetaTipo(tipo));
                config.put("hint", construirHintTipo(tipo));
                config.put("fields", obtenerCamposPorTipo(conn, schema, tipo));
                catalogo.put(tipo, config);
            }
        }
        return catalogo;
    }

    public List<Map<String, Object>> obtenerCustodiosActivos() throws Exception {
        return obtenerCustodiosActivos(null, null);
    }

    public List<Map<String, Object>> obtenerUbicaciones(String query, Integer limit) throws Exception {
        List<Map<String, Object>> ubicaciones = new ArrayList<>();
        String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        boolean tieneFiltro = !term.isEmpty();
        int limite = limit != null && limit > 0 ? Math.min(limit, 500) : 0;

        StringBuilder sql = new StringBuilder();
        sql.append("SELECT id_ubicacion, edificio, piso, direccion FROM ubicacion ");
        if (tieneFiltro) {
            sql.append("WHERE LOWER(CONCAT_WS(' ', edificio, piso, direccion)) LIKE ? ");
        }
        sql.append("ORDER BY edificio, piso, direccion");
        if (limite > 0) {
            sql.append(" LIMIT ?");
        }

        try (Connection conn = DatabaseService.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql.toString())) {
            int index = 1;
            if (tieneFiltro) {
                ps.setString(index++, "%" + term + "%");
            }
            if (limite > 0) {
                ps.setInt(index, limite);
            }
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", rs.getInt("id_ubicacion"));
                    item.put("edificio", rs.getString("edificio"));
                    item.put("piso", rs.getString("piso"));
                    item.put("direccion", rs.getString("direccion"));
                    item.put("nombre", unirNoVacios(rs.getString("edificio"), rs.getString("piso"), rs.getString("direccion")));
                    ubicaciones.add(item);
                }
            }
        }
        return ubicaciones;
    }

    public List<String> obtenerValoresDistintos(String campo, String query, Integer limit) throws Exception {
        if (!"marca".equals(campo) && !"modelo".equals(campo)) {
            throw new IllegalArgumentException("Catalogo no permitido.");
        }
        List<String> valores = new ArrayList<>();
        String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        boolean tieneFiltro = !term.isEmpty();
        int limite = limit != null && limit > 0 ? Math.min(limit, 500) : 50;
        String sql = "SELECT DISTINCT " + campo + " FROM equipo " +
                "WHERE " + campo + " IS NOT NULL AND TRIM(" + campo + ") <> '' " +
                (tieneFiltro ? "AND LOWER(" + campo + ") LIKE ? " : "") +
                "ORDER BY " + campo + " LIMIT ?";

        try (Connection conn = DatabaseService.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            int index = 1;
            if (tieneFiltro) {
                ps.setString(index++, "%" + term + "%");
            }
            ps.setInt(index, limite);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    valores.add(rs.getString(1));
                }
            }
        }
        return valores;
    }

    public List<Map<String, Object>> obtenerCustodiosActivos(String query, Integer limit) throws Exception {
        List<Map<String, Object>> custodios = new ArrayList<>();
        String term = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        boolean tieneFiltro = !term.isEmpty();
        int limite = limit != null && limit > 0 ? Math.min(limit, 500) : 0;

        try (Connection conn = DatabaseService.getConnection()) {
            boolean tieneTablaUsuario = existeTabla(conn, "usuario");
            StringBuilder sql = new StringBuilder();
            if (tieneTablaUsuario) {
                sql.append("SELECT c.id_custodio, c.nombre, u.username AS username ")
                        .append("FROM custodio c ")
                        .append("LEFT JOIN usuario u ON u.id_custodio = c.id_custodio AND u.rol = 'CUSTODIO' AND u.activo = 1 ")
                        .append("WHERE c.activo = 1 ");
                if (tieneFiltro) {
                    sql.append("AND (LOWER(c.nombre) LIKE ? OR LOWER(u.username) LIKE ?) ");
                }
                sql.append("ORDER BY c.nombre");
                if (limite > 0) {
                    sql.append(" LIMIT ?");
                }
            } else {
                sql.append("SELECT c.id_custodio, c.nombre ")
                        .append("FROM custodio c ")
                        .append("WHERE c.activo = 1 ");
                if (tieneFiltro) {
                    sql.append("AND LOWER(c.nombre) LIKE ? ");
                }
                sql.append("ORDER BY c.nombre");
                if (limite > 0) {
                    sql.append(" LIMIT ?");
                }
            }

            try (PreparedStatement ps = conn.prepareStatement(sql.toString())) {
                int index = 1;
                if (tieneFiltro) {
                    String like = "%" + term + "%";
                    ps.setString(index++, like);
                    if (tieneTablaUsuario) {
                        ps.setString(index++, like);
                    }
                }
                if (limite > 0) {
                    ps.setInt(index, limite);
                }

                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", rs.getInt("id_custodio"));
                        item.put("nombre", rs.getString("nombre"));
                        if (tieneTablaUsuario) {
                            item.put("username", rs.getString("username"));
                        }
                        custodios.add(item);
                    }
                }
            }
        }

        return custodios;
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

    public boolean equipoPerteneceACustodio(Integer idEquipo, Integer idCustodio) throws Exception {
        String sql = "SELECT 1 FROM equipo WHERE id_equipo = ? AND id_custodio_actual = ? LIMIT 1";
        try (Connection conn = DatabaseService.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idEquipo);
            ps.setInt(2, idCustodio);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    public InventoryItemDTO actualizarCustodioEquipo(
            Integer idEquipo,
            Integer nuevoIdCustodio,
            String usuario,
            String rol,
            boolean registrarAuditoria) throws Exception {
        try (Connection conn = DatabaseService.getConnection()) {
            conn.setAutoCommit(false);
            try {
                Integer idCustodioAnterior = obtenerIdCustodioActual(conn, idEquipo);
                if (idCustodioAnterior == null) {
                    throw new IllegalArgumentException("No se encontro el equipo indicado.");
                }

                String nombreAnterior = obtenerNombreCustodio(conn, idCustodioAnterior);
                String nombreNuevo = obtenerNombreCustodio(conn, nuevoIdCustodio);
                if (nombreNuevo == null || nombreNuevo.trim().isEmpty()) {
                    throw new IllegalArgumentException("Custodio no valido.");
                }

                String update = "UPDATE equipo SET id_custodio_actual = ?, ultima_actualizacion = CURDATE() WHERE id_equipo = ?";
                try (PreparedStatement ps = conn.prepareStatement(update)) {
                    ps.setInt(1, nuevoIdCustodio);
                    ps.setInt(2, idEquipo);
                    ps.executeUpdate();
                }

                if (registrarAuditoria) {
                    asegurarTablaAuditoria(conn);
                    registrarAuditoria(conn, idEquipo, usuario, rol, "Cambio de custodio", nombreAnterior, nombreNuevo);
                }

                conn.commit();
                return obtenerInventarioPorId(conn, idEquipo);
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    public InventoryItemDTO actualizarEstadoEquipo(Integer idEquipo, String nuevoEstado) throws Exception {
        String estado = normalizarEstado(nuevoEstado);
        if (!"OPERATIVO".equals(estado) && !"NO OPERATIVO".equals(estado) && !"REPORTADO PARA DAR DE BAJA".equals(estado)) {
            throw new IllegalArgumentException("Estado no permitido.");
        }

        try (Connection conn = DatabaseService.getConnection()) {
            conn.setAutoCommit(false);
            try {
                String update = "UPDATE equipo SET estado = ?, ultima_actualizacion = CURDATE() WHERE id_equipo = ?";
                try (PreparedStatement ps = conn.prepareStatement(update)) {
                    ps.setString(1, estado);
                    ps.setInt(2, idEquipo);
                    int updated = ps.executeUpdate();
                    if (updated == 0) {
                        throw new IllegalArgumentException("No se encontro el equipo indicado.");
                    }
                }
                conn.commit();
                return obtenerInventarioPorId(conn, idEquipo);
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    public List<Map<String, Object>> obtenerHistorialEquipo(Integer idEquipo) throws Exception {
        try (Connection conn = DatabaseService.getConnection()) {
            asegurarTablaAuditoria(conn);
            String sql = "SELECT id, usuario, rol, accion, valor_anterior, valor_nuevo, fecha " +
                    "FROM auditoria_custodio WHERE id_equipo = ? ORDER BY fecha DESC, id DESC";
            List<Map<String, Object>> historial = new ArrayList<>();
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, idEquipo);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("id", rs.getInt("id"));
                        item.put("usuario", rs.getString("usuario"));
                        item.put("rol", rs.getString("rol"));
                        item.put("accion", rs.getString("accion"));
                        item.put("valorAnterior", rs.getString("valor_anterior"));
                        item.put("valorNuevo", rs.getString("valor_nuevo"));
                        item.put("fecha", rs.getTimestamp("fecha"));
                        historial.add(item);
                    }
                }
            }
            return historial;
        }
    }

    public InventoryItemDTO crearEquipo(String tipo, Map<String, Object> payload) throws Exception {
        validarTipoFormulario(tipo);
        if (payload == null) {
            payload = new LinkedHashMap<>();
        }
        try (Connection conn = DatabaseService.getConnection()) {
            conn.setAutoCommit(false);
            try {
                String schema = conn.getCatalog();
                Set<String> columnasEquipo = obtenerColumnasPermitidas(conn, schema, "equipo", new HashSet<>(Arrays.asList(
                        "id_equipo", "tipo_equipo", "creado_en", "actualizado_en"
                )));
                Set<String> columnasHija = obtenerColumnasPermitidas(conn, schema, tablaHijaPorTipo(tipo), new HashSet<>(Arrays.asList("id_equipo")));
                payload.remove("costo");
                resolverRelacionesCatalogo(conn, payload);

                Integer idEquipo = insertarEquipo(conn, tipo, payload, columnasEquipo);
                insertarTablaHija(conn, tipo, idEquipo, payload, columnasHija);

                conn.commit();
                return obtenerInventarioPorId(conn, idEquipo);
            } catch (Exception e) {
                conn.rollback();
                throw e;
            } finally {
                conn.setAutoCommit(true);
            }
        }
    }

    private List<InventoryItemDTO> consultarInventario(String tipo) throws Exception {
        List<InventoryItemDTO> items = new ArrayList<>();
        String sql = BASE_QUERY
                + "WHERE e.tipo_equipo IN ('pc','laptop','periferico','impresora','escaner','telefono','proyector','infraestructura','licencia','bien_control_admin','modem') "
                + (tipo != null && !tipo.trim().isEmpty() ? "AND e.tipo_equipo = ? " : "")
                + "ORDER BY e.id_equipo ASC";

        try (Connection conn = DatabaseService.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            if (tipo != null && !tipo.trim().isEmpty()) {
                ps.setString(1, tipo);
            }

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    items.add(mapearItem(rs));
                }
            }
        }

        return items;
    }

    private List<InventoryItemDTO> consultarInventarioRestringido(String tipo, Integer idCustodio) throws Exception {
        if (idCustodio == null) {
            return Collections.emptyList();
        }

        List<InventoryItemDTO> items = new ArrayList<>();
        String sql = BASE_QUERY
                + "WHERE e.tipo_equipo IN ('pc','laptop','periferico','impresora','escaner','telefono','proyector','infraestructura','licencia','bien_control_admin','modem') "
                + "AND e.id_custodio_actual = ? "
                + (tipo != null && !tipo.trim().isEmpty() ? "AND e.tipo_equipo = ? " : "")
                + "ORDER BY e.id_equipo ASC";

        try (Connection conn = DatabaseService.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, idCustodio);
            if (tipo != null && !tipo.trim().isEmpty()) {
                ps.setString(2, tipo);
            }

            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    items.add(mapearItem(rs));
                }
            }
        }
        return items;
    }

    private InventoryItemDTO mapearItem(ResultSet rs) throws Exception {
        InventoryItemDTO item = new InventoryItemDTO();
        String tipo = valor(rs, "tipo_equipo");

        item.setId(rs.getInt("id_equipo"));
        item.setTipo(tipo);
        item.setSubtipo(valor(rs, "infraestructura_subtipo"));
        item.setCodigoSbai(valor(rs, "codigo_sbye"));
        item.setCodigoMegan(valor(rs, "codigo_megan"));
        item.setDescripcion(valor(rs, "descripcion"));
        item.setMarca(valor(rs, "marca"));
        item.setModelo(valor(rs, "modelo"));
        item.setNumeroSerie(valor(rs, "sn"));
        item.setCustodio(valor(rs, "custodio_nombre"));
        item.setUbicacion(construirUbicacion(rs));
        item.setEstado(normalizarEstado(valor(rs, "estado")));
        item.setObservacion(valor(rs, "observacion"));
        item.setProcesador(coalesce(valor(rs, "pc_procesador"), valor(rs, "laptop_procesador")));
        item.setRam(coalesce(valor(rs, "pc_ram"), valor(rs, "laptop_ram")));
        item.setDiscoDuro(coalesce(valor(rs, "pc_disco_duro"), valor(rs, "laptop_disco_duro")));
        item.setSistemaOperativo(coalesce(valor(rs, "pc_so"), valor(rs, "laptop_so")));
        item.setIp(coalesce(valor(rs, "pc_ip"), valor(rs, "laptop_ip"), valor(rs, "impresora_ip")));
        item.setCaracteristicas(construirCaracteristicas(rs, tipo));
        return item;
    }

    private String construirUbicacion(ResultSet rs) throws Exception {
        List<String> partes = new ArrayList<>();
        agregarSiTieneTexto(partes, valor(rs, "edificio"));
        agregarSiTieneTexto(partes, valor(rs, "piso"));
        agregarSiTieneTexto(partes, valor(rs, "direccion"));
        return String.join(" - ", partes);
    }

    private String construirCaracteristicas(ResultSet rs, String tipo) throws Exception {
        if ("periferico".equals(tipo)) {
            return unirNoVacios(valor(rs, "tipo_periferico"), valor(rs, "periferico_caracteristicas"));
        }
        if ("impresora".equals(tipo)) {
            return unirNoVacios(valor(rs, "tipo_impresora"), valor(rs, "impresora_caracteristicas"));
        }
        if ("escaner".equals(tipo)) {
            return valor(rs, "escaner_caracteristicas");
        }
        if ("telefono".equals(tipo)) {
            return valor(rs, "telefono_caracteristicas");
        }
        if ("proyector".equals(tipo)) {
            return unirNoVacios(valor(rs, "proyector_caracteristicas"), valor(rs, "proyector_anotaciones"));
        }
        if ("infraestructura".equals(tipo)) {
            return unirNoVacios(valor(rs, "infraestructura_subtipo"), valor(rs, "infraestructura_caracteristicas"), valor(rs, "infraestructura_anotaciones"));
        }
        if ("licencia".equals(tipo)) {
            return unirNoVacios(valor(rs, "licencia_caracteristicas"), valor(rs, "licencia_anotaciones"));
        }
        if ("bien_control_admin".equals(tipo)) {
            return valor(rs, "codigo_anterior");
        }
        if ("modem".equals(tipo)) {
            return unirNoVacios(
                    valor(rs, "modem_numero_contrato"),
                    valor(rs, "modem_numero_servicio"),
                    valor(rs, "modem_plan_comercial"),
                    valor(rs, "modem_estado_servicio"),
                    valor(rs, "modem_megas"),
                    valor(rs, "modem_acreditacion"),
                    valor(rs, "modem_caracteristicas"),
                    valor(rs, "modem_anotaciones"));
        }
        return unirNoVacios(itemProceso(rs), itemMemoria(rs), itemDisco(rs), itemSistema(rs));
    }

    private List<Map<String, Object>> obtenerCamposPorTipo(Connection conn, String schema, String tipo) throws Exception {
        List<Map<String, Object>> campos = new ArrayList<>();
        campos.addAll(obtenerCamposEquipo(conn, schema));
        campos.addAll(obtenerCamposTabla(conn, schema, tablaHijaPorTipo(tipo), true));
        return campos;
    }

    private List<Map<String, Object>> obtenerCamposEquipo(Connection conn, String schema) throws Exception {
        List<Map<String, Object>> campos = new ArrayList<>();
        String sql = "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
                "WHERE table_schema = ? AND table_name = 'equipo' ORDER BY ordinal_position";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String columna = rs.getString("column_name");
                    if (!CAMPOS_COMUNES_EQUIPO.contains(columna)) {
                        continue;
                    }
                    campos.add(crearCampoMeta(columna, rs.getString("data_type"), rs.getString("is_nullable"), "equipo"));
                }
            }
        }
        agregarCamposRelacion(campos);
        return campos;
    }

    private void agregarCamposRelacion(List<Map<String, Object>> campos) {
        campos.add(crearCampoMeta("custodio_nombre", "varchar", "YES", "custodio"));
        campos.add(crearCampoMeta("ubicacion_edificio", "varchar", "YES", "ubicacion"));
        campos.add(crearCampoMeta("ubicacion_piso", "varchar", "YES", "ubicacion"));
        campos.add(crearCampoMeta("ubicacion_direccion", "varchar", "YES", "ubicacion"));
    }

    private List<Map<String, Object>> obtenerCamposTabla(Connection conn, String schema, String tabla, boolean excluirIdEquipo) throws Exception {
        List<Map<String, Object>> campos = new ArrayList<>();
        String sql = "SELECT column_name, data_type, is_nullable FROM information_schema.columns " +
                "WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            ps.setString(2, tabla);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String columna = rs.getString("column_name");
                    if (excluirIdEquipo && "id_equipo".equals(columna)) {
                        continue;
                    }
                    campos.add(crearCampoMeta(columna, rs.getString("data_type"), rs.getString("is_nullable"), tabla));
                }
            }
        }
        return campos;
    }

    private Set<String> obtenerColumnasPermitidas(Connection conn, String schema, String tabla, Set<String> excluidas) throws Exception {
        Set<String> columnas = new HashSet<>();
        String sql = "SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, schema);
            ps.setString(2, tabla);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    String nombre = rs.getString("column_name");
                    if (!excluidas.contains(nombre)) {
                        columnas.add(nombre);
                    }
                }
            }
        }
        return columnas;
    }

    private void resolverRelacionesCatalogo(Connection conn, Map<String, Object> payload) throws Exception {
        if (!payload.containsKey("id_custodio_actual")) {
            String nombreCustodio = texto(payload.get("custodio_nombre"));
            if (!nombreCustodio.isEmpty()) {
                payload.put("id_custodio_actual", obtenerOCrearCustodio(conn, nombreCustodio));
            }
        }

        if (!payload.containsKey("id_ubicacion")) {
            String edificio = texto(payload.get("ubicacion_edificio"));
            String piso = texto(payload.get("ubicacion_piso"));
            String direccion = texto(payload.get("ubicacion_direccion"));
            if (!edificio.isEmpty() || !piso.isEmpty() || !direccion.isEmpty()) {
                payload.put("id_ubicacion", obtenerOCrearUbicacion(conn, edificio, piso, direccion));
            }
        }
    }

    private Integer obtenerOCrearCustodio(Connection conn, String nombre) throws Exception {
        String select = "SELECT id_custodio FROM custodio WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?)) LIMIT 1";
        try (PreparedStatement ps = conn.prepareStatement(select)) {
            ps.setString(1, nombre);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("id_custodio");
                }
            }
        }

        String insert = "INSERT INTO custodio (nombre, activo) VALUES (?, 1)";
        try (PreparedStatement ps = conn.prepareStatement(insert, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, nombre);
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        }
        throw new SQLException("No se pudo crear el custodio.");
    }

    private Integer obtenerOCrearUbicacion(Connection conn, String edificio, String piso, String direccion) throws Exception {
        String select = "SELECT id_ubicacion FROM ubicacion " +
                "WHERE COALESCE(LOWER(TRIM(edificio)), '') = LOWER(TRIM(?)) " +
                "AND COALESCE(LOWER(TRIM(piso)), '') = LOWER(TRIM(?)) " +
                "AND COALESCE(LOWER(TRIM(direccion)), '') = LOWER(TRIM(?)) LIMIT 1";
        try (PreparedStatement ps = conn.prepareStatement(select)) {
            ps.setString(1, edificio);
            ps.setString(2, piso);
            ps.setString(3, direccion);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt("id_ubicacion");
                }
            }
        }

        String insert = "INSERT INTO ubicacion (edificio, piso, direccion) VALUES (?, ?, ?)";
        try (PreparedStatement ps = conn.prepareStatement(insert, Statement.RETURN_GENERATED_KEYS)) {
            setNullableString(ps, 1, edificio);
            setNullableString(ps, 2, piso);
            setNullableString(ps, 3, direccion);
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        }
        throw new SQLException("No se pudo crear la ubicacion.");
    }

    private void setNullableString(PreparedStatement ps, int index, String value) throws Exception {
        if (value == null || value.trim().isEmpty()) {
            ps.setNull(index, Types.VARCHAR);
            return;
        }
        ps.setString(index, value.trim());
    }

    private Integer insertarEquipo(Connection conn, String tipo, Map<String, Object> payload, Set<String> columnasEquipo) throws Exception {
        List<String> columnas = new ArrayList<>();
        columnas.add("tipo_equipo");
        for (String columna : columnasEquipo) {
            if (payload.containsKey(columna) && !esValorVacio(payload.get(columna))) {
                columnas.add(columna);
            }
        }

        String sql = "INSERT INTO equipo (" + String.join(", ", columnas) + ") VALUES (" +
                String.join(", ", Collections.nCopies(columnas.size(), "?")) + ")";

        try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            int index = 1;
            ps.setString(index++, tipo);
            for (int i = 1; i < columnas.size(); i++) {
                setValorParametro(ps, index++, columnas.get(i), payload.get(columnas.get(i)));
            }
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        }
        throw new SQLException("No se pudo obtener el id del equipo creado.");
    }

    private void insertarTablaHija(Connection conn, String tipo, Integer idEquipo, Map<String, Object> payload, Set<String> columnasHija) throws Exception {
        String tabla = tablaHijaPorTipo(tipo);
        List<String> columnas = new ArrayList<>();
        columnas.add("id_equipo");
        for (String columna : columnasHija) {
            if (payload.containsKey(columna) && !esValorVacio(payload.get(columna))) {
                columnas.add(columna);
            }
        }

        String sql = "INSERT INTO " + tabla + " (" + String.join(", ", columnas) + ") VALUES (" +
                String.join(", ", Collections.nCopies(columnas.size(), "?")) + ")";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idEquipo);
            for (int i = 1; i < columnas.size(); i++) {
                setValorParametro(ps, i + 1, columnas.get(i), payload.get(columnas.get(i)));
            }
            ps.executeUpdate();
        }
    }

    private InventoryItemDTO obtenerInventarioPorId(Connection conn, Integer idEquipo) throws Exception {
        String sql = BASE_QUERY + "WHERE e.id_equipo = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idEquipo);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapearItem(rs);
                }
            }
        }
        throw new SQLException("No se pudo recuperar el equipo creado.");
    }

    private Integer obtenerIdCustodioActual(Connection conn, Integer idEquipo) throws Exception {
        String sql = "SELECT id_custodio_actual FROM equipo WHERE id_equipo = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idEquipo);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Object valor = rs.getObject("id_custodio_actual");
                    return valor == null ? null : ((Number) valor).intValue();
                }
            }
        }
        return null;
    }

    private String obtenerNombreCustodio(Connection conn, Integer idCustodio) throws Exception {
        if (idCustodio == null) {
            return "";
        }
        String sql = "SELECT nombre FROM custodio WHERE id_custodio = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idCustodio);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("nombre");
                }
            }
        }
        return null;
    }

    private void asegurarTablaAuditoria(Connection conn) throws Exception {
        String ddl = "CREATE TABLE IF NOT EXISTS auditoria_custodio (" +
                "id INT NOT NULL AUTO_INCREMENT PRIMARY KEY," +
                "id_equipo INT NOT NULL," +
                "usuario VARCHAR(120) NOT NULL," +
                "rol VARCHAR(40) NOT NULL," +
                "accion VARCHAR(160) NOT NULL," +
                "valor_anterior TEXT NULL," +
                "valor_nuevo TEXT NULL," +
                "fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP," +
                "KEY idx_auditoria_equipo (id_equipo)," +
                "KEY idx_auditoria_usuario (usuario)," +
                "KEY idx_auditoria_fecha (fecha)" +
                ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
        try (PreparedStatement ps = conn.prepareStatement(ddl)) {
            ps.execute();
        }
    }

    private void registrarAuditoria(
            Connection conn,
            Integer idEquipo,
            String usuario,
            String rol,
            String accion,
            String valorAnterior,
            String valorNuevo) throws Exception {
        String sql = "INSERT INTO auditoria_custodio " +
                "(id_equipo, usuario, rol, accion, valor_anterior, valor_nuevo, fecha) " +
                "VALUES (?, ?, ?, ?, ?, ?, NOW())";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, idEquipo);
            ps.setString(2, usuario != null ? usuario : "ANONIMO");
            ps.setString(3, rol != null ? rol : "DESCONOCIDO");
            ps.setString(4, accion);
            ps.setString(5, valorAnterior);
            ps.setString(6, valorNuevo);
            ps.executeUpdate();
        }
    }

    private void setValorParametro(PreparedStatement ps, int index, String columna, Object valor) throws Exception {
        if (esValorVacio(valor)) {
            ps.setNull(index, Types.NULL);
            return;
        }

        String texto = String.valueOf(valor).trim();
        if ("costo".equals(columna)) {
            ps.setBigDecimal(index, new BigDecimal(texto));
            return;
        }
        if ("megas".equals(columna) || "id_custodio_actual".equals(columna) || "id_ubicacion".equals(columna)) {
            ps.setInt(index, Integer.parseInt(texto));
            return;
        }
        if (columna.startsWith("fecha_") || "ultima_actualizacion".equals(columna) || "ultimo_mantenimiento".equals(columna)) {
            ps.setDate(index, Date.valueOf(texto));
            return;
        }
        ps.setString(index, texto);
    }

    private boolean esValorVacio(Object valor) {
        return valor == null || String.valueOf(valor).trim().isEmpty();
    }

    private void validarTipoFormulario(String tipo) {
        if (!TIPOS_FORMULARIO.contains(tipo)) {
            throw new IllegalArgumentException("Tipo de equipo no permitido: " + tipo);
        }
    }

    private Map<String, Object> crearCampoMeta(String columna, String dataType, String nullable, String origen) {
        Map<String, Object> campo = new LinkedHashMap<>();
        campo.put("name", columna);
        campo.put("label", etiquetaCampo(columna));
        campo.put("dataType", dataType);
        campo.put("required", "NO".equalsIgnoreCase(nullable));
        campo.put("source", origen);
        campo.put("inputType", sugerirInputType(columna, dataType));
        return campo;
    }

    private String tablaHijaPorTipo(String tipo) {
        if ("bien_control_admin".equals(tipo)) {
            return "bien_control_admin";
        }
        return tipo;
    }

    private String sugerirInputType(String columna, String dataType) {
        if ("estado".equals(columna)) {
            return "select";
        }
        if (columna.startsWith("fecha_") || "ultima_actualizacion".equals(columna) || "ultimo_mantenimiento".equals(columna)) {
            return "date";
        }
        if ("costo".equals(columna) || "megas".equals(columna)) {
            return "number";
        }
        if (dataType != null && ("text".equalsIgnoreCase(dataType) || "mediumtext".equalsIgnoreCase(dataType) || "longtext".equalsIgnoreCase(dataType))) {
            return "textarea";
        }
        return "text";
    }

    private String etiquetaTipo(String tipo) {
        switch (tipo) {
            case "pc": return "PC";
            case "laptop": return "Laptop";
            case "periferico": return "Periferico";
            case "impresora": return "Impresora";
            case "escaner": return "Escaner";
            case "telefono": return "Telefono";
            case "proyector": return "Proyector";
            case "infraestructura": return "Infraestructura";
            case "licencia": return "Licencia";
            case "bien_control_admin": return "Bien de control administrativo";
            case "modem": return "Modem";
            default: return tipo;
        }
    }

    private String construirHintTipo(String tipo) {
        return "";
    }

    private String etiquetaCampo(String columna) {
        switch (columna) {
            case "codigo_megan": return "Codigo Megan";
            case "codigo_sbye": return "Codigo SBYE";
            case "sn": return "Numero de serie";
            case "fecha_ingreso": return "Fecha de ingreso";
            case "ultima_actualizacion": return "Ultima actualizacion";
            case "ultimo_mantenimiento": return "Ultimo mantenimiento";
            case "custodio_nombre": return "Custodio actual";
            case "ubicacion_edificio": return "Edificio";
            case "ubicacion_piso": return "Piso";
            case "ubicacion_direccion": return "Direccion / Area";
            case "tipo_periferico": return "Tipo de periferico";
            case "tipo_impresora": return "Tipo de impresora";
            case "codigo_anterior": return "Codigo anterior";
            case "numero_contrato": return "Numero de contrato";
            case "numero_servicio": return "Numero de servicio";
            case "plan_comercial": return "Plan comercial";
            case "estado_servicio": return "Estado del servicio";
            case "anterior_custodio": return "Custodio anterior";
            default:
                String normalizado = columna.replace('_', ' ');
                return Character.toUpperCase(normalizado.charAt(0)) + normalizado.substring(1);
        }
    }

    private String normalizarEstado(String estadoOriginal) {
        String valor = estadoOriginal != null ? estadoOriginal.trim().toUpperCase() : "";
        if ("OPERATIVO".equals(valor) || "ACTIVO".equals(valor)) {
            return "OPERATIVO";
        }
        if ("NO OPERATIVO".equals(valor) || "INACTIVO".equals(valor) || "DAÑADO".equals(valor) || "DANADO".equals(valor)) {
            return "NO OPERATIVO";
        }
        if ("REPORTADO PARA DAR DE BAJA".equals(valor) || "REPORTADO PARA BAJA".equals(valor) || "BAJA".equals(valor)) {
            return "REPORTADO PARA DAR DE BAJA";
        }
        return "NO OPERATIVO";
    }

    private String itemProceso(ResultSet rs) throws Exception {
        return coalesce(valor(rs, "pc_procesador"), valor(rs, "laptop_procesador"));
    }

    private String itemMemoria(ResultSet rs) throws Exception {
        return coalesce(valor(rs, "pc_ram"), valor(rs, "laptop_ram"));
    }

    private String itemDisco(ResultSet rs) throws Exception {
        return coalesce(valor(rs, "pc_disco_duro"), valor(rs, "laptop_disco_duro"));
    }

    private String itemSistema(ResultSet rs) throws Exception {
        return coalesce(valor(rs, "pc_so"), valor(rs, "laptop_so"));
    }

    private String valor(ResultSet rs, String columna) throws Exception {
        String valor = rs.getString(columna);
        return valor != null ? valor.trim() : "";
    }

    private String texto(Object valor) {
        return valor == null ? "" : String.valueOf(valor).trim();
    }

    private String coalesce(String... valores) {
        for (String valor : valores) {
            if (valor != null && !valor.trim().isEmpty()) {
                return valor.trim();
            }
        }
        return "";
    }

    private String unirNoVacios(String... valores) {
        List<String> partes = new ArrayList<>();
        for (String valor : valores) {
            agregarSiTieneTexto(partes, valor);
        }
        return String.join(" | ", partes);
    }

    private void agregarSiTieneTexto(List<String> partes, String valor) {
        if (valor != null && !valor.trim().isEmpty()) {
            partes.add(valor.trim());
        }
    }
}
