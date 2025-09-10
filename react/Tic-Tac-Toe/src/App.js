import { useState } from "react";

export default function Game() {
  const [history, setHistory] = useState([Array(9).fill(null)])
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentSquares = history[currentIndex];   // 每次重新渲染后, 该数据也会更新
  const xIsNext = currentIndex % 2 === 0;

  function handlePlay(nextSquares) {
    const nextHistory = [...history.slice(0, currentIndex + 1), nextSquares];
    setHistory(nextHistory);
    setCurrentIndex(nextHistory.length - 1);
  }

  function jumpTo(index) {
    setCurrentIndex(index);
  }

  // 这里将数组转换成 React 元素数组, 也就是说 JS 数据结构可以存储标签!
  // 注意 map 的完整签名是 (element, index, array), 这里用了两个参数
  // squares 代表元素, index 代表索引
  const moves = history.map((squares, index) => {
    let description;
    if (index > 0) {
      description = 'Go to move #' + index;
    } else {
      description = 'Go to game start';
    }
    // 应该为 <li> 标签设置 key 属性, 否则 React 会报错.
    return (
      <li key={index}>
        <button onClick={() => jumpTo(index)}>{description}</button>
      </li>
    )
  });

  return (
    <div className="game">
      <div className="game-board">
        <Board xIsNext={xIsNext} squares={currentSquares} onPlay={handlePlay} />
      </div>
      <div className="game-info">
        <ol>{moves}</ol>
      </div>
    </div>
  )
}

// Board 组件完全由传入的 Props 控制
function Board({ xIsNext, squares, onPlay }) {
  function handleClick(i) {
    // 两点:
    // 1. 已经填写的位置不能修改
    // 2. 由于 handleClick 是一个函数闭包, 因此已经自带了 xIsNext 和 squares
    //    并不需要显式的再将其传递给子组件 squares, handleClick 本身已经包含了所有信息!
    //    这一点非常关键, 因为你总是想着, Squares 里要显示什么需要一个状态来判断, 而你并
    //    没有把传递给它, 实际上, 闭包已经做好了所有的事情.
    if (squares[i] || calculateWinner(squares)) return;   

    const nextSquares = squares.slice();
    if (xIsNext) nextSquares[i] = "X";
    else nextSquares[i] = "O";
    
    onPlay(nextSquares);    // 通过传进来的 onPlay 回调父组件里的状态更新方法

    console.log(`clicked on ${i}`);
  }
  
  // 检测是否获胜, 并增加一些组件
  const winner = calculateWinner(squares);
  let status;
  if (winner) {
    status = "Winner: " + winner;
  } else {
    status = 'Next player: ' + (xIsNext ? 'X' : 'O');
  }

  return (
    <>
      <div className="status">{status}</div>
      <div className="board-row">
        <Square value={squares[0]} handleClick={ () => handleClick(0) } />
        <Square value={squares[1]} handleClick={ () => handleClick(1) } />
        <Square value={squares[2]} handleClick={ () => handleClick(2) } />
      </div>
      <div className="board-row">
        <Square value={squares[3]} handleClick={ () => handleClick(3) } />
        <Square value={squares[4]} handleClick={ () => handleClick(4) } />
        <Square value={squares[5]} handleClick={ () => handleClick(5) } />
      </div>
      <div className="board-row">
        <Square value={squares[6]} handleClick={ () => handleClick(6) } />
        <Square value={squares[7]} handleClick={ () => handleClick(7) } />
        <Square value={squares[8]} handleClick={ () => handleClick(8) } />
      </div>
    </>
  )
}

function Square({ value, handleClick }) {
  // const [val, setVal] = useState(0);

  // function handleClickNew() {
  //   val = val + 1;  // Assignment to constant variable.
  // }
  return <button className="square" onClick={handleClick}>{value}</button>;
}

// 这个函数做纯计算, 和 React 没什么关系
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}


