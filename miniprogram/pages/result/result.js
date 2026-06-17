Page({
  data: {
    task: {},
    isAdjusted: false,
    pageTitle: "处理结果已生成",
    pageSubtitle: "下面是原图和处理后的效果。你也可以提交二次调整需求。",
    leftImage: "",
    rightImage: "",
    leftLabel: "原图",
    rightLabel: "效果图",
    adjustmentSummary: ""
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

    this.setData({
      task,
      isAdjusted,
      pageTitle: isAdjusted ? "调整完成" : "处理结果已生成",
      pageSubtitle: isAdjusted ? "这是根据你的反馈调整后的最终效果。" : "下面是原图和处理后的效果。你也可以提交二次调整需求。",
      leftImage,
      rightImage,
      leftLabel: "原图",
      rightLabel: isAdjusted ? "最终结果" : "效果图",
      adjustmentSummary: `${issueText}；${requirement}`
    });
  },

  saveImage() {
    const imagePath = this.data.rightImage;
    wx.saveImageToPhotosAlbum({
      filePath: imagePath,
      success: () => {
        wx.showToast({ title: "已保存" });
      },
      fail: () => {
        wx.showToast({
          title: "请在真机中保存",
          icon: "none"
        });
      }
    });
  },

  goToAdjustment() {
    wx.navigateTo({
      url: "/pages/adjustment/adjustment"
    });
  },

  restart() {
    wx.removeStorageSync("currentTask");
    wx.reLaunch({
      url: "/pages/home/home"
    });
  }
});
