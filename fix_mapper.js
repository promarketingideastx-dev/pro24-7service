const fs = require('fs');
const filepath = './src/app/[locale]/business/setup/page.tsx';
let data = fs.readFileSync(filepath, 'utf8');

data = data.replace(
    /address: result\.formattedAddress,\n\s*lat: result\.lat,\n\s*lng: result\.lng,/g,
    `address: result.formattedAddress,
                                            displayAddress: result.displayAddress || result.formattedAddress,
                                            plusCode: result.plusCode || '',
                                            lat: result.lat,
                                            lng: result.lng,`
);

fs.writeFileSync(filepath, data, 'utf8');
console.log("Updated mapper");
