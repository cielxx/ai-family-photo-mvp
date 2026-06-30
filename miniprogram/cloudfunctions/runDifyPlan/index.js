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

  const taskResult = await db.collection("tasks").doc(taskId).get();
  const task = taskResult.data;
  if (!task) {
    throw new Error("任务不存在");
  }

  const apiKey = asText(process.env.DIFY_API_KEY);
  const workflowUrl = asText(process.env.DIFY_WORKFLOW_URL);
  if (!apiKey || !workflowUrl) {
    await markDifyFailed(taskId, "Dify Workflow 尚未配置");
    return {
      taskId,
      status: "dify_unconfigured",
      errorMessage: "Dify Workflow 尚未配置"
    };
  }

  const inputs = buildDifyInputs(task);

  await db.collection("tasks").doc(taskId).update({
    data: {
      status: "planning",
      difyInputs: inputs,
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
    const parsed = parseDifyResponse(responseJson);

    await db.collection("tasks").doc(taskId).update({
      data: {
        status: "planned",
        taskCard: parsed.taskCard,
        generatedPrompt: parsed.generatedPrompt,
        workflowRunId: parsed.workflowRunId,
        difyRawResponse: responseJson,
        difyErrorMessage: "",
        updatedAt: db.serverDate()
      }
    });

    return {
      taskId,
      status: "planned",
      taskCard: parsed.taskCard,
      generatedPrompt: parsed.generatedPrompt,
      workflowRunId: parsed.workflowRunId
    };
  } catch (error) {
    const errorMessage = error && error.message ? error.message : "Dify Workflow 调用失败";
    await markDifyFailed(taskId, errorMessage);
    return {
      taskId,
      status: "dify_failed",
      errorMessage
    };
  }
};

function buildDifyInputs(task) {
  return {
    service_type: mapDifyServiceType(task.serviceType),
    image_name: getImageName(task),
    selected_options: asList(task.selectedOptions).join("，"),
    custom_requirement: asText(task.customRequirement),
    authorization_confirmed: task.authorizationConfirmed ? "true" : "false"
  };
}

function mapDifyServiceType(serviceType) {
  const serviceMap = {
    old_photo_restoration: "old_photo_restoration",
    black_white_colorization: "colorization",
    memorial_portrait: "portrait_generation"
  };

  return serviceMap[serviceType] || serviceType || "old_photo_restoration";
}

function getImageName(task) {
  const source = asText(task.originalImageUrl || task.originalFileID);
  if (!source) {
    return "uploaded-image.jpg";
  }

  const cleanSource = source.split("?")[0];
  const parts = cleanSource.split("/");
  return parts[parts.length - 1] || "uploaded-image.jpg";
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

function parseDifyResponse(responseJson) {
  return {
    taskCard: asText(firstValue(
      responseJson,
      ["data", "outputs", "task_card"],
      ["outputs", "task_card"],
      ["task_card"]
    )),
    generatedPrompt: asText(firstValue(
      responseJson,
      ["data", "outputs", "generated_prompt"],
      ["outputs", "generated_prompt"],
      ["generated_prompt"]
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

async function markDifyFailed(taskId, errorMessage) {
  await db.collection("tasks").doc(taskId).update({
    data: {
      status: "processing",
      difyErrorMessage: errorMessage,
      updatedAt: db.serverDate()
    }
  });
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
