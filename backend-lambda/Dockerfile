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
# The Lambda base image doesn't include unzip by default
RUN dnf -y install unzip \
    && dnf clean all \
    && rm -rf /var/cache/dnf


# Copy the built Spring Boot JAR into the image (we'll unpack it for the Lambda classpath)
COPY --from=builder /build/target/backend-lambda-1.0.0.jar /tmp/app.jar

# Unpack Spring Boot layout into the Lambda task root:
# - classes/resources go to /var/task
# - dependency jars go to /var/task/lib
RUN mkdir -p ${LAMBDA_TASK_ROOT}/lib \
    && unzip -q /tmp/app.jar "BOOT-INF/classes/*" -d ${LAMBDA_TASK_ROOT} \
    && unzip -q /tmp/app.jar "BOOT-INF/lib/*" -d ${LAMBDA_TASK_ROOT} \
    && mv ${LAMBDA_TASK_ROOT}/BOOT-INF/classes/* ${LAMBDA_TASK_ROOT}/ \
    && mv ${LAMBDA_TASK_ROOT}/BOOT-INF/lib/* ${LAMBDA_TASK_ROOT}/lib/ \
    && rm -rf ${LAMBDA_TASK_ROOT}/BOOT-INF \
    && rm -f /tmp/app.jar

# Spring Cloud Function's AWS adapter needs to know the Spring Boot start class
# (otherwise it tries to discover it from MANIFEST.MF, which doesn't exist in the exploded layout)
ENV MAIN_CLASS=dev.jettro.backend.BackendApplication

# Set the Lambda handler
CMD [ "org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest" ]
