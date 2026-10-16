package com.handmadeqr.qr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.ByteArrayInputStream;

import javax.imageio.ImageIO;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import org.junit.jupiter.api.Test;

class QrImageTest {

    @Test
    void generatedPngDecodesToExactUtf8Payload() throws Exception {
        String payload = "WIFI:T:WPA;S:카페;P:비밀123;;";
        QrImage image = new QrImage();
        byte[] png = image.png(payload, 256);
        var bitmap = ImageIO.read(new ByteArrayInputStream(png));
        assertEquals(256, bitmap.getWidth());
        assertEquals(256, bitmap.getHeight());
        String decoded = new MultiFormatReader().decode(new BinaryBitmap(
                new HybridBinarizer(new BufferedImageLuminanceSource(bitmap)))).getText();
        assertEquals(payload, decoded);
    }

    @Test
    void payloadTooLargeForQrIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> new QrImage().validate("x".repeat(5000)));
    }
}
