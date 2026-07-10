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
COPY --from=builder /build/csp_nonce.txt /tmp/csp_nonce.txt
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf

# The CSP header's nonce must match the one build.py stamped onto every
# inline <script> in dist/ — substitute it in now that both are available.
RUN sed -i "s/__CSP_NONCE__/$(cat /tmp/csp_nonce.txt)/" /etc/nginx/conf.d/default.conf \
    && rm /tmp/csp_nonce.txt

EXPOSE 80
