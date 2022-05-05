const Toast = Swal.mixin({
    toast: true,
    position: 'bottom',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    var $ = document.querySelector.bind(document);
    var $$ = document.querySelectorAll.bind(document);
    var currentAccount = null;
    var web3 = null;

    var token = $('[name=token]');
    var amount = $('[name=amount]');
    var connect = $('#connect');
    var connectText = connect.innerHTML;
    var bridge = $('#bridge');
    var bridgeText = bridge.innerHTML;
    var bridgePair = null;
    var balanceText = $('#tokenBalance').innerText;

    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        var accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            await connectAccount();
        }
        window.ethereum.on('accountsChanged', function (accounts) {
            if (accounts.length > 0) {
                currentAccount = accounts[0];
            }
            else {
                currentAccount = null;
            }
            handleAccount();
        });
    }

    async function handleAccount() {
        connect.querySelector('span').style.width = connect.querySelector('span').offsetWidth + 'px';
        if (currentAccount != null) {
            connect.querySelector('span').innerText = currentAccount;
        }
        else {
            connect.innerHTML = connectText;
        }
        token.dispatchEvent(new Event('change'));
        loadTransactions();
        setInterval(loadTransactions, 10000);
    }

    async function loadTransactions() {
        let res = await fetch('./api/deposits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                account: currentAccount
            })
        }).then(e => e.json());
        let template = $('.txTemplate').cloneNode(true);
        template.classList.remove('d-none');
        $('#transactions').innerHTML = '';
        if (res.data.length > 0) {
            res.data.reverse();
            for (let i = 0; i < res.data.length; i++) {
                let item = res.data[i];
                let temp = template.cloneNode(true);
                item.from_chain = getChain(item.from_chain);
                item.to_chain = getChain(item.to_chain);
                item.token = token.querySelector('option[data-id="' + item.token + '"]');
                if (typeof item.from_chain !== 'undefined' && typeof item.to_chain !== 'undefined' && item.token != null) {
                    item.token = {
                        symbol: item.token.getAttribute('data-symbol'),
                        decimals: parseInt(item.token.getAttribute('data-decimals'))
                    };
                    temp.querySelector('.from-img').src += item.from_chain.logo;
                    temp.querySelector('.from-img').alt = item.from_chain.name;
                    temp.querySelector('.from').innerText = item.from_chain.name;
                    temp.querySelector('.to-img').src += item.to_chain.logo;
                    temp.querySelector('.to-img').alt = item.to_chain.name;
                    temp.querySelector('.to').innerText = item.to_chain.name;
                    temp.querySelector('.amount').innerText = toFloat(item.amount, item.token.decimals).toFixed(5) + ' ' + item.token.symbol;
                    temp.querySelector('.time').innerText = (new Date(item.created_at * 1000)).toLocaleString();
                    if (item.txhash == '' || item.txhash == '-') {
                        temp.querySelector('.completed').classList.add('d-none');
                    }
                    else {
                        temp.querySelector('.completed').href = item.to_chain.explorer + item.txhash;
                        temp.querySelector('.completed span').innerText += ' (' + item.txhash.substr(0, 7) + '...)';
                        temp.querySelector('.processing').classList.add('d-none');
                    }
                    $('#transactions').prepend(temp);
                }
            }
            $('#noTransaction').classList.add('d-none');
            $('#transactions').classList.remove('d-none');

        }
        else {
            $('#transactions').classList.add('d-none');
            $('#noTransaction').classList.remove('d-none');
        }
    }

    async function connectAccount() {
        if (window.ethereum) {
            try {
                let accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length > 0) {
                    currentAccount = accounts[0];
                    await handleAccount();
                }
                else {
                    Toast.fire({
                        icon: 'error',
                        title: i18n.errorWallet
                    });
                }
            } catch (e) {
                Toast.fire({
                    icon: 'error',
                    title: e.message
                });
            }
        }
        else {
            Toast.fire({
                icon: 'error',
                title: i18n.errorWallet
            });
        }
    }

    function getChain(id) {
        return chains.find(e => e.id == id);
    }

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

    function toWei(number, decimals) {
        return toPlainString(number * 10 ** decimals).split('.')[0];
    }

    function pairChanged(from, to) {
        bridgePair = [from, to];
        if (from == to || !pairs.includes(from + '-' + to)) {
            bridge.disabled = true;
            bridge.querySelector('span').innerText = i18n.unsupportedPair;
            $('#tokenBalance').innerText = balanceText;
        }
        else {
            bridge.disabled = false;
            bridge.innerHTML = bridgeText;
            token.dispatchEvent(new Event('change'));
        }
    }

    $$('[name=to], [name=from]').forEach(e => {
        e.addEventListener('change', () => {
            pairChanged(parseInt($('[name=from]:checked').value), parseInt($('[name=to]:checked').value));
        });
    });

    connect.addEventListener('click', () => {
        connectAccount();
    });

    token.addEventListener('change', async () => {
        let selected = token.querySelector('option[value="' + token.value + '"]');
        $('#tokenSymbol').innerText = selected.getAttribute('data-symbol');
        let _balance = 0;
        if (currentAccount != null) {
            let decimals = selected.getAttribute('data-decimals');
            let chain = getChain(bridgePair[0]);
            let address = tokens[token.value][chain.id];
            let _web3 = new Web3(chain.rpc);
            let _token = new _web3.eth.Contract(ERC20_ABI, address);
            _balance = toFloat(await _token.methods.balanceOf(currentAccount).call(), decimals);
        }
        $('#tokenBalance').innerText = _balance.toFixed(5);
    });

    bridge.addEventListener('click', async () => {
        bridge.style.width = window.getComputedStyle(bridge).width;
        bridge.innerHTML = '<i class="fas fa-spin fa-spinner"></i>';
        bridge.disabled = true;

        if (currentAccount != null) {
            let chainId = await web3.eth.net.getId();
            if (chainId == bridgePair[0]) {
                let res = await fetch('./api/validate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        account: currentAccount,
                        from: bridgePair[0],
                        to: bridgePair[1],
                        token: parseInt(token.value),
                        amount: parseFloat(amount.value)
                    })
                }).then(e => e.json());
                if (res.error == null) {
                    let chain = getChain(bridgePair[0]);
                    let tokenAddress = tokens[parseInt(token.value)][bridgePair[0]];
                    let tokenDecimals = token.querySelector('option[value="' + token.value + '"]').getAttribute('data-decimals');
                    let _token = new web3.eth.Contract(ERC20_ABI, tokenAddress);
                    let approval = await _token.methods.allowance(currentAccount, chain.contract).call();
                    let approved = false;
                    if (approval == 0) {
                        try {
                            await _token.methods.approve(chain.contract, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').send({
                                from: currentAccount
                            });
                            approved = true;
                        }
                        catch (e) {
                            Toast.fire({
                                icon: 'error',
                                title: e.message
                            });
                        }
                    }
                    if (approval != 0 || approved) {
                        let bridge = new web3.eth.Contract(BRIDGE_ABI, chain.contract);
                        try {
                            let deposit = await bridge.methods.deposit(tokenAddress, toWei(res.amount, tokenDecimals), bridgePair[1], currentAccount).send({
                                from: currentAccount
                            });
                            let depositId = deposit.events.TokenDeposit.returnValues._depositId;
                            res = {
                                error: true
                            };
                            try {
                                res = await fetch('./api/deposit', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        id: depositId,
                                        chain: bridgePair[0]
                                    })
                                }).then(e => e.json());
                            }
                            catch (e) {

                            }
                            if (res.error != null) {
                                let again = setInterval(async () => {
                                    res = {
                                        error: true
                                    };
                                    try {
                                        res = await fetch('./api/deposit', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json'
                                            },
                                            body: JSON.stringify({
                                                id: depositId,
                                                chain: bridgePair[0]
                                            })
                                        }).then(e => e.json());
                                    }
                                    catch (e) {

                                    }
                                    if (res.error == null) {
                                        clearInterval(again);
                                        loadTransactions();
                                    }
                                }, 5000);
                            }
                            Toast.fire({
                                icon: 'success',
                                title: i18n.depositSuccessful
                            });
                            token.dispatchEvent(new Event('change'));
                            loadTransactions();
                        }
                        catch (e) {
                            Toast.fire({
                                icon: 'error',
                                title: e.message
                            });
                        }
                    }
                }
                else {
                    Toast.fire({
                        icon: 'error',
                        title: i18n[res.error]
                    });
                }
            }
            else {
                let chainName = $('[name="from"][value="' + bridgePair[0] + '"]').getAttribute('data-name');
                Toast.fire({
                    icon: 'error',
                    title: i18n.errorChain.replace('{chain}', chainName)
                });
            }
        }
        else {
            Toast.fire({
                icon: 'error',
                title: i18n.errorConnect
            });
        }

        bridge.style.width = 'auto';
        bridge.disabled = false;
        bridge.innerHTML = bridgeText;
    });

    $('.balance').addEventListener('click', () => {
        amount.value = $('#tokenBalance').innerText;
    });

    [$('[name=to]'), token].forEach(e => {
        e.dispatchEvent(new Event('change'));
    });
});