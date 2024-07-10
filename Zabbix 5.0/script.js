/*
 * One Uptime expects webhook calls with the following schema:"

{
    "url": "http://zabbix.mydomain/tr_events.php?triggerid=28617&eventid=28001770",
    "host": "cron.mydomain.com",
    "alert_subject": "/: Disk space is low (used > 80%)",
    "alert_description": "Problem 27802117 started at 02:27:06 on 2024.07.05\r\nHost: node26.nc.mydomain\r\nSeverity: Information",
    "severity": 2
}

 * severity should be the Zabbix severity, mapping to One Uptime severity levels is done inside One Uptime Workflow 
*/



// event_url is an optional extra
const required_input = [
  'SERVER_URL', // deployment of the code in ../server
  'ONE_UPTIME_WORKFLOW_WEBHOOK_URL',

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

  'host',

  'alert_subject',
  'alert_message', // mapped to alert_description

  // Used for mapping (WIP)
  // 'event_name',
  'event_id',
  'trigger_id',
  'trigger_url'
];

var ZabbixOneUptimeBridge = {
  validate: function (params) {
    required_input.forEach(function (key) {
      ZabbixOneUptimeBridge.params = {}
      if (key in params && params[key] != undefined && params[key] !== '') {
        ZabbixOneUptimeBridge.params[key] = params[key];
      } else {
        console.log(params);
        throw 'Missing value for key: ' + key;
      }
    });

    ZabbixOneUptimeBridge.raw_params = params

    ZabbixOneUptimeBridge.params.event_severity = parseInt(ZabbixOneUptimeBridge.params.event_severity);
    ZabbixOneUptimeBridge.params.event_is_problem = parseInt(ZabbixOneUptimeBridge.params.event_is_problem);
    ZabbixOneUptimeBridge.params.event_is_update = parseInt(ZabbixOneUptimeBridge.params.event_is_update);

    if (ZabbixOneUptimeBridge.event_is_problem == 1) {
      if (ZabbixOneUptimeBridge.event_is_update == 0) {
        ZabbixOneUptimeBridge.kind = 'problem';
      } else {
        ZabbixOneUptimeBridge.kind = 'update';
      }
    } else {
      ZabbixOneUptimeBridge.kind = 'recovery';
    }
  },

  forwardToServer: function () {
    const required_fields_to_create_incident = [];
    required_fields_to_create_incident.forEach(function (key) {
      if (!(key in incident)) {
        throw 'Missing value for key: ' + key;
      }
    });

    // const path = '/api/zabbix_webhook';
    var request = new CurlHttpRequest();
    request.AddHeader('Content-Type: application/json');
    var url = ZabbixOneUptimeBridge.raw_params.ONE_UPTIME_WORKFLOW_WEBHOOK_URL;

    console.log('[ZabbixOneUptimeBridge Webhook] new request to: ' + url);

    var blob = request.Post(url, JSON.stringify({ data: ZabbixOneUptimeBridge.raw_params }));

    var resp = JSON.parse(blob);

    if (request.Status() !== 200) {
      console.error(
        '[ZabbixOneUptimeBridge Webhook] Request failed, status ' +
          request.Status() +
          ': ' +
          resp.error
      )
      throw 'Request failed: ' + request.Status() + ' ' + resp.error;
    } else {
      console.log(`[ZabbixOneUptimeBridge Webhook] OneUttime responded: status: ${resp.status}`)
    }
    // console.log('[ZabbixOneUptimeBridge Webhook] created incident with id: ' + incident_id);
  },

};

try {
  var params = JSON.parse(value);
  console.log(params);
  ZabbixOneUptimeBridge.validate(params);
  // if (ZabbixOneUptimeBridge.kind == 'problem') {
    ZabbixOneUptimeBridge.forwardToServer();
  // }
  return 'OK';
} catch (error) {
  console.error('[ZabbixOneUptimeBridge Webhook] Error: ' + error);
  throw 'Sending failed: ' + error;
}
