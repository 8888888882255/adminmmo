const { UserPurchase, TenantOfferedPackage, ServiceData, User, ServicePackage } = require('../models');
const path = require('path');
const nodemailer = require('nodemailer');
const paypal = require('paypal-rest-sdk');
const PDFDocument = require('pdfkit');
const { Sequelize } = require('sequelize');

paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox', 
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, tenant_id, user_id, package_id } = req.query;
    const offset = (page - 1) * limit;
    
    const whereClause = {};
    
    // Filter theo role của user
    if (req.user.role === 'tenant_admin') {
      // Tenant admin chỉ thấy đơn hàng của tenant mình
      whereClause.tenant_id = req.user.tenant_id;
    } else if (req.user.role === 'tenant_user') {
      // Tenant user chỉ thấy đơn hàng của mình
      whereClause.user_id = req.user.user_id;
    }
    // Global admin thấy tất cả đơn hàng
    
    // Filter theo status
    if (status) {
      whereClause.status = status;
    }
    
    // Filter theo tenant_id (chỉ global admin)
    if (tenant_id && req.user.role === 'global_admin') {
      whereClause.tenant_id = tenant_id;
    }
    
    // Filter theo user_id
    if (user_id) {
      whereClause.user_id = user_id;
    }
    
    // Filter theo package_id
    if (package_id) {
      whereClause.package_id = package_id;
    }

    const purchases = await UserPurchase.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'email', 'role', 'tenant_id']
        },
        {
          model: ServicePackage,
          as: 'package',
          attributes: [
            'package_id', 
            'name', 
            'description', 
            'price', 
            'billing_cycle',
            'file_storage_limit',
            'bandwidth_limit',
            'database_limit', 
            'api_call_limit',
            'package_type',
            'category_id'
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['purchase_date', 'DESC']]
    });

    res.status(200).json({
      data: purchases.rows,
      total: purchases.count,
      page: parseInt(page),
      totalPages: Math.ceil(purchases.count / limit)
    });
  } catch (error) {
    console.error('Error getting purchases:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const purchase = await UserPurchase.findByPk(req.params.id);
    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }
    res.status(200).json(purchase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const purchase = await UserPurchase.create({ ...req.body, status: 'pending' });
    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.sendInvoiceEmail = async (req, res) => {
  const { purchaseId } = req.params;

  try {
    if (!UserPurchase || typeof UserPurchase.findByPk !== 'function') {
      throw new Error('Purchase model is not properly initialized. Check models/index.js and user_purchase.model.js');
    }
    const purchase = await UserPurchase.findByPk(purchaseId, {
      include: ['user', 'package'],
    });

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD,
      },
    });

    await transporter.verify();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: purchase.user.email,
      subject: 'Invoice for Your Purchase',
      html: `
        <h1>Invoice</h1>
        <p>Dear ${purchase.user.email},</p>
        <p>Thank you for your purchase!</p>
        <ul>
          <li>Package: ${purchase.package.name}</li>
          <li>Price: $${purchase.package.price}</li>
          <li>Purchase Date: ${purchase.purchase_date.toLocaleString()}</li>
          <li>Start Date: ${purchase.start_date.toLocaleString()}</li>
          <li>End Date: ${purchase.end_date.toLocaleString()}</li>
        </ul>
        <p>Regards,<br>Your Company</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ message: 'Error sending invoice', error: error.message });
  }
};

// Tạo đơn hàng PayPal
exports.createPayPalOrder = async (req, res) => {
  const { purchaseId } = req.body;

  try {
    const purchase = await UserPurchase.findByPk(purchaseId, {
      include: ['package'], 
    });
    if (!purchase || purchase.status !== 'pending') {
      return res.status(400).json({ message: 'Invalid purchase' });
    }

    const create_payment_json = {
      intent: 'sale',
      payer: { payment_method: 'paypal' },
      redirect_urls: {
        return_url: `${process.env.APP_URL}/api/user-purchases/paypal/success`,
        cancel_url: `${process.env.APP_URL}/api/user-purchases/paypal/cancel`,
      },
      transactions: [{
        amount: {
          total: purchase.package.price.toString(),
          currency: 'USD',
        },
        description: `Payment for ${purchase.package.name} package`,
      }],
    };

    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        throw error;
      }
      for (let link of payment.links) {
        if (link.rel === 'approval_url') {
          await purchase.update({ payment_id: payment.id });
          return res.status(200).json({ approval_url: link.href });
        }
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating PayPal order', error: error.message });
  }
};

const paypalExecute = (paymentId, execute_payment_json) => {
  return new Promise((resolve, reject) => {
    paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
      if (error) reject(error);
      else resolve(payment);
    });
  });
};

exports.paypalSuccess = async (req, res) => {
  const { paymentId, PayerID, token } = req.query; // Lấy từ query params

  try {
    console.log('Processing PayPal success:', { paymentId, PayerID, token });

    // Tìm purchase dựa trên paymentId
    const purchase = await UserPurchase.findOne({
      where: { payment_id: paymentId },
      include: ['user', 'package']
    });
    console.log('Purchase found:', purchase ? 'YES' : 'NO');

    if (!purchase) {
      console.log('Purchase not found for paymentId:', paymentId);
      return res.status(400).json({ message: 'Purchase not found' });
    }

    if (purchase.status !== 'pending') {
      console.log('Invalid purchase status:', purchase.status);
      return res.status(400).json({ message: 'Invalid purchase status' });
    }

    // Xác minh thanh toán với PayPal
    const execute_payment_json = {
      payer_id: PayerID,
    };

    console.log('Executing PayPal payment...');
    const payment = await paypalExecute(paymentId, execute_payment_json);
    console.log('PayPal payment executed successfully:', payment);

    const startDate = new Date();
    let endDate;
    const billingCycle = purchase.package.billing_cycle.toLowerCase();

    switch (billingCycle) {
      case 'yearly':
        endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'one-time':
      case 'indefinite':
        endDate = null;
        break;
      default:
        endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    // Cập nhật purchase
    await purchase.update({
      status: 'completed',
      purchase_date: new Date(),
      start_date: startDate,
      end_date: endDate,
      payment_id: paymentId,
    });
    console.log('Purchase updated successfully');

    // Cập nhật hoặc tạo TenantOfferedPackage
    try {
      const existingOfferedPackage = await TenantOfferedPackage.findOne({
        where: { tenant_id: purchase.tenant_id, package_id: purchase.package_id }
      });

      if (existingOfferedPackage) {
        await existingOfferedPackage.update({ status: 'active' });
        console.log('Updated existing tenant offered package to active');
      } else {
        await TenantOfferedPackage.create({
          tenant_id: purchase.tenant_id,
          package_id: purchase.package_id,
          status: 'active'
        });
        console.log('Created new tenant offered package record');
      }

      // Kích hoạt service_data cho tất cả người dùng trong tenant
      try {
        // Lấy tất cả người dùng trong tenant
        const tenantUsers = await User.findAll({
          where: { tenant_id: purchase.tenant_id }
        });

        // Lấy thông tin package để biết giới hạn
        const packageInfo = await ServicePackage.findByPk(purchase.package_id);

        if (tenantUsers.length > 0 && packageInfo) {
          // Tạo hoặc cập nhật service_data cho từng user
          for (const user of tenantUsers) {
            const [serviceData, created] = await ServiceData.findOrCreate({
              where: {
                tenant_id: purchase.tenant_id,
                user_id: user.user_id,
                package_id: purchase.package_id
              },
              defaults: {
                object_key: `tenant_${purchase.tenant_id}_user_${user.user_id}`,
                file_size: 0,
                bandwidth_used: 0,
                database_used: 0,
                api_calls_used: 0,
                status: 'active'
              }
            });

            if (!created) {
              // Nếu đã tồn tại, cập nhật status thành active
              await serviceData.update({ status: 'active' });
            }

            console.log(`Service data ${created ? 'created' : 'activated'} for user ${user.user_id} in tenant ${purchase.tenant_id}`);
          }
          console.log(`Activated service data for ${tenantUsers.length} users in tenant ${purchase.tenant_id}`);
        }
      } catch (serviceDataError) {
        console.error('Error creating/activating service data:', serviceDataError);
      }

    } catch (tenantPackageError) {
      console.error('Error saving to tenant_offered_packages:', tenantPackageError);
    }

    // Gửi email hóa đơn
    try {
      const purchaseWithDetails = await UserPurchase.findByPk(purchase.purchase_id, {
        include: ['user', 'package'],
      });

      if (purchaseWithDetails && purchaseWithDetails.user) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_SERVER,
          port: process.env.SMTP_PORT,
          secure: false,
          auth: { user: process.env.SENDER_EMAIL, pass: process.env.SENDER_PASSWORD },
        });

        const mailOptions = {
          from: process.env.SENDER_EMAIL,
          to: purchaseWithDetails.user.email,
          subject: 'Invoice for Your Purchase',
          html: `
            <h1>Invoice</h1>
            <p>Dear ${purchaseWithDetails.user.email},</p>
            <p>Thank you for your purchase!</p>
            <ul>
              <li>Package: ${purchaseWithDetails.package.name}</li>
              <li>Price: $${purchaseWithDetails.package.price}</li>
              <li>Purchase Date: ${purchaseWithDetails.purchase_date.toLocaleString()}</li>
              <li>Start Date: ${purchaseWithDetails.start_date.toLocaleString()}</li>
              <li>End Date: ${purchaseWithDetails.end_date ? purchaseWithDetails.end_date.toLocaleString() : 'N/A'}</li>
            </ul>
            <p>Regards,<br>Your Company</p>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log('Invoice email sent successfully');
      }
    } catch (emailError) {
      console.error('Error sending invoice email:', emailError);
    }

    const frontendUrl = `http://localhost:5173/payment-success?purchase_id=${purchase.purchase_id}&package_name=${encodeURIComponent(purchase.package.name)}&price=${purchase.package.price}`;
    return res.redirect(frontendUrl);

  } catch (error) {
    console.error('Error processing PayPal payment:', error);
    return res.status(500).json({
      message: 'Error processing PayPal payment',
      error: error.message
    });
  }
};

