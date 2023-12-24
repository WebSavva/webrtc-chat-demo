# Base stage for common setup
FROM node:20-alpine as base

# Install pnpm globally
RUN npm install -g pnpm

# Set the working directory
WORKDIR /webrtc-chat

# Copy the necessary files for installing dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json files for each package
COPY app/client/package.json app/client/
COPY app/server/package.json app/server/
COPY packages/types/package.json packages/types/

# Install dependencies for the entire workspace
RUN pnpm install

# Copy the entire workspace
COPY . .

# Server build stage
FROM base

# Build the server application
RUN pnpm turbo --filter=server build

# Set the command to start the server
CMD ["pnpm", "--filter=server", "start"]
