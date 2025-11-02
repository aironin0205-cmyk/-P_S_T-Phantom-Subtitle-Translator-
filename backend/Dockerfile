# ==========================================================
# ===  OPTIMIZED PRODUCTION-READY DOCKERFILE             ===
# ==========================================================

# --- STAGE 1: Build Dependencies ---
# Use a specific version of Node.js for reproducible builds.
# 'alpine' provides a small, security-focused base image.
FROM node:18.18.2-alpine AS builder

# Set the working directory for the entire build process.
WORKDIR /usr/src/app

# Copy only the package files. This leverages Docker's layer caching.
# The 'npm install' layer will only be rebuilt if these files change.
COPY package.json package-lock.json ./

# Install ONLY production dependencies using 'npm ci' for faster, more reliable installs.
RUN npm ci --only=production


# --- STAGE 2: Production Image ---
# Start from a fresh, clean base image.
FROM node:18.18.2-alpine

# Set the working directory for the final image.
WORKDIR /usr/src/app

# Set the environment to production. This is critical for performance and security.
ENV NODE_ENV=production

# --- Security Best Practice: Run as a non-root user ---
# Create a dedicated user and group for the application.
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# Set the new user as the default for all subsequent commands.
USER appuser

# Copy the installed dependencies from the 'builder' stage.
# Ensure the new 'appuser' owns these files.
COPY --chown=appuser:appgroup --from=builder /usr/src/app/node_modules ./node_modules

# Copy the application source code.
# This should be one of the last steps, as code changes frequently.
COPY --chown=appuser:appgroup . .

# Expose the port the application will listen on.
EXPOSE 3001

# The command to run the application, pointing to our refactored entrypoint.
CMD ["node", "src/server.js"]
