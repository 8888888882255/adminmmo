const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const { User } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE DEBUG ===');
    console.log('Headers:', req.headers);
    console.log('Session:', req.session);
    console.log('Cookies:', req.cookies);

    // Lấy token từ header Authorization hoặc cookie
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Token from Authorization header:', token);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token from cookie:', token);
    }

    let user = null;

    // Thử xác thực bằng JWT token
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'GBJipGLHEg1dCzJ4qbQZUOia+M/ynO++RYZApyY/c0Y=');
        console.log('Decoded token:', decoded);

        const userId = decoded.user_id || decoded.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Token không chứa thông tin người dùng' });
        }

        user = await User.findByPk(userId);
        if (!user) {
          return res.status(401).json({ error: 'Người dùng không tồn tại' });
        }
      } catch (tokenError) {
        console.log('Token verification failed:', tokenError.message);
        if (tokenError.name === 'TokenExpiredError') {
          return res.status(401).json({ error: 'Token đã hết hạn' });
        }
        return res.status(401).json({ error: 'Token không hợp lệ' });
      }
    }

    // Nếu không có token hoặc token không hợp lệ, thử session
    if (!user && req.session?.user) {
      console.log('Trying session user:', req.session.user);
      user = await User.findByPk(req.session.user.user_id);
      console.log('User from session:', user ? 'Found' : 'Not found');
    }

    // Kiểm tra xem có user hợp lệ không
    if (!user) {
      console.log('No valid user found');
      return res.status(403).json({
        error: 'Không tìm thấy thông tin xác thực',
        debug: {
          hasAuthHeader: !!authHeader,
          hasSession: !!req.session?.user,
          hasCookie: !!req.cookies?.token
        }
      });
    }

    // Kiểm tra trạng thái user
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Tài khoản đã bị khóa hoặc không hoạt động' });
    }

    // Kiểm tra tenant_id cho tenant_admin và tenant_user
    if ((user.role === 'tenant_admin' || user.role === 'tenant_user') && !user.tenant_id) {
      return res.status(403).json({ error: 'Người dùng không thuộc tenant nào' });
    }

    // Thêm thông tin user vào request
    req.user = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      status: user.status
    };

    // Thêm tenant filter nếu không phải global_admin
    if (user.role !== 'global_admin') {
      req.tenantFilter = { tenant_id: user.tenant_id };
    }

    console.log('Auth successful for user:', req.user.user_id);
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Lỗi xác thực: ' + error.message });
  }
};

module.exports = authMiddleware;