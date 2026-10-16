package com.handmadeqr.qr;

import java.util.List;

public record QrPage(List<SavedQr> items, long total, int page, int pageSize) {
}
