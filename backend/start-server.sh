#!/bin/bash

echo "🚀 启动后端服务器..."
cd /Users/annanyang/Downloads/Prototype\ and\ test/Class\ notebook/class-notebook/backend

# 确保没有其他进程占用端口
echo "检查端口3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# 启动服务器
echo "启动Node.js服务器..."
node server.js