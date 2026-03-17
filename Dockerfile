# Use the official Node image
FROM node:20

# 1. Install system dependencies (Python and FFmpeg are required)
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg curl

# 2. FIX: Correct URL to download the ACTUAL yt-dlp binary (latest release)
RUN curl -L https://github.com -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

# 3. Set up the application directory
WORKDIR /app

# 4. Install npm dependencies
COPY package*.json ./
RUN npm install

# 5. Copy source code and build the frontend (Vite)
COPY . .
RUN npm run build

# 6. Expose the port Render expects (10000)
EXPOSE 10000

# 7. Start the server
CMD ["node", "server.js"]
