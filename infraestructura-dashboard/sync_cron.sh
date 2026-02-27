#!/bin/bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py >> /var/log/infraestructura-sync.log 2>&1
