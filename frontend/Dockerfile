# 1️⃣ Sử dụng Node base image
FROM node:18

# 2️⃣ Tạo thư mục làm việc
WORKDIR /app

# 3️⃣ Copy file package.json và package-lock.json
COPY package*.json ./

# 4️⃣ Cài đặt dependencies
RUN npm install

# 5️⃣ Copy toàn bộ mã nguồn
COPY . .

# 6️⃣ Mở port cho Vite
EXPOSE 5173

# 7️⃣ Chạy dev server
CMD ["npm", "run", "dev"]