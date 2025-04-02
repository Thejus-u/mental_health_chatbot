
import React, { useState, useEffect } from 'react';

const gridSize = 10; // Size of the grid (10x10)

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
  ]);
  const [direction, setDirection] = useState<string>('RIGHT');
  const [food, setFood] = useState<{ x: number; y: number }>({ x: 5, y: 5 });
  const [gameOver, setGameOver] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && direction !== 'DOWN') setDirection('UP');
      if (e.key === 'ArrowDown' && direction !== 'UP') setDirection('DOWN');
      if (e.key === 'ArrowLeft' && direction !== 'RIGHT') setDirection('LEFT');
      if (e.key === 'ArrowRight' && direction !== 'LEFT') setDirection('RIGHT');
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [direction]);

  useEffect(() => {
    if (gameOver) return;

    const gameInterval = setInterval(() => {
      const newSnake = [...snake];
      const head = { ...newSnake[0] };

      if (direction === 'UP') head.y -= 1;
      if (direction === 'DOWN') head.y += 1;
      if (direction === 'LEFT') head.x -= 1;
      if (direction === 'RIGHT') head.x += 1;

      newSnake.unshift(head);
      
      if (head.x === food.x && head.y === food.y) {
        setFood({
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize),
        });
      } else {
        newSnake.pop();
      }

      if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= gridSize ||
        head.y >= gridSize ||
        newSnake.slice(1).some(segment => segment.x === head.x && segment.y === head.y)
      ) {
        setGameOver(true);
        clearInterval(gameInterval);
      } else {
        setSnake(newSnake);
      }
    }, 200);

    return () => clearInterval(gameInterval);
  }, [snake, direction, food, gameOver]);

  const renderGrid = () => {
    const grid = [];
    for (let i = 0; i < gridSize; i++) {
      const row = [];
      for (let j = 0; j < gridSize; j++) {
        const isSnake = snake.some(segment => segment.x === j && segment.y === i);
        const isFood = food.x === j && food.y === i;
        row.push(
          <div
            key={`${i}-${j}`}
            style={{
              width: '30px',
              height: '30px',
              backgroundColor: isSnake ? 'green' : isFood ? 'red' : 'lightgray',
              border: '1px solid #ccc',
            }}
          />
        );
      }
      grid.push(
        <div key={i} style={{ display: 'flex' }}>
          {row}
        </div>
      );
    }
    return grid;
  };

  return (
    <div>
      <h1>Snake Game</h1>
      {gameOver ? <p>Game Over!</p> : <p>Score: {snake.length - 3}</p>}
      <div style={{ display: 'inline-block', border: '1px solid black' }}>
        {renderGrid()}
      </div>
    </div>
  );
};

export default SnakeGame;
