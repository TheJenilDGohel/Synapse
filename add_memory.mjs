import { spawn } from 'child_process';

const server = spawn('./node_modules/.bin/synapse', ['start'], { stdio: ['pipe', 'pipe', 'pipe'] });

server.stdout.on('data', (data) => {
  const messages = data.toString().split('\n').filter(Boolean);
  for (const msg of messages) {
    try {
      const parsed = JSON.parse(msg);
      if (parsed.result) {
        console.log('Result:', JSON.stringify(parsed.result));
        server.kill();
        process.exit(0);
      } else if (parsed.error) {
        console.error('Error:', parsed.error);
        server.kill();
        process.exit(1);
      }
    } catch (e) {
      console.log('Non-JSON:', data.toString());
    }
  }
});

server.stderr.on('data', (data) => {
  // console.error(`stderr: ${data}`);
});

server.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

const req = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "synapse_memory_manage",
    arguments: {
      action: "store",
      content: "This is a memory from the stable version"
    }
  }
};

setTimeout(() => {
    server.stdin.write(JSON.stringify(req) + '\n');
}, 2000);
