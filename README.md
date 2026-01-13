# CryptoBroker - Mobile Investment Platform

A modern, mobile-first investment broker platform that accepts cryptocurrency payments and enables trading of digital assets.

## Features

- 💳 **Deposit System**: Fund your account by sending cryptocurrency to the Trust Wallet address
- 🔍 **Transaction Monitoring**: Automatic detection of deposits with balance updates
- 📱 **Mobile-First Design**: Optimized for mobile devices with responsive desktop support
- 💰 **Crypto Trading**: Buy and sell cryptocurrencies using your account balance
- 📊 **Portfolio Management**: Track your holdings and portfolio performance
- 📈 **Market Data**: View real-time cryptocurrency market information
- 🎨 **Modern UI**: Beautiful, intuitive interface with dark mode support

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Ethers.js** - Ethereum blockchain interaction
- **Lucide React** - Modern icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A cryptocurrency wallet to send deposits (MetaMask, Trust Wallet, etc.)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
  ├── components/          # Reusable React components
  │   ├── Navigation.tsx   # Mobile/desktop navigation
  │   ├── AccountBalance.tsx # Account balance display
  │   ├── DepositFunds.tsx # Deposit interface with Trust Wallet address
  │   ├── CryptoCard.tsx   # Cryptocurrency display card
  │   ├── PortfolioCard.tsx # Portfolio summary card
  │   └── TradeForm.tsx    # Trading interface
  ├── api/                 # API routes
  │   ├── account/         # Account balance management
  │   ├── deposits/        # Deposit checking and processing
  │   ├── trade/           # Trading operations
  │   ├── markets/         # Market data
  │   └── portfolio/       # Portfolio data
  ├── deposit/             # Deposit page
  ├── trade/               # Trading page
  ├── portfolio/           # Portfolio page
  ├── markets/             # Markets page
  └── page.tsx             # Home page
```

## Features in Detail

### Deposit System
- Fund your account by sending cryptocurrency to the provided Trust Wallet address
- Automatic transaction monitoring and deposit detection
- Real-time balance updates when deposits are confirmed
- Support for ETH, USDT, USDC and other cryptocurrencies
- View deposit status and transaction history

### Trading
- Select from multiple cryptocurrencies
- Buy and sell orders
- Real-time price updates
- Transaction confirmation

### Portfolio
- View all holdings
- Track portfolio value and performance
- 24h change indicators
- Real-time updates

### Markets
- Browse all available cryptocurrencies
- Search functionality
- Price and change indicators
- Market data display

## Mobile-First Design

The application is designed with mobile devices as the primary target:

- Bottom navigation bar on mobile
- Touch-optimized buttons and inputs
- Responsive grid layouts
- Optimized font sizes and spacing
- Smooth animations and transitions

## API Integration

The app includes API routes for:
- Account balance (`/api/account/balance`)
- Deposit checking (`/api/deposits/check`)
- Deposit processing (`/api/deposits/process`)
- Trade execution (`/api/trade`)
- Market data (`/api/markets`)
- Portfolio data (`/api/portfolio`)

**Note**: Currently using mock data and in-memory storage. In production, integrate with:
- Real cryptocurrency APIs (CoinGecko, CoinMarketCap, Binance)
- Blockchain monitoring services (Alchemy, Infura, Moralis)
- Database for user data, balances, and transactions
- User authentication and session management
- Proper transaction matching and user identification

## Environment Variables

Create a `.env.local` file with the following variables:

```
TRUST_WALLET_ADDRESS=your-trust-wallet-address
NEXT_PUBLIC_TRUST_WALLET_ADDRESS=your-trust-wallet-address
RPC_URL=https://eth.llamarpc.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security Considerations

For production deployment:

1. **Transaction Verification**: Verify all deposits on-chain before crediting accounts
2. **User Matching**: Implement secure user-to-deposit matching (memo fields, unique addresses, etc.)
3. **Duplicate Prevention**: Track processed transactions to prevent double-crediting
4. **Rate Limiting**: Add rate limiting to API routes
5. **Input Validation**: Enhanced validation on all inputs
6. **Error Handling**: Comprehensive error handling and logging
7. **Environment Variables**: Store sensitive data in environment variables
8. **HTTPS**: Always use HTTPS in production
9. **Database**: Use a proper database instead of in-memory storage
10. **Authentication**: Implement user authentication and session management
11. **Audit Logs**: Maintain audit logs for all transactions

## Future Enhancements

- [ ] Real-time price feeds from cryptocurrency APIs
- [ ] Advanced charting with historical data
- [ ] Order history and transaction logs
- [ ] Price alerts and notifications
- [ ] Multi-chain support (Polygon, BSC, etc.)
- [ ] Staking and yield farming
- [ ] Social features and sharing
- [ ] Advanced portfolio analytics

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
