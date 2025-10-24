const { User, Tenant } = require('../models'); // Need to import Tenant model
const bcrypt = require('bcrypt'); // Missing bcrypt import
const jwt = require('jsonwebtoken');
const sequelize = require('sequelize');
const { Op } = require('sequelize');
const redisClient = require('../config/redisClient');
const nodemailer = require('nodemailer');

// GET /users
exports.getAll = async (req, res) => {
  try {
    console.log('User from request:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
    }

    // Nếu là global_admin, lấy tất cả user
    if (req.user.role === 'global_admin') {
      console.log('Fetching all users for global_admin');
      try {
        const users = await User.findAll({
          attributes: { exclude: ['password_hash'] },
          include: [
            {
              model: Tenant,
              as: 'tenant',
              attributes: ['tenant_id', 'name', 'status']
            }
          ]
        });
        console.log('Found users:', users.length);
        return res.status(200).json(users);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          error: 'Lỗi khi truy vấn cơ sở dữ liệu',
          details: dbError.message 
        });
      }
    }

    // Nếu là tenant_admin, chỉ lấy user trong tenant của họ
    if (req.user.role === 'tenant_admin') {
      if (!req.user.tenant_id) {
        return res.status(400).json({ error: 'Không tìm thấy thông tin tenant' });
      }

      console.log('Fetching users for tenant:', req.user.tenant_id);
      try {
        const users = await User.findAll({
          where: { tenant_id: req.user.tenant_id },
          attributes: { exclude: ['password_hash'] },
          include: [
            {
              model: Tenant,
              as: 'tenant',
              attributes: ['tenant_id', 'name', 'status']
            }
          ]
        });
        console.log('Found users:', users.length);
        return res.status(200).json(users);
      } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ 
          error: 'Lỗi khi truy vấn cơ sở dữ liệu',
          details: dbError.message 
        });
      }
    }

    // Nếu là tenant_user, không có quyền xem danh sách user
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ 
      error: 'Lỗi server',
      details: error.message 
    });
  }
};

