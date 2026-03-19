const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/data/advertiser-details.json', 'utf8'));
if (!Array.isArray(data)) {
  const arr = Object.values(data);
  console.log('Converted object to array with', arr.length, 'entries');
  console.log('First:', arr[0].name, '| Last:', arr[arr.length - 1].name);
  fs.writeFileSync('public/data/advertiser-details.json', JSON.stringify(arr));
} else {
  console.log('Already an array with', data.length, 'entries');
}
