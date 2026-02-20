# Docker Deployment Guide

This guide explains how to run the Receipts Manager using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB free disk space

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/SaVaGi-eu/receipts-manager.git
cd receipts-manager
git checkout docker
```

### 2. Start the application

```bash
docker-compose up -d --build
```

The application will be available at `http://localhost:5000`

### 3. View logs

```bash
docker-compose logs -f
```

### 4. Stop the application

```bash
docker-compose down
```

## Directory Structure

The application uses two main directories that are mounted as volumes:

```
receipts-manager/
├── data/              # Database and backups (mounted)
│   ├── database/
│   │   └── data.json
│   └── backups/
└── storage/           # Receipt files (mounted)
    └── _Receipts/
```

**Important:** These directories are mounted from your host system, so all data persists across container restarts.

## Configuration

### Environment Variables

You can customize the application by adding environment variables in `docker-compose.yml`:

```yaml
environment:
  - PYTHONUNBUFFERED=1
  # Add more variables here if needed
```

### Port Configuration

To change the port, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:5000"  # Maps host port 8080 to container port 5000
```

## Docker Commands

### Build and Start

```bash
# Build and start in detached mode
docker-compose up -d --build

# Build without cache
docker-compose build --no-cache

# Force recreate containers
docker-compose up -d --build --force-recreate
```

### Manage Containers

```bash
# Stop containers
docker-compose stop

# Start containers
docker-compose start

# Restart containers
docker-compose restart

# Remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### View Information

```bash
# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f receipts-manager

# Check container status
docker-compose ps

# Execute command in container
docker-compose exec receipts-manager python --version

# Open shell in container
docker-compose exec receipts-manager /bin/bash
```

### Health Check

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' receipts-manager

# View health check logs
docker inspect --format='{{json .State.Health}}' receipts-manager | jq
```

## Backup and Restore

### Backup

Since data is stored in mounted volumes, you can back up by copying the directories:

```bash
# Create backup
tar -czf receipts-backup-$(date +%Y%m%d).tar.gz data/ storage/

# Or copy to another location
cp -r data/ /path/to/backup/location/
cp -r storage/ /path/to/backup/location/
```

### Restore

```bash
# Stop the application
docker-compose down

# Restore from backup
tar -xzf receipts-backup-YYYYMMDD.tar.gz

# Start the application
docker-compose up -d
```

## Troubleshooting

### Container won't start

1. Check logs:
   ```bash
   docker-compose logs
   ```

2. Verify port availability:
   ```bash
   lsof -i :5000  # macOS/Linux
   netstat -ano | findstr :5000  # Windows
   ```

3. Rebuild from scratch:
   ```bash
   docker-compose down -v
   docker-compose up -d --build --force-recreate
   ```

### Permission Issues

If you encounter permission errors:

```bash
# Fix ownership (Linux)
sudo chown -R 1000:1000 data/ storage/

# macOS/Windows: Usually not needed due to Docker Desktop handling
```

### Database Corruption

If `data.json` is corrupted:

```bash
# Stop container
docker-compose down

# Restore from backup
cp data/backups/data_backup_LATEST.json data/database/data.json

# Start container
docker-compose up -d
```

### OCR Not Working

EasyOCR downloads language models on first use (~100MB each). This happens automatically but requires:

1. Internet connection
2. Sufficient disk space
3. First upload may take 1-2 minutes

Check logs:
```bash
docker-compose logs -f | grep -i ocr
```

## Advanced Configuration

### Custom Dockerfile

If you need to customize the build:

```dockerfile
# Add additional system dependencies
RUN apt-get update && apt-get install -y \
    your-package \
    && rm -rf /var/lib/apt/lists/*

# Add Python packages
RUN pip install your-package
```

### Resource Limits

Add resource limits in `docker-compose.yml`:

```yaml
services:
  receipts-manager:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Network Configuration

For reverse proxy setups (nginx, traefik):

```yaml
services:
  receipts-manager:
    expose:
      - "5000"
    networks:
      - web
      - receipts-net

networks:
  web:
    external: true
  receipts-net:
    driver: bridge
```

## Production Deployment

### Recommendations

1. **Use environment-specific compose files:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

2. **Enable automatic restarts:**
   ```yaml
   restart: always
   ```

3. **Set up monitoring:**
   - Container health checks (already configured)
   - Log aggregation (ELK, Loki)
   - Resource monitoring (Prometheus, Grafana)

4. **Regular backups:**
   ```bash
   # Add to crontab
   0 2 * * * cd /path/to/receipts-manager && tar -czf backup-$(date +\%Y\%m\%d).tar.gz data/ storage/
   ```

5. **Use secrets for sensitive data** (if adding authentication):
   ```yaml
   secrets:
     - db_password
   ```

### Security Considerations

- Application runs as non-root user (UID 1000)
- Minimal attack surface (slim base image)
- No unnecessary packages installed
- Data persisted outside container
- Network isolation with bridge network

## Updating

### Update to Latest Version

```bash
# Pull latest changes
git pull origin docker

# Rebuild and restart
docker-compose up -d --build
```

### Rollback

```bash
# Checkout previous version
git checkout <previous-commit>

# Rebuild
docker-compose up -d --build --force-recreate
```

## FAQ

**Q: Can I use this in production?**
A: Yes, but consider adding authentication, HTTPS, and proper monitoring.

**Q: How much disk space do I need?**
A: Minimum 2GB (image + dependencies). Actual usage depends on number of receipts.

**Q: Can I run multiple instances?**
A: Yes, change the port mapping in docker-compose.yml for each instance.

**Q: Does it work on ARM (Raspberry Pi)?**
A: The base image supports ARM64. For ARM32, you may need to adjust the Dockerfile.

**Q: Can I use an external database?**
A: Currently uses JSON file storage. Database support could be added.

## Support

For issues and questions:
- GitHub Issues: https://github.com/SaVaGi-eu/receipts-manager/issues
- Check logs: `docker-compose logs -f`
- Container shell: `docker-compose exec receipts-manager /bin/bash`

## License

See main repository LICENSE file.
