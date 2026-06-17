const { issueTags, createAdjustment } = require("../../utils/mock-data");

Page({
  data: {
    task: {},
    issueOptions: issueTags.map((name) => ({ name, active: false })),
    selectedIssues: [],
    adjustmentRequirement: "",
    canSubmit: false
  },

  onLoad() {
    const task = wx.getStorageSync("currentTask");
    if (!task) {
      wx.redirectTo({ url: "/pages/service/service" });
      return;
    }

    this.setData({ task });
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
      adjustmentRequirement: event.detail.value
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
  }
});
