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
