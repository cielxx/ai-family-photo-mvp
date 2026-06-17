const { completeTask, completeAdjustment } = require("../../utils/mock-data");

Page({
  data: {
    mode: "initial",
    statusTitle: "正在处理照片",
    statusDesc: "正在根据你的选择准备处理结果，请稍等片刻。"
  },

  onLoad(options) {
    const mode = options.mode || "initial";
    this.setData({
      mode,
      statusTitle: mode === "adjustment" ? "正在调整结果" : "正在处理照片",
      statusDesc: mode === "adjustment" ? "正在根据你的反馈优化结果，请稍等片刻。" : "正在根据你的选择准备处理结果，请稍等片刻。"
    });

    const task = wx.getStorageSync("currentTask");
    if (!task) {
      wx.redirectTo({ url: "/pages/service/service" });
      return;
    }

    setTimeout(() => {
      const nextTask = mode === "adjustment" ? completeAdjustment(task) : completeTask(task);
      wx.setStorageSync("currentTask", nextTask);
      wx.redirectTo({
        url: `/pages/result/result?mode=${mode === "adjustment" ? "adjusted" : "initial"}`
      });
    }, 1200);
  }
});
