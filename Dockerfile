FROM node:20
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg curl
RUN curl -L https://github.com -o /usr/local/bin/yt-dlp
RUN chmod a+rx /usr/local/bin/yt-dlp
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 10000
CMD ["node", "server.js"]
