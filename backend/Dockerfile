FROM debian:buster-slim

# Install system dependencies and ODBC driver for SQL Server
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    gnupg2 \
    unixodbc-dev \
    libgssapi-krb5-2 \
    && curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
    && curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17 \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

# Set Python3 and pip3 as default
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 1 \
    && update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1

# Upgrade pip and setuptools
RUN pip3 install --upgrade pip setuptools wheel

# Set working directory
WORKDIR /app

# Copy the project files
COPY . .
# Explicitly copy the .env file (relative to the backend/ folder)
COPY backend/.env .env

# Install dependencies
RUN pip install --upgrade pip  # Upgrade pip first
RUN pip install --no-cache-dir -r ./backend/requirements.txt  # Install dependencies

# Copy the entire backend folder to /app
COPY backend /app

# Set PYTHONPATH to include the project root
ENV PYTHONPATH=/app

# Expose the backend port
EXPOSE 5000

# Run the application
CMD ["python", "main.py"]
