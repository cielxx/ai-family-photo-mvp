# 微信小程序云开发 MVP 说明

## 1. 当前阶段

当前小程序已从本地 mock 原型升级为“微信小程序 + 云开发 + Dify Workflow”的轻量 MVP。

这一阶段的重点不是自动完成图像修复，而是跑通任务系统和 AI 需求转译链路：

```text
用户上传照片
-> 云存储保存原图
-> 云数据库创建任务
-> Dify 生成任务卡和 Prompt
-> mock 图像结果展示
-> 用户提交二次调整
-> Dify 生成二次调整任务卡和 Prompt
-> 保存结果状态
```

当前图像结果仍使用本地 mock 示例图。真实图像处理 API 可在后续接入时替换 mock 结果生成部分。

## 2. 架构

```text
微信小程序
-> 微信云开发
   -> 云存储：保存用户上传原图
   -> 云数据库：保存任务与调整记录
   -> 云函数：调用 Dify Workflow
-> Dify Workflow
   -> 初次任务卡 / Prompt
   -> 二次调整任务卡 / Prompt
-> mock 图像结果
```

## 3. 小程序主流程

1. 首页
   - 进入产品主流程。

2. 服务选择
   - 选择老照片修复、黑白照片上色或纪念照生成。

3. 上传与需求
   - 选择照片。
   - 选择需求标签。
   - 填写补充说明。
   - 确认授权。

4. 创建任务
   - 真实相册照片上传到云存储。
   - 调用 `createTask` 创建 `tasks` 记录。

5. 初次处理
   - 调用 `runDifyPlan`。
   - 写入 `taskCard`、`generatedPrompt`、`workflowRunId` 和 `difyRawResponse`。
   - 图像结果暂使用 mock 示例图。

6. 初次结果
   - 展示原图和 mock 效果图。
   - 支持保存结果。
   - 支持二次调整。

7. 二次调整
   - 选择问题标签。
   - 填写补充调整说明。
   - 调用 `runDifyAdjustment`。
   - 写入 `adjustments` 记录和主任务二次调整字段。

8. 最终结果
   - 展示原图和 mock 最终结果。
   - 保存结果后调用 `saveTaskResult`。

## 4. 云函数

### `createTask`

职责：

- 创建 `tasks` 任务记录。
- 保存服务类型、服务名称、原图地址、用户需求、授权状态等字段。
- 记录 `createdAt`、`uploadedAt` 和 `updatedAt`。

说明：

- 如果用户使用本地示例图，则不上传云存储，`originalFileID` 为空。
- 如果用户从相册选择真实图片，则前端先上传到云存储，再将 `fileID` 写入任务记录。

### `runDifyPlan`

职责：

- 根据 `taskId` 读取 `tasks` 记录。
- 将小程序任务字段转换为 Dify 初次 Workflow 入参。
- 调用 Dify 初次 Workflow。
- 写回初次任务卡、Prompt、Workflow 运行 ID 和原始响应。

写入字段：

```text
status
taskCard
generatedPrompt
workflowRunId
difyRawResponse
difyInputs
difyErrorMessage
updatedAt
```

### `runDifyAdjustment`

职责：

- 根据 `taskId` 读取主任务。
- 创建 `adjustments` 记录。
- 使用初次任务卡、初次 Prompt、用户反馈标签和补充说明调用 Dify 二次调整 Workflow。
- 写回二次调整任务卡、二次 Prompt 和 Workflow 运行 ID。

写入 `adjustments` 的字段：

```text
taskId
openid
status
issueTags
adjustmentRequirement
parentTaskCard
originalPrompt
adjustmentTaskCard
secondRoundPrompt
workflowRunId
difyRawResponse
difyErrorMessage
resultSource
createdAt
updatedAt
```

同步写入 `tasks` 的字段：

```text
adjustmentId
issueTags
adjustmentRequirement
adjustmentTaskCard
secondRoundPrompt
adjustmentWorkflowRunId
adjustmentRawResponse
adjustmentErrorMessage
updatedAt
```

### `saveTaskResult`

职责：

- 记录用户保存结果的动作。
- 更新任务状态和保存时间。

写入字段：

```text
status: "saved"
savedAt
savedBy
savedResultType
updatedAt
```

## 5. 数据结构

### `tasks`

`tasks` 集合记录一次主任务。

核心字段：

