const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('CampusConnect Chat Module Server is Running ✅');
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));