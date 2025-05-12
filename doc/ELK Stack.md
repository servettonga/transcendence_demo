# ELK Stack Documentation

## Access Information

| Component | URL | Default Credentials |
|-----------|-----|---------------------|
| Elasticsearch | http://localhost:9200 | username: `elastic`<br>password: `elasticsearch_password` or `changeme` |
| Kibana | http://localhost:5601 | username: `elastic`<br>password: `elasticsearch_password` or `changeme` |
| Logstash | Port 5044 (Beats input) | N/A (internal service) |

## Architecture Overview

```md
Application Logs → Filebeat → Logstash → Elasticsearch ← Kibana
```

1. **Application** generates structured JSON logs
2. **Filebeat** collects logs from files
3. **Logstash** processes and transforms logs
4. **Elasticsearch** stores and indexes logs
5. **Kibana** provides visualization and search interface

## Log Structure

The application generates structured logs with consistent fields:

- `event_type`: Categorizes the event (e.g., `message_sent`, `game_created`)
- `timestamp`: ISO-formatted date/time
- Event-specific fields like `sender_username`, `game_id`, etc.

## Quick Health Checks

### Check Elasticsearch Status

```bash
curl -u elastic:elasticsearch_password http://localhost:9200/_cluster/health
```

### Check Indices

```bash
curl -u elastic:elasticsearch_password http://localhost:9200/_cat/indices
```

### Verify Logs in Kibana

1. Navigate to http://localhost:5601
2. Go to Discover → Create index pattern → Use `logs-*`
3. Set Time field to `@timestamp`
4. Use Discover to search logs with queries like `event_type:game_created`

## Common Issues and Solutions

### Missing Logs

If logs aren't appearing in Elasticsearch:

1. **Verify logs are being written** to Django log file:

   ```bash
   docker-compose exec backend cat /app/logs/django.log | grep event_type
   ```

2. **Check Filebeat is reading logs**:

   ```bash
   docker-compose logs filebeat | grep "harvester"
   ```

3. **Check Logstash is processing logs**:

   ```bash
   docker-compose logs logstash | grep "pipeline"
   ```

### JSON Parsing Issues

If log data isn't properly structured in Elasticsearch, check Logstash configuration:

1. Ensure `json.keys_under_root: true` in Filebeat configuration
2. Ensure JSON filter in Logstash is uncommented and working correctly

### Field Mapping Issues

Search for terms using `.keyword` suffix for exact matching:

```json
event_type.keyword:"message_sent"
```

## Creating Visualizations

1. In Kibana, go to Analytics → Visualize Library → Create visualization
2. Select a visualization type (e.g., bar chart)
3. Choose an aggregation (e.g., count by `event_type.keyword`)
4. Save and add to dashboard

## Log Retention

Logs are automatically managed through Elasticsearch's Index Lifecycle Management:

- **Hot phase**: Active logs (current day)
- **Warm phase**: 7+ days old, optimized
- **Cold phase**: 30+ days old, lower priority
- **Delete phase**: 90+ days old, removed

## Index Pattern Information

- Logs are stored in indices following the pattern: `logs-YYYY.MM.DD`
- Use `logs-*` to query all logs in Kibana

## Security

- All ELK components have security enabled
- Authentication is required for all access
- Specific users and roles are configured for each service

## Further Resources

- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
