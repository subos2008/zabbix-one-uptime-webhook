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

var ZabbixOneUptimeBridgeServer = {
  validate: function (params) {
    required_input.forEach(function (key) {
      ZabbixOneUptimeBridgeServer.params = {}
      if (key in params && params[key] != undefined && params[key] !== '') {
        ZabbixOneUptimeBridgeServer.params[key] = params[key];
      } else {
        console.log(params);
        throw 'Missing value for key: ' + key;
      }
    });

    ZabbixOneUptimeBridgeServer.raw_params = params

    ZabbixOneUptimeBridgeServer.params.event_severity = parseInt(ZabbixOneUptimeBridgeServer.params.event_severity);
    ZabbixOneUptimeBridgeServer.params.event_is_problem = parseInt(ZabbixOneUptimeBridgeServer.params.event_is_problem);
    ZabbixOneUptimeBridgeServer.params.event_is_update = parseInt(ZabbixOneUptimeBridgeServer.params.event_is_update);

    if (ZabbixOneUptimeBridgeServer.event_is_problem == 1) {
      if (ZabbixOneUptimeBridgeServer.event_is_update == 0) {
        ZabbixOneUptimeBridgeServer.kind = 'problem';
      } else {
        ZabbixOneUptimeBridgeServer.kind = 'update';
      }
    } else {
      ZabbixOneUptimeBridgeServer.kind = 'recovery';
    }
  },

  forwardToServer: function () {
    const required_fields_to_create_incident = [];
    required_fields_to_create_incident.forEach(function (key) {
      if (!(key in incident)) {
        throw 'Missing value for key: ' + key;
      }
    });

    const path = '/api/zabbix_webhook';
    var request = new CurlHttpRequest();
    request.AddHeader('Content-Type: application/json');
    var url = ZabbixOneUptimeBridgeServer.raw_params.SERVER_URL + path;

    console.log('[ZabbixOneUptimeBridgeServer Webhook] new request to: ' + url);

    var blob = request.Post(url, JSON.stringify({ data: ZabbixOneUptimeBridgeServer.raw_params }));

    var resp = JSON.parse(blob);

    if (request.Status() !== 200) {
      console.error(
        '[ZabbixOneUptimeBridgeServer Webhook] Request failed, status ' +
          request.Status() +
          ': ' +
          resp.error
      );
      throw 'Request failed: ' + request.Status() + ' ' + resp.error;
    }
    // console.log('[ZabbixOneUptimeBridgeServer Webhook] created incident with id: ' + incident_id);
  },

};

try {
  var params = JSON.parse(value);
  console.log(params);
  ZabbixOneUptimeBridgeServer.validate(params);
  // if (ZabbixOneUptimeBridgeServer.kind == 'problem') {
    ZabbixOneUptimeBridgeServer.forwardToServer();
  // }
  return 'OK';
} catch (error) {
  console.error('[ZabbixOneUptimeBridgeServer Webhook] Error: ' + error);
  throw 'Sending failed: ' + error;
}
