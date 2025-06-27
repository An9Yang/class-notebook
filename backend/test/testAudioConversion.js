const { convertToWav, getAudioInfo, cleanupTempFile } = require('../services/audioConverter');
const { transcribeAudioEnhanced } = require('../services/azureSpeechEnhanced');
const path = require('path');
const fs = require('fs');

// 测试音频转换功能
async function testAudioConversion() {
  console.log('=== 测试音频转换功能 ===\n');
  
  // 测试文件路径（你需要提供一个实际的WebM文件路径）
  const testWebMFile = path.join(__dirname, '..', 'uploads', 'recordings', 'test.webm');
  
  if (!fs.existsSync(testWebMFile)) {
    console.log('请在 uploads/recordings/ 目录下放置一个 test.webm 文件进行测试');
    return;
  }
  
  try {
    // 1. 获取原始文件信息
    console.log('1. 获取原始文件信息...');
    const originalInfo = await getAudioInfo(testWebMFile);
    console.log('原始文件信息:', originalInfo);
    console.log();
    
    // 2. 转换为WAV
    console.log('2. 转换WebM到WAV...');
    const wavFile = await convertToWav(testWebMFile);
    console.log('转换成功，输出文件:', wavFile);
    console.log();
    
    // 3. 获取转换后文件信息
    console.log('3. 获取转换后文件信息...');
    const convertedInfo = await getAudioInfo(wavFile);
    console.log('转换后文件信息:', convertedInfo);
    console.log();
    
    // 4. 测试转写（如果Azure配置可用）
    if (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
      console.log('4. 测试Azure语音转写...');
      try {
        const transcript = await transcribeAudioEnhanced(testWebMFile);
        console.log('转写结果:', transcript);
      } catch (error) {
        console.error('转写失败:', error.message);
      }
    } else {
      console.log('4. 跳过Azure转写测试（未配置）');
    }
    
    // 5. 清理临时文件
    console.log('\n5. 清理临时文件...');
    cleanupTempFile(wavFile);
    console.log('清理完成');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testAudioConversion();