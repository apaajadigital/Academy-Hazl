import PDFDocument from "pdfkit";
import { type Order } from "@prisma/client";

type InvoiceOrder = Order & {
  user: { name: string; email: string };
  items: { itemTitle: string | null; quantity: number; unitPrice: number | unknown; totalPrice: number | unknown }[];
  coupon?: { code: string } | null;
};

export function generateInvoicePDF(order: InvoiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 60 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - 120;

    // Header
    doc.fillColor("#0077A8").fontSize(22).font("Helvetica-Bold").text("HAZL ACADEMY", 60, 60);
    doc.fillColor("#6E6E73").fontSize(10).font("Helvetica").text("Platform Pembelajaran Online", 60, 86);

    // Invoice title
    doc
      .fillColor("#1D1D1F")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("INVOICE", doc.page.width - 60 - 120, 60, { width: 120, align: "right" });

    doc
      .fillColor("#6E6E73")
      .fontSize(10)
      .font("Helvetica")
      .text(`#${order.id.slice(0, 8).toUpperCase()}`, doc.page.width - 60 - 120, 84, { width: 120, align: "right" });

    // Divider
    doc.moveTo(60, 115).lineTo(doc.page.width - 60, 115).stroke("#E5E5EA");

    // Bill To / Info
    const infoY = 130;
    doc.fillColor("#6E6E73").fontSize(9).font("Helvetica-Bold").text("TAGIHAN KEPADA:", 60, infoY);
    doc.fillColor("#1D1D1F").fontSize(11).font("Helvetica-Bold").text(order.user.name, 60, infoY + 14);
    doc.fillColor("#6E6E73").fontSize(10).font("Helvetica").text(order.user.email, 60, infoY + 28);

    doc.fillColor("#6E6E73").fontSize(9).font("Helvetica-Bold").text("TANGGAL:", doc.page.width - 60 - 180, infoY, { width: 180, align: "right" });
    doc.fillColor("#1D1D1F").fontSize(10).font("Helvetica").text(
      new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(order.createdAt)),
      doc.page.width - 60 - 180,
      infoY + 14,
      { width: 180, align: "right" }
    );

    doc.fillColor("#6E6E73").fontSize(9).font("Helvetica-Bold").text("STATUS:", doc.page.width - 60 - 180, infoY + 30, { width: 180, align: "right" });
    const statusColor = order.status === "paid" ? "#34C759" : "#FF9500";
    doc.fillColor(statusColor).fontSize(10).font("Helvetica-Bold").text(order.status.toUpperCase(), doc.page.width - 60 - 180, infoY + 44, { width: 180, align: "right" });

    // Items table header
    const tableTop = 210;
    doc.rect(60, tableTop, W, 24).fill("#F5F5F7");
    doc.fillColor("#3C3C43").fontSize(9).font("Helvetica-Bold");
    doc.text("ITEM", 68, tableTop + 8);
    doc.text("QTY", 60 + W - 180, tableTop + 8, { width: 60, align: "center" });
    doc.text("HARGA", 60 + W - 120, tableTop + 8, { width: 60, align: "right" });
    doc.text("SUBTOTAL", 60 + W - 60, tableTop + 8, { width: 52, align: "right" });

    let rowY = tableTop + 30;
    for (const item of order.items) {
      const price = Number(item.unitPrice);
      const total = Number(item.totalPrice);
      doc.fillColor("#1D1D1F").fontSize(10).font("Helvetica");
      doc.text(item.itemTitle ?? "Item", 68, rowY, { width: W - 200 });
      doc.text(String(item.quantity), 60 + W - 180, rowY, { width: 60, align: "center" });
      doc.text(`Rp ${price.toLocaleString("id-ID")}`, 60 + W - 120, rowY, { width: 60, align: "right" });
      doc.text(`Rp ${total.toLocaleString("id-ID")}`, 60 + W - 60, rowY, { width: 52, align: "right" });
      doc.moveTo(60, rowY + 18).lineTo(60 + W, rowY + 18).stroke("#E5E5EA");
      rowY += 26;
    }

    // Totals
    const totalsX = 60 + W - 220;
    let totRow = rowY + 10;

    if (order.discountAmount && Number(order.discountAmount) > 0) {
      const subtotal = Number(order.totalAmount);
      doc.fillColor("#6E6E73").fontSize(10).font("Helvetica").text("Subtotal:", totalsX, totRow, { width: 110 });
      doc.text(`Rp ${subtotal.toLocaleString("id-ID")}`, totalsX + 110, totRow, { width: 110, align: "right" });
      totRow += 18;

      const disc = Number(order.discountAmount);
      const couponCode = order.coupon?.code ?? "DISKON";
      doc.fillColor("#CC0052").text(`Kupon (${couponCode}):`, totalsX, totRow, { width: 110 });
      doc.text(`-Rp ${disc.toLocaleString("id-ID")}`, totalsX + 110, totRow, { width: 110, align: "right" });
      totRow += 18;
    }

    const final = Number(order.finalAmount);
    doc.rect(totalsX - 8, totRow - 4, 232, 26).fill("#0077A8");
    doc.fillColor("#FFFFFF").fontSize(12).font("Helvetica-Bold");
    doc.text("TOTAL:", totalsX, totRow + 4, { width: 110 });
    doc.text(`Rp ${final.toLocaleString("id-ID")}`, totalsX + 110, totRow + 4, { width: 110, align: "right" });

    // Footer
    const footerY = doc.page.height - 80;
    doc.moveTo(60, footerY).lineTo(doc.page.width - 60, footerY).stroke("#E5E5EA");
    doc.fillColor("#6E6E73").fontSize(9).font("Helvetica");
    doc.text("Hazl Academy | academy.hazl.id | TBD", 60, footerY + 12, { align: "center", width: W });
    doc.text("Dokumen ini diterbitkan secara elektronik dan sah tanpa tanda tangan.", 60, footerY + 26, { align: "center", width: W });

    doc.end();
  });
}
