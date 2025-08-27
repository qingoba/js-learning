// 本程序的目标是借助 web3.js 库, 与 Present 合约进行交互, 接受礼物


// 1. 初始化 Web3 模块
import Web3 from 'web3'
const RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc"
const web3 = new Web3(RPC_URL); 

// 2. 使用 <合约地址 + 合约 ABI> 构造合约交互实例 (可以认为是 RPC 中的客户端实例)
import presentABI from './Present.abi.js' // assert { type: 'json' };
import { sign } from 'crypto';
const presentAddr = "0x3B3cF7ee8dbCDDd8B8451e38269D982F351ca3db"
const contract = new web3.eth.Contract(presentABI, presentAddr);

// 3. 查询合约中的所有事件, 验证连接
//    Contract.getPastEvents(event[, options][, callback])
const events = await contract.getPastEvents("allEvents", {
    fromBlock: 182490992,
    toBlock: "latest",
}
);
console.log(events);

// 4. 与合约函数交互
//    (1) 先生成一个交易对象 (tx object), 然后调用 call() 或 send() 等
//        交易对象是和函数绑定的, 所以构建交易对象时要传入函数参数
//    (2) 两种形式进行签名, 一种是托管钱包, 把私钥提前添加到 web3.eth.accounts.wallet.add 里
//        另一种是自己签名 (Node 后端常用), 即把交易签名后广播出去
//        这里采用第二种, 到实际项目里估计也是第二种
//    (3) 构造 Raw Tx 对象
//    (4) 签名交易并广播
// const ethAmount = web3.utils.toWei("0.001")
// const recipients = ["0xd0F637b18723279A2D97947dB7647761B08311B5"];
// const content = [{tokens: "0x0000000000000000000000000000000000000000", amounts: ethAmount}];
// const txObject = contract.methods.wrapPresent(recipients, content);
const presentID = "0x6fbfc22e08bf9b8489c1a58e5923d169f41f7cd469524c6918ae0138e1523f95"
const txObject = contract.methods.unwrapPresent(presentID);
const data = txObject.encodeABI();
console.log("Tx Object is", txObject);
console.log("txObject.encodeABI: ", data)
const from = "0xd0F637b18723279A2D97947dB7647761B08311B5"
// const nonce = await web3.eth.getTransactionCount(from, "pending");
const rawTx = {
    to: contract.options.address,
    from: from,
    data: data,
    gas: '2000000',
    // value: ethAmount
};
const signed = await web3.eth.accounts.signTransaction(rawTx, process.env.PRIVATE_KEY);
console.log("singTransaction: ", signed);
const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
console.log("tx mined:", receipt.transactionHash);