const { issueTags, createAdjustment } = require("../../utils/mock-data");

Page({
  data: {
    task: {},
    issueOptions: issueTags.map((name) => ({ name, active: false })),
    selectedIssues: [],
    adjustmentRequirement: "",
    requirementCount: 0,
    canSubmit: false,
    compareLabels: {
      before: "修复前",
      after: "修复后"
    }
  },

  onLoad() {
    const task = wx.getStorageSync("currentTask");
    if (!task) {
      wx.redirectTo({ url: "/pages/service/service" });
      return;
    }

    this.setData({
      task,
      compareLabels: this.getCompareLabels(task.serviceType)
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

  toggleIssue(event) {
    const tag = event.currentTarget.dataset.tag;
    const selectedIssues = [...this.data.selectedIssues];
    const index = selectedIssues.indexOf(tag);

    if (index >= 0) {
      selectedIssues.splice(index, 1);
    } else {
      selectedIssues.push(tag);
    }

    this.setData({
      selectedIssues,
      issueOptions: this.data.issueOptions.map((item) => ({
        ...item,
        active: selectedIssues.indexOf(item.name) >= 0
      }))
    });
    this.updateSubmitState();
  },

  onRequirementInput(event) {
    this.setData({
      adjustmentRequirement: event.detail.value,
      requirementCount: event.detail.value.length
    });
    this.updateSubmitState();
  },

  updateSubmitState() {
    this.setData({
      canSubmit: Boolean(this.data.selectedIssues.length || this.data.adjustmentRequirement.trim())
    });
  },

  submitAdjustment() {
    if (!this.data.canSubmit) return;

    const nextTask = createAdjustment(this.data.task, {
      issueTags: this.data.selectedIssues,
      adjustmentRequirement: this.data.adjustmentRequirement
    });

    wx.setStorageSync("currentTask", nextTask);
    wx.redirectTo({
      url: "/pages/processing/processing?mode=adjustment"
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
