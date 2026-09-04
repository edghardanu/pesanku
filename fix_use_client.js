const fs = require('fs');

let c = fs.readFileSync('src/components/ClientBuyerOrders.tsx', 'utf-8');
let lines = c.split(/\r?\n/);

if (lines[0].includes('import ClientOrderDetail') && lines[1].includes('"use client"')) {
    const tmp = lines[0];
    lines[0] = lines[1];
    lines[1] = tmp;
    fs.writeFileSync('src/components/ClientBuyerOrders.tsx', lines.join('\n'));
    console.log('Swapped!');
} else {
    console.log('Not at top');
    console.log(lines[0]);
    console.log(lines[1]);
}
