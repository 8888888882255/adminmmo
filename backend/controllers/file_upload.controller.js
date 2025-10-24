const multer = require('multer');
const { ServiceData, ServicePackage } = require('../models');
const minioService = require('../services/minio.service');
const { Op } = require('sequelize');
const { User, Tenant, TenantOfferedPackage, UserPurchase } = require('../models');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common file types
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

exports.uploadMiddleware = upload.single('file');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { tenant_id, user_id, package_id } = req.body;
    
    console.log('Upload request:', { tenant_id, user_id, package_id, fileSize: req.file.size });
    
    if (!tenant_id || !user_id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Tìm service data active cho user trong tenant
    let serviceData = null;
    let actualPackageId = package_id;

    if (package_id) {
      // Thử tìm với package_id được chỉ định
      serviceData = await ServiceData.findOne({
        where: {
          tenant_id: parseInt(tenant_id),
          user_id: parseInt(user_id),
          package_id: parseInt(package_id),
          status: 'active'
        }
      });
    }

    // Nếu không tìm thấy, tìm bất kỳ service data active nào
    if (!serviceData) {
      serviceData = await ServiceData.findOne({
        where: {
          tenant_id: parseInt(tenant_id),
          user_id: parseInt(user_id),
          status: 'active'
        }
      });

      if (serviceData) {
        actualPackageId = serviceData.package_id;
        console.log('Found active service data with package:', actualPackageId);
      }
    }

    console.log('Service data found:', serviceData ? 'YES' : 'NO');

    if (!serviceData) {
      return res.status(403).json({ 
        error: 'Service not activated. Please ask your tenant admin to purchase a package first.' 
      });
    }

    // Get package limits
    const package = await ServicePackage.findByPk(actualPackageId);
    if (!package) {
      return res.status(404).json({ error: 'Package not found' });
    }

    console.log('Package found:', package.name, 'Limit:', package.file_storage_limit);

    // Check storage limits
    if (package.file_storage_limit > 0) {
      const currentUsage = await ServiceData.sum('file_size', {
        where: {
          tenant_id: parseInt(tenant_id),
          user_id: parseInt(user_id),
          package_id: actualPackageId,
          status: 'active'
        }
      });

      const totalUsage = (currentUsage || 0) + req.file.size;
      
      console.log('Storage usage:', { current: currentUsage || 0, requested: req.file.size, total: totalUsage, limit: package.file_storage_limit });
      
      if (totalUsage > package.file_storage_limit) {
        return res.status(400).json({
          error: 'Storage limit exceeded',
          currentUsage: currentUsage || 0,
          limit: package.file_storage_limit,
          requested: req.file.size,
          remaining: package.file_storage_limit - (currentUsage || 0)
        });
      }
    }

    // Upload file to MinIO
    const uploadResult = await minioService.uploadFile(
      req.file,
      parseInt(tenant_id),
      parseInt(user_id),
      actualPackageId
    );

    console.log('File uploaded to MinIO:', uploadResult.objectName);

    // Update service data with new file size
    await serviceData.update({
      file_size: (serviceData.file_size || 0) + req.file.size
    });

    console.log('Service data updated, new file_size:', serviceData.file_size);

    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        name: uploadResult.objectName,
        objectName: uploadResult.objectName,
        fileName: uploadResult.fileName,
        originalName: uploadResult.originalName,
        fileSize: uploadResult.fileSize,
        size: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        fileUrl: uploadResult.fileUrl,
        uploadDate: uploadResult.uploadDate,
        lastModified: uploadResult.uploadDate
      },
      usage: {
        currentFileSize: serviceData.file_size,
        packageLimit: package.file_storage_limit,
        remaining: package.file_storage_limit > 0 ? package.file_storage_limit - serviceData.file_size : -1
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      error: 'Failed to upload file',
      details: error.message 
    });
  }
};