```json
{
  "openid": "user_openid",
  "serviceType": "black_white_colorization",
  "serviceName": "黑白照片上色",
  "status": "saved",
  "originalFileID": "cloud://...",
  "originalImageUrl": "cloud://...",
  "resultImageUrl": "/assets/mock/color_after.jpg",
  "adjustedImageUrl": "/assets/mock/color_after.jpg",
  "resultSource": "mock",
  "selectedOptions": ["自然肤色", "保留光影"],
  "customRequirement": "希望颜色自然一点",
  "authorizationConfirmed": true,
  "validationStatus": "pass",
  "validationMessage": "照片已通过基础检查，可继续补充处理需求",
  "taskCard": "Dify 生成的初次任务卡",
  "generatedPrompt": "Dify 生成的初次 Prompt",
  "workflowRunId": "Dify 初次 Workflow 运行 ID",
  "difyRawResponse": {},
  "adjustmentId": "adjustment record id",
  "issueTags": ["人脸修得不像了", "皮肤太平滑"],
  "adjustmentRequirement": "希望更像本人，皮肤保留自然纹理",
  "adjustmentTaskCard": "Dify 生成的二次调整任务卡",
  "secondRoundPrompt": "Dify 生成的二次调整 Prompt",
  "adjustmentWorkflowRunId": "Dify 二次 Workflow 运行 ID",
  "adjustmentRawResponse": {},
  "createdAt": "server date",
  "uploadedAt": "server date",
  "updatedAt": "server date",
  "completedAt": "client mock completion date",
  "savedAt": "server date"
}
```

### `adjustments`

`adjustments` 集合记录二次调整请求。

核心字段：

```json
{
  "taskId": "task record id",
  "openid": "user_openid",
  "status": "planned",
  "issueTags": ["人脸修得不像了", "皮肤太平滑"],
  "adjustmentRequirement": "希望更像本人，皮肤保留自然纹理",
  "parentTaskCard": "初次任务卡",
  "originalPrompt": "初次 Prompt",
  "adjustmentTaskCard": "二次调整任务卡",
  "secondRoundPrompt": "二次调整 Prompt",
  "workflowRunId": "Dify 二次 Workflow 运行 ID",
  "difyRawResponse": {},
  "difyErrorMessage": "",
  "resultSource": "mock",
  "createdAt": "server date",
  "updatedAt": "server date",
  "completedAt": null
}
```

## 6. Dify Workflow

### 初次处理 Workflow

输入：

```json
{
  "service_type": "colorization",
  "image_name": "example.jpg",
  "selected_options": "自然肤色，保留光影",
  "custom_requirement": "希望颜色自然一点",
  "authorization_confirmed": "true"
}
```

输出：

```json
{
  "task_card": "初次处理任务卡",
  "generated_prompt": "初次图像处理 Prompt"
}
```

服务 ID 映射：

```text
old_photo_restoration -> old_photo_restoration
black_white_colorization -> colorization
memorial_portrait -> portrait_generation
```

### 二次调整 Workflow

输入：

```json
{
  "parent_task_card": "初次处理任务卡",
  "original_prompt": "初次图像处理 Prompt",
  "issue_tags": "人脸修得不像了，皮肤太平滑",
  "adjustment_requirement": "希望更像本人，皮肤保留自然纹理"
}
```

输出：

```json
{
  "adjustment_task_card": "二次调整任务卡",
  "second_round_prompt": "二次调整图像处理 Prompt"
}
```

## 7. 当前边界

- 未接入真实图像处理 API。
- 图像结果仍使用本地 mock 示例图。
- 暂不包含支付、订单和后台管理台。
- 暂不包含历史任务页面。
- 暂不支持多轮无限调整。
- Dify Workflow 输出主要用于任务规划和后续图像处理指令生成，不直接生成最终图像。

## 8. 后续接入真实图像 API

后续接入真实图像 API 时，可替换当前 mock 图像结果生成部分：

```text
generatedPrompt / secondRoundPrompt
-> 图像处理 API
-> 结果图上传云存储
-> 更新 resultImageUrl / adjustedImageUrl
-> 更新任务状态
```

建议新增字段：

```text
imageApiProvider
imageApiJobId
imageApiRawResponse
processingStartedAt
processingCompletedAt
failureReason
retryCount
costEstimate
```

## 9. 安全与隐私

- Dify API Key 只配置在云函数环境变量中。
- 小程序 AppSecret 不进入仓库。
- `project.private.config.json` 保持本地忽略。
- 真实用户照片不进入仓库。
- 公开截图时避免展示 API Key、用户隐私照片和敏感 raw response。
