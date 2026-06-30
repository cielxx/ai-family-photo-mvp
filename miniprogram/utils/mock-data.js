const services = {
  old_photo_restoration: {
    id: "old_photo_restoration",
    name: "老照片修复",
    shortName: "修复",
    description: "提升清晰度，减少划痕和破损，尽量保留照片原本的年代感。",
    tags: ["提高清晰度", "减少划痕", "修复破损", "保留年代感"],
    beforeImage: "/assets/mock/old_before.jpg",
    resultImage: "/assets/mock/old_after.jpg",
    adjustedImage: "/assets/mock/old_after.jpg"
  },
  black_white_colorization: {
    id: "black_white_colorization",
    name: "黑白照片上色",
    shortName: "上色",
    description: "为黑白照片补充自然色彩，让人物和场景更接近真实记忆。",
    tags: ["自然肤色", "柔和色彩", "保留光影", "不要过度鲜艳"],
    beforeImage: "/assets/mock/color_before.jpg",
    resultImage: "/assets/mock/color_after.jpg",
    adjustedImage: "/assets/mock/color_after.jpg"
  },
  memorial_portrait: {
    id: "memorial_portrait",
    name: "纪念照生成",
    shortName: "纪念照",
    description: "基于家庭照片生成温暖、克制、适合保存和分享的纪念影像。",
    tags: ["温暖氛围", "自然表情", "家庭纪念", "简洁背景"],
    beforeImage: "/assets/mock/memorial_before.jpg",
    resultImage: "/assets/mock/memorial_after.jpg",
    adjustedImage: "/assets/mock/memorial_after.jpg"
  }
};

const serviceList = [
  services.old_photo_restoration,
  services.black_white_colorization,
  services.memorial_portrait
];

const issueTags = ["人脸修得不像了", "修复痕迹太重", "皮肤太平滑", "照片失去年代感", "仍然不够清晰", "背景处理不自然"];

function getService(serviceType) {
  return services[serviceType] || services.old_photo_restoration;
}

function createTask(input) {
  const service = getService(input.serviceType);
  const selectedOptions = input.selectedOptions || [];
  const customRequirement = input.customRequirement || "";

  return {
    taskId: `mock_${Date.now()}`,
    serviceType: service.id,
    serviceName: service.name,
    originalImageUrl: input.originalImageUrl || service.beforeImage,
    resultImageUrl: service.resultImage,
    selectedOptions,
    customRequirement,
    authorizationConfirmed: Boolean(input.authorizationConfirmed),
    status: "processing",
    taskCard: buildTaskCard(service, selectedOptions, customRequirement),
    generatedPrompt: buildPrompt(service, selectedOptions, customRequirement),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function completeTask(task) {
  return {
    ...task,
    status: "completed",
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function regenerateTask(task) {
  return {
    ...task,
    status: "processing",
    regenerateCount: (task.regenerateCount || 0) + 1,
    updatedAt: new Date().toISOString()
  };
}

function createAdjustment(task, input) {
  const service = getService(task.serviceType);
  const issueTagsValue = input.issueTags || [];
  const adjustmentRequirement = input.adjustmentRequirement || "";

  return {
    ...task,
    issueTags: issueTagsValue,
    adjustmentRequirement,
    secondRoundPrompt: buildAdjustmentPrompt(service, issueTagsValue, adjustmentRequirement),
    adjustedImageUrl: service.adjustedImage,
    status: "adjusting",
    updatedAt: new Date().toISOString()
  };
}

function completeAdjustment(task) {
  return {
    ...task,
    status: "adjusted",
    completedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function buildTaskCard(service, selectedOptions, customRequirement) {
  const options = selectedOptions.length ? selectedOptions.join("、") : "保持自然、不过度处理";
  const requirement = customRequirement || "无额外补充";
  return `服务：${service.name}\n处理重点：${options}\n补充说明：${requirement}`;
}

function buildPrompt(service, selectedOptions, customRequirement) {
  const options = selectedOptions.length ? selectedOptions.join(", ") : "natural result";
  const requirement = customRequirement || "keep the image realistic and family-memory friendly";
  return `${service.name}: ${options}. ${requirement}.`;
}

function buildAdjustmentPrompt(service, tags, requirement) {
  const issues = tags.length ? tags.join(", ") : "general refinement";
  const detail = requirement || "make the result more natural and restrained";
  return `${service.name} second pass: fix ${issues}. ${detail}.`;
}

module.exports = {
  serviceList,
  issueTags,
  getService,
  createTask,
  completeTask,
  regenerateTask,
  createAdjustment,
  completeAdjustment
};
