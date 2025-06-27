#!/bin/bash

echo "🚀 启动课堂笔记系统测试环境..."

# 启动后端服务器
echo "📦 启动后端服务器..."
cd backend
npm run dev &
BACKEND_PID=$!

# 等待后端启动
echo "⏳ 等待后端服务器启动..."
sleep 3

# 启动前端
echo "🎨 启动前端应用..."
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "✅ 系统已启动!"
echo "   后端: http://localhost:3001"
echo "   前端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获退出信号
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM

# 保持脚本运行
wait