const { completeTask, completeAdjustment } = require("../../utils/mock-data");

Page({
  data: {
    mode: "initial",
    statusTitle: "正在生成处理方案",
    statusDesc: "系统正在模拟 AI 理解、任务卡和处理结果。"
  },

  onLoad(options) {
    const mode = options.mode || "initial";
    this.setData({
      mode,
      statusTitle: mode === "adjustment" ? "正在生成调整方案" : "正在生成处理方案",
      statusDesc: mode === "adjustment" ? "系统正在模拟二次调整结果。" : "系统正在模拟 AI 理解、任务卡和处理结果。"
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
