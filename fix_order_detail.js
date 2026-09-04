const fs = require('fs');
let code = fs.readFileSync('src/components/ClientOrderDetail.tsx', 'utf-8');

// Stop squishing by making it xl:flex-row
code = code.replace(/className="flex flex-col lg:flex-row flex-1 overflow-hidden lg:overflow-visible/g,
    'className="flex flex-col xl:flex-row flex-1 overflow-hidden xl:overflow-visible');

// Change grid columns to be more responsive to the xl breakpoint
code = code.replace(/className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6"/g,
    'className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6"');

// Fix chat sidebar width and sticky behavior for xl
code = code.replace(/className="w-full lg:w-\[380px\] bg-white border border-gray-300 rounded shadow-sm flex flex-col shrink-0 mt-4 lg:mt-0 h-\[500px\] lg:h-\[calc\(100vh-140px\)\] static lg:sticky lg:top-36 overflow-hidden"/g,
    'className="w-full xl:w-[420px] bg-white border border-gray-300 rounded shadow-sm flex flex-col shrink-0 mt-4 xl:mt-0 min-h-[600px] xl:h-auto static xl:sticky xl:top-[120px] overflow-hidden"');

// Replace break-all with break-words or truncate
code = code.replace(/className="font-semibold break-all"/g, 'className="font-semibold truncate block max-w-full" title={user?.email || "-"}');

fs.writeFileSync('src/components/ClientOrderDetail.tsx', code);
