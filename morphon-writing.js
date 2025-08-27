// 本程序的目标是借助 web3.js 库, 索引最近的代币转账交易

// 0. 我们要使用的是 getPastLogs 函数, 该函数在 web3.eth 模块里, 我们需要引入该模块
//    如何引入模块?
//    参考 https://web3js.readthedocs.io/en/v1.10.0/getting-started.html
//    参考 https://liaoxuefeng.com/books/javascript/nodejs/module/index.html
//    使用 const web3 = new Web3("ws://localhost:8545") 得到的是一个什么?
//    在 JS 中所有皆对象, 其应该也是对象, web3.eth 应该是对象的一个属性
//    const 关键字是作何? 用 const 声明的对象不能再修改
//    web3 其实是一个类的实例, Web3 是一个类, new Web3 调用 Web3 的构造函数返回一个实例
//    关于类的部分, 我觉得有必要看 https://liaoxuefeng.com/books/javascript/oop/index.html
//
//    关于导入模块, 还需要知道 ECMAScript Modules 和 CommonJS Module
//    前者使用 import 导入, 后者使用 require, 前者是新标准, 推荐使用

// const Web3 = require("web3")
import Web3 from 'web3'

// 应该用 const 还是 let?
let FORK_URL = "https://eth-mainnet.g.alchemy.com/v2/xCiveK4PE1ixtwHhQfZmy1NLIDRdVTRG"
const web3 = new Web3(FORK_URL)     // 下面的所有包都用这个 URl 除了 bzz

// 1. 现在我们已经有 web3 这么一个客户端了, 可以来获取日志了
//    获取日志就要调用函数, 该函数的签名为 web3.eth.getPastLogs(options [, callback])
//    其中 options 表示必须参数, [] 内的是可选参数, 这里的可选参数是一个回调函数, 说明该函数是一个异步函数
//    
//    调用异步函数有几种方式: 
//       (1) 使用 Promise 对象接受一个 future  
//       (2) 传入回调函数,执行结束后自动回调
//       (3) 使用 await 以同步方式执行异步代码
//    展开:
//      (1) 如果用 let promise = web3.eth.getPastLogs() 接受, 那么想拿到 future 中的结果, 必须用
//          .then(lambda), 然后 lambada 的参数是最后的结果, 写起来非常不优雅
//      (3) 使用 let result = await web3.eth.getPastLogs(), 函数执行后可以直接拿到结果存进 result
//    
//    关于函数调用的语法:
//      不能使用 key=value 的形式传参
//      可以使用 {k1=v1, k2=v2} 参数包传参, 自动解构
//
//    关于 Topics:
//      topics 是按顺序存放的索引字段, 方便在链上快速过滤日志
//      以 event Transfer(address indexed from, address indexed to, uint256 value) 为例子
//      编译后：
//          topic[0] → 事件签名的 Keccak256 哈希, 即 keccak256("Transfer(address,address,uint256)")
//          topic[1] → from 的 32 字节编码（因为它 indexed）
//          topic[2] → to 的 32 字节编码 (因为它 indexed)
//          data → value 的编码（没被 indexed）
//
let curBlockNum = await web3.eth.getBlockNumber();
let morphonContractAddr = "0x58D97B57BB95320F9a05dC918Aef65434969c2B2"
let transferEventTopic = web3.utils.keccak256("Transfer(address,address,uint256)");
let events = await web3.eth.getPastLogs(
    // 参数包
    // JS 里对象的属性本质是字符串, 所以 key 加不加引号是等价的.
    // 我们这里想要找到的是转账日志, 所以用 ERC20 的转账函数, keccak256("Transfer(address,address,uint256)")
    // 其他字段不加限制, 其中 web3.utils.keccak256(string | BN | Buffer) 可以算函数的哈希值,
    {
        "fromBlock": curBlockNum - 400,
        "toBlock": curBlockNum,
        address: morphonContractAddr,
        topics: [transferEventTopic],
    }
)

console.log(events)


//  2. 已经成功获取了日志, events 的每个项都是一个对象 (结构体), 包含很多属性
//     但是我们要获取的是一个时间范围内所有的日志, 所以要循环获取, 范围以时间戳记录
///    也就是说, 我们要设置一个 startTimestamp, 从 curBlockNum 开始往前找到第一个大于等于 startTimepStamp 的那个区块
//     值得注意的是, 同一个区块里的所有交易时间戳是相同的, 因此我们只需要关注区块的时间戳
//
//     使用循环结构实现批量前溯查询
//     getPastLogs 拿到的区块是按时间戳升序排列的, 最早的那个区块就是 event[1]
//     从前端拿到时间范围
let timeRange = 7 * 24 * 60 * 60;
let curBlockTs = Math.floor(Date.now() / 1000)
let startTimestamp =  curBlockTs - timeRange;

for (events = []; curBlockTs > startTimestamp; )
{
    let items =  await web3.eth.getPastLogs(
        {
            "fromBlock": curBlockNum - 500 + 1,
            "toBlock": curBlockNum,
            address: morphonContractAddr,
            topics: [transferEventTopic],
        }
    );
    items.reverse();
    events.push(...items);         // 按时间降序存放

    console.log(`Got ${items.length} txs, Total ${events.length} txs`);
    
    curBlockNum = curBlockNum - 500;
    if (items.length > 0) curBlockTs = items[0].blockTimestamp;
}

// 3. 对 events 剔除尾部超出时间范围的交易
while (events.at(-1).blockTimestamp < startTimestamp)
{
    events.pop();
}

console.log(events);
console.log(`Total ${events.length} txs`);

// 4. 从 event 中解析出转账金额, 然后把转账金额直接添加在 event 的属性上
//    解析数据使用 web3.eth.abi.decodeLog(inputs, hexString, topics)
for (let i = 0; i < events.length; i++)
{
    let decodeData = web3.eth.abi.decodeLog([
        {type: 'address', name: 'from', indexed: true},
        {type: 'address', name: 'to', indexed: true},
        {type: 'uint256', name: 'value', indexed: false},
    ], events[i].data, [events[i].topics[1], events[i].topics[2]]);

    events[i].from = decodeData.from;
    events[i].to = decodeData.to;
    events[i].value = decodeData.value / 10**18;     // 拿到的数量除以 1e18 是真实的代币数量
    // 值得注意的是, value 如果不加处理, 输出是以字符串形式, 而做了除法之后, 就自动变成了 Number 类型
}

//  5. 接下来以 value 进行排序, 然后取前 50 个
events.sort(function(e1, e2) {return e2.value - e1.value});
console.log(events.slice(0, 10))


//  6. 已经拿到前 50 个交易了, 可以获取交易详情
//     对于代币转账来说, 交易详情可以使用 web3.eth.getTransaction(transactionHash [, callback])
//     对于我们的礼物来说, 应该使用合约的接口来获取详情?
//     
//     在旧版本的 JS 中, 变量可以不声明直接使用, 默认挂在全局作用域
//     现代 JS, 使用 use strict 模式, 变量必须声明再使用, 声明可以用 var/let/const, 其中 var 不推荐使用
//     ESLint的建议: 默认用 const, 需要重赋值时改成 let. 即非必要不使用 let, 优先使用 const
let txDetail = await web3.eth.getTransaction(events.at(0).transactionHash);
console.log(txDetail);

//  7. 后续应该做的: 如何直接用 JS 调用链上自定义合约的函数
//     要使用 ABI, 经过 RPC Provider 来调用, 让 Cursor 写一个看看




