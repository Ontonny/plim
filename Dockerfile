ARG VITE_PLIM_BACKEND_URL=https://production-plim-backend.host:3001/api/v1

FROM rust:1.86-bullseye as rust_build
RUN apt update && apt install -y \ 
	curl \
	sed \
	git \
	llvm-dev \
	libclang-dev \
	libssl-dev \
	make \
	pkg-config \
	protobuf-compiler
RUN cargo install just
WORKDIR /app
COPY . /app
RUN just build_release

FROM node:22.14.0-bullseye as react_build
ARG VITE_PLIM_BACKEND_URL
ENV VITE_PLIM_BACKEND_URL=${VITE_PLIM_BACKEND_URL}
WORKDIR /app
COPY . /app
RUN npm install -g rust-just
RUN cd ./plim_front && printf "VITE_PLIM_BACKEND_URL=${VITE_PLIM_BACKEND_URL}\n" > .env.production
RUN just npm_build

# Stage 2: Runtime
FROM debian:bullseye-slim
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy built binary from builder
COPY --from=rust_build /app/target/release/plim-rusty .
COPY --from=react_build /app/plim_front/dist ./static
# COPY ./config ./config
# COPY ./config.yml ./config.yml

# Set the startup command
# CMD ["./app"]