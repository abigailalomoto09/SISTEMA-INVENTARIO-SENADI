package com.mycompany.sistemainventariov3.service;

import com.mycompany.sistemainventariov3.dto.ActaSoftwareRequest;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTBody;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTTcPr;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.CTVMerge;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STMerge;
import org.openxmlformats.schemas.wordprocessingml.x2006.main.STVerticalJc;

import javax.xml.namespace.QName;
import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ActaSoftwareDocumentService {

    private static final String NS      = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    private static final QName  QGRID   = new QName(NS, "tblGrid");
    private static final QName  QTBLPR  = new QName(NS, "tblPr");
    private static final QName  QLAYOUT = new QName(NS, "tblLayout");

    private static final String TITULO_1 = "SERVICIO NACIONAL DE DERECHOS INTELECTUALES";
    private static final String TITULO_2 = "DIRECCIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN";
    private static final String TITULO_3 = "FORMULARIO DE PROGRAMAS Y APLICACIONES INSTALADAS";

    private static final String CERTIFICACION_DEFAULT =
            "Certifico que los programas y aplicaciones detallados en el presente documento se encuentran " +
            "debidamente instalados y licenciados en el equipo institucional asignado a mi cargo. Me comprometo " +
            "a utilizar correctamente los recursos tecnológicos, a no instalar software no autorizado y a " +
            "reportar cualquier novedad al área de soporte de DTIC.";

    // Software items page 1 — [categoria, programa]
    private static final String[][] SOFTWARE_PAGE1 = {
        {"SISTEMA OPERATIVO",             "MICROSOFT WINDOWS 10 HOME"},
        {"SISTEMA OPERATIVO",             "MICROSOFT WINDOWS 10 PRO"},
        {"PAQUETE OFIMÁTICO",             "MICROSOFT OFFICE 365 PRO PLUS"},
        {"SOFTWARE ANTIVIRUS",            "KASPERSKY ENDPOINT SECURITY 11.9"},
        {"NAVEGADORES",                   "GOOGLE CHROME"},
        {"NAVEGADORES",                   "MOZILLA FIREFOX"},
        {"NAVEGADORES",                   "MICROSOFT EDGE"},
        {"NAVEGADORES",                   "INTERNET EXPLORER"},
        {"SOFTWARE SOPORTE REMOTO",       "ANYDESK"},
        {"SOFTWARE SOPORTE REMOTO",       "ZOHO ASSIST"},
        {"SOFTWARE DE FIRMA ELECTRÓNICA", "TOKEN SECURITY BAUAC 2018 (64 BITS)"},
        {"SOFTWARE DE FIRMA ELECTRÓNICA", "SIGNER DIGITAL 1.0.0.VERSIÓN"},
        {"SOFTWARE PARA VISUALIZACIÓN PDF","ADOBE ACROBAT READER"},
        {"SOFTWARE PARA VISUALIZACIÓN PDF","PDF 24 CREATOR"},
        {"SOFTWARE PARA VISUALIZACIÓN PDF","FOXIT READER"},
        {"COMPRESIÓN",                    "WINRAR"},
        {"CORREOS",                       "MICROSOFT OUTLOOK"},
        {"VIDEO CONFERENCIA",             "ZOOM MEETINGS"}
    };

    // Driver items page 2 — program name only (category = "CONTROLADORES / DRIVERS")
    private static final String[] DRIVERS_PAGE2 = {
        "HP LASER JET COLOR",
        "HP LASER JET B/N",
        "LEXMARK LASER B/N",
        "ESCÁNER EPSON",
        "ESCÁNER HP",
        "ESCÁNER KODAK"
    };

    // PDF layout constants (pt)
    private static final float PAGE_W  = PDRectangle.A4.getWidth();   // 595.28
    private static final float PAGE_H  = PDRectangle.A4.getHeight();  // 841.89
    private static final float MARGIN  = 40f;
    private static final float CONT_W  = PAGE_W - 2 * MARGIN;        // 515.28

    private static final float H_HDR   = 18f;
    private static final float H_ROW   = 16f;
    private static final float H_SW    = 14f;   // software row height
    private static final float H_DARK  = 22f;
    private static final float H_SIGN  = 65f;
    private static final float FOOTER_Y = 78f;

    // ══════════════════════════ PUBLIC ENTRY POINTS ══════════════════════════════

    public byte[] generarDocx(ActaSoftwareRequest request) throws IOException {
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ensureDefaults(request);
            configurePage(doc);
            addDocumentHeader(doc);
            addFuncionarioTable(doc, request);
            addEquipoTable(doc, request);
            addSoftwarePage1Table(doc, request);
            addDriversPage2Table(doc, request);
            addCertificacion(doc, request);
            addEntregaRecepcionTable(doc, request);
            addFooter(doc);
            doc.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generarPdf(ActaSoftwareRequest request) throws IOException {
        ensureDefaults(request);
        try (PDDocument doc = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            buildPage1(doc, request);
            buildPage2(doc, request);

            doc.save(out);
            return out.toByteArray();
        }
    }

    // ══════════════════════════ PDF GENERATION ════════════════════════════════════

    private void buildPage1(PDDocument doc, ActaSoftwareRequest req) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            float y = PAGE_H - MARGIN;

            // ── Logos ─────────────────────────────────────────────────────────
            float logoY = y - 50f;
            drawLogo(doc, cs, "logo_ecuador.png",  MARGIN,             logoY, 48f, 48f);
            drawLogo(doc, cs, "logo_senadi.png",   PAGE_W - MARGIN - 64f, logoY, 64f, 48f);

            // ── Títulos ──────────────────────────────────────────────────────
            float tx = MARGIN + 60f;
            float tw = CONT_W - 120f;
            float ty = y - 15f;
            drawCenteredText(cs, TITULO_1, tx, ty, tw, PDType1Font.HELVETICA_BOLD, 10f);
            ty -= 12f;
            drawCenteredText(cs, TITULO_2, tx, ty, tw, PDType1Font.HELVETICA_BOLD, 8f);
            ty -= 13f;
            drawCenteredText(cs, TITULO_3, tx, ty, tw, PDType1Font.HELVETICA_BOLD, 10f);

            y = logoY - 8f;

            // ── Funcionario ──────────────────────────────────────────────────
            ActaSoftwareRequest.Funcionario f = req.getFuncionario();
            float[] fw = {CONT_W * 0.13f, CONT_W * 0.30f, CONT_W * 0.12f, CONT_W * 0.25f, CONT_W * 0.09f, CONT_W * 0.11f};
            y = drawHeaderRow(cs, "DATOS DEL FUNCIONARIO SENADI", MARGIN, y, CONT_W, H_HDR);
            y = drawSixCellRow(cs, MARGIN, y, fw, H_ROW,
                "NOMBRE", n(f.getNombre()),
                "CARGO",  n(f.getCargo()),
                "N° EXT.", n(f.getExtension()));
            y = drawSixCellRow(cs, MARGIN, y, fw, H_ROW,
                "CORREO", n(f.getCorreo()),
                "ÁREA",   n(f.getArea()),
                "EDIFICIO", n(f.getEdificio()));

            // ── Equipo ───────────────────────────────────────────────────────
            ActaSoftwareRequest.EquipoInfo eq = req.getEquipo();
            float[] ew = {CONT_W * 0.15f, CONT_W * 0.22f, CONT_W * 0.22f, CONT_W * 0.22f, CONT_W * 0.19f};
            y = drawHeaderRow(cs, "EQUIPOS", MARGIN, y, CONT_W, H_HDR);
            y = drawFiveColHeader(cs, MARGIN, y, ew, H_ROW,
                "TIPO", "MARCA", "MODELO", "SERIAL", "CÓDIGO");
            y = drawFiveColRow(cs, MARGIN, y, ew, H_ROW,
                n(eq.getTipo()), n(eq.getMarca()), n(eq.getModelo()), n(eq.getSerial()), n(eq.getCodigo()));

            // ── Software table ────────────────────────────────────────────────
            float cW  = CONT_W * 0.37f;
            float pW  = CONT_W * 0.47f;
            float iW  = CONT_W * 0.16f;
            y = drawDarkRow(cs, "PROGRAMAS Y APLICACIONES INSTALADAS", MARGIN, y, CONT_W, H_DARK);
            y = drawSwColHeader(cs, MARGIN, y, cW, pW, iW, H_ROW);

            List<ActaSoftwareRequest.SoftwareItem> items = req.getSoftwareItems();
            for (int i = 0; i < SOFTWARE_PAGE1.length; i++) {
                String[] def = SOFTWARE_PAGE1[i];
                String instalado = "";
                if (items != null && i < items.size()) {
                    instalado = n(items.get(i).getInstalado());
                }
                y = drawSwRow(cs, MARGIN, y, cW, pW, iW, H_SW, def[0], def[1], instalado, i % 2 == 1);
            }

            // ── Footer ───────────────────────────────────────────────────────
            drawFooter(cs);
        }
    }

    private void buildPage2(PDDocument doc, ActaSoftwareRequest req) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            float y = PAGE_H - MARGIN;

            // ── Logos ─────────────────────────────────────────────────────────
            float logoY = y - 50f;
            drawLogo(doc, cs, "logo_ecuador.png",  MARGIN,                 logoY, 48f, 48f);
            drawLogo(doc, cs, "logo_senadi.png",   PAGE_W - MARGIN - 64f, logoY, 64f, 48f);

            float tx = MARGIN + 60f;
            float tw = CONT_W - 120f;
            float ty = y - 15f;
            drawCenteredText(cs, TITULO_1, tx, ty, tw, PDType1Font.HELVETICA_BOLD, 10f);
            ty -= 12f;
            drawCenteredText(cs, TITULO_2, tx, ty, tw, PDType1Font.HELVETICA_BOLD, 8f);
            ty -= 13f;
            drawCenteredText(cs, TITULO_3, tx, ty, tw, PDType1Font.HELVETICA_BOLD, 10f);

            y = logoY - 8f;

            // ── Drivers table ─────────────────────────────────────────────────
            float cW = CONT_W * 0.37f;
            float pW = CONT_W * 0.47f;
            float iW = CONT_W * 0.16f;

            y = drawDarkRow(cs, "CONTROLADORES / DRIVERS", MARGIN, y, CONT_W, H_DARK);
            y = drawSwColHeader(cs, MARGIN, y, cW, pW, iW, H_ROW);

            List<ActaSoftwareRequest.SoftwareItem> items = req.getSoftwareItems();
            int offset = SOFTWARE_PAGE1.length;
            for (int i = 0; i < DRIVERS_PAGE2.length; i++) {
                String instalado = "";
                int idx = offset + i;
                if (items != null && idx < items.size()) {
                    instalado = n(items.get(idx).getInstalado());
                }
                y = drawSwRow(cs, MARGIN, y, cW, pW, iW, H_SW, "CONTROLADORES / DRIVERS", DRIVERS_PAGE2[i], instalado, i % 2 == 1);
            }

            // ── Adicionales ───────────────────────────────────────────────────
            y = drawDarkRow(cs, "SOFTWARE Y DRIVERS ADICIONAL", MARGIN, y, CONT_W, H_DARK);
            y = drawSwColHeader(cs, MARGIN, y, cW, pW, iW, H_ROW);
            List<String> adicionales = req.getDriversAdicionales();
            for (int i = 0; i < 3; i++) {
                String val = (adicionales != null && i < adicionales.size()) ? n(adicionales.get(i)) : "";
                y = drawSwRow(cs, MARGIN, y, cW, pW, iW, H_SW + 4f, "", val, "", i % 2 == 1);
            }

            // ── Certificación ─────────────────────────────────────────────────
            String cert = (req.getCertificacion() != null && !req.getCertificacion().isEmpty())
                ? req.getCertificacion() : CERTIFICACION_DEFAULT;
            float certH = 50f;
            drawRect(cs, MARGIN, y - certH, CONT_W, certH, null, new Color(0.95f, 0.95f, 0.95f));
            drawParagraphInBox(cs, cert, MARGIN + 4f, y - 4f, CONT_W - 8f, certH - 6f, 7f, false);
            y -= certH;

            // ── Entrega / Recibe ──────────────────────────────────────────────
            ActaSoftwareRequest.FirmaRecepcion entrega = req.getEntrega();
            ActaSoftwareRequest.FirmaRecepcion recibe  = req.getRecibe();
            float half = CONT_W / 2f;

            y = drawHeaderRow(cs, "ENTREGA RECEPCIÓN DEL EQUIPO", MARGIN, y, CONT_W, H_HDR);

            // column headers
            drawRect(cs, MARGIN,        y - H_ROW, half, H_ROW, Color.BLACK, new Color(0.2f, 0.2f, 0.5f));
            drawRect(cs, MARGIN + half, y - H_ROW, half, H_ROW, Color.BLACK, new Color(0.2f, 0.2f, 0.5f));
            drawCenteredText(cs, "ENTREGA", MARGIN,        y - H_ROW, half, PDType1Font.HELVETICA_BOLD, 8f, Color.WHITE);
            drawCenteredText(cs, "RECIBE",  MARGIN + half, y - H_ROW, half, PDType1Font.HELVETICA_BOLD, 8f, Color.WHITE);
            y -= H_ROW;

            // nombre row
            drawRect(cs, MARGIN,        y - H_ROW, half, H_ROW, Color.BLACK, null);
            drawRect(cs, MARGIN + half, y - H_ROW, half, H_ROW, Color.BLACK, null);
            drawText(cs, "Nombre: " + n(entrega.getNombre()), MARGIN + 4f, y - H_ROW / 2f - 3f, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            drawText(cs, "Nombre: " + n(recibe.getNombre()),  MARGIN + half + 4f, y - H_ROW / 2f - 3f, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            y -= H_ROW;

            // firma row
            drawRect(cs, MARGIN,        y - H_SIGN, half, H_SIGN, Color.BLACK, null);
            drawRect(cs, MARGIN + half, y - H_SIGN, half, H_SIGN, Color.BLACK, null);
            drawText(cs, "Firma: " + n(entrega.getFirma()), MARGIN + 4f, y - 12f, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            drawText(cs, "Firma: " + n(recibe.getFirma()),  MARGIN + half + 4f, y - 12f, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            y -= H_SIGN;

            // fecha row
            drawRect(cs, MARGIN,        y - H_ROW, half, H_ROW, Color.BLACK, null);
            drawRect(cs, MARGIN + half, y - H_ROW, half, H_ROW, Color.BLACK, null);
            drawText(cs, "Fecha: " + n(entrega.getFecha()), MARGIN + 4f, y - H_ROW / 2f - 3f, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            drawText(cs, "Fecha: " + n(recibe.getFecha()),  MARGIN + half + 4f, y - H_ROW / 2f - 3f, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            y -= H_ROW;

            drawFooter(cs);
        }
    }

    // ──────────────────────── PDF ROW DRAWING HELPERS ─────────────────────────

    private float drawHeaderRow(PDPageContentStream cs, String title, float x, float y, float w, float h) throws IOException {
        drawRect(cs, x, y - h, w, h, Color.BLACK, new Color(0.2f, 0.2f, 0.5f));
        float asc = 8.5f * 0.718f;
        drawText(cs, title, x + 4f, y - h / 2f - asc / 2f, PDType1Font.HELVETICA_BOLD, 8.5f, Color.WHITE, false);
        return y - h;
    }

    private float drawDarkRow(PDPageContentStream cs, String title, float x, float y, float w, float h) throws IOException {
        drawRect(cs, x, y - h, w, h, Color.BLACK, new Color(0.6f, 0.6f, 0.8f));
        float asc = 9f * 0.718f;
        drawText(cs, title, x + 4f, y - h / 2f - asc / 2f, PDType1Font.HELVETICA_BOLD, 9f, Color.BLACK, false);
        return y - h;
    }

    private float drawSwColHeader(PDPageContentStream cs, float x, float y, float cW, float pW, float iW, float h) throws IOException {
        drawRect(cs, x,          y - h, cW, h, Color.BLACK, new Color(0.85f, 0.85f, 0.92f));
        drawRect(cs, x + cW,     y - h, pW, h, Color.BLACK, new Color(0.85f, 0.85f, 0.92f));
        drawRect(cs, x + cW + pW, y - h, iW, h, Color.BLACK, new Color(0.85f, 0.85f, 0.92f));
        float asc = 8f * 0.718f;
        float by = y - h / 2f - asc / 2f;
        drawText(cs, "CATEGORÍA",           x + 3f,          by, PDType1Font.HELVETICA_BOLD, 8f, Color.BLACK, false);
        drawText(cs, "PROGRAMA / APLICACIÓN", x + cW + 3f,   by, PDType1Font.HELVETICA_BOLD, 8f, Color.BLACK, false);
        drawText(cs, "INSTALADO",           x + cW + pW + 3f, by, PDType1Font.HELVETICA_BOLD, 8f, Color.BLACK, false);
        return y - h;
    }

    private float drawSwRow(PDPageContentStream cs, float x, float y, float cW, float pW, float iW,
                             float h, String categoria, String programa, String instalado, boolean shaded) throws IOException {
        Color bg = shaded ? new Color(0.95f, 0.95f, 0.97f) : null;
        drawRect(cs, x,           y - h, cW, h, Color.BLACK, bg);
        drawRect(cs, x + cW,      y - h, pW, h, Color.BLACK, bg);
        drawRect(cs, x + cW + pW, y - h, iW, h, Color.BLACK, bg);
        float fs = 7.5f;
        float asc = fs * 0.718f;
        float by = y - h / 2f - asc / 2f;
        if (!categoria.isEmpty()) {
            drawText(cs, truncate(categoria, cW - 6f, fs), x + 3f, by, PDType1Font.HELVETICA, fs, Color.BLACK, false);
        }
        drawText(cs, truncate(programa, pW - 6f, fs), x + cW + 3f, by, PDType1Font.HELVETICA, fs, Color.BLACK, false);
        // instalado — centered
        if (!instalado.isEmpty()) {
            float tw = PDType1Font.HELVETICA_BOLD.getStringWidth(instalado) / 1000f * fs;
            drawText(cs, instalado, x + cW + pW + (iW - tw) / 2f, by, PDType1Font.HELVETICA_BOLD, fs, Color.BLACK, false);
        }
        return y - h;
    }

    private float drawSixCellRow(PDPageContentStream cs, float x, float y, float[] fw, float h,
                                  String l1, String v1, String l2, String v2, String l3, String v3) throws IOException {
        String[] labels = {l1, l2, l3};
        String[] values = {v1, v2, v3};
        float cx = x;
        for (int i = 0; i < 3; i++) {
            float lw = fw[i * 2];
            float vw = fw[i * 2 + 1];
            drawRect(cs, cx, y - h, lw, h, Color.BLACK, new Color(0.85f, 0.85f, 0.92f));
            drawRect(cs, cx + lw, y - h, vw, h, Color.BLACK, null);
            float asc = 7.5f * 0.718f;
            float by = y - h / 2f - asc / 2f;
            drawText(cs, labels[i], cx + 3f, by, PDType1Font.HELVETICA_BOLD, 7.5f, Color.BLACK, false);
            drawText(cs, truncate(values[i], vw - 6f, 7.5f), cx + lw + 3f, by, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            cx += lw + vw;
        }
        return y - h;
    }

    private float drawFiveColHeader(PDPageContentStream cs, float x, float y, float[] cw, float h,
                                     String... labels) throws IOException {
        float cx = x;
        for (int i = 0; i < labels.length; i++) {
            drawRect(cs, cx, y - h, cw[i], h, Color.BLACK, new Color(0.85f, 0.85f, 0.92f));
            float asc = 7.5f * 0.718f;
            drawText(cs, labels[i], cx + 3f, y - h / 2f - asc / 2f, PDType1Font.HELVETICA_BOLD, 7.5f, Color.BLACK, false);
            cx += cw[i];
        }
        return y - h;
    }

    private float drawFiveColRow(PDPageContentStream cs, float x, float y, float[] cw, float h,
                                  String... values) throws IOException {
        float cx = x;
        for (int i = 0; i < values.length; i++) {
            drawRect(cs, cx, y - h, cw[i], h, Color.BLACK, null);
            float asc = 7.5f * 0.718f;
            drawText(cs, truncate(values[i], cw[i] - 6f, 7.5f), cx + 3f, y - h / 2f - asc / 2f, PDType1Font.HELVETICA, 7.5f, Color.BLACK, false);
            cx += cw[i];
        }
        return y - h;
    }

    // ──────────────────────── PDF PRIMITIVES ──────────────────────────────────

    private void drawRect(PDPageContentStream cs, float x, float y, float w, float h, Color stroke, Color fill) throws IOException {
        if (fill != null) {
            cs.setNonStrokingColor(fill);
            cs.addRect(x, y, w, h);
            cs.fill();
        }
        if (stroke != null) {
            cs.setStrokingColor(stroke);
            cs.setLineWidth(0.5f);
            cs.addRect(x, y, w, h);
            cs.stroke();
        }
        cs.setNonStrokingColor(Color.BLACK);
        cs.setStrokingColor(Color.BLACK);
    }

    private void drawText(PDPageContentStream cs, String text, float x, float y, PDType1Font font, float fs,
                           Color color, boolean bold) throws IOException {
        if (text == null || text.isEmpty()) return;
        String safe = normalize(text);
        cs.beginText();
        cs.setFont(bold ? PDType1Font.HELVETICA_BOLD : font, fs);
        cs.setNonStrokingColor(color);
        cs.newLineAtOffset(x, y);
        cs.showText(safe);
        cs.endText();
        cs.setNonStrokingColor(Color.BLACK);
    }

    private void drawCenteredText(PDPageContentStream cs, String text, float x, float y, float w,
                                   PDType1Font font, float fs) throws IOException {
        drawCenteredText(cs, text, x, y, w, font, fs, Color.BLACK);
    }

    private void drawCenteredText(PDPageContentStream cs, String text, float x, float y, float w,
                                   PDType1Font font, float fs, Color color) throws IOException {
        if (text == null || text.isEmpty()) return;
        String safe = normalize(text);
        float tw = font.getStringWidth(safe) / 1000f * fs;
        float tx = x + (w - tw) / 2f;
        float baseline = y - fs * 0.718f;
        drawText(cs, safe, tx, baseline, font, fs, color, false);
    }

    private void drawParagraphInBox(PDPageContentStream cs, String text, float x, float y, float maxW,
                                     float maxH, float fs, boolean bold) throws IOException {
        if (text == null || text.isEmpty()) return;
        PDType1Font font = bold ? PDType1Font.HELVETICA_BOLD : PDType1Font.HELVETICA;
        List<String> lines = wrapText(text, font, fs, maxW);
        float ascent = fs * 0.718f;
        float lh     = fs * 1.3f;
        float cy     = y - ascent;
        int max = Math.max(1, (int) Math.floor(maxH / lh));
        for (int i = 0; i < lines.size() && i < max; i++) {
            drawText(cs, lines.get(i), x, cy, font, fs, Color.BLACK, bold);
            cy -= lh;
        }
    }

    private void drawFooter(PDPageContentStream cs) throws IOException {
        float fy = FOOTER_Y - 12f;
        cs.setStrokingColor(new Color(0.6f, 0.6f, 0.6f));
        cs.setLineWidth(0.5f);
        cs.moveTo(MARGIN, FOOTER_Y);
        cs.lineTo(PAGE_W - MARGIN, FOOTER_Y);
        cs.stroke();
        drawText(cs, "Dirección: Av. República E7-197 y Diego de Almagro — Edificio FORUM 300 | Código postal: 170518 / Quito — Ecuador", MARGIN, fy, PDType1Font.HELVETICA, 6f, new Color(0.4f, 0.4f, 0.4f), false);
        drawText(cs, "Teléfono: +539-2 394 0000 | www.derechosintelectuales.gob.ec", MARGIN, fy - 8f, PDType1Font.HELVETICA, 6f, new Color(0.4f, 0.4f, 0.4f), false);
        cs.setStrokingColor(Color.BLACK);
    }

    private void drawLogo(PDDocument doc, PDPageContentStream cs, String name, float x, float y, float w, float h) {
        try (InputStream is = getClass().getResourceAsStream("/assets/actas/" + name)) {
            if (is == null) return;
            byte[] bytes = is.readAllBytes();
            PDImageXObject img = PDImageXObject.createFromByteArray(doc, bytes, name);
            cs.drawImage(img, x, y, w, h);
        } catch (Exception ignored) {}
    }

    // ──────────────────────── TEXT UTILITIES ──────────────────────────────────

    private String normalize(String s) {
        if (s == null) return "";
        return s.replace("á","a").replace("é","e").replace("í","i")
                .replace("ó","o").replace("ú","u").replace("ü","u")
                .replace("Á","A").replace("É","E").replace("Í","I")
                .replace("Ó","O").replace("Ú","U").replace("Ü","U")
                .replace("ñ","n").replace("Ñ","N")
                .replace("º","°").replace("ª","°")
                .replaceAll("[\\p{Cntrl}]", " ").trim();
    }

    private String n(String s) {
        return s == null ? "" : s.trim();
    }

    private String truncate(String text, float maxW, float fs) {
        if (text == null || text.isEmpty()) return "";
        String s = normalize(text);
        try {
            float tw = PDType1Font.HELVETICA.getStringWidth(s) / 1000f * fs;
            if (tw <= maxW) return s;
            while (s.length() > 1) {
                s = s.substring(0, s.length() - 1);
                tw = PDType1Font.HELVETICA.getStringWidth(s + "...") / 1000f * fs;
                if (tw <= maxW) return s + "...";
            }
        } catch (IOException ignored) {}
        return s;
    }

    private List<String> wrapText(String text, PDType1Font font, float fs, float maxW) {
        List<String> result = new ArrayList<>();
        if (text == null || text.isEmpty()) return result;
        String[] words = normalize(text).split("\\s+");
        StringBuilder line = new StringBuilder();
        for (String word : words) {
            String candidate = line.length() == 0 ? word : line + " " + word;
            try {
                float w = font.getStringWidth(candidate) / 1000f * fs;
                if (w > maxW && line.length() > 0) {
                    result.add(line.toString());
                    line = new StringBuilder(word);
                } else {
                    line = new StringBuilder(candidate);
                }
            } catch (IOException e) {
                line = new StringBuilder(candidate);
            }
        }
        if (line.length() > 0) result.add(line.toString());
        return result;
    }

    // ══════════════════════════ DOCX GENERATION ═══════════════════════════════

    private void ensureDefaults(ActaSoftwareRequest req) {
        if (req.getFuncionario() == null) req.setFuncionario(new ActaSoftwareRequest.Funcionario());
        if (req.getEquipo() == null) req.setEquipo(new ActaSoftwareRequest.EquipoInfo());
        if (req.getSoftwareItems() == null) req.setSoftwareItems(new ArrayList<>());
        if (req.getDriversAdicionales() == null) req.setDriversAdicionales(new ArrayList<>());
        if (req.getEntrega() == null) req.setEntrega(new ActaSoftwareRequest.FirmaRecepcion());
        if (req.getRecibe() == null) req.setRecibe(new ActaSoftwareRequest.FirmaRecepcion());
        if (req.getCertificacion() == null || req.getCertificacion().isEmpty()) {
            req.setCertificacion(CERTIFICACION_DEFAULT);
        }
    }

    private void configurePage(XWPFDocument doc) {
        CTBody body = doc.getDocument().getBody();
        org.openxmlformats.schemas.wordprocessingml.x2006.main.CTSectPr sect =
                body.isSetSectPr() ? body.getSectPr() : body.addNewSectPr();
        org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageSz sz =
                sect.isSetPgSz() ? sect.getPgSz() : sect.addNewPgSz();
        sz.setW(java.math.BigInteger.valueOf(11906));
        sz.setH(java.math.BigInteger.valueOf(16838));
        org.openxmlformats.schemas.wordprocessingml.x2006.main.CTPageMar mar =
                sect.isSetPgMar() ? sect.getPgMar() : sect.addNewPgMar();
        mar.setTop(java.math.BigInteger.valueOf(720));
        mar.setBottom(java.math.BigInteger.valueOf(720));
        mar.setLeft(java.math.BigInteger.valueOf(720));
        mar.setRight(java.math.BigInteger.valueOf(720));
    }

    private void addDocumentHeader(XWPFDocument doc) throws IOException {
        XWPFParagraph p1 = doc.createParagraph();
        p1.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun r1 = p1.createRun();
        r1.setText(TITULO_1);
        r1.setBold(true);
        r1.setFontSize(11);

        XWPFParagraph p2 = doc.createParagraph();
        p2.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun r2 = p2.createRun();
        r2.setText(TITULO_2);
        r2.setBold(true);
        r2.setFontSize(9);

        XWPFParagraph p3 = doc.createParagraph();
        p3.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun r3 = p3.createRun();
        r3.setText(TITULO_3);
        r3.setBold(true);
        r3.setFontSize(11);
    }

    private void addFuncionarioTable(XWPFDocument doc, ActaSoftwareRequest req) {
        ActaSoftwareRequest.Funcionario f = req.getFuncionario();
        XWPFTable t = doc.createTable(3, 6);
        setTableWidth(t, 9360);
        XWPFTableRow header = t.getRow(0);
        mergeCellsHorizontal(header, 0, 5);
        setBold(header.getCell(0), "DATOS DEL FUNCIONARIO SENADI", 9, true, "2E4057");

        XWPFTableRow r1 = t.getRow(1);
        setCell(r1.getCell(0), "NOMBRE", 8, true);
        setCell(r1.getCell(1), n(f.getNombre()), 8, false);
        setCell(r1.getCell(2), "CARGO", 8, true);
        setCell(r1.getCell(3), n(f.getCargo()), 8, false);
        setCell(r1.getCell(4), "N° EXT.", 8, true);
        setCell(r1.getCell(5), n(f.getExtension()), 8, false);

        XWPFTableRow r2 = t.getRow(2);
        setCell(r2.getCell(0), "CORREO", 8, true);
        setCell(r2.getCell(1), n(f.getCorreo()), 8, false);
        setCell(r2.getCell(2), "ÁREA", 8, true);
        setCell(r2.getCell(3), n(f.getArea()), 8, false);
        setCell(r2.getCell(4), "EDIFICIO", 8, true);
        setCell(r2.getCell(5), n(f.getEdificio()), 8, false);
    }

    private void addEquipoTable(XWPFDocument doc, ActaSoftwareRequest req) {
        ActaSoftwareRequest.EquipoInfo eq = req.getEquipo();
        XWPFTable t = doc.createTable(3, 5);
        setTableWidth(t, 9360);
        XWPFTableRow h = t.getRow(0);
        mergeCellsHorizontal(h, 0, 4);
        setBold(h.getCell(0), "EQUIPOS", 9, true, "2E4057");
        XWPFTableRow hdr = t.getRow(1);
        setCell(hdr.getCell(0), "TIPO", 8, true);
        setCell(hdr.getCell(1), "MARCA", 8, true);
        setCell(hdr.getCell(2), "MODELO", 8, true);
        setCell(hdr.getCell(3), "SERIAL", 8, true);
        setCell(hdr.getCell(4), "CÓDIGO", 8, true);
        XWPFTableRow r = t.getRow(2);
        setCell(r.getCell(0), n(eq.getTipo()), 8, false);
        setCell(r.getCell(1), n(eq.getMarca()), 8, false);
        setCell(r.getCell(2), n(eq.getModelo()), 8, false);
        setCell(r.getCell(3), n(eq.getSerial()), 8, false);
        setCell(r.getCell(4), n(eq.getCodigo()), 8, false);
    }

    private void addSoftwarePage1Table(XWPFDocument doc, ActaSoftwareRequest req) {
        List<ActaSoftwareRequest.SoftwareItem> items = req.getSoftwareItems();
        XWPFTable t = doc.createTable(2 + SOFTWARE_PAGE1.length, 3);
        setTableWidth(t, 9360);
        XWPFTableRow h = t.getRow(0);
        mergeCellsHorizontal(h, 0, 2);
        setBold(h.getCell(0), "PROGRAMAS Y APLICACIONES INSTALADAS", 9, true, "2E4057");
        XWPFTableRow hdr = t.getRow(1);
        setCell(hdr.getCell(0), "CATEGORÍA", 8, true);
        setCell(hdr.getCell(1), "PROGRAMA / APLICACIÓN", 8, true);
        setCell(hdr.getCell(2), "INSTALADO", 8, true);
        for (int i = 0; i < SOFTWARE_PAGE1.length; i++) {
            String[] def = SOFTWARE_PAGE1[i];
            String ins = (items != null && i < items.size()) ? n(items.get(i).getInstalado()) : "";
            XWPFTableRow row = t.getRow(2 + i);
            setCell(row.getCell(0), def[0], 8, false);
            setCell(row.getCell(1), def[1], 8, false);
            setCell(row.getCell(2), ins, 8, false);
        }
    }

    private void addDriversPage2Table(XWPFDocument doc, ActaSoftwareRequest req) {
        List<ActaSoftwareRequest.SoftwareItem> items = req.getSoftwareItems();
        int offset = SOFTWARE_PAGE1.length;
        XWPFTable t = doc.createTable(2 + DRIVERS_PAGE2.length + 5, 3);
        setTableWidth(t, 9360);
        XWPFTableRow h = t.getRow(0);
        mergeCellsHorizontal(h, 0, 2);
        setBold(h.getCell(0), "CONTROLADORES / DRIVERS", 9, true, "2E4057");
        XWPFTableRow hdr = t.getRow(1);
        setCell(hdr.getCell(0), "CATEGORÍA", 8, true);
        setCell(hdr.getCell(1), "PROGRAMA / APLICACIÓN", 8, true);
        setCell(hdr.getCell(2), "INSTALADO", 8, true);
        for (int i = 0; i < DRIVERS_PAGE2.length; i++) {
            int idx = offset + i;
            String ins = (items != null && idx < items.size()) ? n(items.get(idx).getInstalado()) : "";
            XWPFTableRow row = t.getRow(2 + i);
            setCell(row.getCell(0), "CONTROLADORES / DRIVERS", 8, false);
            setCell(row.getCell(1), DRIVERS_PAGE2[i], 8, false);
            setCell(row.getCell(2), ins, 8, false);
        }
        // Adicionales header
        int base = 2 + DRIVERS_PAGE2.length;
        mergeCellsHorizontal(t.getRow(base), 0, 2);
        setBold(t.getRow(base).getCell(0), "SOFTWARE Y DRIVERS ADICIONAL", 9, true, "2E4057");
        setCell(t.getRow(base + 1).getCell(0), "CATEGORÍA", 8, true);
        setCell(t.getRow(base + 1).getCell(1), "PROGRAMA / APLICACIÓN", 8, true);
        setCell(t.getRow(base + 1).getCell(2), "INSTALADO", 8, true);
        List<String> adicionales = req.getDriversAdicionales();
        for (int i = 0; i < 3; i++) {
            String val = (adicionales != null && i < adicionales.size()) ? n(adicionales.get(i)) : "";
            setCell(t.getRow(base + 2 + i).getCell(0), "", 8, false);
            setCell(t.getRow(base + 2 + i).getCell(1), val, 8, false);
            setCell(t.getRow(base + 2 + i).getCell(2), "", 8, false);
        }
    }

    private void addCertificacion(XWPFDocument doc, ActaSoftwareRequest req) {
        String cert = (req.getCertificacion() != null && !req.getCertificacion().isEmpty())
            ? req.getCertificacion() : CERTIFICACION_DEFAULT;
        XWPFParagraph p = doc.createParagraph();
        p.setSpacingBefore(100);
        XWPFRun r = p.createRun();
        r.setText(cert);
        r.setFontSize(8);
        r.setItalic(true);
    }

    private void addEntregaRecepcionTable(XWPFDocument doc, ActaSoftwareRequest req) {
        ActaSoftwareRequest.FirmaRecepcion entrega = req.getEntrega();
        ActaSoftwareRequest.FirmaRecepcion recibe  = req.getRecibe();
        XWPFTable t = doc.createTable(5, 2);
        setTableWidth(t, 9360);
        XWPFTableRow h = t.getRow(0);
        mergeCellsHorizontal(h, 0, 1);
        setBold(h.getCell(0), "ENTREGA RECEPCIÓN DEL EQUIPO", 9, true, "2E4057");
        XWPFTableRow hdr = t.getRow(1);
        setCell(hdr.getCell(0), "ENTREGA", 8, true);
        setCell(hdr.getCell(1), "RECIBE", 8, true);
        setCell(t.getRow(2).getCell(0), "Nombre: " + n(entrega.getNombre()), 8, false);
        setCell(t.getRow(2).getCell(1), "Nombre: " + n(recibe.getNombre()), 8, false);
        setMinHeight(t.getRow(3), 900);
        setCell(t.getRow(3).getCell(0), "Firma: " + n(entrega.getFirma()), 8, false);
        setCell(t.getRow(3).getCell(1), "Firma: " + n(recibe.getFirma()), 8, false);
        setCell(t.getRow(4).getCell(0), "Fecha: " + n(entrega.getFecha()), 8, false);
        setCell(t.getRow(4).getCell(1), "Fecha: " + n(recibe.getFecha()), 8, false);
    }

    private void addFooter(XWPFDocument doc) {
        XWPFParagraph p = doc.createParagraph();
        p.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun r = p.createRun();
        r.setText("Dirección: Av. República E7-197 y Diego de Almagro — Edificio FORUM 300 | Tel: +539-2 394 0000 | www.derechosintelectuales.gob.ec");
        r.setFontSize(7);
        r.setColor("888888");
    }

    // ──────────────────────── DOCX CELL HELPERS ───────────────────────────────

    private void setCell(XWPFTableCell cell, String text, int fontSize, boolean bold) {
        cell.getParagraphs().get(0).getRuns().clear();
        XWPFParagraph p = cell.getParagraphs().get(0);
        XWPFRun r = p.createRun();
        r.setText(text == null ? "" : text);
        r.setFontSize(fontSize);
        r.setBold(bold);
    }

    private void setBold(XWPFTableCell cell, String text, int fontSize, boolean bold, String bgHex) {
        setCell(cell, text, fontSize, bold);
        if (bgHex != null) {
            cell.setColor(bgHex);
            cell.getParagraphs().get(0).getRuns().get(0).setColor("FFFFFF");
        }
    }

    private void mergeCellsHorizontal(XWPFTableRow row, int from, int to) {
        for (int i = from; i <= to; i++) {
            XWPFTableCell cell = row.getCell(i);
            CTTcPr pr = cell.getCTTc().isSetTcPr() ? cell.getCTTc().getTcPr() : cell.getCTTc().addNewTcPr();
            CTVMerge merge = pr.isSetHMerge() ? pr.getHMerge() : pr.addNewHMerge();
            if (i == from) {
                merge.setVal(STMerge.RESTART);
            } else {
                merge.setVal(STMerge.CONTINUE);
            }
        }
    }

    private void setTableWidth(XWPFTable t, int twips) {
        t.getCTTbl().getTblPr().getTblW().setW(java.math.BigInteger.valueOf(twips));
        t.getCTTbl().getTblPr().getTblW().setType(
            org.openxmlformats.schemas.wordprocessingml.x2006.main.STTblWidth.DXA);
    }

    private void setMinHeight(XWPFTableRow row, int twips) {
        row.getCtRow().getTrPr().addNewTrHeight().setVal(java.math.BigInteger.valueOf(twips));
    }
}
