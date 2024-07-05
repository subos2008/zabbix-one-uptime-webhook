#!./node_modules/.bin/ts-node

require('dotenv').config();
import express from 'express';

const app = express();
const port = process.env.PORT || 3168;

app.use(express.json());
const zabbix_severity: { [key: string]: number } = {
  'not-classified': 0,
  information: 1,
  warning: 2,
  average: 3,
  high: 4,
  disaster: 5,
};

function get_severity_string(i: number): string | undefined {
  let names = Object.keys(zabbix_severity)
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
    if (zabbix_severity[name] === i) return name;
  }
  return undefined;
}

type ZabbixWebhookData = {
  event_severity: string
  alert_message: string
  host: string
  trigger_name: string
  event_is_problem: string
  event_is_update: string
}

// To be called by Zabbix Media Type is alert us there's been a change in monitoring status
app.post('/api/zabbix_webhook', (req, res) => {
  // Handle the webhook data from Zabbix
  const data: ZabbixWebhookData = req.body.data;
  // console.log('Received Zabbix webhook data:', data);
  let severity: string = (
    get_severity_string(parseInt(data.event_severity)) || 'UNDEFINED'
  ).toUpperCase();
  let kind //, icon
  if (data.event_is_problem == '1') {
    if (data.event_is_update == '0') {
      kind = 'problem';
      // icon = '⚠️'
    } else {
      kind = 'update';
      // icon = 'ℹ️'
    }
  } else {
    kind = 'recovery';
    // icon = '✅'
  }
  if (['problem'].includes(kind))
    console.log(`${severity}: ${data.host} ${data.trigger_name}`);
  // Perform any actions based on the webhook data (e.g., send notifications, store data)

  res.json({ Status: 'OK' });
});

function get_problems_at_severity_level(severity: string) {
  
}

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
  let problems = get_problems_at_severity_level(req.params.severity)
  res.json({ Status: 'OK', problems });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
