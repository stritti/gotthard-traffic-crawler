# Specify the base Docker image. You can read more about
# the available images at https://crawlee.dev/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node-playwright-camoufox:24-1.58.2 AS builder

# Install bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Copy package files first for Docker layer caching
COPY --chown=myuser package.json bun.lock* ./

# Install dependencies (including devDependencies for the build)
RUN bun install --ignore-scripts

# Copy source files
COPY --chown=myuser . ./

# Build TypeScript
RUN bun run build

# Create final image
FROM apify/actor-node-playwright-camoufox:24-1.58.2

# Install bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Copy only built JS files from builder image
COPY --from=builder --chown=myuser /home/myuser/dist ./dist

# Copy package files for production install
COPY --chown=myuser package.json bun.lock* ./

# Install production dependencies only
RUN bun install --production --ignore-scripts \
    && echo "Installed packages:" \
    && bun pm ls \
    && echo "Bun version:" \
    && bun --version \
    && echo "Node.js version:" \
    && node --version

# Copy the source files and directories.
COPY --chown=myuser . ./

# Run the image.
CMD bun run start:prod
