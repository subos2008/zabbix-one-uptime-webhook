// NB, you can use console.log, warn, error in Zabbix code. c.f. https://www.zabbix.com/documentation/current/en/manual/config/items/preprocessing/javascript/javascript_objects

/****************************************************************************** */
/* Debug for when running on local machine: */
/****************************************************************************** */
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const value = JSON.stringify({
  ONE_UPTIME_URL: process.env.ONE_UPTIME_URL,
  ONE_UPTIME_API_KEY: process.env.ONE_UPTIME_API_KEY,
  ONE_UPTIME_PROJECT_ID: process.env.ONE_UPTIME_PROJECT_ID,
  event_is_problem: 1,
  event_is_update: 0,
  event_severity: 1,
});
const { execSync } = require('child_process');

// Code from GPT, not reviewed
// function CurlHttpRequest(url, options = {}) {
//   // Helper function to build the curl command with options
//   const buildCurlCommand = (opts) => {
//     let cmd = `curl -s -X ${opts.method || 'GET'}`;
//     if (opts.headers) {
//       for (const [key, value] of Object.entries(opts.headers)) {
//         cmd += ` -H "${key}: ${value}"`;
//       }
//     }
//     if (opts.data) {
//       cmd += ` -d '${JSON.stringify(opts.data)}'`;
//     }
//     if (opts.proxy) {
//       cmd += ` --proxy ${opts.proxy}`;
//     }
//     if (opts.auth) {
//       cmd += ` -u '${opts.auth.username}:${opts.auth.password}'`;
//     }
//     cmd += ` ${url}`;
//     return cmd;
//   }

//   // Execute the curl command and return the response
//   const response = execSync(buildCurlCommand(options)).toString();
//   const statusCode = parseInt(execSync('curl -o /dev/null -w %{http_code} ' + buildCurlCommand(options)));

//   // Return an object with similar structure to CurlHttpRequest
//   return {
//     status() {
//       return statusCode;
//     },
//     responseText() {
//       return response;
//     },
//   };
// }

// Example usage
const httpRequest = CurlHttpRequest('https://www.example.com', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  data: {
    message: 'Hello, world!',
  },
});

console.log(httpRequest.status()); // Output: The status code of the request
console.log(httpRequest.responseText()); // Output: The response body as a string

/****************************************************************************** */
/* End of local dev code */
/****************************************************************************** */

// event_url is an optional extra
const required_input = [
  'ONE_UPTIME_URL',
  'ONE_UPTIME_API_KEY',
  'ONE_UPTIME_PROJECT_ID',

  // Event severity values:
  // 0: Not classified
  // 1: Information
  // 2: Warning
  // 3: Average
  // 4: High
  // 5: Disaster
  'event_severity',

  // See logic below, these are either 0 or 1
  'event_is_problem',
  'event_is_update',

  // Used for mapping (WIP)
  'event_name',
  'event_id'
];

// WIP development consts
const zabbix_trigger_id = '1';
const one_uptime_test_monitor_id = '8580c68b-a5b7-41fa-a925-46f498bc954a';

// Maps Zabbix trigger id's to their associated OneUptime monitor id
const monitor_map = {
  zabbix_trigger_id: one_uptime_test_monitor_id,
};

var OneUptime = {
  validate: function (params) {
    required_input.forEach(function (key) {
      if (key in params && params[key] != undefined && params[key] !== '') {
        OneUptime[key] = params[key];
      } else {
        console.log(params);
        throw 'Missing value for key: ' + key;
      }
    });

    OneUptime.event_severity = parseInt(OneUptime.event_severity);
    OneUptime.event_is_problem = parseInt(OneUptime.event_is_problem);
    OneUptime.event_is_update = parseInt(OneUptime.event_is_update);

    if (
      typeof params.event_url === 'string' &&
      params.event_url.trim() !== ''
    ) {
      OneUptime.event_url = params.event_url;
    }

    if (OneUptime.event_is_problem == 1) {
      if (OneUptime.event_is_update == 0) {
        OneUptime.kind = 'problem';
      } else {
        OneUptime.kind = 'update';
      }
    } else {
      OneUptime.kind = 'recovery';
    }
  },

  createIncident: function (incident) {
    const required_fields_to_create_incident = [];
    required_fields_to_create_incident.forEach(function (key) {
      if (!(key in incident)) {
        throw 'Missing value for key: ' + key;
      }
    });

    const path = '/api/incident';
    var request = new CurlHttpRequest();
    request.AddHeader('Content-Type: application/json');
    // https://oneuptime.com/reference/authentication
    request.AddHeader('Authorization: Bearer ' + OneUptime.ONE_UPTIME_API_KEY);
    request.AddHeader('ProjectID: ' + OneUptime.ONE_UPTIME_PROJECT_ID);

    var url = OneUptime.ONE_UPTIME_URL + path;

    console.log('[OneUptime Webhook] new request to: ' + url);

    // Note `data:` is added here
    var blob = request.Post(url, JSON.stringify({ data: incident }));

    var resp = JSON.parse(blob);

    if (request.Status() !== 200) {
      if (request.Status() == 403) {
        throw '403 creating incident';
      }

      console.error(
        '[OneUptime Webhook] Request failed, status ' +
          request.Status() +
          ': ' +
          resp.error
      );
      throw 'Request failed: ' + request.Status() + ' ' + resp.error;
    }
    const incident_id = resp['_id'];
    console.log('[OneUptime Webhook] created incident with id: ' + incident_id);
  },

  mapZabbixEventToIncident: function (zabbix_event) {
    throw new Error(`mapZabbixEventToIncident not implemented.`);
  },
};

try {
  var params = JSON.parse(value);
  console.log(params);
  OneUptime.validate(params);
  if (OneUptime.kind == 'problem') {
    const incident = OneUptime.mapZabbixEventToIncident(params);
    OneUptime.createIncident(incident);
  }
  return 'OK';
} catch (error) {
  console.error('[OneUptime Webhook] Error: ' + error);
  throw 'Sending failed: ' + error;
}