exports.getFiles = async (req, res) => {
  try {
    const { tenant_id, user_id, package_id } = req.query;
    
    if (!tenant_id || !user_id || !package_id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if user has active service data
    const serviceData = await ServiceData.findOne({
      where: {
        tenant_id: parseInt(tenant_id),
        user_id: parseInt(user_id),
        package_id: parseInt(package_id),
        status: 'active'
      }
    });

    if (!serviceData) {
      return res.status(403).json({ 
        error: 'Service not activated. Please purchase a package first.' 
      });
    }

    // List files from MinIO
    const prefix = `tenant-${tenant_id}/user-${user_id}/package-${package_id}/`;
    const files = await minioService.listFiles(prefix);

    // Generate URLs and get metadata for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        const fileUrl = await minioService.getFileUrl(file.name);
        
        // Get file metadata to extract mimeType and original name
        try {
          const fileInfo = await minioService.getFileInfo(file.name);
          return {
            ...file,
            fileUrl,
            mimeType: fileInfo.metadata['content-type'] || fileInfo.metadata['Content-Type'],
            originalName: fileInfo.metadata['original-name'] || file.name.split('/').pop()
          };
        } catch (metaError) {
          console.warn('Failed to get metadata for file:', file.name, metaError.message);
          // Fallback if metadata is not available
          const extension = file.name.split('.').pop()?.toLowerCase();
          let mimeType = 'application/octet-stream';
          
          if (['jpg', 'jpeg'].includes(extension)) mimeType = 'image/jpeg';
          else if (extension === 'png') mimeType = 'image/png';
          else if (extension === 'gif') mimeType = 'image/gif';
          else if (extension === 'webp') mimeType = 'image/webp';
          else if (extension === 'pdf') mimeType = 'application/pdf';
          
          return {
            ...file,
            fileUrl,
            mimeType,
            originalName: file.name.split('/').pop()
          };
        }
      })
    );

    res.status(200).json({
      files: filesWithUrls,
      totalFiles: filesWithUrls.length
    });

  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ 
      error: 'Failed to get files',
      details: error.message 
    });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { objectName } = req.params;
    const { tenant_id, user_id, package_id } = req.body;

    if (!tenant_id || !user_id || !package_id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Check if user has active service data
    const serviceData = await ServiceData.findOne({
      where: {
        tenant_id: parseInt(tenant_id),
        user_id: parseInt(user_id),
        package_id: parseInt(package_id),
        status: 'active'
      }
    });

    if (!serviceData) {
      return res.status(403).json({ 
        error: 'Service not activated. Please purchase a package first.' 
      });
    }

    // Get file info before deletion
    const fileInfo = await minioService.getFileInfo(objectName);
    
    // Delete file from MinIO
    await minioService.deleteFile(objectName);

    // Update service data by reducing file size
    const newFileSize = Math.max(0, (serviceData.file_size || 0) - fileInfo.size);
    await serviceData.update({
      file_size: newFileSize
    });

    res.status(200).json({
      message: 'File deleted successfully',
      usage: {
        currentFileSize: newFileSize
      }
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error.message 
    });
  }
};

exports.getFileUrl = async (req, res) => {
  try {
    const { objectName } = req.params;
    const { expiryHours = 24 } = req.query;

    const fileUrl = await minioService.getFileUrl(objectName, parseInt(expiryHours));

    res.status(200).json({
      fileUrl,
      expiryHours: parseInt(expiryHours)
    });

  } catch (error) {
    console.error('Error generating file URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate file URL',
      details: error.message 
    });
  }
};

// Debug endpoint để kiểm tra trạng thái service data
exports.debugServiceData = async (req, res) => {
  try {
    const { tenant_id, user_id } = req.query;
    
    if (!tenant_id || !user_id) {
      return res.status(400).json({ error: 'Missing tenant_id or user_id' });
    }

    // Kiểm tra user
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Kiểm tra tenant
    const tenant = await Tenant.findByPk(tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Kiểm tra service data
    const serviceData = await ServiceData.findAll({
      where: {
        tenant_id: parseInt(tenant_id),
        user_id: parseInt(user_id)
      },
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'file_storage_limit']
        }
      ]
    });

    // Kiểm tra tenant offered packages
    const tenantOfferedPackages = await TenantOfferedPackage.findAll({
      where: {
        tenant_id: parseInt(tenant_id)
      },
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name']
        }
      ]
    });

    // Kiểm tra user purchases
    const userPurchases = await UserPurchase.findAll({
      where: {
        tenant_id: parseInt(tenant_id),
        user_id: parseInt(user_id),
        status: 'completed'
      },
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name']
        }
      ]
    });

    res.status(200).json({
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      },
      tenant: {
        tenant_id: tenant.tenant_id,
        name: tenant.name
      },
      serviceData: serviceData.map(sd => ({
        data_id: sd.data_id,
        tenant_id: sd.tenant_id,
        user_id: sd.user_id,
        package_id: sd.package_id,
        file_size: sd.file_size,
        status: sd.status,
        package: sd.package
      })),
      tenantOfferedPackages: tenantOfferedPackages.map(top => ({
        tenant_id: top.tenant_id,
        package_id: top.package_id,
        status: top.status,
        package: top.package
      })),
      userPurchases: userPurchases.map(up => ({
        purchase_id: up.purchase_id,
        tenant_id: up.tenant_id,
        user_id: up.user_id,
        package_id: up.package_id,
        status: up.status,
        purchase_date: up.purchase_date,
        start_date: up.start_date,
        end_date: up.end_date,
        package: up.package
      }))
    });

  } catch (error) {
    console.error('Error debugging service data:', error);
    res.status(500).json({ 
      error: 'Failed to debug service data',
      details: error.message 
    });
  }
};

