# --- Build Stage ---
FROM python:3.11-alpine AS builder

WORKDIR /build

# Install compilation system tools
RUN apk add --no-cache gcc musl-dev libffi-dev postgresql-dev

# Copy requirements
COPY requirements.txt .

# Install dependencies into a wheelhouse
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Final Production Stage ---
FROM python:3.11-alpine AS final

WORKDIR /app

# Install runtime system dependencies (libpq is needed for postgres driver)
RUN apk add --no-cache libpq

# Copy installed dependencies from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy backend source code
COPY . .

# Expose ports
EXPOSE 8000

# Run entry point command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
