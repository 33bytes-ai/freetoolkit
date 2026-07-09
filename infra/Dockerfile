# Build stage — generate the static site
FROM python:3.12-slim AS builder

WORKDIR /build
COPY pyproject.toml .
COPY src/ src/
COPY content/ content/
COPY templates/ templates/
COPY static/ static/
RUN pip install --no-cache-dir -e . && python src/freetoolkit/build.py

# Runtime stage — nginx serving the static files
FROM nginx:1.27-alpine

COPY --from=builder /build/dist /usr/share/nginx/html
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
