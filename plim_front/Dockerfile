FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Serve the built files using a lightweight server
FROM nginx:alpine AS production
RUN apk add openssl
# Copy the production build from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration (optional)
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port Nginx will use
EXPOSE 80
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx-selfsigned.key -out /etc/ssl/certs/nginx-selfsigned.crt -subj "/C=US/ST=California/L=San Francisco/O=MyCompany/OU=IT/CN=pruduction.host"
# Start Nginx when the container launches
CMD ["nginx", "-g", "daemon off;"]