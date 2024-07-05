#!./node_modules/.bin/ts-node

require('dotenv').config();
import express from 'express';

const app = express();
const port = process.env.PORT || 3168;

app.use(express.json());

const zabbix_severity: { [key: string]: number } = {
  warning: 0,
  disaster: 4,
};

// To be called by Zabbix Media Type is alert us there's been a change in monitoring status
app.post('/api/zabbix_webhook', (req, res) => {
  // Handle the webhook data from Zabbix
  const data = req.body;
  console.log('Received Zabbix webhook data:', data);

  // Perform any actions based on the webhook data (e.g., send notifications, store data)

  res.json({ Status: 'OK' });
});

app.get(`/api/v1/zabbix-alerts/:severity`, (req, res) => {
  const severity: number | undefined = zabbix_severity[req.params.severity];
  if (typeof severity === 'undefined') {
    res.status(400);
    res.json({
      Status: `Severity level '${severity}' not recognised, use one of ${Object.keys(
        zabbix_severity
      ).join(', ')}`,
    });
  }
  const data = req.body;
  console.log('Received Zabbix webhook data:', data);

  // Perform any actions based on the webhook data (e.g., send notifications, store data)

  res.json({ Status: 'OK' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
