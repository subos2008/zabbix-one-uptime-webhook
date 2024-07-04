# Zabbix to One Uptime Bridge Server

This recieves simple webhook events from Zabbix using the Media Type defined in [../Zabbix 5.0]. 

When it gets an event it contains the EVENT.ID. We can then call back into Zabbix via it's API
and inspect the event in more detail.

Test with

```bash
export SERVER_URL=....
curl ${SERVER_URL}/api/zabbix_webhook -X POST -d '{"foo":"bar"}' -H "Content-Type: application/json"
```
