# Monitoring System with Prometheus and Grafana

## Introduction

This monitoring system provides real-time visibility into the health and performance of the application.
It uses Prometheus for metrics collection and Grafana for visualization.

## Features

- Real-time metrics collection with Prometheus
- Visualization through Grafana dashboards
- Monitoring of PostgreSQL, Redis, Nginx, and Django
- Automatic provisioning of datasources and dashboards
- Support for alerting (configurable)

## Architecture

The monitoring system consists of several components:

- **Prometheus**: The central metrics collection and storage system
- **Grafana**: The visualization and dashboarding tool
- **Exporters**:
  - **postgres_exporter**: Collects metrics from PostgreSQL
  - **redis_exporter**: Collects metrics from Redis
  - **nginx_exporter**: Collects metrics from Nginx
- **django-prometheus**: Collects metrics from the Django backend

Prometheus scrapes metrics from the exporters at regular intervals, stores them in its time-series database,
and Grafana visualizes these metrics through pre-configured dashboards.

The monitoring system uses several configuration files:

- `prometheus.yml`: The main configuration file for Prometheus
- `alerts.yml`: Configuration for alerting rules
- `datasources.yml`: Configuration for Grafana datasources
- `dashboard_provider.yml`: Configuration for Grafana dashboards

## Usage

**Accessing Interfaces**:

- Run the `docker-compose up` command to start all components.
- Access Grafana at `http://localhost:3000` and log in with the default credentials (admin/admin).
- Access Prometheus at `http://localhost:9090`.
- Access Prometheus targets at `http://localhost:9090/targets` and alerts at `http://localhost:9090/alerts`.
- Access Alert manager's alerts at `http://localhost:9093`.

**Available Dashboards**:

- PostgreSQL: Database performance metrics, connections, queries
  - Redis: Memory usage, commands, connections, keys
  - Nginx: Connection statistics, request rates, status codes

## Customization

Additional exporters or modify existing ones by updating the `docker-compose.yml` file and the Prometheus configuration.

```yaml
new_exporter:
  image: exporter_image
  ports:
    - "9100:9100"
  networks:
    - ft_transcendence_network
```

Add the exporter as a scrape target in `prometheus.yml`:

```yaml
- job_name: 'new_service'
  static_configs:
    - targets: ['new_exporter:9100']
```

Create or modify `alerts.yml`:

```yaml
groups:
- name: example
  rules:
  - alert: InstanceDown
    expr: up == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Instance {{ $labels.instance }} down"
      description: "{{ $labels.instance }} has been down for more than 5 minutes."
```

## Troubleshooting

Common Issues

1. **Nginx Exporter Shows as "Down"**
   - Ensure stub_status is enabled in Nginx config
   - Verify the correct scrape URI in nginx_exporter command
2. **No Data in Grafana Dashboards**
   - Check Prometheus targets at <http://localhost:9090/targets>
   - Verify Prometheus data source is configured correctly in Grafana
   - Check for query errors in Grafana panels
3. **Configuration Parsing Errors**
   - Validate YAML syntax in `prometheus.yml` and `alerts.yml`
   - Ensure proper indentation and formatting

## Manual Configuration

### 1. Manually Adding Prometheus Data Source

1. Login to Grafana at <http://localhost:3000> (default credentials: admin/admin)
2. Navigate to Configuration (gear icon) → Data Sources → Add data source
3. Select "Prometheus" from the list
4. Configure with the following settings:
   - Name: Prometheus
   - URL: <http://prometheus:9090>
   - Access: Server (default)
   - Leave other settings as default
5. Click "Save & Test" - you should see "Data source is working"

### 2. Manually Importing Dashboards

1. Login to Grafana
2. Navigate to Create (+ icon) → Import dashboard
3. Use one of these methods:
   - **Import via ID**: Enter the dashboard ID and click "Load"
     - PostgreSQL: 9628
     - Redis: 763
     - Nginx: 12708
   - **Import via JSON**: Upload the dashboard JSON file or paste the JSON content
4. Select "Prometheus" as the data source when prompted
5. Click "Import"

### 3. Verification Steps

1. After starting the containers, wait a minute for services to initialize
2. Login to Grafana at <http://localhost:3000>
3. Check the Data Sources under Configuration → Data Sources
   - Verify Prometheus is connected with "Data source is working" status
4. Navigate to Dashboards → Browse
   - Confirm the PostgreSQL, Redis, and Nginx dashboards appear and show data

### 4. Troubleshooting

- **No data in dashboards**: Verify Prometheus targets are UP at <http://localhost:9090/targets>
- **Data source connection failing**: Prometheus might still be initializing; wait a minute and try again
- **Missing dashboard**: Try importing manually using the dashboard IDs provided above
- **Permission issues**: Ensure proper permissions on the provisioning directories with `chmod -R 755 docker/grafana/provisioning`
