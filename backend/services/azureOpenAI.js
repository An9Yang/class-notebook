const { AzureOpenAI } = require('openai');

class AzureOpenAIService {
  constructor() {
    this.apiKey = process.env.AZURE_OPENAI_KEY;
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';
    
    // 确保endpoint格式正确
    if (this.endpoint && this.endpoint.endsWith('/')) {
      this.endpoint = this.endpoint.slice(0, -1);
    }
    
    if (!this.apiKey || !this.endpoint) {
      console.warn('Azure OpenAI服务未配置');
      this.client = null;
    } else {
      console.log('Azure OpenAI配置:', {
        endpoint: this.endpoint,
        deployment: this.deploymentName,
        hasKey: !!this.apiKey
      });
      
      // 初始化客户端
      this.client = new AzureOpenAI({
        endpoint: this.endpoint,
        apiKey: this.apiKey,
        deployment: this.deploymentName,
        apiVersion: '2024-12-01-preview',
        timeout: 120000 // 120秒超时
      });
    }
  }

  /**
   * 创建聊天完成请求
   */
  async createChatCompletion(messages, options = {}) {
    if (!this.client) {
      throw new Error('Azure OpenAI服务未配置');
    }

    // 添加重试逻辑
    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        // o3模型的特殊处理
        const params = {
          messages,
          model: this.deploymentName,
          max_completion_tokens: options.max_tokens || (this.deploymentName === 'o3' ? 10000 : 1000)
        };
        
        // o3模型只支持默认参数
        if (this.deploymentName !== 'o3') {
          params.temperature = options.temperature || 0.7;
          params.top_p = options.top_p || 0.95;
          params.frequency_penalty = options.frequency_penalty || 0;
          params.presence_penalty = options.presence_penalty || 0;
        }
        
        console.log(`发送请求到${this.deploymentName}模型...`);
        const startTime = Date.now();
        
        const response = await this.client.chat.completions.create(params);
        
        const duration = Date.now() - startTime;
        console.log(`${this.deploymentName}模型响应时间: ${duration}ms`);

        if (response?.error !== undefined && response.status !== "200") {
          throw response.error;
        }
        
        console.log(`响应内容: ${response.choices[0]?.message?.content?.substring(0, 100) || '(空)'}`);

        return response;
      } catch (error) {
        lastError = error;
        console.log(`尝试 ${i + 1}/3 失败:`, error.message);
        
        if (error.status !== 503 && error.status !== 429) {
          throw error; // 非暂时性错误，直接抛出
        }
        
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1))); // 等待2秒、4秒
        }
      }
    }
    
    // 处理最终错误
    console.error('Azure OpenAI API错误详情:', lastError);
    
    if (lastError.status === 503) {
      throw new Error('AI服务暂时不可用，请稍后再试');
    }
    
    throw new Error(`AI服务调用失败: ${lastError.message}`);
  }

  /**
   * 基于课堂内容回答问题
   */
  async answerQuestion(question, context, options = {}) {
    const systemPrompt = `你是一个专业的学习助手，基于提供的课堂内容回答学生的问题。

规则：
1. 只根据提供的课堂内容回答，不要使用外部知识
2. 如果课堂内容中没有相关信息，明确说明"根据当前课堂内容，没有找到相关信息"
3. 回答要准确、清晰、有条理
4. 适当引用原文内容
5. 使用中文回答

课堂内容：
${context}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ];

    const response = await this.createChatCompletion(messages, {
      temperature: 0.3, // 降低温度以获得更准确的答案
      max_tokens: 1500,
      ...options
    });

    return response.choices[0].message.content;
  }

  /**
   * 生成课堂总结
   */
  async generateSummary(content, options = {}) {
    const systemPrompt = `你是一个专业的学习助手，请为以下课堂内容生成一个结构化的总结。

要求：
1. 提取关键知识点
2. 保持原始信息的准确性
3. 使用清晰的层级结构
4. 突出重要概念和定义
5. 使用中文`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请总结以下课堂内容：\n\n${content}` }
    ];

    const response = await this.createChatCompletion(messages, {
      temperature: 0.5,
      max_tokens: 2000,
      ...options
    });

    return response.choices[0].message.content;
  }

  /**
   * 生成复习问题
   */
  async generateQuizQuestions(content, options = {}) {
    const systemPrompt = `你是一个专业的学习助手，请基于课堂内容生成复习问题。

要求：
1. 生成5-10个问题
2. 问题要覆盖主要知识点
3. 包含不同难度的问题
4. 每个问题都要有明确的答案依据
5. 使用中文

输出格式：
问题1：xxx
答案：xxx
依据：xxx（引用原文）

问题2：xxx
...`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `基于以下内容生成复习问题：\n\n${content}` }
    ];

    const response = await this.createChatCompletion(messages, {
      temperature: 0.7,
      max_tokens: 3000,
      ...options
    });

    return response.choices[0].message.content;
  }

  /**
   * 增强OCR识别结果
   */
  async enhanceOCRResult(ocrText, options = {}) {
    const systemPrompt = `分析OCR文本并提取表格。

如果文本包含表格数据，返回JSON格式：
{
  "tables": [表格数组],
  "text": "非表格文本"
}

表格格式：三维数组 [[[单元格]]]
示例：[[["名称","值"],["A","1"],["B","2"]]]

如果没有表格，返回：
{
  "tables": [],
  "text": "所有文本"
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请处理以下OCR识别的文本：\n\n${ocrText}` }
    ];

    try {
      const response = await this.createChatCompletion(messages, {
        temperature: 0.1, // 非常低的温度，确保输出稳定
        max_tokens: 4000,
        ...options
      });

      const content = response.choices[0].message.content;
      
      // 尝试解析JSON响应
      try {
        const parsed = JSON.parse(content);
        return {
          text: parsed.text || ocrText,
          tables: parsed.tables || []
        };
      } catch (parseError) {
        // 如果不是JSON格式，返回原始文本
        console.log('AI返回非JSON格式，使用纯文本');
        return {
          text: content || ocrText,
          tables: []
        };
      }
    } catch (error) {
      console.error('AI增强OCR失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证服务配置
   */
  validateConfig() {
    return !!(this.apiKey && this.endpoint && this.client);
  }
}

// 创建单例
const azureOpenAI = new AzureOpenAIService();

module.exports = {
  azureOpenAI,
  AzureOpenAIService
};