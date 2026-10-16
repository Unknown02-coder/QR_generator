package com.handmadeqr.qr;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import javax.imageio.ImageIO;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.stereotype.Component;

@Component
public class QrImage {

    private static final Map<EncodeHintType, Object> HINTS = Map.of(
            EncodeHintType.CHARACTER_SET, "UTF-8",
            EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M,
            EncodeHintType.MARGIN, 4);

    public void validate(String payload) {
        matrix(payload, 1);
    }

    public byte[] png(String payload, int size) {
        if (size <= 0) {
            throw new IllegalArgumentException("QR size must be positive");
        }
        BitMatrix matrix = matrix(payload, size);
        BufferedImage image = new BufferedImage(matrix.getWidth(), matrix.getHeight(), BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < matrix.getHeight(); y++) {
            for (int x = 0; x < matrix.getWidth(); x++) {
                image.setRGB(x, y, matrix.get(x, y) ? Color.BLACK.getRGB() : Color.WHITE.getRGB());
            }
        }
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "PNG", output);
            return output.toByteArray();
        } catch (IOException error) {
            throw new IllegalStateException("QR PNG could not be rendered", error);
        }
    }

    public byte[] svg(String payload) {
        BitMatrix matrix = matrix(payload, 1);
        int width = matrix.getWidth();
        int height = matrix.getHeight();
        StringBuilder svg = new StringBuilder(width * height * 8);
        svg.append("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1024\" height=\"1024\" viewBox=\"0 0 ")
                .append(width).append(' ').append(height)
                .append("\" shape-rendering=\"crispEdges\"><path fill=\"#fff\" d=\"M0 0h")
                .append(width).append('v').append(height).append("H0z\"/><path fill=\"#000\" d=\"");
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (matrix.get(x, y)) {
                    svg.append('M').append(x).append(' ').append(y).append("h1v1h-1z");
                }
            }
        }
        svg.append("\"/></svg>");
        return svg.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private BitMatrix matrix(String payload, int size) {
        if (payload == null || payload.isBlank()) {
            throw new IllegalArgumentException("QR payload is required");
        }
        try {
            return new QRCodeWriter().encode(payload, BarcodeFormat.QR_CODE, size, size, HINTS);
        } catch (WriterException error) {
            throw new IllegalArgumentException("QR payload exceeds capacity", error);
        }
    }
}
