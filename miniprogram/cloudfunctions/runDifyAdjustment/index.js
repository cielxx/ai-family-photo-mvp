const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const taskId = asText(event.taskId);
  if (!taskId) {
    throw new Error("缺少 taskId");
  }

  await ensureCollection("adjustments");

  const taskResult = await db.collection("tasks").doc(taskId).get();
  const task = taskResult.data;
  if (!task) {
    throw new Error("任务不存在");
  }

  const issueTags = asList(event.issueTags);
  const adjustmentRequirement = asText(event.adjustmentRequirement);
  if (!issueTags.length && !adjustmentRequirement) {
    throw new Error("请至少选择一个问题标签或填写调整说明");
  }

  const apiKey = asText(process.env.DIFY_ADJUSTMENT_API_KEY);
  const workflowUrl = asText(process.env.DIFY_ADJUSTMENT_WORKFLOW_URL);
  if (!apiKey || !workflowUrl) {
    const adjustmentId = await createAdjustmentRecord({
      task,
      taskId,
      issueTags,
      adjustmentRequirement,
      status: "dify_unconfigured",
      errorMessage: "Dify 二次调整 Workflow 尚未配置"
    });
    await markTaskAdjustmentFailed(taskId, "Dify 二次调整 Workflow 尚未配置");
    return {
      taskId,
      adjustmentId,
      status: "dify_unconfigured",
      errorMessage: "Dify 二次调整 Workflow 尚未配置"
    };
  }

  const inputs = buildDifyInputs({
    task,
    issueTags,
    adjustmentRequirement
  });
  const adjustmentId = await createAdjustmentRecord({
    task,
    taskId,
    issueTags,
    adjustmentRequirement,
    status: "planning",
    inputs
  });

  await db.collection("tasks").doc(taskId).update({
    data: {
      status: "adjusting",
      issueTags,
      adjustmentRequirement,
      updatedAt: db.serverDate()
    }
  });

  try {
    const responseJson = await callDifyWorkflow({
      apiKey,
      workflowUrl,
      inputs,
      user: task.openid || "miniprogram-user"
    });
    const parsed = parseDifyAdjustmentResponse(responseJson);

    await db.collection("adjustments").doc(adjustmentId).update({
      data: {
        status: "planned",
        adjustmentTaskCard: parsed.adjustmentTaskCard,
        secondRoundPrompt: parsed.secondRoundPrompt,
        workflowRunId: parsed.workflowRunId,
        difyRawResponse: responseJson,
        difyErrorMessage: "",
        updatedAt: db.serverDate()
      }
    });

    await db.collection("tasks").doc(taskId).update({
      data: {
        status: "adjustment_planned",
        adjustmentId,
        issueTags,
        adjustmentRequirement,
        adjustmentTaskCard: parsed.adjustmentTaskCard,
        secondRoundPrompt: parsed.secondRoundPrompt,
        adjustmentWorkflowRunId: parsed.workflowRunId,
        adjustmentRawResponse: responseJson,
        adjustmentErrorMessage: "",
        updatedAt: db.serverDate()
      }
    });

    return {
      taskId,
      adjustmentId,
      status: "adjustment_planned",
      adjustmentTaskCard: parsed.adjustmentTaskCard,
      secondRoundPrompt: parsed.secondRoundPrompt,
      workflowRunId: parsed.workflowRunId
    };
  } catch (error) {
    const errorMessage = error && error.message ? error.message : "Dify 二次调整 Workflow 调用失败";
    await db.collection("adjustments").doc(adjustmentId).update({
      data: {
        status: "dify_failed",
        difyErrorMessage: errorMessage,
        updatedAt: db.serverDate()
      }
    });
    await markTaskAdjustmentFailed(taskId, errorMessage);
    return {
      taskId,
      adjustmentId,
      status: "dify_failed",
      errorMessage
    };
  }
};

function buildDifyInputs({ task, issueTags, adjustmentRequirement }) {
  return {
    parent_task_card: asText(task.taskCard),
    original_prompt: asText(task.generatedPrompt),
    issue_tags: issueTags.join("，"),
    adjustment_requirement: adjustmentRequirement
  };
}

async function createAdjustmentRecord({
  task,
  taskId,
  issueTags,
  adjustmentRequirement,
  status,
  inputs,
  errorMessage
}) {
  const result = await db.collection("adjustments").add({
    data: {
      taskId,
      openid: task.openid || "",
      status,
      issueTags,
      adjustmentRequirement,
      parentTaskCard: asText(task.taskCard),
      originalPrompt: asText(task.generatedPrompt),
      difyInputs: inputs || {},
      adjustmentTaskCard: "",
      secondRoundPrompt: "",
      workflowRunId: "",
      difyRawResponse: {},
      difyErrorMessage: errorMessage || "",
      resultSource: "mock",
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
      completedAt: null
    }
  });

  return result._id;
}

async function callDifyWorkflow({ apiKey, workflowUrl, inputs, user }) {
  const response = await postJson(workflowUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    data: {
      inputs,
      response_mode: "blocking",
      user
    }
  });

  const responseText = response.body;
  let responseJson = {};
  try {
    responseJson = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    throw new Error(`Dify 返回内容无法解析：${responseText.slice(0, 120)}`);
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    const message = responseJson.message || responseJson.error || responseText;
    throw new Error(`Dify 请求失败：${response.statusCode} ${message}`);
  }

  return responseJson;
}

function postJson(url, { headers, data }) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify(data);
    const requestUrl = new URL(url);
    const request = https.request({
      method: "POST",
      hostname: requestUrl.hostname,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(requestBody)
      },
      timeout: 60000
    }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode || 0,
          body
        });
      });
    });

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy(new Error("Dify 请求超时"));
    });
    request.write(requestBody);
    request.end();
  });
}

function parseDifyAdjustmentResponse(responseJson) {
  return {
    adjustmentTaskCard: asText(firstValue(
      responseJson,
      ["data", "outputs", "adjustment_task_card"],
      ["outputs", "adjustment_task_card"],
      ["adjustment_task_card"]
    )),
    secondRoundPrompt: asText(firstValue(
      responseJson,
      ["data", "outputs", "second_round_prompt"],
      ["outputs", "second_round_prompt"],
      ["second_round_prompt"]
    )),
    workflowRunId: asText(firstValue(
      responseJson,
      ["workflow_run_id"],
      ["data", "workflow_run_id"]
    ))
  };
}

function firstValue(payload, ...paths) {
  for (const path of paths) {
    let value = payload;
    for (const key of path) {
      if (!value || typeof value !== "object" || !(key in value)) {
        value = undefined;
        break;
      }
      value = value[key];
    }
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return "";
}

async function markTaskAdjustmentFailed(taskId, errorMessage) {
  await db.collection("tasks").doc(taskId).update({
    data: {
      status: "adjusting",
      adjustmentErrorMessage: errorMessage,
      updatedAt: db.serverDate()
    }
  });
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (error) {
    // Existing collections throw on some SDK versions; creating the adjustment can continue.
  }
}

function asText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function asList(value) {
  return Array.isArray(value) ? value.map(asText).filter(Boolean) : [];
}
