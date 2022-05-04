# Bridgel - Bridge for EVM Chains
This is a bridge to transfer tokens between EVM based blockchains. You can charge a fee for bridging transactions in this tool.

![image](https://user-images.githubusercontent.com/47295517/166823397-3ef746e9-3707-458c-85c0-a5c2987c3024.png)

## How to install?
1. Fork this repository.
2. Run `npm install` command to install libraries.
3. Edit **config.js** (see below) file.
4. Start the app by `node app.js` command.

## How to edit config file?
First of all, you need to deploy Bridge contract (`contracts/bridge.sol`) to all blockchains you will serve. After that, open `config.js` file and set the bridge contract address for all chains. You can add or remove chains by editing the array. ([image](https://user-images.githubusercontent.com/47295517/166824983-e56f9691-fc3f-4058-9c6a-06fd83c4efed.png))

In the second step, you should define the tokens. Set the token address for all chains. ([image](https://user-images.githubusercontent.com/47295517/166825531-f9995a0f-d363-4497-9f26-ce6a64f4655e.png))

Edit `pairs` array to set allowed pairs for swapping. You can edit `feeMultiplier` if you want to set transaction fee. ([image](https://user-images.githubusercontent.com/47295517/166826079-680729ac-97ac-44d5-956b-6954a7c9ec22.png))

Lastly, you should enter the private key of (bridge contract) deployer address. Always there should be some funds in that account to cover network fees.
