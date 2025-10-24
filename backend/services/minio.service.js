const Minio = require('minio');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

class MinioService {
  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT) || 9000,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    });

    this.bucketName = process.env.MINIO_BUCKET_NAME || 'tenant-files';
    this.initBucket();
  }

  async initBucket() {
    try {
      const bucketExists = await this.minioClient.bucketExists(this.bucketName);
      if (!bucketExists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        console.log(`Bucket '${this.bucketName}' created successfully`);
        
        // Set bucket policy to allow public read access for images
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucketName}/*`]
            }
          ]
        };
        
        await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
        console.log(`Bucket policy set for '${this.bucketName}'`);
      }
    } catch (error) {
      console.error('Error initializing MinIO bucket:', error);
    }
  }

  async uploadFile(file, tenantId, userId, packageId) {
    try {
      const fileExtension = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExtension}`;
      const objectName = `tenant-${tenantId}/user-${userId}/package-${packageId}/${fileName}`;
      
      const metadata = {
        'Content-Type': file.mimetype,
        'content-type': file.mimetype,
        'original-name': file.originalname,
        'tenant-id': tenantId.toString(),
        'user-id': userId.toString(),
        'package-id': packageId.toString(),
        'file-size': file.size.toString()
      };

      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        file.buffer,
        file.size,
        metadata
      );

      // Generate backend proxy URL instead of MinIO presigned URL
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      const fileUrl = `${backendUrl}/api/file-upload/serve/${encodeURIComponent(objectName)}`;

      return {
        objectName,
        fileName,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileUrl,
        uploadDate: new Date()
      };
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new Error('Failed to upload file');
    }
  }

  async deleteFile(objectName) {
    try {
      await this.minioClient.removeObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new Error('Failed to delete file');
    }
  }

  async getFileUrl(objectName, expiryHours = 24) {
    try {
      // Return backend proxy URL instead of direct MinIO URL
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
      return `${backendUrl}/api/file-upload/serve/${encodeURIComponent(objectName)}`;
    } catch (error) {
      console.error('Error generating file URL:', error);
      throw new Error('Failed to generate file URL');
    }
  }

  async getFileStream(objectName) {
    try {
      return await this.minioClient.getObject(this.bucketName, objectName);
    } catch (error) {
      console.error('Error getting file stream from MinIO:', error);
      throw new Error('Failed to get file stream');
    }
  }

  async listFiles(prefix = '') {
    try {
      const files = [];
      const stream = this.minioClient.listObjects(this.bucketName, prefix, true);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified
          });
        });
        
        stream.on('error', reject);
        stream.on('end', () => resolve(files));
      });
    } catch (error) {
      console.error('Error listing files from MinIO:', error);
      throw new Error('Failed to list files');
    }
  }

  async getFileInfo(objectName) {
    try {
      const stat = await this.minioClient.statObject(this.bucketName, objectName);
      return {
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        metadata: stat.metaData
      };
    } catch (error) {
      console.error('Error getting file info from MinIO:', error);
      throw new Error('Failed to get file info');
    }
  }
}

module.exports = new MinioService(); 