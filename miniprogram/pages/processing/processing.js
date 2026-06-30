const { completeTask, completeAdjustment } = require("../../utils/mock-data");
const { runDifyAdjustment, runDifyPlan } = require("../../utils/cloud-task");
const { formatClockTime } = require("../../utils/time");

Page({
  data: {
    mode: "initial",
    task: {},
    fileName: "家庭合影_1993.jpg",
    fileSize: "2.4MB",
    uploadTime: "09:21",
    statusTitle: "正在处理...",
    statusDescLineOne: "我们正在根据照片状态和你的补充需求进行处理",
    statusDescLineTwo: "会优先保留人物特征",
    progressSteps: []
  },

  processingTimer: null,

  onLoad(options) {
    const mode = options.mode || "initial";
    const task = wx.getStorageSync("currentTask");
    if (!task) {
      wx.redirectTo({ url: "/pages/service/service" });
      return;
    }

    this.setData({
      mode,
      task,
      fileName: this.getFileName(task),
      uploadTime: formatClockTime(task.uploadedAt || task.createdAt),
      statusTitle: mode === "adjustment" ? "正在调整..." : "正在处理...",
      statusDescLineOne: mode === "adjustment" ? "我们正在根据你的反馈重新优化结果" : "我们正在根据照片状态和你的补充需求进行处理",
      statusDescLineTwo: mode === "adjustment" ? "会尽量保留你满意的部分" : "会优先保留人物特征",
      progressSteps: this.getProgressSteps(mode)
    });

    const workflowPromise = this.requestWorkflowPlan(mode, task);
    const minimumWaitPromise = new Promise((resolve) => {
      this.processingTimer = setTimeout(resolve, 3200);
    });

    Promise.all([
      minimumWaitPromise,
      workflowPromise.catch((error) => {
        console.warn("run workflow plan failed", error);
      })
    ]).then(() => {
      const latestTask = wx.getStorageSync("currentTask") || this.data.task || task;
      const nextTask = mode === "adjustment" ? completeAdjustment(latestTask) : completeTask(latestTask);
      wx.setStorageSync("currentTask", nextTask);
      wx.redirectTo({
        url: `/pages/result/result?mode=${mode === "adjustment" ? "adjusted" : "initial"}`
      });
    });
  },

  onUnload() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
  },

  getFileName(task) {
    const names = {
      old_photo_restoration: "家庭合影_1993.jpg",
      black_white_colorization: "黑白合影_1988.jpg",
      memorial_portrait: "纪念人像素材.jpg"
    };

    return names[task.serviceType] || "家庭照片.jpg";
  },

  getProgressSteps(mode) {
    if (mode === "adjustment") {
      return [
        { name: "读取反馈需求", label: "已完成", state: "done" },
        { name: "保留满意部分", label: "已完成", state: "done" },
        { name: "生成调整任务", label: "已完成", state: "done" },
        { name: "重新优化图像", label: "处理中", state: "active" },
        { name: "整理调整结果", label: "等待中", state: "pending" }
      ];
    }

    return [
      { name: "检查照片质量", label: "已完成", state: "done" },
      { name: "解析照片需求", label: "已完成", state: "done" },
      { name: "生成处理任务", label: "已完成", state: "done" },
      { name: "进行图像处理", label: "处理中", state: "active" },
      { name: "整理处理结果", label: "等待中", state: "pending" }
    ];
  },

  requestWorkflowPlan(mode, task) {
    if (mode === "adjustment") {
      return this.requestDifyAdjustment(task);
    }

    if (mode === "initial") {
      return this.requestDifyPlan(task);
    }

    return Promise.resolve();
  },

  requestDifyPlan(task) {
    if (!task.cloudTaskId) return Promise.resolve();

    return runDifyPlan({
      taskId: task.cloudTaskId
    }).then((result) => {
      if (!result) return;

      const latestTask = wx.getStorageSync("currentTask") || task;
      const nextTask = {
        ...latestTask,
        cloudStatus: result.status || latestTask.cloudStatus,
        taskCard: result.taskCard || latestTask.taskCard,
        generatedPrompt: result.generatedPrompt || latestTask.generatedPrompt,
        workflowRunId: result.workflowRunId || latestTask.workflowRunId,
        difyErrorMessage: result.errorMessage || ""
      };

      wx.setStorageSync("currentTask", nextTask);
      this.setData({ task: nextTask });
    });
  },

  requestDifyAdjustment(task) {
    if (!task.cloudTaskId) return Promise.resolve();

    return runDifyAdjustment({
      taskId: task.cloudTaskId,
      issueTags: task.issueTags || [],
      adjustmentRequirement: task.adjustmentRequirement || ""
    }).then((result) => {
      if (!result) return;

      const latestTask = wx.getStorageSync("currentTask") || task;
      const nextTask = {
        ...latestTask,
        cloudStatus: result.status || latestTask.cloudStatus,
        cloudAdjustmentId: result.adjustmentId || latestTask.cloudAdjustmentId,
        adjustmentTaskCard: result.adjustmentTaskCard || latestTask.adjustmentTaskCard,
        secondRoundPrompt: result.secondRoundPrompt || latestTask.secondRoundPrompt,
        adjustmentWorkflowRunId: result.workflowRunId || latestTask.adjustmentWorkflowRunId,
        adjustmentErrorMessage: result.errorMessage || ""
      };

      wx.setStorageSync("currentTask", nextTask);
      this.setData({ task: nextTask });
    });
  },

  goBack() {
    wx.navigateBack();
  },

  continueWaiting() {
    wx.showToast({
      title: "正在继续处理",
      icon: "none"
    });
  },

  viewLater() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    wx.setStorageSync("pendingTask", this.data.task);
    wx.showToast({
      title: "已暂存当前任务",
      icon: "none"
    });

    setTimeout(() => {
      wx.reLaunch({
        url: "/pages/home/home"
      });
    }, 600);
  },

  cancelTask() {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    wx.removeStorageSync("currentTask");
    wx.reLaunch({
      url: "/pages/home/home"
    });
  }
});
