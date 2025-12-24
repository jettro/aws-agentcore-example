# Build stage
FROM public.ecr.aws/docker/library/maven:3.9-amazoncorretto-21 AS builder

WORKDIR /build

# Copy Maven project files
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM public.ecr.aws/lambda/java:21

# Copy the built JAR
COPY --from=builder /build/target/backend-lambda-1.0.0.jar ${LAMBDA_TASK_ROOT}/lib/

# Set the Lambda handler
CMD [ "org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest" ]