exports.downloadInvoicePDF = async (req, res) => {
  const { purchaseId } = req.params;

  try {
    const purchase = await UserPurchase.findByPk(purchaseId, {
      include: ['user', 'package'],
    });

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    const doc = new PDFDocument();

    res.setHeader('Content-disposition', `attachment; filename=invoice_${purchaseId}.pdf`);
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    const fontPath = path.join(__dirname, '../fonts/NotoSans-Regular.ttf');
    doc.font(fontPath);

    doc.fontSize(20).text('Hóa đơn', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Mã đơn hàng: ${purchase.purchase_id}`);
    doc.text(`Email: ${purchase.user.email}`);
    doc.text(`Gói mua: ${purchase.package.name}`);
    doc.text(`Giá: $${purchase.package.price}`);
    doc.text(`Ngày mua: ${purchase.purchase_date.toLocaleString()}`);
    doc.text(`Ngày bắt đầu: ${purchase.start_date.toLocaleString()}`);
    doc.text(`Ngày hết hạn: ${purchase.end_date ? purchase.end_date.toLocaleString() : 'Không xác định'}`);

    doc.moveDown();
    doc.text('Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Error generating PDF', error: error.message });
  }
};

exports.paypalCancel = async (req, res) => {
  const { token } = req.query;

  try {
    const purchase = await UserPurchase.findOne({
      where: { payment_id: token }
    });

    if (purchase) {
      await purchase.update({ status: 'canceled' });
    }

    const frontendUrl = 'http://localhost:5173/shop';
    return res.redirect(frontendUrl);
  } catch (error) {
    console.error('Error canceling payment:', error);
    return res.status(500).json({ message: 'Error canceling payment', error: error.message });
  }
};

// Kích hoạt gói data cho tenant
exports.activatePackageForTenant = async (req, res) => {
  try {
    const { purchase_id } = req.params;
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'global_admin' && req.user.role !== 'tenant_admin') {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }

    // Tìm purchase
    const purchase = await UserPurchase.findByPk(purchase_id, {
      include: ['user', 'package']
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Kiểm tra quyền truy cập theo tenant
    if (req.user.role === 'tenant_admin' && purchase.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({ error: 'Forbidden - Cannot access data from other tenants' });
    }

    if (purchase.status !== 'completed') {
      return res.status(400).json({ error: 'Purchase is not completed' });
    }

    // Cập nhật hoặc tạo TenantOfferedPackage
    const [tenantOfferedPackage, created] = await TenantOfferedPackage.findOrCreate({
      where: { 
        tenant_id: purchase.tenant_id, 
        package_id: purchase.package_id 
      },
      defaults: {
        status: 'active'
      }
    });

    if (!created) {
      await tenantOfferedPackage.update({ status: 'active' });
    }

    // Lấy tất cả users trong tenant
    const tenantUsers = await User.findAll({
      where: { tenant_id: purchase.tenant_id }
    });

    // Kích hoạt service data cho tất cả users
    const activationResults = [];
    for (const user of tenantUsers) {
      const [serviceData, serviceCreated] = await ServiceData.findOrCreate({
        where: {
          tenant_id: purchase.tenant_id,
          user_id: user.user_id,
          package_id: purchase.package_id
        },
        defaults: {
          object_key: `tenant_${purchase.tenant_id}_user_${user.user_id}`,
          file_size: 0,
          bandwidth_used: 0,
          database_used: 0,
          api_calls_used: 0,
          status: 'active'
        }
      });

      if (!serviceCreated) {
        await serviceData.update({ status: 'active' });
      }

      activationResults.push({
        user_id: user.user_id,
        email: user.email,
        activated: true,
        created: serviceCreated
      });
    }

    res.status(200).json({
      message: 'Package activated successfully for tenant',
      purchase: {
        purchase_id: purchase.purchase_id,
        package_name: purchase.package.name,
        tenant_id: purchase.tenant_id
      },
      tenantOfferedPackage: {
        tenant_id: tenantOfferedPackage.tenant_id,
        package_id: tenantOfferedPackage.package_id,
        status: tenantOfferedPackage.status
      },
      activatedUsers: activationResults,
      totalUsers: tenantUsers.length
    });

  } catch (error) {
    console.error('Error activating package for tenant:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lấy thống kê đơn hàng theo role
exports.getPurchaseStats = async (req, res) => {
  try {
    const whereClause = {};
    
    // Filter theo role
    if (req.user.role === 'tenant_admin') {
      whereClause.tenant_id = req.user.tenant_id;
    } else if (req.user.role === 'tenant_user') {
      whereClause.user_id = req.user.user_id;
    }

    // Thống kê theo status
    const statusStats = await UserPurchase.findAll({
      where: whereClause,
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('purchase_id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('package.price')), 'total_amount']
      ],
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: []
        }
      ],
      group: ['status'],
      raw: true
    });

    // Tổng số đơn hàng
    const totalPurchases = await UserPurchase.count({ where: whereClause });

    // Đơn hàng gần đây
    const recentPurchases = await UserPurchase.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'email', 'role']
        },
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'price']
        }
      ],
      order: [['purchase_date', 'DESC']],
      limit: 5
    });

    res.status(200).json({
      statusStats,
      totalPurchases,
      recentPurchases
    });

  } catch (error) {
    console.error('Error getting purchase stats:', error);
    res.status(500).json({ error: error.message });
  }
};

