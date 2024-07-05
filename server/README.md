# Zabbix to One Uptime Bridge Server

This recieves simple webhook events from Zabbix using the Media Type defined in [../Zabbix 5.0.] see [../README/md](../README.md) for an overview of the project. 

When it gets an event it contains the EVENT.ID. We can then call back into Zabbix via it's API
and inspect the event in more detail.

# Install and Setup

See the Dockerfile as the main way to execute this code.

To run in locally for development, run:

```bash
yarn install
yarn start
```

Test with

```bash
export SERVER_URL=....
curl ${SERVER_URL}/api/zabbix_webhook -X POST -d '{"foo":"bar"}' -H "Content-Type: application/json"
```
