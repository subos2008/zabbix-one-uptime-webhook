#!./node_modules/.bin/ts-node

require('dotenv').config();
import express from 'express';
import { resolve } from 'url';

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
  let names = Object.keys(zabbix_severity);
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
    if (zabbix_severity[name] === i) return name;
  }
  return undefined;
}

type ZabbixWebhookData = {
  event_severity: string;
  alert_message: string;
  host: string;
  trigger_name: string;
  event_is_problem: string;
  event_is_update: string;
};

// To be called by Zabbix Media Type is alert us there's been a change in monitoring status
app.post('/api/zabbix_webhook', (req, res) => {
  // Handle the webhook data from Zabbix
  const data: ZabbixWebhookData = req.body.data;
  // console.log('Received Zabbix webhook data:', data);
  let severity: string = (
    get_severity_string(parseInt(data.event_severity)) || 'UNDEFINED'
  ).toUpperCase();
  let kind; //, icon
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

// Interface to define the expected response structure (replace with your actual response structure)
interface Problem {
  // Add properties based on your API response
  message: string;
}

async function get_problems_at_severity_level(
  severity: string
): Promise<Problem[]> {
  const integer_severity_as_string = zabbix_severity[severity].toString()
  const zabbix_base_url = process.env.ZABBIX_SERVER_URL;
  const auth_token = process.env.ZABBIX_API_TOKEN;

  if (!zabbix_base_url) {
    throw new Error('ZABBIX_SERVER_URL environment variable is not set');
  }

  if (!auth_token) {
    throw new Error('ZABBIX_API_TOKEN environment variable is not set');
  }

  try {
    const body = {
      jsonrpc: '2.0',
      method: 'problem.get',
      params: {
        output: 'extend',
        selectAcknowledges: 'extend',
        selectTags: 'extend',
        selectSuppressionData: 'extend',
        recent: 'true',
        sortfield: ['eventid'],
        sortorder: 'DESC',
        acknowledged: '0',
      },
      auth: auth_token,
      id: 2,
    };

    const response = await fetch(resolve(zabbix_base_url, '/api_jsonrpc.php'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth_token}`,
        'Content-Type': 'application/json', // Adjust content type based on your request body format
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const problems = data.result;

    return problems.filter((i: any) => i.severity == integer_severity_as_string);
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Re-throw the error for further handling
  }
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
  // TODO: this code is shit
  get_problems_at_severity_level(req.params.severity).then(
    (problems: Problem[]) => res.json({ Status: 'OK', problems, count: problems.length }),
    () => {
      res.status(500);
      res.json({ Status: 'FAIL' });
    }
  );
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
