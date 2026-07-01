# 微信小程序

这是“AI 家庭纪念影像助手”的微信小程序端。

小程序主流程覆盖服务选择、照片上传、需求补充、处理中状态、结果查看、二次调整和保存结果。当前已接入微信云开发与 Dify Workflow；图像结果为 mock 示例图。

## 打开方式

使用微信开发者工具打开当前目录：

```text
miniprogram/
```

需要使用正式小程序 AppID，并在本地配置微信云开发环境。小程序私有配置和 AppSecret 不应提交到仓库。

## 云函数

需要部署以下云函数：

```text
createTask
saveTaskResult
runDifyPlan
runDifyAdjustment
```

`runDifyPlan` 和 `runDifyAdjustment` 需要在云函数环境变量中配置 Dify API Key 和 Workflow URL。

## 说明

- 用户从相册选择的原图会上传到云存储。
- 任务与二次调整记录写入云数据库。
- Dify Workflow 输出任务卡和图像处理 Prompt。
- 真实图像处理 API 为后续扩展项。
