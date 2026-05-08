package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.dto.ActaMantenimientoPcRequest;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.PDPageTree;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.BreakType;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.TableRowAlign;
import org.apache.poi.xwpf.usermodel.TextAlignment;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTBody;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTVMerge;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STMerge;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblWidth;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STVerticalJc;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ActaMantenimientoPcDocumentService {

    private static final String TITULO_1 = "SERVICIO NACIONAL DE DERECHOS INTELECTUALES";
    private static final String TITULO_2 = "DIRECCIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN";
    private static final String TITULO_3 = "FORMULARIO DE MANTENIMIENTO PREVENTIVO DE EQUIPOS";
    private static final String CERTIFICACION_DEFAULT =
            "Certifico que los elementos detallados en el presente documento, me han sido instalados para mi cuidado y custodia " +
            "con el propósito de cumplir con las tareas y asignaciones propias de mi cargo en la Institución, siendo estos de mi " +
            "única y exclusiva responsabilidad. Me comprometo a usar correctamente los recursos, y solo para los fines establecidos, " +
            "a no instalar ni permitir la instalación de software por personal ajeno al área de soporte de DTIC, dado cualquier " +
            "novedad dar conocimiento a los técnicos de DTIC.";
    private static final List<String> ACTIVIDADES = Arrays.asList(
            "DESFRAGMENTACIÓN DE DISCOS",
            "DEPURACIÓN DE SOFTWARE",
            "ANÁLISIS Y LIMPIEZA DE VIRUS",
            "INSTALACIÓN DE ACTUALIZACIONES (PARCHES) DEL SISTEMA OPERATIVO Y DE APLICACIONES.",
            "LIMPIEZA DE PARTES Y PIEZAS",
            "REORGANIZACIÓN DE CABLES DE CONEXIÓN",
            "OTRAS ACCIONES REALIZADAS"
    );

    public byte[] generarDocx(ActaMantenimientoPcRequest request) throws IOException {
        try (XWPFDocument document = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            ensureActaDefaults(request);
            configurePage(document);
            addDocumentHeader(document);
            addFuncionarioTable(document, request);
            addEquiposTable(document, request);
            addActividadesTable(document, request);
            addCertificacion(document, request);
            addEntregaRecepcionTable(document, request);
            addFooter(document);
            document.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generarPdf(ActaMantenimientoPcRequest request) throws IOException {
        ensureActaDefaults(request);
        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            PDRectangle mediaBox = page.getMediaBox();

            float margin = 40f;
            float pageWidth = mediaBox.getWidth();
            float y = mediaBox.getHeight() - 28f;

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                drawImage(content, document, "actas/logo_ecuador.png", margin, y - 58f, 150f, 58f);
                drawImage(content, document, "actas/logo_senadi.png", pageWidth - margin - 150f, y - 52f, 150f, 52f);

                y -= 92f;
                y = drawCenteredText(content, TITULO_1, pageWidth / 2f, y, PDType1Font.HELVETICA_BOLD, 16f, Color.BLACK);
                y -= 6f;
                y = drawCenteredText(content, TITULO_2, pageWidth / 2f, y, PDType1Font.HELVETICA_BOLD, 15f, Color.BLACK);
                y -= 16f;
                y = drawCenteredText(content, TITULO_3, pageWidth / 2f, y, PDType1Font.HELVETICA_BOLD, 14.5f, Color.BLACK, true);
                y -= 18f;

                float contentWidth = pageWidth - (margin * 2f);
                y = drawFuncionarioSection(content, margin, y, contentWidth, request);
                y -= 16f;
                y = drawEquiposSection(content, margin, y, contentWidth, request);
                y -= 18f;
                y = drawActividadesSection(content, margin, y, contentWidth, request);
                y -= 10f;
                y = drawParagraph(content, normalize(request.getCertificacion()), margin + 10f, y, contentWidth - 20f, 9f, 12f);
                y -= 10f;
                y = drawEntregaRecepcionSection(content, margin + 10f, y, contentWidth - 20f, request);

                drawFooterText(content, margin, 64f);
                drawImage(content, document, "actas/logo_nuevo_ecuador.png", pageWidth - margin - 128f, 34f, 128f, 46f);
            }

            document.save(out);
            return out.toByteArray();
        }
    }

    private void configurePage(XWPFDocument document) {
        CTBody body = document.getDocument().getBody();
        if (!body.isSetSectPr()) {
            body.addNewSectPr();
        }
        body.getSectPr().addNewPgSz().setW(java.math.BigInteger.valueOf(11906));
        body.getSectPr().getPgSz().setH(java.math.BigInteger.valueOf(16838));
        body.getSectPr().addNewPgMar().setTop(java.math.BigInteger.valueOf(720));
        body.getSectPr().getPgMar().setRight(java.math.BigInteger.valueOf(720));
        body.getSectPr().getPgMar().setBottom(java.math.BigInteger.valueOf(720));
        body.getSectPr().getPgMar().setLeft(java.math.BigInteger.valueOf(720));
    }

    private void addDocumentHeader(XWPFDocument document) throws IOException {
        XWPFTable logos = document.createTable(1, 2);
        logos.setWidth("100%");
        logos.setTableAlignment(TableRowAlign.CENTER);
        configureCell(logos.getRow(0).getCell(0), ParagraphAlignment.LEFT, "FFFFFF", null, true);
        configureCell(logos.getRow(0).getCell(1), ParagraphAlignment.RIGHT, "FFFFFF", null, true);
        addImageRun(logos.getRow(0).getCell(0), "actas/logo_ecuador.png", 165, 60);
        addImageRun(logos.getRow(0).getCell(1), "actas/logo_senadi.png", 165, 58);

        addCenteredParagraph(document, TITULO_1, true, 16, false);
        addCenteredParagraph(document, TITULO_2, true, 15, false);
        addCenteredParagraph(document, TITULO_3, true, 14, true);
    }

    private void addFuncionarioTable(XWPFDocument document, ActaMantenimientoPcRequest request) {
        XWPFTable table = document.createTable(3, 6);
        table.setWidth("100%");
        setTableBorders(table);
        mergeCellsHorizontal(table, 0, 0, 5);
        setCellText(table.getRow(0).getCell(0), "DATOS DEL FUNCIONARIO SENADI", true, ParagraphAlignment.CENTER, "D9D9D9");

        fillLabelValue(table.getRow(1), 0, "NOMBRE", request.getFuncionario().getNombre());
        fillLabelValue(table.getRow(1), 2, "CARGO", request.getFuncionario().getCargo());
        fillLabelValue(table.getRow(1), 4, "N° EXT.", request.getFuncionario().getExtension());
        fillLabelValue(table.getRow(2), 0, "CORREO", request.getFuncionario().getCorreo());
        fillLabelValue(table.getRow(2), 2, "AREA", request.getFuncionario().getArea());
        fillLabelValue(table.getRow(2), 4, "EDIFICIO", request.getFuncionario().getEdificio());

        addSpacer(document, 180);
    }

    private void addEquiposTable(XWPFDocument document, ActaMantenimientoPcRequest request) {
        XWPFTable table = document.createTable(4, 5);
        table.setWidth("100%");
        setTableBorders(table);
        mergeCellsHorizontal(table, 0, 0, 4);
        setCellText(table.getRow(0).getCell(0), "EQUIPOS", true, ParagraphAlignment.CENTER, "D9D9D9");

        List<String> headers = Arrays.asList("TIPO", "MARCA", "MODELO", "SERIAL", "CODIGO");
        for (int i = 0; i < headers.size(); i++) {
            setCellText(table.getRow(1).getCell(i), headers.get(i), true, ParagraphAlignment.CENTER, "E6E6E6");
        }

        fillEquipoRow(table.getRow(2), request.getDesktop());
        fillEquipoRow(table.getRow(3), request.getLaptop());

        addSpacer(document, 180);
    }

    private void addActividadesTable(XWPFDocument document, ActaMantenimientoPcRequest request) {
        XWPFTable table = document.createTable(10, 4);
        table.setWidth("100%");
        setTableBorders(table);

        mergeCellsHorizontal(table, 0, 0, 3);
        setCellText(table.getRow(0).getCell(0), "COMPUTADORA", true, ParagraphAlignment.CENTER, "7F7F7F", "FFFFFF", 14);

        mergeCellsVertical(table, 1, 2, 0);
        setCellText(table.getRow(1).getCell(0), "ACTIVIDADES DE\nMANTENIMIENTOS", true, ParagraphAlignment.CENTER, "D9D9D9");
        mergeCellsHorizontal(table, 1, 1, 3);
        setCellText(table.getRow(1).getCell(1), "INSTALADO", true, ParagraphAlignment.CENTER, "D9D9D9");
        setCellText(table.getRow(2).getCell(1), "FECHA", true, ParagraphAlignment.CENTER, "D9D9D9");
        setCellText(table.getRow(2).getCell(2), "ESTADO", true, ParagraphAlignment.CENTER, "D9D9D9");
        setCellText(table.getRow(2).getCell(3), "OBSERVACIÓN", true, ParagraphAlignment.CENTER, "D9D9D9");

        List<ActaMantenimientoPcRequest.ActividadMantenimiento> actividades = normalizedActivities(request.getActividades());
        for (int i = 0; i < ACTIVIDADES.size(); i++) {
            XWPFTableRow row = table.getRow(i + 3);
            ActaMantenimientoPcRequest.ActividadMantenimiento actividad = actividades.get(i);
            setCellText(row.getCell(0), ACTIVIDADES.get(i), true, ParagraphAlignment.LEFT, "F2F2F2");
            setCellText(row.getCell(1), actividad.getFecha(), false, ParagraphAlignment.CENTER, "FFFFFF");
            setCellText(row.getCell(2), actividad.getEstado(), false, ParagraphAlignment.CENTER, "FFFFFF");
            setCellText(row.getCell(3), actividad.getObservacion(), false, ParagraphAlignment.LEFT, "FFFFFF");
        }
    }

    private void addCertificacion(XWPFDocument document, ActaMantenimientoPcRequest request) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setSpacingBefore(120);
        paragraph.setSpacingAfter(120);
        paragraph.setAlignment(ParagraphAlignment.BOTH);
        XWPFRun run = paragraph.createRun();
        run.setFontSize(10);
        run.setText(normalize(request.getCertificacion()));
    }

    private void addEntregaRecepcionTable(XWPFDocument document, ActaMantenimientoPcRequest request) {
        XWPFTable table = document.createTable(5, 2);
        table.setWidth("100%");
        setTableBorders(table);
        mergeCellsHorizontal(table, 0, 0, 1);
        setCellText(table.getRow(0).getCell(0), "ENTREGA RECEPCION DE EQUIPO", true, ParagraphAlignment.CENTER, "D9D9D9");
        setCellText(table.getRow(1).getCell(0), "ENTREGA", false, ParagraphAlignment.CENTER, "EDEDED");
        setCellText(table.getRow(1).getCell(1), "RECIBE", false, ParagraphAlignment.CENTER, "EDEDED");

        fillEntregaCell(table.getRow(2).getCell(0), request.getEntrega().getNombre(), "Nombre:");
        fillEntregaCell(table.getRow(2).getCell(1), request.getRecibe().getNombre(), "Nombre:");
        fillEntregaCell(table.getRow(3).getCell(0), request.getEntrega().getFirma(), "Firma:");
        fillEntregaCell(table.getRow(3).getCell(1), request.getRecibe().getFirma(), "Firma:");
        fillEntregaCell(table.getRow(4).getCell(0), request.getEntrega().getFecha(), "Fecha:");
        fillEntregaCell(table.getRow(4).getCell(1), request.getRecibe().getFecha(), "Fecha:");
    }

    private void addFooter(XWPFDocument document) throws IOException {
        XWPFTable footer = document.createTable(1, 2);
        footer.setWidth("100%");
        footer.setTableAlignment(TableRowAlign.CENTER);
        footer.removeBorders();
        XWPFTableCell left = footer.getRow(0).getCell(0);
        XWPFTableCell right = footer.getRow(0).getCell(1);
        configureCell(left, ParagraphAlignment.LEFT, "FFFFFF", null, true);
        configureCell(right, ParagraphAlignment.RIGHT, "FFFFFF", null, true);

        XWPFParagraph address = left.getParagraphs().get(0);
        address.setSpacingBefore(220);
        address.setSpacingAfter(0);
        address.createRun().setText("Dirección: Av. República E7-197 y Diego de Almagro – Edificio FORUM 300");
        XWPFParagraph address2 = left.addParagraph();
        address2.createRun().setText("Código postal: 170518 / Quito – Ecuador");
        XWPFParagraph phone = left.addParagraph();
        phone.createRun().setText("Teléfono: +539-2 394 0000");
        XWPFParagraph web = left.addParagraph();
        web.createRun().setText("www.derechosintelectuales.gob.ec");

        addImageRun(right, "actas/logo_nuevo_ecuador.png", 145, 46);
    }

    private float drawFuncionarioSection(PDPageContentStream content, float x, float y, float width, ActaMantenimientoPcRequest request) throws IOException {
        float[] cols = new float[] {70f, 190f, 70f, 150f, 76f, width - 556f};
        y = drawSectionHeader(content, "DATOS DEL FUNCIONARIO SENADI", x, y, width, 22f, new Color(217, 217, 217), Color.BLACK, 11f);
        y = drawKeyValueRow(content, x, y, cols, new String[]{"NOMBRE", request.getFuncionario().getNombre(), "CARGO", request.getFuncionario().getCargo(), "N° EXT.", request.getFuncionario().getExtension()}, 22f);
        y = drawKeyValueRow(content, x, y, cols, new String[]{"CORREO", request.getFuncionario().getCorreo(), "AREA", request.getFuncionario().getArea(), "EDIFICIO", request.getFuncionario().getEdificio()}, 22f);
        return y;
    }

    private float drawEquiposSection(PDPageContentStream content, float x, float y, float width, ActaMantenimientoPcRequest request) throws IOException {
        float[] cols = new float[] {160f, 70f, 68f, 90f, width - 388f};
        y = drawSectionHeader(content, "EQUIPOS", x, y, width, 24f, new Color(217, 217, 217), Color.BLACK, 11f);
        y = drawTableHeaderRow(content, x, y, cols, new String[]{"TIPO", "MARCA", "MODELO", "SERIAL", "CODIGO"}, 24f);
        y = drawSimpleRow(content, x, y, cols, new String[]{request.getDesktop().getTipo(), request.getDesktop().getMarca(), request.getDesktop().getModelo(), request.getDesktop().getSerial(), request.getDesktop().getCodigo()}, 24f);
        y = drawSimpleRow(content, x, y, cols, new String[]{request.getLaptop().getTipo(), request.getLaptop().getMarca(), request.getLaptop().getModelo(), request.getLaptop().getSerial(), request.getLaptop().getCodigo()}, 24f);
        return y;
    }

    private float drawActividadesSection(PDPageContentStream content, float x, float y, float width, ActaMantenimientoPcRequest request) throws IOException {
        float totalHeight = 28f + 20f + 20f + 34f + 34f + 34f + 66f + 34f + 34f + 34f;
        drawFilledRect(content, x, y - totalHeight, width, totalHeight, Color.WHITE);
        drawFilledRect(content, x, y - 28f, width, 28f, new Color(127, 127, 127));
        drawBorder(content, x, y - totalHeight, width, totalHeight);
        drawText(content, "COMPUTADORA", x + (width / 2f), y - 18f, PDType1Font.HELVETICA_BOLD, 13f, Color.WHITE, true);

        float rowTop = y - 28f;
        float leftWidth = 175f;
        float dateWidth = 80f;
        float estadoWidth = 68f;
        float obsWidth = width - leftWidth - dateWidth - estadoWidth;

        drawFilledRect(content, x, rowTop - 40f, leftWidth, 40f, new Color(217, 217, 217));
        drawBorder(content, x, rowTop - 40f, leftWidth, 40f);
        drawBorder(content, x + leftWidth, rowTop - 20f, dateWidth + estadoWidth + obsWidth, 20f);
        drawFilledRect(content, x + leftWidth, rowTop - 20f, dateWidth + estadoWidth + obsWidth, 20f, new Color(217, 217, 217));
        drawText(content, "ACTIVIDADES DE", x + (leftWidth / 2f), rowTop - 17f, PDType1Font.HELVETICA_BOLD, 9.5f, Color.BLACK, true);
        drawText(content, "MANTENIMIENTOS", x + (leftWidth / 2f), rowTop - 29f, PDType1Font.HELVETICA_BOLD, 9.5f, Color.BLACK, true);
        drawText(content, "INSTALADO", x + leftWidth + ((dateWidth + estadoWidth + obsWidth) / 2f), rowTop - 14f, PDType1Font.HELVETICA_BOLD, 10f, Color.BLACK, true);

        drawFilledRect(content, x + leftWidth, rowTop - 40f, dateWidth, 20f, new Color(217, 217, 217));
        drawFilledRect(content, x + leftWidth + dateWidth, rowTop - 40f, estadoWidth, 20f, new Color(217, 217, 217));
        drawFilledRect(content, x + leftWidth + dateWidth + estadoWidth, rowTop - 40f, obsWidth, 20f, new Color(217, 217, 217));
        drawBorder(content, x + leftWidth, rowTop - 40f, dateWidth, 20f);
        drawBorder(content, x + leftWidth + dateWidth, rowTop - 40f, estadoWidth, 20f);
        drawBorder(content, x + leftWidth + dateWidth + estadoWidth, rowTop - 40f, obsWidth, 20f);
        drawText(content, "FECHA", x + leftWidth + (dateWidth / 2f), rowTop - 34f, PDType1Font.HELVETICA_BOLD, 9f, Color.BLACK, true);
        drawText(content, "ESTADO", x + leftWidth + dateWidth + (estadoWidth / 2f), rowTop - 34f, PDType1Font.HELVETICA_BOLD, 9f, Color.BLACK, true);
        drawText(content, "OBSERVACIÓN", x + leftWidth + dateWidth + estadoWidth + (obsWidth / 2f), rowTop - 34f, PDType1Font.HELVETICA_BOLD, 9f, Color.BLACK, true);

        List<Float> heights = Arrays.asList(34f, 34f, 34f, 66f, 34f, 34f, 34f);
        List<ActaMantenimientoPcRequest.ActividadMantenimiento> actividades = normalizedActivities(request.getActividades());
        float currentTop = rowTop - 40f;
        for (int i = 0; i < ACTIVIDADES.size(); i++) {
            float rowHeight = heights.get(i);
            currentTop -= rowHeight;
            drawFilledRect(content, x, currentTop, leftWidth, rowHeight, new Color(242, 242, 242));
            drawBorder(content, x, currentTop, leftWidth, rowHeight);
            drawBorder(content, x + leftWidth, currentTop, dateWidth, rowHeight);
            drawBorder(content, x + leftWidth + dateWidth, currentTop, estadoWidth, rowHeight);
            drawBorder(content, x + leftWidth + dateWidth + estadoWidth, currentTop, obsWidth, rowHeight);

            drawParagraphInBox(content, ACTIVIDADES.get(i), x + 6f, currentTop + rowHeight - 9f, leftWidth - 10f, rowHeight - 8f, 8f, true);
            drawParagraphInBox(content, actividades.get(i).getFecha(), x + leftWidth + 4f, currentTop + rowHeight - 10f, dateWidth - 8f, rowHeight - 8f, 8f, false);
            drawParagraphInBox(content, actividades.get(i).getEstado(), x + leftWidth + dateWidth + 4f, currentTop + rowHeight - 10f, estadoWidth - 8f, rowHeight - 8f, 8f, false);
            drawParagraphInBox(content, actividades.get(i).getObservacion(), x + leftWidth + dateWidth + estadoWidth + 4f, currentTop + rowHeight - 10f, obsWidth - 8f, rowHeight - 8f, 8f, false);
        }
        return y - totalHeight;
    }

    private float drawEntregaRecepcionSection(PDPageContentStream content, float x, float y, float width, ActaMantenimientoPcRequest request) throws IOException {
        float[] cols = new float[]{width / 2f, width / 2f};
        y = drawSectionHeader(content, "ENTREGA RECEPCION DE EQUIPO", x, y, width, 20f, new Color(217, 217, 217), Color.BLACK, 10.5f);
        y = drawSimpleHeader(content, x, y, cols, new String[]{"ENTREGA", "RECIBE"}, 18f);
        y = drawPairRow(content, x, y, cols, "Nombre:", request.getEntrega().getNombre(), request.getRecibe().getNombre(), 22f);
        y = drawPairRow(content, x, y, cols, "Firma:", request.getEntrega().getFirma(), request.getRecibe().getFirma(), 80f);
        y = drawPairRow(content, x, y, cols, "Fecha:", request.getEntrega().getFecha(), request.getRecibe().getFecha(), 22f);
        return y;
    }

    private float drawSectionHeader(PDPageContentStream content, String text, float x, float y, float width, float height, Color fill, Color textColor, float fontSize) throws IOException {
        drawFilledRect(content, x, y - height, width, height, fill);
        drawBorder(content, x, y - height, width, height);
        drawText(content, text, x + (width / 2f), y - (height * 0.68f), PDType1Font.HELVETICA_BOLD, fontSize, textColor, true);
        return y - height;
    }

    private float drawTableHeaderRow(PDPageContentStream content, float x, float y, float[] widths, String[] values, float height) throws IOException {
        return drawRow(content, x, y, widths, values, height, true, new Color(230, 230, 230));
    }

    private float drawSimpleHeader(PDPageContentStream content, float x, float y, float[] widths, String[] values, float height) throws IOException {
        return drawRow(content, x, y, widths, values, height, false, new Color(237, 237, 237));
    }

    private float drawSimpleRow(PDPageContentStream content, float x, float y, float[] widths, String[] values, float height) throws IOException {
        return drawRow(content, x, y, widths, values, height, false, Color.WHITE);
    }

    private float drawKeyValueRow(PDPageContentStream content, float x, float y, float[] widths, String[] values, float height) throws IOException {
        float currentX = x;
        for (int i = 0; i < widths.length; i++) {
            boolean isLabel = i % 2 == 0;
            drawFilledRect(content, currentX, y - height, widths[i], height, isLabel ? new Color(242, 242, 242) : Color.WHITE);
            drawBorder(content, currentX, y - height, widths[i], height);
            drawParagraphInBox(content, values[i], currentX + 4f, y - 6f, widths[i] - 8f, height - 8f, 8.5f, isLabel);
            currentX += widths[i];
        }
        return y - height;
    }

    private float drawPairRow(PDPageContentStream content, float x, float y, float[] widths, String label, String leftValue, String rightValue, float height) throws IOException {
        drawBorder(content, x, y - height, widths[0], height);
        drawBorder(content, x + widths[0], y - height, widths[1], height);
        drawParagraphInBox(content, label, x + 6f, y - 8f, widths[0] - 12f, 12f, 8.5f, true);
        drawParagraphInBox(content, leftValue, x + 6f, y - 22f, widths[0] - 12f, height - 24f, 8.5f, false);
        drawParagraphInBox(content, label, x + widths[0] + 6f, y - 8f, widths[1] - 12f, 12f, 8.5f, true);
        drawParagraphInBox(content, rightValue, x + widths[0] + 6f, y - 22f, widths[1] - 12f, height - 24f, 8.5f, false);
        return y - height;
    }

    private float drawRow(PDPageContentStream content, float x, float y, float[] widths, String[] values, float height, boolean bold, Color fill) throws IOException {
        float currentX = x;
        for (int i = 0; i < widths.length; i++) {
            drawFilledRect(content, currentX, y - height, widths[i], height, fill);
            drawBorder(content, currentX, y - height, widths[i], height);
            drawParagraphInBox(content, values[i], currentX + 4f, y - 8f, widths[i] - 8f, height - 8f, 8.5f, bold);
            currentX += widths[i];
        }
        return y - height;
    }

    private float drawParagraph(PDPageContentStream content, String text, float x, float y, float width, float fontSize, float lineHeight) throws IOException {
        List<String> lines = wrap(text, width, fontSize, PDType1Font.HELVETICA);
        float currentY = y;
        for (String line : lines) {
            drawText(content, line, x, currentY, PDType1Font.HELVETICA, fontSize, Color.BLACK, false);
            currentY -= lineHeight;
        }
        return currentY;
    }

    private void drawParagraphInBox(PDPageContentStream content, String text, float x, float y, float width, float height, float fontSize, boolean bold) throws IOException {
        List<String> lines = wrap(normalize(text), width, fontSize, bold ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA);
        float lineHeight = fontSize + 2f;
        float currentY = y;
        int maxLines = Math.max(1, (int) Math.floor(height / lineHeight));
        for (int i = 0; i < lines.size() && i < maxLines; i++) {
            drawText(content, lines.get(i), x, currentY, bold ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA, fontSize, Color.BLACK, false);
            currentY -= lineHeight;
        }
    }

    private float drawCenteredText(PDPageContentStream content, String text, float centerX, float y, PDType1Font font, float fontSize, Color color) throws IOException {
        return drawCenteredText(content, text, centerX, y, font, fontSize, color, false);
    }

    private float drawCenteredText(PDPageContentStream content, String text, float centerX, float y, PDType1Font font, float fontSize, Color color, boolean underline) throws IOException {
        float width = font.getStringWidth(normalize(text)) / 1000f * fontSize;
        float startX = centerX - (width / 2f);
        drawText(content, text, startX, y, font, fontSize, color, false);
        if (underline) {
            content.setStrokingColor(color);
            content.moveTo(startX, y - 2f);
            content.lineTo(startX + width, y - 2f);
            content.stroke();
        }
        return y - fontSize;
    }

    private void drawText(PDPageContentStream content, String text, float x, float y, PDType1Font font, float fontSize, Color color, boolean centered) throws IOException {
        String safe = normalize(text);
        float startX = x;
        if (centered) {
            float width = font.getStringWidth(safe) / 1000f * fontSize;
            startX = x - (width / 2f);
        }
        content.beginText();
        content.setFont(font, fontSize);
        content.setNonStrokingColor(color);
        content.newLineAtOffset(startX, y);
        content.showText(safe);
        content.endText();
    }

    private void drawBorder(PDPageContentStream content, float x, float y, float width, float height) throws IOException {
        content.setStrokingColor(Color.BLACK);
        content.addRect(x, y, width, height);
        content.stroke();
    }

    private void drawFilledRect(PDPageContentStream content, float x, float y, float width, float height, Color color) throws IOException {
        content.setNonStrokingColor(color);
        content.addRect(x, y, width, height);
        content.fill();
    }

    private void drawFooterText(PDPageContentStream content, float x, float y) throws IOException {
        List<String> lines = Arrays.asList(
                "Dirección: Av. República E7-197 y Diego de Almagro – Edificio FORUM 300",
                "Código postal: 170518 / Quito – Ecuador",
                "Teléfono: +539-2 394 0000",
                "www.derechosintelectuales.gob.ec"
        );
        float currentY = y;
        for (String line : lines) {
            drawText(content, line, x, currentY, PDType1Font.HELVETICA, 8.5f, new Color(96, 96, 96), false);
            currentY -= 12f;
        }
    }

    private void drawImage(PDPageContentStream content, PDDocument document, String resourcePath, float x, float y, float width, float height) throws IOException {
        byte[] data = readBinaryResource(resourcePath);
        if (data.length == 0) {
            return;
        }
        PDImageXObject image = PDImageXObject.createFromByteArray(document, data, resourcePath);
        content.drawImage(image, x, y, width, height);
    }

    private void fillLabelValue(XWPFTableRow row, int labelCellIndex, String label, String value) {
        setCellText(row.getCell(labelCellIndex), label, false, ParagraphAlignment.LEFT, "F2F2F2");
        setCellText(row.getCell(labelCellIndex + 1), value, false, ParagraphAlignment.LEFT, "FFFFFF");
    }

    private void fillEquipoRow(XWPFTableRow row, ActaMantenimientoPcRequest.EquipoRow equipo) {
        setCellText(row.getCell(0), equipo.getTipo(), false, ParagraphAlignment.LEFT, "FFFFFF");
        setCellText(row.getCell(1), equipo.getMarca(), false, ParagraphAlignment.LEFT, "FFFFFF");
        setCellText(row.getCell(2), equipo.getModelo(), false, ParagraphAlignment.LEFT, "FFFFFF");
        setCellText(row.getCell(3), equipo.getSerial(), false, ParagraphAlignment.LEFT, "FFFFFF");
        setCellText(row.getCell(4), equipo.getCodigo(), false, ParagraphAlignment.LEFT, "FFFFFF");
    }

    private void fillEntregaCell(XWPFTableCell cell, String value, String label) {
        configureCell(cell, ParagraphAlignment.LEFT, "FFFFFF", null, true);
        XWPFParagraph labelParagraph = cell.getParagraphs().get(0);
        XWPFRun labelRun = labelParagraph.createRun();
        labelRun.setBold(true);
        labelRun.setText(label);
        XWPFParagraph valueParagraph = cell.addParagraph();
        valueParagraph.setSpacingBefore(20);
        valueParagraph.createRun().setText(normalize(value));
    }

    private void setCellText(XWPFTableCell cell, String text, boolean bold, ParagraphAlignment alignment, String bgColor) {
        setCellText(cell, text, bold, alignment, bgColor, null, 10);
    }

    private void setCellText(XWPFTableCell cell, String text, boolean bold, ParagraphAlignment alignment, String bgColor, String fontColor, int fontSize) {
        configureCell(cell, alignment, bgColor, fontColor, true);
        XWPFParagraph paragraph = cell.getParagraphs().isEmpty() ? cell.addParagraph() : cell.getParagraphs().get(0);
        paragraph.setAlignment(alignment);
        paragraph.setVerticalAlignment(TextAlignment.CENTER);
        XWPFRun run = paragraph.createRun();
        run.setBold(bold);
        run.setFontSize(fontSize);
        if (fontColor != null) {
            run.setColor(fontColor);
        }
        String[] parts = normalize(text).split("\n", -1);
        for (int i = 0; i < parts.length; i++) {
            if (i > 0) {
                run.addBreak();
            }
            run.setText(parts[i]);
        }
    }

    private void configureCell(XWPFTableCell cell, ParagraphAlignment alignment, String bgColor, String fontColor, boolean clear) {
        if (clear) {
            while (cell.getParagraphs().size() > 1) {
                cell.removeParagraph(1);
            }
            if (!cell.getParagraphs().isEmpty()) {
                cell.removeParagraph(0);
            }
        }
        XWPFParagraph paragraph = cell.addParagraph();
        paragraph.setAlignment(alignment);
        paragraph.setVerticalAlignment(TextAlignment.CENTER);
        if (bgColor != null) {
            cell.setColor(bgColor);
        }
        CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
        tcPr.addNewVAlign().setVal(STVerticalJc.CENTER);
        CTTblWidth width = tcPr.isSetTcW() ? tcPr.getTcW() : tcPr.addNewTcW();
        width.setType(STTblWidth.DXA);
    }

    private void mergeCellsHorizontal(XWPFTable table, int row, int from, int to) {
        for (int cellIndex = from; cellIndex <= to; cellIndex++) {
            CTTcPr tcPr = table.getRow(row).getCell(cellIndex).getCTTc().addNewTcPr();
            if (cellIndex == from) {
                tcPr.addNewGridSpan().setVal(java.math.BigInteger.valueOf(to - from + 1L));
            } else {
                table.getRow(row).removeCell(cellIndex);
                table.getRow(row).addNewTableCell();
            }
        }
    }

    private void mergeCellsVertical(XWPFTable table, int fromRow, int toRow, int col) {
        for (int rowIndex = fromRow; rowIndex <= toRow; rowIndex++) {
            XWPFTableCell cell = table.getRow(rowIndex).getCell(col);
            CTTcPr tcPr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
            CTVMerge vMerge = tcPr.isSetVMerge() ? tcPr.getVMerge() : tcPr.addNewVMerge();
            vMerge.setVal(rowIndex == fromRow ? STMerge.RESTART : STMerge.CONTINUE);
        }
    }

    private void setTableBorders(XWPFTable table) {
        table.setInsideHBorder(XWPFTable.XWPFBorderType.SINGLE, 1, 0, "000000");
        table.setInsideVBorder(XWPFTable.XWPFBorderType.SINGLE, 1, 0, "000000");
        table.setTopBorder(XWPFTable.XWPFBorderType.SINGLE, 1, 0, "000000");
        table.setBottomBorder(XWPFTable.XWPFBorderType.SINGLE, 1, 0, "000000");
        table.setLeftBorder(XWPFTable.XWPFBorderType.SINGLE, 1, 0, "000000");
        table.setRightBorder(XWPFTable.XWPFBorderType.SINGLE, 1, 0, "000000");
    }

    private void addCenteredParagraph(XWPFDocument document, String text, boolean bold, int size, boolean underline) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setAlignment(ParagraphAlignment.CENTER);
        paragraph.setSpacingAfter(underline ? 140 : 40);
        XWPFRun run = paragraph.createRun();
        run.setBold(bold);
        run.setFontSize(size);
        if (underline) {
            run.setUnderline(UnderlinePatterns.SINGLE);
        }
        run.setText(text);
    }

    private void addSpacer(XWPFDocument document, int after) {
        XWPFParagraph paragraph = document.createParagraph();
        paragraph.setSpacingAfter(after);
    }

    private void addImageRun(XWPFTableCell cell, String resourcePath, int widthPx, int heightPx) throws IOException {
        XWPFParagraph paragraph = cell.getParagraphs().get(0);
        paragraph.setSpacingAfter(0);
        XWPFRun run = paragraph.createRun();
        byte[] image = readBinaryResource(resourcePath);
        if (image.length == 0) {
            return;
        }
        try {
            run.addPicture(new ByteArrayInputStream(image), XWPFDocument.PICTURE_TYPE_PNG, resourcePath, Units.toEMU(widthPx), Units.toEMU(heightPx));
        } catch (InvalidFormatException e) {
            throw new IOException("No se pudo insertar la imagen " + resourcePath, e);
        }
    }

    private byte[] readBinaryResource(String resourcePath) throws IOException {
        try (InputStream input = getClass().getClassLoader().getResourceAsStream(resourcePath);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            if (input == null) {
                return new byte[0];
            }
            byte[] buffer = new byte[4096];
            int read;
            while ((read = input.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            return out.toByteArray();
        }
    }

    private List<ActaMantenimientoPcRequest.ActividadMantenimiento> normalizedActivities(List<ActaMantenimientoPcRequest.ActividadMantenimiento> incoming) {
        List<ActaMantenimientoPcRequest.ActividadMantenimiento> result = new ArrayList<>();
        for (int i = 0; i < ACTIVIDADES.size(); i++) {
            ActaMantenimientoPcRequest.ActividadMantenimiento item =
                    incoming != null && i < incoming.size() && incoming.get(i) != null
                            ? incoming.get(i)
                            : new ActaMantenimientoPcRequest.ActividadMantenimiento();
            if (item.getActividad() == null || item.getActividad().trim().isEmpty()) {
                item.setActividad(ACTIVIDADES.get(i));
            }
            result.add(item);
        }
        return result;
    }

    private void ensureActaDefaults(ActaMantenimientoPcRequest request) {
        if (request.getFuncionario() == null) {
            request.setFuncionario(new ActaMantenimientoPcRequest.Funcionario());
        }
        if (request.getDesktop() == null) {
            request.setDesktop(new ActaMantenimientoPcRequest.EquipoRow());
        }
        if (request.getLaptop() == null) {
            request.setLaptop(new ActaMantenimientoPcRequest.EquipoRow());
        }
        if (request.getEntrega() == null) {
            request.setEntrega(new ActaMantenimientoPcRequest.FirmaRecepcion());
        }
        if (request.getRecibe() == null) {
            request.setRecibe(new ActaMantenimientoPcRequest.FirmaRecepcion());
        }
        if (request.getActividades() == null) {
            request.setActividades(new ArrayList<>());
        }
        if (request.getCertificacion() == null || request.getCertificacion().trim().isEmpty()) {
            request.setCertificacion(CERTIFICACION_DEFAULT);
        }
        if (request.getDesktop().getTipo() == null || request.getDesktop().getTipo().trim().isEmpty()) {
            request.getDesktop().setTipo("DESKTOP");
        }
        if (request.getLaptop().getTipo() == null || request.getLaptop().getTipo().trim().isEmpty()) {
            request.getLaptop().setTipo("LAPTOP");
        }
    }

    private List<String> wrap(String text, float width, float fontSize, PDType1Font font) throws IOException {
        String normalized = normalize(text);
        if (normalized.isEmpty()) {
            return Arrays.asList("");
        }
        List<String> lines = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String word : normalized.split("\\s+")) {
            String candidate = current.length() == 0 ? word : current + " " + word;
            float candidateWidth = font.getStringWidth(candidate) / 1000f * fontSize;
            if (candidateWidth <= width || current.length() == 0) {
                current.setLength(0);
                current.append(candidate);
            } else {
                lines.add(current.toString());
                current.setLength(0);
                current.append(word);
            }
        }
        if (current.length() > 0) {
            lines.add(current.toString());
        }
        return lines;
    }

    private String normalize(String value) {
        return value == null ? "" : value.replace('\u00A0', ' ').trim();
    }
}
