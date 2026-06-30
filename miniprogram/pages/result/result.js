const { regenerateTask } = require("../../utils/mock-data");
const { saveCloudTaskResult } = require("../../utils/cloud-task");

Page({
  data: {
    task: {},
    isAdjusted: false,
    pageTitle: "处理结果已生成",
    pageSubtitle: "下面是原图和处理后的效果。你也可以提交二次调整需求。",
    leftImage: "",
    rightImage: "",
    leftLabel: "修复前",
    rightLabel: "修复后",
    adjustmentSummary: "",
    resultHint: "",
    compareNote: "原图与本次结果",
    selectedSummary: "",
    customSummary: "",
    completionItems: [],
    adjustedFeedbackTags: [],
    adjustedFocusItems: [],
    isSaved: false
  },

  onLoad(options) {
    const task = wx.getStorageSync("currentTask");
    if (!task) {
      wx.redirectTo({ url: "/pages/service/service" });
      return;
    }

    const isAdjusted = options.mode === "adjusted";
    const leftImage = task.originalImageUrl;
    const rightImage = isAdjusted ? task.adjustedImageUrl : task.resultImageUrl;
    const issueText = task.issueTags && task.issueTags.length ? task.issueTags.join("、") : "整体微调";
    const requirement = task.adjustmentRequirement || "让结果更自然";
    const selectedSummary = task.selectedOptions && task.selectedOptions.length ? task.selectedOptions.join("、") : "保持自然、不过度处理";
    const customSummary = task.customRequirement || "无额外补充";
    const adjustedFeedbackTags = task.issueTags && task.issueTags.length ? task.issueTags : [issueText];
    const compareLabels = this.getCompareLabels(task.serviceType);

    this.setData({
      task,
      isAdjusted,
      isSaved: false,
      pageTitle: isAdjusted ? "调整完成" : "处理完成",
      pageSubtitle: isAdjusted ? "这是根据你的反馈调整后的最终效果。" : "我们已根据照片状态和你的补充需求完成修复",
      resultHint: isAdjusted ? "" : "尽量保留了人物特征",
      leftImage,
      rightImage,
      leftLabel: isAdjusted ? "原图" : compareLabels.before,
      rightLabel: isAdjusted ? "最终结果" : compareLabels.after,
      compareNote: isAdjusted ? "原图与最终结果" : "修复前后对比",
      selectedSummary,
      customSummary,
      adjustmentSummary: `${issueText}；${requirement}`,
      completionItems: this.getCompletionItems(task.serviceType),
      adjustedFeedbackTags,
      adjustedFocusItems: this.getAdjustedFocusItems(task.serviceType)
    });
  },

  getCompareLabels(serviceType) {
    if (serviceType === "black_white_colorization") {
      return {
        before: "上色前",
        after: "上色后"
      };
    }

    if (serviceType === "memorial_portrait") {
      return {
        before: "生成前",
        after: "生成后"
      };
    }

    return {
      before: "修复前",
      after: "修复后"
    };
  },

  getCompletionItems(serviceType) {
    if (serviceType === "black_white_colorization") {
      return ["已为黑白照片补充自然色彩", "已尽量保留原始光影", "已控制色彩不过度鲜艳", "已保持人物和场景真实感"];
    }

    if (serviceType === "memorial_portrait") {
      return ["已生成更正式的纪念影像", "已尽量保留人物特征", "已控制画面温暖克制", "已适配保存和分享场景"];
    }

    return ["已提升人物区域清晰度", "已减弱划痕和噪点", "已对褪色区域进行柔和恢复", "已尽量保留原照片年代感"];
  },

  getAdjustedFocusItems(serviceType) {
    if (serviceType === "black_white_colorization") {
      return ["调整了色彩和背景细节，让结果更自然", "减弱过度修饰的痕迹", "尽量保留原始光影和年代感"];
    }

    if (serviceType === "memorial_portrait") {
      return ["调整了画面细节，更接近日常记忆", "保留人物特征和整体氛围", "让结果更适合保存与分享"];
    }

    return ["调整了人物面部细节，更接近原照片特征", "减弱过度修复的痕迹", "恢复更柔和的年代感氛围"];
  },

  goBack() {
    wx.navigateBack();
  },

  handlePrimaryAction() {
    if (this.data.isSaved) {
      this.goHome();
      return;
    }

    this.saveImage();
  },

  saveImage() {
    const imagePath = this.data.rightImage;
    wx.saveImageToPhotosAlbum({
      filePath: imagePath,
      success: () => {
        this.markResultSaved();
        wx.showToast({ title: "已保存" });
      },
      fail: () => {
        this.markResultSaved();
        wx.showToast({
          title: "已模拟保存",
          icon: "none"
        });
      }
    });
  },

  markResultSaved() {
    const savedAt = new Date().toISOString();
    const nextTask = {
      ...this.data.task,
      status: "saved",
      savedAt
    };

    this.setData({
      isSaved: true,
      task: nextTask
    });
    wx.setStorageSync("currentTask", nextTask);

    saveCloudTaskResult({
      taskId: nextTask.cloudTaskId,
      resultType: this.data.isAdjusted ? "adjusted" : "initial"
    }).then((result) => {
      if (!result || !result.savedAt) return;

      const syncedTask = {
        ...nextTask,
        savedAt: result.savedAt,
        savedResultType: result.savedResultType
      };
      this.setData({ task: syncedTask });
      wx.setStorageSync("currentTask", syncedTask);
    }).catch((error) => {
      console.warn("save cloud task result failed", error);
    });
  },

  goToAdjustment() {
    wx.navigateTo({
      url: "/pages/adjustment/adjustment"
    });
  },

  restart() {
    const nextTask = regenerateTask(this.data.task);
    wx.setStorageSync("currentTask", nextTask);
    wx.redirectTo({
      url: "/pages/processing/processing?mode=initial"
    });
  },

  goHome() {
    wx.removeStorageSync("currentTask");
    wx.reLaunch({
      url: "/pages/home/home"
    });
  }
});
