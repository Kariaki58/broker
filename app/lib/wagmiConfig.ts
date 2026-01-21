import { http, createConfig } from 'wagmi';
import { bsc, mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [bsc, mainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [bsc.id]: http(),
    [mainnet.id]: http(),
  },
});