// GET /users/:id
exports.getById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    console.log('getCurrentUser called, req.user:', req.user);
    
    if (!req.user) {
      console.log('No req.user found');
      return res.status(401).json({ error: 'Không tìm thấy thông tin người dùng' });
    }

    // Lấy thông tin user mới nhất từ database
    const user = await User.findByPk(req.user.user_id);
    if (!user) {
      console.log('User not found in database:', req.user.user_id);
      return res.status(404).json({ error: 'User not found' });
    }

    const response = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      full_name: user.full_name,
      phone: user.phone_number,
      phone_number: user.phone_number
    };

    console.log('Returning user info:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({ error: error.message });
  }
};
// POST /users
exports.create = async (req, res) => {
  try {
    // Kiểm tra quyền tenant_admin
    if (req.user.role !== 'tenant_admin') {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này' });
    }
    
    const { email, password, full_name, phone_number, role } = req.body;
    const tenant_id = req.user.tenant_id;

    // Kiểm tra các trường bắt buộc
    const requiredFields = { email, password, full_name, phone_number };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Các trường sau là bắt buộc: ${missingFields.join(', ')}`
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    // Tăng cường bảo mật mật khẩu
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 6 ký tự và chứa ít nhất một chữ hoa, một chữ thường, một số và một ký tự đặc biệt'
      });
    }

    // Validate phone number format (VN format)
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // Kiểm tra role hợp lệ (không cho phép tạo admin)
    const allowedRoles = ['tenant_user', 'tenant_staff', 'tenant_manager'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Role không hợp lệ. Chỉ được phép tạo: tenant_user, tenant_staff, tenant_manager' 
      });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Tạo user mới
    const newUser = await User.create({
      email,
      password_hash,
      full_name,
      phone_number,
      role,
      tenant_id,
      status: 'active',
      created_at: new Date()
    });

    res.status(201).json({
      message: 'Tạo tài khoản người dùng thành công',
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        full_name: newUser.full_name,
        phone_number: newUser.phone_number,
        role: newUser.role,
        tenant_id: newUser.tenant_id,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Đã xảy ra lỗi khi tạo tài khoản người dùng',
      details: error.message
    });
  }
};

// PUT /users/:id
exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update(req.body);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /users/:id
exports.delete = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.destroy();
    res.status(204).json({});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy danh sách user theo tenant
exports.getByTenant = async (req, res) => {
  try {
    // Nếu là global_admin, có thể xem user của bất kỳ tenant nào
    if (req.user.role === 'global_admin') {
      const users = await User.findAll({ 
        where: { tenant_id: req.params.tenant_id },
        attributes: { exclude: ['password_hash'] }
      });
      return res.status(200).json(users);
    }

    // Nếu là tenant_admin, chỉ có thể xem user trong tenant của họ
    if (req.user.role === 'tenant_admin') {
      if (req.user.tenant_id !== parseInt(req.params.tenant_id)) {
        return res.status(403).json({ error: 'Không có quyền truy cập thông tin này' });
      }
      
      const users = await User.findAll({ 
        where: { tenant_id: req.params.tenant_id },
        attributes: { exclude: ['password_hash'] }
      });
      return res.status(200).json(users);
    }

    // Nếu là tenant_user, không có quyền xem danh sách user
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy danh sách user theo role
exports.getByRole = async (req, res) => {
  try {
    // Nếu là global_admin, có thể xem user của bất kỳ role nào
    if (req.user.role === 'global_admin') {
      const users = await User.findAll({ 
        where: { role: req.params.role },
        attributes: { exclude: ['password_hash'] },
        include: [
          {
            model: Tenant,
            attributes: ['tenant_id', 'name', 'status']
          }
        ]
      });
      return res.status(200).json(users);
    }

    // Nếu là tenant_admin, chỉ có thể xem user trong tenant của họ
    if (req.user.role === 'tenant_admin') {
      const users = await User.findAll({ 
        where: { 
          role: req.params.role,
          tenant_id: req.user.tenant_id
        },
        attributes: { exclude: ['password_hash'] }
      });
      return res.status(200).json(users);
    }

    // Nếu là tenant_user, không có quyền xem danh sách user
    return res.status(403).json({ error: 'Không có quyền truy cập' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password, tenant_name, full_name, phone_number } = req.body;

    // Kiểm tra các trường bắt buộc
    const requiredFields = { email, password, tenant_name, full_name, phone_number };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Các trường sau là bắt buộc: ${missingFields.join(', ')}`
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Validate phone number format (VN format)
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // Kiểm tra tên tenant đã tồn tại
    const existingTenant = await Tenant.findOne({ where: { name: tenant_name } });
    if (existingTenant) {
      return res.status(400).json({ error: 'Tên tenant đã được sử dụng' });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Tạo user mới
    const newUser = await User.create({
      email,
      password_hash,
      full_name,
      phone_number: phone_number, // Sửa từ phone thành phone_number
      role: 'tenant_admin',
      status: 'active',
      created_at: new Date()
    });

    // Tạo tenant mới
    const newTenant = await Tenant.create({
      name: tenant_name,
      admin_user_id: newUser.user_id,
      status: 'active',
      created_at: new Date()
    });

    // Cập nhật tenant_id cho user
    await newUser.update({ tenant_id: newTenant.tenant_id });

    // Tạo JWT token cho user mới
    const token = jwt.sign(
      { 
        user_id: newUser.user_id,
        email: newUser.email,
        role: newUser.role,
        tenant_id: newTenant.tenant_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Lưu session vào Redis
    const redisClient = require('../config/redisClient');
    const userSessionKey = `user_session:${newUser.user_id}`;
    const sessionData = {
      token,
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        full_name: newUser.full_name,
        phone: newUser.phone_number,
        role: newUser.role,
        tenant_id: newTenant.tenant_id,
        tenant: newTenant
      },
      lastActivity: new Date().toISOString()
    };

    await redisClient.setex(userSessionKey, 24 * 60 * 60, JSON.stringify(sessionData));

    // Trả về thông tin đăng ký thành công
    res.status(201).json({
      message: 'Đăng ký thành công',
      token,
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        full_name: newUser.full_name,
        phone: newUser.phone_number,
        role: newUser.role,
        tenant_id: newTenant.tenant_id,
        tenant: newTenant
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Đã xảy ra lỗi trong quá trình đăng ký',
      details: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const redisClient = require('../config/redisClient');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email và mật khẩu là bắt buộc' });
    }

    // Tìm user theo email
    const user = await User.findOne({ 
      where: { email },
      include: [{ model: Tenant, as: 'tenant' }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra mật khẩu
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id  // Đảm bảo có tenant_id trong token
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Chuẩn bị dữ liệu phản hồi
    const userData = {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone_number,
      phone_number: user.phone_number,
      role: user.role,
      tenant_id: user.tenant_id,
      tenant: user.tenant
    };

    try {
      // Lưu thông tin đăng nhập vào Redis
      const userSessionKey = `user_session:${user.user_id}`;
      const sessionData = {
        token,
        user: userData,
        lastActivity: new Date().toISOString()
      };

      // Lưu session trong 24 giờ
      await redisClient.setex(userSessionKey, 24 * 60 * 60, JSON.stringify(sessionData));
    } catch (redisError) {
      console.error('Redis session storage error:', redisError);
      // Tiếp tục xử lý đăng nhập ngay cả khi Redis không khả dụng
    }

    // Trả về token và thông tin user
    res.status(200).json({
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /users/profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('Received update profile request:', {
      body: req.body,
      user: req.user,
      headers: req.headers,
      url: req.url,
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl
    });

    const { full_name, phone_number } = req.body;
    const user_id = req.user.user_id;

    if (!full_name || !phone_number) {
      console.log('Missing required fields:', { full_name, phone_number });
      return res.status(400).json({
        error: 'Họ tên và số điện thoại là bắt buộc'
      });
    }

    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone_number)) {
      console.log('Invalid phone number:', phone_number);
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
    }

    console.log('Finding user with ID:', user_id);
    const user = await User.findByPk(user_id);
    
    if (!user) {
      console.log('User not found:', user_id);
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    console.log('Updating user:', {
      id: user_id,
      current: {
        full_name: user.full_name,
        phone_number: user.phone_number
      },
      new: {
        full_name,
        phone_number
      }
    });

    await user.update({
      full_name,
      phone_number
    });

    try {
      const redisClient = require('../config/redisClient');
      const userSessionKey = `user_session:${user_id}`;
      console.log('Updating Redis session:', userSessionKey);
      
      const sessionStr = await redisClient.get(userSessionKey);
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        session.user.full_name = full_name;
        session.user.phone_number = phone_number;
        await redisClient.setex(userSessionKey, 24 * 60 * 60, JSON.stringify(session));
        console.log('Redis session updated successfully');
      } else {
        console.log('No Redis session found for user');
      }
    } catch (redisError) {
      console.error('Redis update error:', redisError);
    }

    console.log('Profile update successful');
    return res.status(200).json({
      message: 'Cập nhật thông tin thành công',
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        phone_number: user.phone_number,
        role: user.role,
        tenant_id: user.tenant_id
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      error: 'Lỗi khi cập nhật thông tin',
      details: error.message
    });
  }
};

// Thêm khách hàng mới cho tenant
exports.addCustomer = async (req, res) => {
  try {
    // Kiểm tra quyền - chỉ cho phép tenant_admin hoặc tenant_manager tạo tenant_user
    if (req.user.role !== 'tenant_admin' && req.user.role !== 'global_admin') {
      return res.status(403).json({ error: 'Bạn không có quyền thực hiện hành động này' });
    }
    
    const { email, password, full_name, phone_number } = req.body;
    const tenant_id = req.user.tenant_id; 

    // Kiểm tra tenant_id có tồn tại không
    if (!tenant_id) {
      return res.status(400).json({ error: 'Không tìm thấy thông tin tenant' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email không hợp lệ' });
    }

    // Tăng cường bảo mật mật khẩu
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error: 'Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt'
      });
    }

    // Validate phone number format (VN format)
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
    }

    // Kiểm tra email đã tồn tại
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Tạo user mới với role là tenant_user và tenant_id
    const newUser = await User.create({
      email,
      password_hash,
      full_name,
      phone_number,
      role: 'tenant_user',
      tenant_id,  // Đảm bảo tenant_id được gán
      status: 'active',
      created_at: new Date()
    });
    
    res.status(201).json({
      message: 'Thêm khách hàng thành công',
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        full_name: newUser.full_name,
        phone_number: newUser.phone_number,
        role: newUser.role,
        tenant_id: newUser.tenant_id,
        status: newUser.status
      }
    });
  } catch (error) {
    // Xử lý lỗi
  }
};

// Lấy danh sách khách hàng của tenant
exports.getCustomers = async (req, res) => {
  try {
    const tenant_id = req.user.tenant_id; 
    
    // Nếu là global_admin, lấy tất cả khách hàng
    if (req.user.role === 'global_admin') {
      const customers = await User.findAll({
        where: {
          role: 'tenant_user'
        },
        attributes: ['user_id', 'email', 'full_name', 'phone_number', 'role', 'status', 'created_at', 'tenant_id']
      });
      
      return res.status(200).json({
        message: 'Lấy danh sách người dùng thành công',
        data: customers
      });
    }
    
    // Nếu không phải global_admin, chỉ lấy khách hàng của tenant hiện tại
    const customers = await User.findAll({
      where: {
        tenant_id,
        role: 'tenant_user'
      },
      attributes: ['user_id', 'email', 'full_name', 'phone_number', 'role', 'status', 'created_at']
    });

    res.status(200).json({
      message: 'Lấy danh sách người dùng thành công',
      data: customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant_id = req.user.tenant_id; 

    // Nếu là global_admin, có thể xem thông tin khách hàng của bất kỳ tenant nào
    if (req.user.role === 'global_admin') {
      const customer = await User.findOne({
        where: {
          user_id: id,
          role: 'tenant_user'
        },
        attributes: ['user_id', 'email', 'full_name', 'phone_number', 'status', 'created_at', 'tenant_id']
      });

      if (!customer) {
        return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
      }

      return res.status(200).json({
        message: 'Lấy thông tin khách hàng thành công',
        data: customer
      });
    }

    // Nếu không phải global_admin, chỉ có thể xem thông tin khách hàng của tenant hiện tại
    const customer = await User.findOne({
      where: {
        user_id: id,
        tenant_id,
        role: 'tenant_user'
      },
      attributes: ['user_id', 'email', 'full_name', 'phone_number', 'status', 'created_at']
    });

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    res.status(200).json({
      message: 'Lấy thông tin khách hàng thành công',
      data: customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cập nhật thông tin khách hàng
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone_number, status } = req.body;
    const tenant_id = req.user.tenant_id; // Lấy tenant_id từ user đã xác thực

    // Nếu là global_admin, có thể cập nhật thông tin khách hàng của bất kỳ tenant nào
    if (req.user.role === 'global_admin') {
      const customer = await User.findOne({
        where: {
          user_id: id,
          role: 'tenant_user'
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
      }

      // Validate số điện thoại nếu có
      if (phone_number) {
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!phoneRegex.test(phone_number)) {
          return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
        }
      }

      // Cập nhật thông tin
      const updateData = {};
      if (full_name) updateData.full_name = full_name;
      if (phone_number) updateData.phone_number = phone_number;
      if (status && ['active', 'inactive', 'deleted'].includes(status)) {
        updateData.status = status;
      }

      await customer.update(updateData);

      return res.status(200).json({
        message: 'Cập nhật thông tin khách hàng thành công',
        data: {
          user_id: customer.user_id,
          email: customer.email,
          full_name: customer.full_name,
          phone_number: customer.phone_number,
          status: customer.status,
          created_at: customer.created_at,
          tenant_id: customer.tenant_id
        }
      });
    }

    // Nếu không phải global_admin, chỉ có thể cập nhật thông tin khách hàng của tenant hiện tại
    const customer = await User.findOne({
      where: {
        user_id: id,
        tenant_id,
        role: 'tenant_user'
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    // Validate số điện thoại nếu có
    if (phone_number) {
      const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
      if (!phoneRegex.test(phone_number)) {
        return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
      }
    }

    // Cập nhật thông tin
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (phone_number) updateData.phone_number = phone_number;
    if (status && ['active', 'inactive', 'deleted'].includes(status)) {
      updateData.status = status;
    }

    await customer.update(updateData);

    res.status(200).json({
      message: 'Cập nhật thông tin khách hàng thành công',
      data: {
        user_id: customer.user_id,
        email: customer.email,
        full_name: customer.full_name,
        phone_number: customer.phone_number,
        status: customer.status,
        created_at: customer.created_at
      }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Xóa khách hàng (chuyển trạng thái sang deleted)
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant_id = req.user.tenant_id; // Lấy tenant_id từ user đã xác thực

    // Nếu là global_admin, có thể xóa khách hàng của bất kỳ tenant nào
    if (req.user.role === 'global_admin') {
      const customer = await User.findOne({
        where: {
          user_id: id,
          role: 'tenant_user'
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
      }

      // Cập nhật trạng thái thành deleted
      await customer.update({ status: 'deleted' });

      return res.status(200).json({
        message: 'Xóa khách hàng thành công'
      });
    }

    // Nếu không phải global_admin, chỉ có thể xóa khách hàng của tenant hiện tại
    const customer = await User.findOne({
      where: {
        user_id: id,
        tenant_id,
        role: 'tenant_user'
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    }

    // Cập nhật trạng thái thành deleted
    await customer.update({ status: 'deleted' });

    res.status(200).json({
      message: 'Xóa khách hàng thành công'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Khôi phục khách hàng đã xóa
exports.restoreCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant_id = req.user.tenant_id; 

    // Nếu là global_admin, có thể khôi phục khách hàng của bất kỳ tenant nào
    if (req.user.role === 'global_admin') {
      const customer = await User.findOne({
        where: {
          user_id: id,
          role: 'tenant_user',
          status: 'deleted'
        }
      });

      if (!customer) {
        return res.status(404).json({ error: 'Không tìm thấy khách hàng đã xóa' });
      }

      // Cập nhật trạng thái thành active
      await customer.update({ status: 'active' });

      return res.status(200).json({
        message: 'Khôi phục khách hàng thành công',
        data: {
          user_id: customer.user_id,
          email: customer.email,
          full_name: customer.full_name,
          phone_number: customer.phone_number,
          status: customer.status,
          created_at: customer.created_at,
          tenant_id: customer.tenant_id
        }
      });
    }

    // Nếu không phải global_admin, chỉ có thể khôi phục khách hàng của tenant hiện tại
    const customer = await User.findOne({
      where: {
        user_id: id,
        tenant_id,
        role: 'tenant_user',
        status: 'deleted'
      }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng đã xóa' });
    }

    // Cập nhật trạng thái thành active
    await customer.update({ status: 'active' });

    res.status(200).json({
      message: 'Khôi phục khách hàng thành công',
      data: {
        user_id: customer.user_id,
        email: customer.email,
        full_name: customer.full_name,
        phone_number: customer.phone_number,
        status: customer.status,
        created_at: customer.created_at
      }
    });
  } catch (error) {
    console.error('Restore customer error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /users/statistics/:tenant_id
exports.getUserStatistics = async (req, res) => {
  try {
    const { tenant_id } = req.params;
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'global_admin' && req.user.tenant_id !== parseInt(tenant_id)) {
      return res.status(403).json({ error: 'Không có quyền truy cập thông tin này' });
    }

    // Lấy tổng số người dùng
    const totalUsers = await User.count({
      where: { tenant_id }
    });

    // Lấy số người dùng theo role
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
      ],
      where: { tenant_id },
      group: ['role']
    });

    // Lấy số người dùng theo trạng thái
    const usersByStatus = await User.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
      ],
      where: { tenant_id },
      group: ['status']
    });

    // Lấy người dùng mới nhất trong 7 ngày
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.count({
      where: {
        tenant_id,
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.status(200).json({
      totalUsers,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr.role] = curr.get('count');
        return acc;
      }, {}),
      usersByStatus: usersByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr.get('count');
        return acc;
      }, {}),
      recentUsers
    });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /users/extended-statistics/:tenant_id - Thống kê mở rộng bao gồm dung lượng và gói dịch vụ
exports.getExtendedTenantStatistics = async (req, res) => {
  try {
    const { tenant_id } = req.params;
    
    // Kiểm tra quyền truy cập
    if (req.user.role !== 'global_admin' && req.user.tenant_id !== parseInt(tenant_id)) {
      return res.status(403).json({ error: 'Không có quyền truy cập thông tin này' });
    }

    // Lấy thống kê người dùng cơ bản
    const totalUsers = await User.count({
      where: { tenant_id }
    });

    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
      ],
      where: { tenant_id },
      group: ['role']
    });

    const usersByStatus = await User.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('user_id')), 'count']
      ],
      where: { tenant_id },
      group: ['status']
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentUsers = await User.count({
      where: {
        tenant_id,
        created_at: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // Lấy thống kê dung lượng và gói dịch vụ
    const { ServiceData, ServicePackage, UserPurchase } = require('../models');
    
    // Thống kê sử dụng dịch vụ theo gói
    const storageStats = await ServiceData.findAll({
      where: {
        tenant_id: tenant_id,
        status: 'active'
      },
      attributes: [
        'package_id',
        [sequelize.fn('SUM', sequelize.col('file_size')), 'total_file_size'],
        [sequelize.fn('SUM', sequelize.col('bandwidth_used')), 'total_bandwidth'],
        [sequelize.fn('SUM', sequelize.col('database_used')), 'total_database'],
        [sequelize.fn('SUM', sequelize.col('api_calls_used')), 'total_api_calls'],
        [sequelize.fn('COUNT', sequelize.col('data_id')), 'total_records']
      ],
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'file_storage_limit', 'bandwidth_limit', 'database_limit', 'api_call_limit', 'price']
        }
      ],
      group: ['package_id', 'package.package_id', 'package.name', 'package.file_storage_limit', 'package.bandwidth_limit', 'package.database_limit', 'package.api_call_limit', 'package.price']
    });

    // Lấy thông tin gói đang hoạt động
    const activePackages = await UserPurchase.findAll({
      where: {
        tenant_id: tenant_id,
        status: 'active',
        [Op.or]: [
          { end_date: { [Op.gt]: new Date() } },
          { end_date: { [Op.is]: null } }
        ]
      },
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'file_storage_limit', 'bandwidth_limit', 'database_limit', 'api_call_limit', 'price']
        },
        {
          model: User,
          as: 'user',
          attributes: ['user_id', 'email', 'role']
        }
      ]
    });

    // Tính tổng dung lượng sử dụng của tenant
    const totalUsage = await ServiceData.findOne({
      where: {
        tenant_id: tenant_id,
        status: 'active'
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('file_size')), 'total_file_size'],
        [sequelize.fn('SUM', sequelize.col('bandwidth_used')), 'total_bandwidth'],
        [sequelize.fn('SUM', sequelize.col('database_used')), 'total_database'],
        [sequelize.fn('SUM', sequelize.col('api_calls_used')), 'total_api_calls']
      ]
    });

    res.status(200).json({
      // Thống kê người dùng
      totalUsers,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr.role] = curr.get('count');
        return acc;
      }, {}),
      usersByStatus: usersByStatus.reduce((acc, curr) => {
        acc[curr.status] = curr.get('count');
        return acc;
      }, {}),
      recentUsers,
      
      // Thống kê dung lượng và gói dịch vụ
      storageStatsByPackage: storageStats.map(stat => ({
        package_id: stat.package_id,
        package_name: stat.package?.name,
        usage: {
          file_size: parseInt(stat.get('total_file_size')) || 0,
          bandwidth_used: parseInt(stat.get('total_bandwidth')) || 0,
          database_used: parseInt(stat.get('total_database')) || 0,
          api_calls_used: parseInt(stat.get('total_api_calls')) || 0,
          total_records: parseInt(stat.get('total_records')) || 0
        },
        limits: {
          file_storage_limit: stat.package?.file_storage_limit || 0,
          bandwidth_limit: stat.package?.bandwidth_limit || 0,
          database_limit: stat.package?.database_limit || 0,
          api_call_limit: stat.package?.api_call_limit || 0
        },
        price: stat.package?.price || 0
      })),
      
      // Tổng sử dụng của tenant
      totalUsage: {
        file_size: parseInt(totalUsage?.get('total_file_size')) || 0,
        bandwidth_used: parseInt(totalUsage?.get('total_bandwidth')) || 0,
        database_used: parseInt(totalUsage?.get('total_database')) || 0,
        api_calls_used: parseInt(totalUsage?.get('total_api_calls')) || 0
      },
      
      // Danh sách gói đang hoạt động
      activePackages: activePackages.map(purchase => ({
        purchase_id: purchase.purchase_id,
        package_id: purchase.package_id,
        package_name: purchase.package?.name,
        user_email: purchase.user?.email,
        user_role: purchase.user?.role,
        start_date: purchase.start_date,
        end_date: purchase.end_date,
        status: purchase.status,
        limits: {
          file_storage_limit: purchase.package?.file_storage_limit || 0,
          bandwidth_limit: purchase.package?.bandwidth_limit || 0,
          database_limit: purchase.package?.database_limit || 0,
          api_call_limit: purchase.package?.api_call_limit || 0
        },
        price: purchase.package?.price || 0
      }))
    });
  } catch (error) {
    console.error('Get extended tenant statistics error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /users/change-password
exports.changePassword = async (req, res) => {
  try {
    const email = req.user.email; // Lấy email từ token
    console.log('email from token:', email);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Thiếu thông tin mật khẩu.' });
    }

    const user = await User.findOne({ where: { email } }); // Tìm user theo email
    console.log('user found:', !!user);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await user.update({ password_hash: newPasswordHash });

    res.status(200).json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi đổi mật khẩu.' });
  }
}

// POST /users/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Vui lòng nhập email.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // To prevent email enumeration attacks, always return a generic success message.
      return res.status(200).json({ message: 'Nếu email của bạn tồn tại trong hệ thống, một mã OTP đã được gửi đi.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${email}`;
    await redisClient.setex(otpKey, 300, otp); // OTP is valid for 5 minutes

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"DATT" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Mã khôi phục mật khẩu',
      html: `<p>Mã OTP để khôi phục mật khẩu của bạn là: <strong>${otp}</strong></p><p>Mã này sẽ hết hạn sau 5 phút.</p>`,
    });

    res.status(200).json({ message: 'Nếu email của bạn tồn tại trong hệ thống, một mã OTP đã được gửi đi.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Đã có lỗi xảy ra khi gửi yêu cầu khôi phục mật khẩu.' });
  }
};

// POST /users/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
    }

    const otpKey = `otp:${email}`;
    const storedOtp = await redisClient.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ error: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await user.update({ password_hash: newPasswordHash });
    await redisClient.del(otpKey);

    res.status(200).json({ message: 'Khôi phục mật khẩu thành công.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Đã có lỗi xảy ra khi khôi phục mật khẩu.' });
  }
};