FROM node:18-alpine

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application source
COPY . .

# Expose port 3000
EXPOSE 3000

# Start in development mode with hot-reloading
CMD ["npm", "run", "dev"]
