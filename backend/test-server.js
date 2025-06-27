// 简单的服务器测试脚本
const http = require('http');

const testEndpoint = (path, callback) => {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: path,
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`\n测试 ${path}:`);
      console.log(`状态码: ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        console.log('响应:', JSON.stringify(json, null, 2));
        callback(null, json);
      } catch (e) {
        console.log('响应:', data);
        callback(e);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`\n❌ 测试 ${path} 失败:`, error.message);
    callback(error);
  });

  req.end();
};

console.log('🧪 开始测试服务器...\n');
console.log('请确保服务器正在运行 (npm run dev)');

// 测试根路径
setTimeout(() => {
  testEndpoint('/', (err) => {
    if (!err) {
      // 测试健康检查
      setTimeout(() => {
        testEndpoint('/api/health', (err) => {
          if (!err) {
            // 测试数据库健康检查
            setTimeout(() => {
              testEndpoint('/api/health/db', (err) => {
                if (!err) {
                  console.log('\n✅ 所有测试通过！');
                }
              });
            }, 1000);
          }
        });
      }, 1000);
    }
  });
}, 1000);