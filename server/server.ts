#!./node_modules/.bin/ts-node

// dependencies: express, typescript

import express from 'express';

const app = express();
const port = process.env.PORT || 3168;

app.use(express.json());

app.post('/zabbix_webhook', (req, res) => {
  // Handle the webhook data from Zabbix
  const data = req.body;
  console.log('Received Zabbix webhook data:', data);

  // Perform any actions based on the webhook data (e.g., send notifications, store data)

  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
