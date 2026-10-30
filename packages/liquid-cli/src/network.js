import os from 'node:os';

/**
 * Get local and network accessible URLs.
 * Works seamlessly in Linux, Termux, Codespaces, and macOS.
 */
export function getNetworkUrls(port = 3000, host = 'localhost') {
  const isWildcard = host === '0.0.0.0' || host === '::' || host === '';
  const localHost = isWildcard ? 'localhost' : host;
  const localUrl = `http://${localHost}:${port}/`;

  const networkUrls = [];
  if (isWildcard || host === '0.0.0.0') {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          networkUrls.push(`http://${iface.address}:${port}/`);
        }
      }
    }
  }

  return {
    localUrl,
    networkUrls
  };
}

export function printServerUrls({ port, host, protocol = 'http' }) {
  const { localUrl, networkUrls } = getNetworkUrls(port, host);
  console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36m${localUrl}\x1b[0m`);
  for (const netUrl of networkUrls) {
    console.log(`  \x1b[32m➜\x1b[0m  \x1b[1mNetwork:\x1b[0m \x1b[36m${netUrl}\x1b[0m`);
  }
  console.log('');
}
