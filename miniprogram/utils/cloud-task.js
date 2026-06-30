const app = getApp();

function hasCloud() {
  return Boolean(wx.cloud && app.globalData.cloudEnv);
}

function isPackagedAsset(filePath) {
  return typeof filePath === "string" && filePath.indexOf("/assets/") === 0;
}

function getFileExtension(filePath) {
  const matched = String(filePath || "").match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return matched ? matched[1].toLowerCase() : "jpg";
}

function buildCloudPath(serviceType, filePath) {
  const ext = getFileExtension(filePath);
  const random = Math.random().toString(36).slice(2, 8);
  return `tasks/original/${serviceType}/${Date.now()}-${random}.${ext}`;
}

function uploadOriginalImage({ filePath, serviceType }) {
  if (!hasCloud() || !filePath || isPackagedAsset(filePath)) {
    return Promise.resolve({
      originalFileID: "",
      originalImageUrl: filePath || ""
    });
  }

  return wx.cloud.uploadFile({
    cloudPath: buildCloudPath(serviceType, filePath),
    filePath
  }).then((result) => ({
    originalFileID: result.fileID || "",
    originalImageUrl: result.fileID || filePath
  }));
}

function createCloudTask(input) {
  if (!hasCloud()) {
    return Promise.resolve(null);
  }

  return uploadOriginalImage({
    filePath: input.originalImageUrl,
    serviceType: input.serviceType
  }).then((uploadResult) =>
    wx.cloud.callFunction({
      name: "createTask",
      data: {
        ...input,
        originalFileID: uploadResult.originalFileID,
        originalImageUrl: uploadResult.originalImageUrl
      }
    })
  ).then((response) => response.result || null);
}

function saveCloudTaskResult({ taskId, resultType }) {
  if (!hasCloud() || !taskId) {
    return Promise.resolve(null);
  }

  return wx.cloud.callFunction({
    name: "saveTaskResult",
    data: {
      taskId,
      resultType: resultType || "initial"
    }
  }).then((response) => response.result || null);
}

function runDifyPlan({ taskId }) {
  if (!hasCloud() || !taskId) {
    return Promise.resolve(null);
  }

  return wx.cloud.callFunction({
    name: "runDifyPlan",
    data: {
      taskId
    }
  }).then((response) => response.result || null);
}

module.exports = {
  createCloudTask,
  saveCloudTaskResult,
  runDifyPlan
};
