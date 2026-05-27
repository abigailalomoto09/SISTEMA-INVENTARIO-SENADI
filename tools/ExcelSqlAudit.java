import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.openxml4j.opc.PackageAccess;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

public class ExcelSqlAudit {
    private static final Pattern CUSTODIO_INSERT = Pattern.compile(
        "INSERT\\s+INTO\\s+custodio\\s*\\(nombre\\)\\s*VALUES\\s*(.*?);",
        Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern QUOTED = Pattern.compile("'((?:''|[^'])*)'");
    private static final Pattern EQUIPO_INSERT = Pattern.compile(
        "INSERT\\s+IGNORE\\s+INTO\\s+equipo\\s*\\([^)]*id_custodio_actual\\s*,\\s*id_ubicacion\\s*\\)\\s*VALUES",
        Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern NORMALIZE_EQUIPO_UPDATE = Pattern.compile(
        "UPDATE\\s+equipo\\s+SET\\s+id_custodio_actual\\s*=\\s*" +
        "\\(SELECT\\s+id_custodio\\s+FROM\\s+\\(SELECT\\s+id_custodio\\s+FROM\\s+custodio\\s+WHERE\\s+nombre\\s*=\\s*'((?:''|[^'])*)'\\s+LIMIT\\s+1\\)\\s+t\\)\\s*" +
        "WHERE\\s+id_custodio_actual\\s+IN\\s*" +
        "\\(\\s*SELECT\\s+id_custodio\\s+FROM\\s+\\(SELECT\\s+id_custodio\\s+FROM\\s+custodio\\s+WHERE\\s+nombre\\s+(?:IN\\s*\\((.*?)\\)|=\\s*'((?:''|[^'])*)')\\)\\s+t\\);",
        Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private static final class ExcelRow {
        String type;
        String codigoMegan;
        String codigoSbye;
        String sn;
        String custodio;
        String sheet;
        int rowNumber;

        String keyFull() {
            return key(type, codigoMegan, codigoSbye, sn);
        }

        String keySbye() {
            return type + "|" + normCode(codigoSbye);
        }

        String keySn() {
            return type + "|" + normCode(sn);
        }
    }

    private static final class SqlTuple {
        List<String> values = new ArrayList<>();
        int field13Start;
        int field13End;
        int start;
    }

    private static final class Replacement {
        int start;
        int end;
        String value;

        Replacement(int start, int end, String value) {
            this.start = start;
            this.end = end;
            this.value = value;
        }
    }

    private static final class Decision {
        ExcelRow row;
        String matchMode;
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("Usage: ExcelSqlAudit <xlsx> <sql> [--apply]");
            System.exit(2);
        }

        boolean apply = args.length > 2 && "--apply".equals(args[2]);
        Path sqlPath = Path.of(args[1]);
        String sql = Files.readString(sqlPath, StandardCharsets.UTF_8);
        Map<String, Integer> custIdByName = parseCustodios(sql);
        Map<Integer, Integer> canonicalIdById = parseCanonicalCustodioIds(sql, custIdByName);
        Map<Integer, String> nameById = custIdByName.entrySet().stream()
            .collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey, (a, b) -> a, LinkedHashMap::new));
        List<ExcelRow> excelRows = readExcel(args[0]);
        Index index = new Index(excelRows);

        List<SqlTuple> tuples = parseEquipoTuples(sql);
        StringBuilder out = new StringBuilder(sql);
        List<String> changes = new ArrayList<>();
        List<Replacement> replacements = new ArrayList<>();
        int matched = 0;
        int noExcelMatch = 0;
        int noCustodioMatch = 0;
        int alreadyOk = 0;
        int ambiguous = 0;

        for (SqlTuple tuple : tuples) {
            String type = value(tuple, 0);
            String cm = value(tuple, 1);
            String cs = value(tuple, 2);
            String sn = value(tuple, 6);
            String current = rawValue(tuple, 13);
            Decision decision = index.find(type, cm, cs, sn);
            if (decision == null) {
                noExcelMatch++;
                continue;
            }
            if ("ambiguous".equals(decision.matchMode)) {
                ambiguous++;
                if (ambiguous <= 50) {
                    System.out.println("AMBIGUOUS|" + type + "|" + safe(cs) + "|" + safe(sn));
                }
                continue;
            }
            matched++;
            Integer expectedId = expectedCustodioId(decision.row.custodio, custIdByName);
            if (expectedId == null) {
                noCustodioMatch++;
                if (noCustodioMatch <= 20) {
                    System.out.println("NO_CUSTODIO|" + decision.row.sheet + "|" + decision.row.rowNumber + "|" + decision.row.custodio);
                }
                continue;
            }
            Integer currentId = "NULL".equalsIgnoreCase(current) ? null : parseInt(current);
            Integer currentFinalId = canonicalId(currentId, canonicalIdById);
            Integer expectedFinalId = canonicalId(expectedId, canonicalIdById);
            if (Objects.equals(currentFinalId, expectedFinalId)) {
                alreadyOk++;
                continue;
            }
            String currentName = "NULL".equals(current) ? "NULL" : nameById.getOrDefault(parseInt(current), "?");
            String expected = expectedFinalId.toString();
            changes.add(type + "|" + safe(cs) + "|" + safe(sn) + "|id " + current + " [" + currentName + "] final="
                + safeId(currentFinalId) + " -> " + expected + " [" + nameById.get(expectedFinalId) + "]|Excel "
                + decision.row.sheet + ":" + decision.row.rowNumber
                + "|" + decision.matchMode);
            if (apply) {
                replacements.add(new Replacement(tuple.field13Start, tuple.field13End, expected));
            }
        }

        if (apply && !changes.isEmpty()) {
            replacements.sort((a, b) -> Integer.compare(b.start, a.start));
            for (Replacement replacement : replacements) {
                out.replace(replacement.start, replacement.end, replacement.value);
            }
            Files.writeString(sqlPath, out.toString(), StandardCharsets.UTF_8);
        }

        System.out.println("SUMMARY|excelRows=" + excelRows.size()
            + "|sqlEquipos=" + tuples.size()
            + "|matched=" + matched
            + "|alreadyOk=" + alreadyOk
            + "|changes=" + changes.size()
            + "|noExcelMatch=" + noExcelMatch
            + "|ambiguous=" + ambiguous
            + "|noCustodioMatch=" + noCustodioMatch
            + "|apply=" + apply);
        changes.stream().limit(80).forEach(c -> System.out.println("CHANGE|" + c));
        if (changes.size() > 80) {
            System.out.println("CHANGE_MORE|" + (changes.size() - 80));
        }
    }

