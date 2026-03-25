FROM node:20.10-alpine

# Create app directory
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the actual application files
COPY . .

# Environment Arguments needed for the Next.js build step
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_ENABLED
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AUTH_ENABLED=$NEXT_PUBLIC_AUTH_ENABLED

# Build the Next.js production artifact
RUN npm run build

# Expose the standard Google Cloud Run port
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Command to run the generic compiled server
CMD ["npm", "run", "start"]
