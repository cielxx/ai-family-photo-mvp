const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const now = new Date();

  await ensureCollection("tasks");

  const task = {
    openid: wxContext.OPENID,
    serviceType: asText(event.serviceType),
    serviceName: asText(event.serviceName),
    status: event.originalFileID ? "uploaded" : "created",
    originalFileID: asText(event.originalFileID),
    originalImageUrl: asText(event.originalImageUrl),
    resultImageUrl: asText(event.resultImageUrl),
    adjustedImageUrl: asText(event.adjustedImageUrl),
    selectedOptions: asList(event.selectedOptions),
    customRequirement: asText(event.customRequirement),
    authorizationConfirmed: Boolean(event.authorizationConfirmed),
    validationStatus: asText(event.validationStatus || "pass"),
    validationMessage: asText(event.validationMessage),
    taskCard: "",
    generatedPrompt: "",
    workflowRunId: "",
    difyRawResponse: {},
    resultSource: "mock",
    regenerateCount: 0,
    createdAt: db.serverDate(),
    uploadedAt: db.serverDate(),
    updatedAt: db.serverDate(),
    completedAt: null,
    savedAt: null
  };

  const result = await db.collection("tasks").add({
    data: task
  });

  return {
    taskId: result._id,
    status: task.status,
    originalFileID: task.originalFileID,
    originalImageUrl: task.originalImageUrl,
    createdAt: now.toISOString(),
    uploadedAt: now.toISOString()
  };
};

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (error) {
    // Existing collections throw on some SDK versions; creating the task can continue.
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