// Endpoint kiểm tra trạng thái kích hoạt của tenant
exports.checkTenantActivation = async (req, res) => {
  try {
    const { tenant_id } = req.params;
    
    if (!tenant_id) {
      return res.status(400).json({ error: 'Missing tenant_id' });
    }

    // Kiểm tra tenant
    const tenant = await Tenant.findByPk(tenant_id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Kiểm tra tenant offered packages
    const tenantOfferedPackages = await TenantOfferedPackage.findAll({
      where: {
        tenant_id: parseInt(tenant_id),
        status: 'active'
      },
      include: [
        {
          model: ServicePackage,
          as: 'package',
          attributes: ['package_id', 'name', 'file_storage_limit']
        }
      ]
    });

    // Kiểm tra service data của tất cả users trong tenant
    const tenantUsers = await User.findAll({
      where: { tenant_id: parseInt(tenant_id) }
    });

    const usersWithServiceData = await Promise.all(
      tenantUsers.map(async (user) => {
        const serviceData = await ServiceData.findOne({
          where: {
            tenant_id: parseInt(tenant_id),
            user_id: user.user_id,
            status: 'active'
          },
          include: [
            {
              model: ServicePackage,
              as: 'package',
              attributes: ['package_id', 'name', 'file_storage_limit']
            }
          ]
        });

        return {
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          hasActiveService: !!serviceData,
          serviceData: serviceData ? {
            data_id: serviceData.data_id,
            package_id: serviceData.package_id,
            file_size: serviceData.file_size,
            package: serviceData.package
          } : null
        };
      })
    );

    res.status(200).json({
      tenant: {
        tenant_id: tenant.tenant_id,
        name: tenant.name
      },
      isActivated: tenantOfferedPackages.length > 0,
      activePackages: tenantOfferedPackages.map(top => ({
        package_id: top.package_id,
        package: top.package
      })),
      totalUsers: tenantUsers.length,
      usersWithActiveService: usersWithServiceData.filter(u => u.hasActiveService).length,
      users: usersWithServiceData
    });

  } catch (error) {
    console.error('Error checking tenant activation:', error);
    res.status(500).json({ 
      error: 'Failed to check tenant activation',
      details: error.message 
    });
  }
};

// Serve files through backend proxy
exports.serveFile = async (req, res) => {
  try {
    const { objectName } = req.params;
    
    // Decode object name if it's URL encoded
    const decodedObjectName = decodeURIComponent(objectName);
    
    console.log('Serving file:', decodedObjectName);
    
    // Get file stream from MinIO
    const fileStream = await minioService.getFileStream(decodedObjectName);
    const fileInfo = await minioService.getFileInfo(decodedObjectName);
    
    // Set appropriate headers
    res.setHeader('Content-Type', fileInfo.metadata['content-type'] || 'application/octet-stream');
    res.setHeader('Content-Length', fileInfo.size);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Set filename header for download
    if (fileInfo.metadata['original-name']) {
      res.setHeader('Content-Disposition', `inline; filename="${fileInfo.metadata['original-name']}"`);
    }
    
    // Pipe file stream to response
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(404).json({ 
      error: 'File not found',
      details: error.message 
    });
  }
}; 