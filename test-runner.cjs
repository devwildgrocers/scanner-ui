const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const phaseArg = process.argv[2];
let args = ['jest', '--verbose'];

if (phaseArg && phaseArg.startsWith('p')) {
  // 🔍 Check if the requested phases actually exist in the test file
  const testFilePath = path.join(__dirname, 'src/components/features/WarehouseFlow.test.tsx');
  if (fs.existsSync(testFilePath)) {
    const content = fs.readFileSync(testFilePath, 'utf8');
    const requested = phaseArg.split(',');
    
    for (const p of requested) {
      if (!content.includes(`.includes('${p}')`) && !content.includes(`.includes("${p}")`)) {
        console.error(`\n❌ [ERROR] Phase '${p}' does not exist in your Frontend WarehouseFlow suite.`);
        console.error(`👉 Available phases in that file: p1, p2, p3\n`);
        process.exit(1);
      }
    }
  }

  args.push('WarehouseFlow');
  console.log(`\n🎯 [Frontend] Targeted Test Run: ${phaseArg}...\n`);
} else {
  console.log(`\n🚀 [Frontend] Full System Test Run...\n`);
}

const jest = spawn('npx', args, {
  stdio: 'inherit',
  env: {
    ...process.env,
    PHASE: phaseArg || ''
  }
});

jest.on('exit', (code) => {
  process.exit(code);
});