    private static final class Index {
        final Map<String, List<ExcelRow>> full = new HashMap<>();
        final Map<String, List<ExcelRow>> sbye = new HashMap<>();
        final Map<String, List<ExcelRow>> sn = new HashMap<>();
        final Map<String, Integer> fullCursor = new HashMap<>();

        Index(List<ExcelRow> rows) {
            for (ExcelRow row : rows) {
                add(full, row.keyFull(), row);
                if (!normCode(row.codigoSbye).isEmpty() && !"S/N".equals(normCode(row.codigoSbye))) {
                    add(sbye, row.keySbye(), row);
                }
                if (!normCode(row.sn).isEmpty() && !"S/N".equals(normCode(row.sn))) {
                    add(sn, row.keySn(), row);
                }
            }
        }

        Decision find(String type, String cm, String cs, String serial) {
            String fullKey = key(type, cm, cs, serial);
            List<ExcelRow> fullRows = full.get(fullKey);
            Decision d = sequential(fullRows, fullKey);
            if (d != null) return d;
            d = uniqueSameCust(sbye.get(type + "|" + normCode(cs)), "sbye");
            if (d != null) return d;
            d = uniqueSameCust(sn.get(type + "|" + normCode(serial)), "sn");
            return d;
        }

        private static void add(Map<String, List<ExcelRow>> map, String key, ExcelRow row) {
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(row);
        }

        private Decision sequential(List<ExcelRow> rows, String key) {
            if (rows == null || rows.isEmpty()) {
                return null;
            }
            int next = fullCursor.getOrDefault(key, 0);
            if (next >= rows.size()) {
                return uniqueSameCust(rows, "full");
            }
            fullCursor.put(key, next + 1);
            Decision d = new Decision();
            d.row = rows.get(next);
            d.matchMode = rows.size() == 1 ? "full" : "full_seq";
            return d;
        }

        private static Decision uniqueSameCust(List<ExcelRow> rows, String mode) {
            if (rows == null || rows.isEmpty()) {
                return null;
            }
            String first = normName(rows.get(0).custodio);
            for (ExcelRow row : rows) {
                if (!Objects.equals(first, normName(row.custodio))) {
                    Decision d = new Decision();
                    d.row = rows.get(0);
                    d.matchMode = "ambiguous";
                    return d;
                }
            }
            Decision d = new Decision();
            d.row = rows.get(0);
            d.matchMode = mode;
            return d;
        }
    }

    private static Map<String, Integer> parseCustodios(String sql) {
        Matcher m = CUSTODIO_INSERT.matcher(sql);
        if (!m.find()) {
            throw new IllegalStateException("No se encontro INSERT INTO custodio");
        }
        Map<String, Integer> map = new LinkedHashMap<>();
        Matcher q = QUOTED.matcher(m.group(1));
        int id = 1;
        while (q.find()) {
            map.put(normName(q.group(1).replace("''", "'")), id++);
        }
        return map;
    }

