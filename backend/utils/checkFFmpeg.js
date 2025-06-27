const ffmpeg = require('fluent-ffmpeg');

// Check if FFmpeg is available
exports.checkFFmpeg = () => {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.error('FFmpeg不可用:', err.message);
        console.log('请确保系统已安装FFmpeg');
        console.log('macOS: brew install ffmpeg');
        console.log('Ubuntu/Debian: sudo apt-get install ffmpeg');
        console.log('Windows: 下载并添加到PATH');
        resolve(false);
      } else {
        console.log('FFmpeg已正确安装');
        resolve(true);
      }
    });
  });
};

// Get FFmpeg version info
exports.getFFmpegInfo = () => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe('-version', (err, metadata) => {
      if (err) {
        resolve({ available: false, error: err.message });
      } else {
        resolve({ available: true, info: metadata });
      }
    });
  });
};