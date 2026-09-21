# Global Drive 新能源汽车海外销售英语实训系统

本地可运行并适配腾讯云 EdgeOne Makers 的课程系统。部署后，AI 评分通过同源 Cloud Function 安全调用讯飞星火。

## 已实现

- 需求解码器：案例文本拖拽分类、讯飞星火实时评价与本地备用评价
- 交流互动台：浏览器英文语音、听辨勾选、待追问选择与AI客户模拟回复
- 交付保障处：浏览器录音、回听、生成任务凭证
- 学习档案：浏览器本地存储本机练习记录

## 本地运行

直接用浏览器打开 `index.html` 时，评分会自动使用本地备用规则。录音功能需要在 Chrome 或 Edge 中允许麦克风权限。

## EdgeOne Makers 部署

1. 在 EdgeOne Makers 创建并关联 Git 仓库项目，或创建“直接上传”项目并上传本目录。
2. 在项目的生产环境变量中配置：
   - `XFYUN_API_KEY`：讯飞控制台生成的 API Key。
   - `XFYUN_MODEL`：`spark-x2.5-1.7b`。
   - `XFYUN_API_URL`：`https://maas-api.cn-huabei-1.xf-yun.com/v2/chat/completions`。
3. 重新部署后，浏览器会通过 `/api/evaluate` 使用讯飞星火实时评分。函数位于 `cloud-functions/api/evaluate.js`，密钥仅在服务端读取。

不要把真实 API Key 写入 `.env.example`、`app.js`、HTML 或任何准备上传的文件。

## 后续可迭代

1. 将交流互动台的预设客户回复替换为实时 AI 对话。
2. 接入正式英文 TTS 与语音识别、发音评分服务。
3. 对接学习通作业入口或自建后端，保存学生与班级过程数据。
4. 增加教师端案例库、任务发布与数据看板。
