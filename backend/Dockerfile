# ==============================================================================
# AXM Nexus Backend Multi-Stage Dockerfile (Non-root, Container-aware)
# ==============================================================================

# 1-bosqich: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /workspace

COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

COPY src src
RUN ./gradlew bootJar -x test --no-daemon

# 2-bosqich: Runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Non-root user va fayllar saqlash katalogini tayyorlash
RUN addgroup -S spring && adduser -S spring -G spring && \
    mkdir -p /app/uploads/resources && \
    chown -R spring:spring /app

USER spring:spring

COPY --from=builder --chown=spring:spring /workspace/build/libs/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:${PORT:-8080}/actuator/health || exit 1

STOPSIGNAL SIGTERM

ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