    private static Map<Integer, Integer> parseCanonicalCustodioIds(String sql, Map<String, Integer> custIdByName) {
        Map<Integer, Integer> canonical = new HashMap<>();
        Matcher m = NORMALIZE_EQUIPO_UPDATE.matcher(sql);
        while (m.find()) {
            Integer target = custIdByName.get(normName(m.group(1).replace("''", "'")));
            if (target == null) {
                continue;
            }
            String sourceList = m.group(2);
            String sourceSingle = m.group(3);
            if (sourceList != null) {
                Matcher q = QUOTED.matcher(sourceList);
                while (q.find()) {
                    putCanonical(canonical, custIdByName, q.group(1), target);
                }
            } else {
                putCanonical(canonical, custIdByName, sourceSingle, target);
            }
        }
        return canonical;
    }

    private static void putCanonical(Map<Integer, Integer> canonical, Map<String, Integer> custIdByName,
                                     String rawName, Integer target) {
        if (rawName == null) {
            return;
        }
        Integer source = custIdByName.get(normName(rawName.replace("''", "'")));
        if (source != null) {
            canonical.put(source, target);
        }
    }

    private static Integer canonicalId(Integer id, Map<Integer, Integer> canonical) {
        if (id == null) {
            return null;
        }
        Integer current = id;
        for (int guard = 0; guard < 20; guard++) {
            Integer next = canonical.get(current);
            if (next == null || Objects.equals(next, current)) {
                return current;
            }
            current = next;
        }
        return current;
    }

    private static List<ExcelRow> readExcel(String xlsx) throws Exception {
        List<ExcelRow> rows = new ArrayList<>();
        DataFormatter fmt = new DataFormatter(Locale.US);
        try (OPCPackage pkg = OPCPackage.open(new File(xlsx), PackageAccess.READ);
             Workbook wb = new XSSFWorkbook(pkg)) {
            addSheet(rows, wb.getSheet("PCs"), "pc", 0, 1, 7, 8, fmt);
            addSheet(rows, wb.getSheet("Laptops"), "laptop", 0, 1, 7, 8, fmt);
            addSheet(rows, wb.getSheet("Periféricos"), "periferico", 0, 1, 5, 6, fmt);
            addSheet(rows, wb.getSheet("CA"), "bien_control_admin", -1, 0, -1, 5, fmt);
            addSheet(rows, wb.getSheet("Teléfonos"), "telefono", 0, 1, 7, 8, fmt);
            addSheet(rows, wb.getSheet("Escaners"), "escaner", 0, 1, 7, 8, fmt);
            addSheet(rows, wb.getSheet("Impresoras"), "impresora", 0, 1, 7, 8, fmt);
            addSheet(rows, wb.getSheet("Proyectores"), "proyector", 0, 1, 7, 9, fmt);
            addSheet(rows, wb.getSheet("Infraestructura"), "infraestructura", 0, 1, 7, 9, fmt);
            addSheet(rows, wb.getSheet("Licencias"), "licencia", 0, 1, 7, 9, fmt);
            addSheet(rows, wb.getSheet("Modems"), "modem", -1, 1, -1, 8, fmt);
        }
        return rows;
    }

    private static void addSheet(List<ExcelRow> rows, Sheet sheet, String type, int cmCol, int csCol, int snCol,
                                 int custCol, DataFormatter fmt) {
        if (sheet == null) {
            return;
        }
        for (int r = 4; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            ExcelRow er = new ExcelRow();
            er.type = type;
            er.codigoMegan = cell(row, cmCol, fmt);
            er.codigoSbye = cell(row, csCol, fmt);
            er.sn = cell(row, snCol, fmt);
            er.custodio = cell(row, custCol, fmt);
            er.sheet = sheet.getSheetName();
            er.rowNumber = r + 1;
            if (normCode(er.codigoMegan).isEmpty() && normCode(er.codigoSbye).isEmpty()
                && normCode(er.sn).isEmpty() && normName(er.custodio).isEmpty()) {
                continue;
            }
            rows.add(er);
        }
    }

    private static String cell(Row row, int col, DataFormatter fmt) {
        if (col < 0) return null;
        Cell cell = row.getCell(col);
        return cell == null ? null : fmt.formatCellValue(cell).trim();
    }

    private static List<SqlTuple> parseEquipoTuples(String sql) {
        List<SqlTuple> tuples = new ArrayList<>();
        Matcher m = EQUIPO_INSERT.matcher(sql);
        while (m.find()) {
            int pos = m.end();
            int end = findStatementEnd(sql, pos);
            tuples.addAll(parseValues(sql, pos, end));
        }
        return tuples;
    }

