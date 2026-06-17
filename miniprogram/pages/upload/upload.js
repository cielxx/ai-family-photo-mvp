const { getService, createTask } = require("../../utils/mock-data");

Page({
  data: {
    service: {},
    serviceType: "old_photo_restoration",
    imageUrl: "",
    optionTags: [],
    selectedOptions: [],
    customRequirement: "",
    authorizationConfirmed: false,
    canSubmit: false
  },

  onLoad(options) {
    const serviceType = options.serviceType || "old_photo_restoration";
    const service = getService(serviceType);

    this.setData({
      service,
      serviceType,
      optionTags: service.tags.map((name) => ({ name, active: false }))
    });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (result) => {
        const file = result.tempFiles && result.tempFiles[0];
        if (!file) return;

        this.setData({
          imageUrl: file.tempFilePath
        });
        this.updateSubmitState();
      }
    });
  },

  useSample() {
    this.setData({
      imageUrl: this.data.service.beforeImage
    });
    this.updateSubmitState();
  },

  toggleTag(event) {
    const tag = event.currentTarget.dataset.tag;
    const selectedOptions = [...this.data.selectedOptions];
    const index = selectedOptions.indexOf(tag);

    if (index >= 0) {
      selectedOptions.splice(index, 1);
      delete selectedMap[tag];
    } else {
      selectedOptions.push(tag);
    }

    this.setData({
      selectedOptions,
      optionTags: this.data.optionTags.map((item) => ({
        ...item,
        active: selectedOptions.indexOf(item.name) >= 0
      }))
    });
  },

  onRequirementInput(event) {
    this.setData({
      customRequirement: event.detail.value
    });
  },

  toggleAuthorization() {
    this.setData({
      authorizationConfirmed: !this.data.authorizationConfirmed
    });
    this.updateSubmitState();
  },

  updateSubmitState() {
    this.setData({
      canSubmit: Boolean(this.data.imageUrl && this.data.authorizationConfirmed)
    });
  },

  submitTask() {
    if (!this.data.canSubmit) return;

    const task = createTask({
      serviceType: this.data.serviceType,
      originalImageUrl: this.data.imageUrl,
      selectedOptions: this.data.selectedOptions,
      customRequirement: this.data.customRequirement,
      authorizationConfirmed: this.data.authorizationConfirmed
    });

    wx.setStorageSync("currentTask", task);
    wx.navigateTo({
      url: "/pages/processing/processing?mode=initial"
    });
  }
});
