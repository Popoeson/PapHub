const nodemailer = require('nodemailer');

/* const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: parseInt(process.env.MAIL_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
}); */

transporter.verify((err, success) => {
  if (err) {
    console.error('Mail transporter error:', err.message);
    console.error('Mail config:', {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      user: process.env.MAIL_USER,
      passLength: process.env.MAIL_PASS?.length,
    });
  } else {
    console.log('Mail transporter ready.');
  }
});

// Verify connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('Mail transporter error:', err.message);
  } else {
    console.log('Mail transporter ready.');
  }
});

/**
 * Send order confirmation to customer
 */
const sendCustomerOrderEmail = async (order) => {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8c8;font-family:'DM Sans',sans-serif;color:#4e3534;">
          ${item.name}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8c8;text-align:center;font-family:'DM Sans',sans-serif;color:#4e3534;">
          ${item.quantity}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0e8c8;text-align:right;font-family:'DM Sans',sans-serif;color:#4e3534;">
          ₦${formatPrice(item.price * item.quantity)}
        </td>
      </tr>`
    )
    .join('');

  const html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"/></head>
  <body style="margin:0;padding:0;background:#fff8dc;font-family:'DM Sans',Arial,sans-serif;">
    <div style="max-width:600px;margin:40px auto;background:#fff8dc;border-radius:16px;overflow:hidden;border:1px solid rgba(103,72,70,0.15);box-shadow:0 4px 24px rgba(103,72,70,0.1);">

      <!-- Header -->
      <div style="background:#674846;padding:32px;text-align:center;">
        <h1 style="margin:0;color:#fff8dc;font-size:28px;font-family:Georgia,serif;letter-spacing:1px;">PapHub</h1>
        <p style="margin:8px 0 0;color:rgba(255,248,220,0.75);font-size:14px;">Order Confirmation</p>
      </div>

      <!-- Body -->
      <div style="padding:36px 32px;">
        <h2 style="font-family:Georgia,serif;color:#4e3534;font-size:22px;margin:0 0 8px;">
          Thank you, ${order.customerName}!
        </h2>
        <p style="color:#8a6260;font-size:14px;margin:0 0 28px;line-height:1.6;">
          Your order has been received and is being processed. Here's a summary of what you ordered.
        </p>

        <!-- Order ID -->
        <div style="background:rgba(103,72,70,0.06);border-radius:10px;padding:16px 20px;margin-bottom:28px;">
          <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a6260;">Order ID</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#4e3534;font-family:Georgia,serif;letter-spacing:2px;">${order.orderID}</p>
        </div>

        <!-- Items table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr>
              <th style="text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8a6260;padding-bottom:10px;border-bottom:2px solid rgba(103,72,70,0.15);">Item</th>
              <th style="text-align:center;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8a6260;padding-bottom:10px;border-bottom:2px solid rgba(103,72,70,0.15);">Qty</th>
              <th style="text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#8a6260;padding-bottom:10px;border-bottom:2px solid rgba(103,72,70,0.15);">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <!-- Total -->
        <div style="text-align:right;margin-bottom:28px;">
          <span style="font-size:13px;color:#8a6260;text-transform:uppercase;letter-spacing:1px;">Total Paid &nbsp;</span>
          <span style="font-size:22px;font-weight:700;color:#4e3534;font-family:Georgia,serif;">₦${formatPrice(order.totalAmount)}</span>
        </div>

        <!-- Delivery details -->
        <div style="background:rgba(103,72,70,0.06);border-radius:10px;padding:20px;margin-bottom:28px;">
          <p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a6260;">Delivery Details</p>
          <p style="margin:4px 0;font-size:14px;color:#4e3534;"><strong>Name:</strong> ${order.customerName}</p>
          <p style="margin:4px 0;font-size:14px;color:#4e3534;"><strong>Phone:</strong> ${order.phone}</p>
          <p style="margin:4px 0;font-size:14px;color:#4e3534;"><strong>Address:</strong> ${order.address}</p>
          ${order.landmark ? `<p style="margin:4px 0;font-size:14px;color:#4e3534;"><strong>Landmark:</strong> ${order.landmark}</p>` : ''}
        </div>

        <p style="font-size:13px;color:#8a6260;line-height:1.7;margin:0;">
          We'll be in touch shortly to coordinate delivery. If you have any questions, reply to this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#674846;padding:20px 32px;text-align:center;">
        <p style="margin:0;color:rgba(255,248,220,0.6);font-size:12px;">&copy; ${new Date().getFullYear()} PapHub. All rights reserved.</p>
      </div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from: `"PapHub" <${process.env.MAIL_USER}>`,
    to: order.email,
    subject: `Order Confirmed — ${order.orderID}`,
    html,
  });
};

/**
 * Send order notification to admin
 */
const sendAdminOrderEmail = async (order) => {
  const itemsList = order.items
    .map((i) => `• ${i.name} x${i.quantity} — ₦${formatPrice(i.price * i.quantity)}`)
    .join('\n');

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#fff8dc;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:40px auto;background:#fff8dc;border-radius:16px;overflow:hidden;border:1px solid rgba(103,72,70,0.15);">
      <div style="background:#674846;padding:28px 32px;">
        <h1 style="margin:0;color:#fff8dc;font-size:22px;font-family:Georgia,serif;">New Order Received</h1>
        <p style="margin:6px 0 0;color:rgba(255,248,220,0.7);font-size:13px;">Order ID: <strong style="color:#fff8dc;">${order.orderID}</strong></p>
      </div>
      <div style="padding:32px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:8px 0;color:#8a6260;font-size:13px;width:140px;">Customer</td><td style="padding:8px 0;color:#4e3534;font-size:13px;font-weight:600;">${order.customerName}</td></tr>
          <tr><td style="padding:8px 0;color:#8a6260;font-size:13px;">Email</td><td style="padding:8px 0;color:#4e3534;font-size:13px;">${order.email}</td></tr>
          <tr><td style="padding:8px 0;color:#8a6260;font-size:13px;">Phone</td><td style="padding:8px 0;color:#4e3534;font-size:13px;">${order.phone}</td></tr>
          <tr><td style="padding:8px 0;color:#8a6260;font-size:13px;">Address</td><td style="padding:8px 0;color:#4e3534;font-size:13px;">${order.address}${order.landmark ? ` (${order.landmark})` : ''}</td></tr>
          <tr><td style="padding:8px 0;color:#8a6260;font-size:13px;">Total Paid</td><td style="padding:8px 0;color:#4e3534;font-size:18px;font-weight:700;font-family:Georgia,serif;">₦${formatPrice(order.totalAmount)}</td></tr>
        </table>

        <div style="background:rgba(103,72,70,0.06);border-radius:10px;padding:16px 20px;margin-bottom:20px;">
          <p style="margin:0 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#8a6260;">Items Ordered</p>
          ${order.items.map((i) => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(103,72,70,0.1);">
              <span style="font-size:13px;color:#4e3534;">${i.name} &times; ${i.quantity}</span>
              <span style="font-size:13px;color:#4e3534;font-weight:600;">₦${formatPrice(i.price * i.quantity)}</span>
            </div>
          `).join('')}
        </div>

        <a href="${process.env.FRONTEND_URL}/admin/orders.html"
           style="display:inline-block;padding:12px 24px;background:#674846;color:#fff8dc;text-decoration:none;border-radius:8px;font-size:14px;font-weight:500;">
          View Order in Dashboard
        </a>
      </div>
    </div>
  </body>
  </html>`;

  await transporter.sendMail({
    from: `"PapHub" <${process.env.MAIL_USER}>`,
    to: process.env.MAIL_USER,
    subject: `New Order — ${order.orderID} — ₦${formatPrice(order.totalAmount)}`,
    html,
  });
};

/**
 * Generate WhatsApp pre-filled URL
 */
const generateWhatsAppUrl = (order) => {
  const itemsList = order.items
    .map((i) => `  • ${i.name} x${i.quantity} — ₦${formatPrice(i.price * i.quantity)}`)
    .join('\n');

  const message = `Hello PapHub! 👋

I just placed an order and made payment. Here are my details:

*Order ID:* ${order.orderID}
*Name:* ${order.customerName}
*Phone:* ${order.phone}
*Address:* ${order.address}${order.landmark ? `\n*Landmark:* ${order.landmark}` : ''}

*Items Ordered:*
${itemsList}

*Total Paid:* ₦${formatPrice(order.totalAmount)}

Please confirm receipt of my order. Thank you!`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${process.env.ADMIN_WHATSAPP_NUMBER}?text=${encoded}`;
};

const formatPrice = (n) =>
  Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });

module.exports = {
  sendCustomerOrderEmail,
  sendAdminOrderEmail,
  generateWhatsAppUrl,
};
