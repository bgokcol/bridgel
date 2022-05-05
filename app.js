const express = require('express');
const Web3 = require('web3');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const config = require('./config.js');
const i18n = require('./i18n.js');

const app = express();
const port = config.app.port;
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS "deposits" ("id"	INTEGER, "from_chain"	INTEGER, "to_chain"	INTEGER, "token"	TEXT, "amount"	INTEGER, "sender"	TEXT, "receiver"	TEXT, "created_at"	INTEGER, "txhash"	TEXT)');
});

const ABI = {
  BRIDGE: JSON.parse(fs.readFileSync('abi/bridge.json', 'utf-8')),
  ERC20: JSON.parse(fs.readFileSync('abi/erc20.json', 'utf-8'))
};

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.json());

function toFloat(number, decimals) {
  return number / 10 ** decimals;
}

function toPlainString(num) {
  return ('' + +num).replace(/(-?)(\d*)\.?(\d*)e([+-]\d+)/,
    function (a, b, c, d, e) {
      return e < 0
        ? b + '0.' + Array(1 - e - c.length).join(0) + c + d
        : b + c + d + Array(e - d.length + 1).join(0);
    });
}

async function db_all(query, params = []) {
  return new Promise(function (resolve, reject) {
    db.all(query, params, function (err, rows) {
      if (err) { return reject(err); }
      resolve(rows);
    });
  });
}

async function db_run(query, params = []) {
  return new Promise(function (resolve, reject) {
    db.run(query, params, function (err) {
      if (err) { return reject(err); }
      resolve();
    });
  });
}

app.get('/', (req, res) => {
  res.render('index', { config, i18n })
});

app.get('/api/cron', async (req, res) => {
  let row = await db_all('SELECT * from deposits WHERE txhash = "" ORDER by created_at ASC LIMIT 1');
  if (row.length > 0) {
    row = row[0];
    await db_run('UPDATE deposits SET txhash = ? WHERE id = ? AND from_chain = ?', ['-', row.id, row.from_chain]);
    let amount = row.amount - (row.amount * config.feeMultiplier);
    amount = toPlainString(amount);
    let to_chain = config.chains.find(e => e.id == row.to_chain);
    let token = config.tokens.find(e => e.id == row.token);
    if(typeof to_chain !== 'undefined' && typeof token !== 'undefined') {
      let web3 = new Web3(to_chain.rpc);
      let account = web3.eth.accounts.privateKeyToAccount(config.privateKey);
      let bridge = new web3.eth.Contract(ABI.BRIDGE, to_chain.contract);
      let tx = {
        from: account.address,
        to: web3.utils.toChecksumAddress(to_chain.contract),
        data: bridge.methods.withdraw(token.address[to_chain.id], amount, row.receiver).encodeABI(),
        gas: 2000000,
        gasPrice: to_chain.gasPrice,
        nonce: (await web3.eth.getTransactionCount(account.address, 'pending'))
      };
      let signedTx = await web3.eth.accounts.signTransaction(tx, config.privateKey);
      let sended = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      await db_run('UPDATE deposits SET txhash = ? WHERE id = ? AND from_chain = ?', [sended.transactionHash, row.id, row.from_chain]);
    }
  }
  res.send(JSON.stringify({
    error: null
  }));
});

app.post('/api/deposits', async (req, res) => {
  if (typeof req.body === 'undefined' || typeof req.body.account !== 'string') {
    res.send(JSON.stringify({
      error: 'invalidData'
    }));
    return;
  }
  let web3 = new Web3();
  if (web3.utils.isAddress(req.body.account.toLowerCase())) {
    let rows = await db_all('SELECT * from deposits WHERE sender = ? ORDER by created_at DESC', [req.body.account.toLowerCase()]);
    res.send(JSON.stringify({
      error: null,
      data: rows
    }));
  }
  else {
    res.send(JSON.stringify({
      error: 'invalidAccount'
    }));
  }
});

