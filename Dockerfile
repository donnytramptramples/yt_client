FROM node:20

# Install Python and FFmpeg
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg curl

# FIX: Correct URL to download the actual yt-dlp binary
RUN curl -L https://github.com -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Render uses 10000 by default; we will update server.js to match
EXPOSE 10000
CMD ["node", "server.js"]
