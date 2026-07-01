# AI Workflow Design | AI 家庭纪念影像助手 MVP

## 1. 设计目标

本项目中的 AI Workflow 主要承担“需求理解与任务转译”的作用。用户输入通常是模糊的，例如“希望更清楚一点”“保留年代感”“不要太假”。因此，系统需要将用户的服务选择、需求标签和补充说明转化为可执行的图像处理任务。

## 2. Workflow 总览

当前 v0.1 包含两个 Workflow：

1. 初次处理 Workflow；
2. 二次调整 Workflow。

整体流程为：

用户输入 → Streamlit 收集信息 → Dify 生成任务卡与 Prompt → 外部图像工具半自动处理 → 结果回传 → 用户二次调整 → Dify 生成二次任务卡与 Prompt → 调整结果展示

## 3. 初次处理 Workflow

### 输入字段

| 字段 | 说明 |
|---|---|
| service_type | 用户选择的服务类型，如老照片修复、黑白照片上色、纪念照生成 |
| image_name | 用户上传图片的文件名 |
| selected_options | 用户选择的需求标签，使用中文逗号拼接 |
| custom_requirement | 用户补充说明 |
| authorization_confirmed | 用户是否确认授权 |

### 输出字段

| 字段 | 说明 |
|---|---|
| task_card | 面向后续处理环节的任务卡，说明处理目标、重点、限制和注意事项 |
| generated_prompt | 面向图像工具的图像处理 Prompt |

## 4. 二次调整 Workflow

### 输入字段

| 字段 | 说明 |
|---|---|
| parent_task_card | 初次处理任务卡 |
| original_prompt | 初次图像处理 Prompt |
| issue_tags | 用户选择的问题标签 |
| adjustment_requirement | 用户补充调整说明 |

### 输出字段

| 字段 | 说明 |
|---|---|
| adjustment_task_card | 二次调整任务卡 |
| second_round_prompt | 二次调整图像处理 Prompt |

## 5. 产品价值

AI Workflow 在本项目中承担用户需求与图像处理执行之间的转译层，主要价值包括：

1. 降低普通用户表达图像处理需求的门槛；
2. 将模糊需求转化为可执行任务；
3. 支持半自动图像处理流程；
4. 为后续接入真实图像 API 预留结构化输入与输出；
5. 通过二次调整机制处理 AI 图像结果的不确定性。
