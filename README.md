### Chạy lệnh sau để run dự án
```bash
docker-compose up -d --build
```
### FE
```bash
http://localhost:8080/
```
### BE
```bash
http://localhost:3000/api/test
```
### MinIO
```bash
http://localhost:9001
```

### Backend
```bash
npm i
npm install bcrypt 
npm install bcrypt cors
npm install ioredis
npm install cookie-parser
npm install redis

npm install pdfkit

###CHẠY XONG LỆNH NÀY NHỚ COPPY KEY DÁN VÀO FILE .ENV
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

### Frontend
```bash
npm i
npm install axios
npm install dotenv
```

### thêm vào sql 
```bash
ALTER TABLE service_packages
  ADD COLUMN bandwidth_limit BIGINT DEFAULT 0,
  ADD COLUMN database_limit BIGINT DEFAULT 0,
  ADD COLUMN api_call_limit BIGINT DEFAULT 0;
``` 