app.post('/api/deposit', async (req, res) => {
  if (typeof req.body === 'undefined' || typeof req.body.id === 'undefined' || typeof req.body.chain === 'undefined') {
    res.send(JSON.stringify({
      error: 'invalidData'
    }));
    return;
  }
  let depositId = parseInt(req.body.id);
  let chainId = parseInt(req.body.chain);
  let from = config.chains.find(e => e.id == chainId);
  if (typeof from !== 'undefined') {
    let rows = await db_all('SELECT id FROM deposits WHERE id = ? AND from_chain = ?', [depositId, chainId]);
    if (rows.length == 0) {
      let web3 = new Web3(from.rpc);
      let bridge = new web3.eth.Contract(ABI.BRIDGE, from.contract);
      let deposit = await bridge.methods.get(depositId).call();
      if (deposit.timestamp != '0') {
        if (config.pairs.includes(from.id + '-' + deposit.chain)) {
          let tokenItem = config.tokens.find(e => e.address[from.id].toLowerCase() == deposit.token.toLowerCase());
          if (typeof tokenItem !== 'undefined') {
            await db_run('INSERT into deposits (id, from_chain, to_chain, token, amount, sender, receiver, created_at, txhash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [depositId, from.id, deposit.chain, tokenItem.id, deposit.amount, deposit.sender.toLowerCase(), deposit.receiver.toLowerCase(), deposit.timestamp, ''])
            res.send(JSON.stringify({
              error: null
            }));
          }
          else {
            res.send(JSON.stringify({
              error: 'invalidToken'
            }));
          }
        }
        else {
          res.send(JSON.stringify({
            error: 'invalidPair'
          }));
        }
      }
      else {
        res.send(JSON.stringify({
          error: 'invalidDepositId'
        }));
      }
    }
    else {
      res.send(JSON.stringify({
        error: 'alreadyExists'
      }));
    }
  }
  else {
    res.send(JSON.stringify({
      error: 'invalidChain'
    }));
  }
});

app.post('/api/validate', async (req, res) => {
  if (typeof req.body === 'undefined' || typeof req.body.account !== 'string' || typeof req.body.from === 'undefined' || typeof req.body.to === 'undefined' || typeof req.body.token === 'undefined' || typeof req.body.amount === 'undefined') {
    res.send(JSON.stringify({
      error: 'invalidData'
    }));
    return;
  }
  let account = req.body.account;
  let from = parseInt(req.body.from);
  let to = parseInt(req.body.to);
  let amount = parseFloat(parseFloat(req.body.amount).toFixed(5));
  let tokenId = parseInt(req.body.token);
  let web3 = new Web3();
  if (web3.utils.isAddress(account.toLowerCase())) {
    if (config.pairs.includes(from + '-' + to)) {
      if (typeof config.tokens[tokenId] !== 'undefined') {
        let token = config.tokens[tokenId];
        if (typeof token !== 'undefined') {
          if (amount >= token.min) {
            if (amount <= token.max) {
              let fromChain = config.chains.find(e => e.id == from);
              let toChain = config.chains.find(e => e.id == to);
              web3 = new Web3(fromChain.rpc);
              let tokenContract = new web3.eth.Contract(ABI.ERC20, token.address[from]);
              let balance = await tokenContract.methods.balanceOf(account).call();
              balance = toFloat(balance, token.decimals);
              if (amount <= balance) {
                web3 = new Web3(toChain.rpc);
                tokenContract = new web3.eth.Contract(ABI.ERC20, token.address[to]);
                balance = await tokenContract.methods.balanceOf(toChain.contract).call();
                balance = toFloat(balance, token.decimals);
                if (amount <= balance) {
                  res.send(JSON.stringify({
                    error: null,
                    amount: amount
                  }));
                }
                else {
                  res.send(JSON.stringify({
                    error: 'errorAmount'
                  }));
                }
              }
              else {
                res.send(JSON.stringify({
                  error: 'errorBalance'
                }));
              }
            }
            else {
              res.send(JSON.stringify({
                error: 'errorMax'
              }));
            }
          }
          else {
            res.send(JSON.stringify({
              error: 'errorMin'
            }));
          }
        }
        else {
          res.send(JSON.stringify({
            error: 'invalidToken'
          }));
        }
      }
      else {
        res.send(JSON.stringify({
          error: 'invalidAccount'
        }));
      }
    }
    else {
      res.send(JSON.stringify({
        error: 'invalidPair'
      }));
    }
  }
  else {
    res.send(JSON.stringify({
      error: 'invalidAccount'
    }));
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`)
});