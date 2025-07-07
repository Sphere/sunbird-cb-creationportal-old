# Use compatible Node.js version
FROM node:16.16.0

# Set working directory
WORKDIR /app

# Copy only the package files for dependency install
COPY package.json yarn.lock ./

# Install dependencies safely (avoid upgrading minimatch)
RUN yarn install --frozen-lockfile

# Copy the rest of the project
COPY . .

# Build Angular project using your existing script
RUN yarn build

# Compress using brotli after build
RUN yarn compress:brotli

# Set the working directory to dist output
WORKDIR /app/dist

# Copy client assets to build output (adjust path if needed)
COPY assets/CBP/client-assets/dist www/en/assets

# Install production-only Node dependencies (if needed)
RUN yarn install --production

# Expose app port
EXPOSE 3024

# Start the server
CMD ["yarn", "serve:prod"]