    private static int findStatementEnd(String sql, int start) {
        boolean inString = false;
        for (int i = start; i < sql.length(); i++) {
            char ch = sql.charAt(i);
            if (ch == '\'') {
                if (inString && i + 1 < sql.length() && sql.charAt(i + 1) == '\'') {
                    i++;
                } else {
                    inString = !inString;
                }
            } else if (!inString && ch == ';') {
                return i;
            }
        }
        throw new IllegalStateException("No se encontro fin de INSERT equipo");
    }

    private static List<SqlTuple> parseValues(String sql, int start, int end) {
        List<SqlTuple> tuples = new ArrayList<>();
        boolean inString = false;
        SqlTuple tuple = null;
        int fieldStart = -1;
        for (int i = start; i < end; i++) {
            char ch = sql.charAt(i);
            if (ch == '\'') {
                if (inString && i + 1 < end && sql.charAt(i + 1) == '\'') {
                    i++;
                } else {
                    inString = !inString;
                }
                continue;
            }
            if (inString) {
                continue;
            }
            if (ch == '(') {
                tuple = new SqlTuple();
                tuple.start = i;
                fieldStart = i + 1;
            } else if (tuple != null && (ch == ',' || ch == ')')) {
                String raw = sql.substring(fieldStart, i).trim();
                tuple.values.add(raw);
                int fieldIndex = tuple.values.size() - 1;
                if (fieldIndex == 13) {
                    tuple.field13Start = trimStart(sql, fieldStart, i);
                    tuple.field13End = trimEnd(sql, fieldStart, i);
                }
                fieldStart = i + 1;
                if (ch == ')') {
                    if (tuple.values.size() == 15) {
                        tuples.add(tuple);
                    }
                    tuple = null;
                    fieldStart = -1;
                }
            }
        }
        return tuples;
    }

    private static int trimStart(String s, int start, int end) {
        while (start < end && Character.isWhitespace(s.charAt(start))) start++;
        return start;
    }

    private static int trimEnd(String s, int start, int end) {
        while (end > start && Character.isWhitespace(s.charAt(end - 1))) end--;
        return end;
    }

    private static String value(SqlTuple tuple, int index) {
        String raw = rawValue(tuple, index);
        if ("NULL".equalsIgnoreCase(raw)) {
            return null;
        }
        if (raw.startsWith("'") && raw.endsWith("'")) {
            return raw.substring(1, raw.length() - 1).replace("''", "'");
        }
        return raw;
    }

    private static String rawValue(SqlTuple tuple, int index) {
        if (index >= tuple.values.size()) {
            return null;
        }
        return tuple.values.get(index).trim();
    }

    private static String key(String type, String cm, String cs, String sn) {
        return type + "|" + normCode(cm) + "|" + normCode(cs) + "|" + normCode(sn);
    }

    private static String normName(String value) {
        if (value == null) return "";
        String text = Normalizer.normalize(value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .replace('Ñ', 'N')
            .replace('ñ', 'n')
            .toUpperCase(Locale.ROOT)
            .replaceAll("[^A-Z0-9 ]", " ")
            .replaceAll("\\s+", " ")
            .trim();
        return text;
    }

    private static Integer expectedCustodioId(String value, Map<String, Integer> custIdByName) {
        String normalized = normName(value);
        Integer id = custIdByName.get(normalized);
        if (id != null) {
            return id;
        }
        if (normalized.isEmpty() || "NA".equals(normalized) || "N A".equals(normalized)
            || "SN".equals(normalized) || "S N".equals(normalized)) {
            return custIdByName.get(normName("SIN CUSTODIO"));
        }
        if ("PABLO A GARCIA HIADLGO".equals(normalized)) {
            return custIdByName.get(normName("PABLO A GARCIA HIDALGO"));
        }
        if ("ANDREA KATHERINEINIGUEZ MEDINA".equals(normalized)) {
            return custIdByName.get(normName("ANDREA KATHERINE INIGUEZ MEDINA"));
        }
        return null;
    }

    private static String normCode(String value) {
        if (value == null) return "";
        String text = value.trim();
        if ("NULL".equalsIgnoreCase(text)) return "";
        if (text.startsWith("'") && text.endsWith("'")) {
            text = text.substring(1, text.length() - 1);
        }
        text = text.trim().replaceAll("\\.0$", "");
        return text.toUpperCase(Locale.ROOT);
    }

    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static String safeId(Integer id) {
        return id == null ? "NULL" : id.toString();
    }

    private static Integer parseInt(String raw) {
        try {
            return Integer.valueOf(raw);
        } catch (Exception ex) {
            return null;
        }
    }
}
