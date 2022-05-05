module.exports = {
    app: {
        title: 'Bridgel',
        port: 80
    },
    chains: [
        {
            // EVM chain id: chainlist.org
            id: 80001,
            // Name of the chain
            name: 'Polygon',
            // RPC URL of the chain
            rpc: 'https://rpc-mumbai.maticvigil.com/',
            // Enter deployed (bridge.sol) contract address
            contract: '0x',
            // Block explorer of chain
            explorer: 'https://mumbai.polygonscan.com/tx/',
            // Gas price in WEI | 1 GWEI = 1000000000 WEI
            gasPrice: 2000000000,
            // Logo file name
            logo: 'matic.png'
        },
        {
            id: 1287,
            name: 'Moonbase',
            rpc: 'https://rpc.api.moonbase.moonbeam.network',
            contract: '0x',
            explorer: 'https://moonbase.moonscan.io/tx/',
            gasPrice: 2000000000,
            logo: 'moon.png'
        }
    ],
    tokens: [
        {
            // Unique ID for the token
            id: 'multi-token',
            // Name of the token
            name: 'Multi Token',
            // Symbol of the token
            symbol: 'MULTI',
            // Decimals of the token
            decimals: 18,
            // Minimum amount for swap
            min: 0.001,
            // Maximum amount for swap
            max: 1000000,
            address: {
                // chain id: token address in the chain
                80001: 'polygon token address',
                1287: 'moonbase token address'
            }
        }
    ],
    // allow pairs for bridging. example: '1287-80001' to allow bridging from moonbase to polygon.
    pairs: ['1287-80001','80001-1287'],
    // fee multiplier. enter 0 for feeless transactions. (0.03 = 3% fee)
    feeMultiplier: 0,
    // private key of (bridge.sol) deployer address
    privateKey: ''
}