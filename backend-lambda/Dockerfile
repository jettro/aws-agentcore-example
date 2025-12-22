# Multi-stage build for GraalVM Native Image

# Stage 1: Build native image using GraalVM
FROM ghcr.io/graalvm/native-image-community:21-muslib AS builder

# Install Maven
RUN microdnf install -y findutils

WORKDIR /build

# Copy Maven project files
COPY pom.xml .
COPY src ./src

# Download Maven if not present
RUN curl -fsSL https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz | tar xz -C /opt
ENV PATH="/opt/apache-maven-3.9.6/bin:${PATH}"

# Build the application
RUN mvn clean package -DskipTests

# Build native image
RUN mvn -Pnative native:compile -DskipTests

# Stage 2: Create minimal runtime image
FROM public.ecr.aws/lambda/provided:al2023

# Copy the native executable
COPY --from=builder /build/target/bootstrap ${LAMBDA_RUNTIME_DIR}/bootstrap

# Set execute permissions
RUN chmod 755 ${LAMBDA_RUNTIME_DIR}/bootstrap

# Set the handler (not used for custom runtime but required)
CMD [ "unused.handler" ]
